"""
Views and API Endpoints for ELD Trip Planner.
Handles /api/trips/plan/, /api/geocode/, and /api/health/.
"""

import logging
from datetime import datetime, timedelta
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings

from .serializers import TripPlanRequestSerializer, GeocodeQuerySerializer
from .services.routing import get_route, RoutingProviderError
from .services.geo_utils import compute_cumulative_distances, interpolate_coord_at_mile
from .services.geocoding import search_locations, reverse_geocode, batch_reverse_geocode
from .services.hos_planner import (
    plan_trip,
    STATUS_DRIVING,
    STATUS_ON_DUTY,
    STATUS_OFF,
    STATUS_SB,
)
from .services.hos_validator import validate_hos
from .services.log_builder import build_daily_logs

logger = logging.getLogger(__name__)


class TripPlanView(APIView):
    """
    POST /api/trips/plan/
    Main trip planning endpoint. Computes route, HOS schedule, stops, and daily logs.
    """

    def post(self, request):
        serializer = TripPlanRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {
                    "error": "Validation Error",
                    "message": "Please review and correct the invalid form fields.",
                    "details": serializer.errors,
                },
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )

        data = serializer.validated_data
        origin = data["current_location"]
        pickup = data["pickup_location"]
        dropoff = data["dropoff_location"]
        cycle_used = data["cycle_used_hours"]
        start_dt = data["start_datetime"]
        speed_mph = getattr(settings, "AVG_SPEED_MPH", 55.0)

        # 1. Generate Route
        try:
            route_data = get_route(origin, pickup, dropoff, avg_speed_mph=speed_mph)
        except RoutingProviderError as exc:
            return Response(
                {
                    "error": "Routing Provider Failure",
                    "message": str(exc),
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )
        except Exception as exc:
            logger.error(f"Unexpected routing error: {exc}", exc_info=True)
            return Response(
                {
                    "error": "Routing Service Error",
                    "message": "Unable to calculate route. Please verify addresses or coordinates.",
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )

        geometry = route_data["geometry"]
        total_dist_mi = route_data["total_distance_miles"]
        pickup_dist_mi = route_data["pickup_distance_miles"]
        legs = route_data["legs"]

        cum_miles, _ = compute_cumulative_distances(geometry)

        # 2. Simulate HOS Segments
        segments = plan_trip(
            total_distance_mi=total_dist_mi,
            pickup_dist_mi=pickup_dist_mi,
            cycle_used_hr=cycle_used,
            start_dt=start_dt,
            speed_mph=speed_mph,
        )

        # 3. Independent Rule Validation
        violations = validate_hos(segments, cycle_used_at_start=cycle_used)
        hos_valid = (len(violations) == 0)

        # 4. Build Detailed Stops & Rest Markers for Map & Timeline
        stops = []
        stop_id = 1

        # Stop 0: Origin
        stops.append({
            "id": f"stop-{stop_id}",
            "type": "origin",
            "label": f"Origin: {origin['label']}",
            "location": {
                "label": origin["label"],
                "lat": origin["lat"],
                "lng": origin["lng"],
            },
            "arrive": start_dt.isoformat(),
            "depart": start_dt.isoformat(),
            "duration_minutes": 0,
            "mile_marker": 0.0,
            "note": "Trip dispatch & departure point",
        })
        stop_id += 1

        fuel_count = 0
        rest_count = 0
        restart_count = 0

        for seg in segments:
            reason_lower = seg.reason.lower()
            st_type = None
            st_label = ""
            note = ""

            if seg.status == STATUS_ON_DUTY and "pickup" in reason_lower:
                st_type = "pickup"
                st_label = f"Pickup: {pickup['label']}"
                note = "1 hour On Duty: Freight loading & pre-trip paperwork"
            elif seg.status == STATUS_ON_DUTY and "dropoff" in reason_lower:
                st_type = "dropoff"
                st_label = f"Dropoff: {dropoff['label']}"
                note = "1 hour On Duty: Freight unloading & post-trip inspection"
            elif seg.status == STATUS_ON_DUTY and "fuel" in reason_lower:
                fuel_count += 1
                st_type = "fuel"
                st_label = f"Fuel Stop #{fuel_count}"
                note = "30 min On Duty: Commercial vehicle refueling (Rule <= 1,000 mi)"
            elif seg.status == STATUS_SB and "rest" in reason_lower:
                rest_count += 1
                st_type = "rest"
                st_label = f"10-Hour Rest Break #{rest_count}"
                note = "10 hours Sleeper Berth: Required rest period (§ 395.1(g))"
            elif seg.status == STATUS_OFF and "restart" in reason_lower:
                restart_count += 1
                st_type = "restart"
                st_label = f"34-Hour Restart #{restart_count}"
                note = "34 consecutive hours Off Duty: Resets 70-hour cycle to 0 (§ 395.3(c))"
            elif seg.status == STATUS_OFF and "break" in reason_lower:
                st_type = "break"
                st_label = "30-Minute Rest Break"
                note = "30 min Off Duty: Required after 8h cumulative driving (§ 395.3(a)(3)(ii))"

            if st_type is not None:
                lat, lng = interpolate_coord_at_mile(geometry, cum_miles, seg.start_mi)
                stops.append({
                    "id": f"stop-{stop_id}",
                    "type": st_type,
                    "label": st_label,
                    "location": {
                        "label": f"{lat:.3f}, {lng:.3f}",  # Will be enriched by logs if geocoded
                        "lat": lat,
                        "lng": lng,
                    },
                    "arrive": seg.start.isoformat(),
                    "depart": seg.end.isoformat(),
                    "duration_minutes": seg.duration_minutes,
                    "mile_marker": round(seg.start_mi, 1),
                    "note": note,
                })
                stop_id += 1

        # Reverse-geocode stop locations in a thread pool with caching and safe fallback
        offline_mode = data.get("offline", False)
        intermediate_stops = [
            st for st in stops if st["type"] not in ("origin", "pickup", "dropoff")
        ]
        if intermediate_stops:
            if offline_mode:
                for st in intermediate_stops:
                    st["location"]["label"] = f"Mile {st['mile_marker']:.0f}, Highway Rest/Fuel"
            else:
                stop_coords = [
                    (float(st["location"]["lat"]), float(st["location"]["lng"]))
                    for st in intermediate_stops
                ]
                geocoded_stop_labels = batch_reverse_geocode(stop_coords, max_workers=5)
                for st, lbl in zip(intermediate_stops, geocoded_stop_labels):
                    if lbl:
                        st["location"]["label"] = lbl

        # 5. Build Daily Log Sheets
        header_info = {
            "carrier_name": data.get("carrier_name") or "Antigravity Freight Lines",
            "main_office_address": data.get("main_office_address") or "100 S. Wacker Dr, Chicago, IL",
            "home_terminal_address": data.get("home_terminal_address") or "400 Logistics Blvd, Joliet, IL",
            "vehicle_numbers": data.get("vehicle_numbers") or "TRK-9042 / TRL-4410",
            "driver_name": data.get("driver_name") or "Alex Vance",
            "co_driver": data.get("co_driver") or "",
            "shipper_commodity": data.get("shipper_commodity") or "Apex Industrial / Auto Components",
            "shipping_doc_no": data.get("shipping_doc_no") or "BOL-8829104",
            "from_location": origin["label"],
            "to_location": dropoff["label"],
        }

        daily_logs = build_daily_logs(
            segments=segments,
            route_geometry=geometry,
            route_cumulative_miles=cum_miles,
            cycle_used_at_start=cycle_used,
            header_info=header_info,
            offline=offline_mode,
        )

        # Enrich stop locations with nearest remark labels if not already named
        for st in stops:
            lbl = st["location"].get("label", "")
            # If label is just raw coordinates like "38.123, -89.456", try to get a better label from remarks
            if not lbl or ("," in lbl and lbl.replace(".", "").replace(",", "").replace("-", "").replace(" ", "").isdigit()):
                for log in daily_logs:
                    for rem in log.get("remarks", []):
                        if rem["time"] == st["arrive"][11:16] and rem.get("location"):
                            st["location"]["label"] = rem["location"]
                            break

        # 6. Overall Metrics Summary
        total_driving_min = sum(s.duration_minutes for s in segments if s.status == STATUS_DRIVING)
        first_start = segments[0].start
        last_end = segments[-1].end
        trip_duration_hrs = round((last_end - first_start).total_seconds() / 3600.0, 2)

        summary = {
            "total_miles": total_dist_mi,
            "driving_hours": round(total_driving_min / 60.0, 2),
            "trip_duration_hours": trip_duration_hrs,
            "days": len(daily_logs),
            "fuel_stops": fuel_count,
            "rests": rest_count,
            "restarts": restart_count,
            "hos_valid": hos_valid,
            "violations": violations,
        }

        assumptions = [
            "Property-carrying driver operating under 70 hr / 8 day cycle (§ 395.3(b)(2)).",
            "Sleeper berth rest periods taken in 10 consecutive hours (§ 395.1(g)(1)).",
            "Mandatory 30-minute rest break required within 8 cumulative driving hours (§ 395.3(a)(3)(ii)).",
            "Commercial vehicle refueling scheduled at least once every 1,000 miles (30 min On Duty).",
            "1 hour On Duty (not driving) terminal operations at pickup and 1 hour at dropoff.",
            f"Average driving speed constant {speed_mph:.1f} mph applied across route distance.",
            "All times recorded in driver's home terminal time standard (§ 395.8(a)(1)).",
        ]

        return Response(
            {
                "summary": summary,
                "route": {
                    "geometry": geometry,
                    "legs": legs,
                },
                "stops": stops,
                "segments": [s.to_dict() for s in segments],
                "daily_logs": daily_logs,
                "assumptions": assumptions,
            },
            status=status.HTTP_200_OK,
        )


class GeocodeView(APIView):
    """
    GET /api/geocode/?q=...
    Address search and autocomplete endpoint.
    """

    def get(self, request):
        serializer = GeocodeQuerySerializer(data=request.query_params)
        if not serializer.is_valid():
            return Response(
                {"error": "Invalid query", "details": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        query = serializer.validated_data["q"]
        results = search_locations(query, limit=6)
        return Response(results, status=status.HTTP_200_OK)


class HealthCheckView(APIView):
    """
    GET /api/health/
    Health check and cold-start verification.
    """

    def get(self, request):
        provider = "openrouteservice" if settings.ORS_API_KEY else "osrm/nominatim"
        return Response(
            {
                "status": "ok",
                "service": "eld-trip-planner-backend",
                "provider": provider,
                "avg_speed_mph": getattr(settings, "AVG_SPEED_MPH", 55.0),
            },
            status=status.HTTP_200_OK,
        )
