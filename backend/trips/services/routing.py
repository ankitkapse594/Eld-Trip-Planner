"""
Vehicle Routing Service.
Generates CMV truck routes using OpenRouteService ('driving-hgv' profile)
with automatic fallback to the OSRM public routing engine.
"""

import logging
from typing import Dict, Any, List, Tuple
import requests
from django.conf import settings
from django.core.cache import cache
from .geo_utils import haversine_distance_miles, compute_cumulative_distances, simplify_geometry

logger = logging.getLogger(__name__)

TIMEOUT = getattr(settings, "HTTP_TIMEOUT_SECONDS", 8.0)
USER_AGENT = "ELD-Trip-Planner-App/1.0 (FMCSA-395; contact: support@antigravity.ai)"
METERS_TO_MILES = 0.000621371


class RoutingProviderError(Exception):
    """Raised when all external routing providers fail."""
    pass


def get_route(
    origin: Dict[str, Any],
    pickup: Dict[str, Any],
    dropoff: Dict[str, Any],
    avg_speed_mph: float = 55.0,
) -> Dict[str, Any]:
    """
    Computes a continuous commercial vehicle route across 3 waypoints:
    Origin -> Pickup -> Dropoff.

    Returns:
        {
            "geometry": [[lat, lng], ...],
            "total_distance_miles": float,
            "pickup_distance_miles": float,
            "legs": [
                {"from": str, "to": str, "miles": float, "hours": float},
                {"from": str, "to": str, "miles": float, "hours": float}
            ]
        }
    """
    cache_key = (
        f"route:{round(float(origin['lat']), 3)},{round(float(origin['lng']), 3)}:"
        f"{round(float(pickup['lat']), 3)},{round(float(pickup['lng']), 3)}:"
        f"{round(float(dropoff['lat']), 3)},{round(float(dropoff['lng']), 3)}:"
        f"{round(float(avg_speed_mph), 1)}"
    )
    cached_route = cache.get(cache_key)
    if cached_route is not None:
        return cached_route

    coords_lon_lat = [
        [float(origin["lng"]), float(origin["lat"])],
        [float(pickup["lng"]), float(pickup["lat"])],
        [float(dropoff["lng"]), float(dropoff["lat"])],
    ]

    # 1. Primary: OpenRouteService driving-hgv
    if settings.ORS_API_KEY:
        try:
            url = "https://api.openrouteservice.org/v2/directions/driving-hgv/geojson"
            headers = {
                "Authorization": settings.ORS_API_KEY,
                "Content-Type": "application/json",
            }
            body = {
                "coordinates": coords_lon_lat,
            }
            resp = requests.post(url, json=body, headers=headers, timeout=TIMEOUT)
            if resp.status_code == 200:
                data = resp.json()
                features = data.get("features", [])
                if features:
                    feat = features[0]
                    geom = feat.get("geometry", {}).get("coordinates", [])
                    segments = feat.get("properties", {}).get("segments", [])

                    # Invert [lon, lat] -> [lat, lon]
                    route_lat_lng = [[pt[1], pt[0]] for pt in geom]
                    
                    if len(segments) >= 2:
                        leg1_meters = segments[0].get("distance", 0.0)
                        leg2_meters = segments[1].get("distance", 0.0)
                        leg1_mi = round(leg1_meters * METERS_TO_MILES, 2)
                        leg2_mi = round(leg2_meters * METERS_TO_MILES, 2)
                    else:
                        total_meters = feat.get("properties", {}).get("summary", {}).get("distance", 0.0)
                        leg1_mi = round(haversine_distance_miles(origin["lat"], origin["lng"], pickup["lat"], pickup["lng"]) * 1.2, 2)
                        leg2_mi = round(total_meters * METERS_TO_MILES - leg1_mi, 2)

                    total_mi = round(leg1_mi + leg2_mi, 2)
                    result = {
                        "geometry": simplify_geometry(route_lat_lng, max_points=600),
                        "total_distance_miles": total_mi,
                        "pickup_distance_miles": leg1_mi,
                        "legs": [
                            {
                                "from": origin.get("label", "Current Location"),
                                "to": pickup.get("label", "Pickup Location"),
                                "miles": leg1_mi,
                                "hours": round(leg1_mi / avg_speed_mph, 2),
                            },
                            {
                                "from": pickup.get("label", "Pickup Location"),
                                "to": dropoff.get("label", "Dropoff Location"),
                                "miles": leg2_mi,
                                "hours": round(leg2_mi / avg_speed_mph, 2),
                            },
                        ],
                    }
                    cache.set(cache_key, result, timeout=86400)
                    return result
        except Exception as exc:
            logger.warning(f"ORS routing failed: {exc}. Attempting OSRM fallback.")

    # 2. Resilient Fallback: OSRM Public Server
    try:
        coord_str = f"{origin['lng']},{origin['lat']};{pickup['lng']},{pickup['lat']};{dropoff['lng']},{dropoff['lat']}"
        url = f"https://router.project-osrm.org/route/v1/driving/{coord_str}?overview=full&geometries=geojson"
        headers = {"User-Agent": USER_AGENT}
        resp = requests.get(url, headers=headers, timeout=TIMEOUT)
        if resp.status_code == 200:
            data = resp.json()
            routes = data.get("routes", [])
            if routes:
                route = routes[0]
                geom = route.get("geometry", {}).get("coordinates", [])
                legs = route.get("legs", [])

                route_lat_lng = [[pt[1], pt[0]] for pt in geom]
                if len(legs) >= 2:
                    leg1_mi = round(legs[0].get("distance", 0.0) * METERS_TO_MILES, 2)
                    leg2_mi = round(legs[1].get("distance", 0.0) * METERS_TO_MILES, 2)
                else:
                    total_m = route.get("distance", 0.0)
                    leg1_mi = round(haversine_distance_miles(origin["lat"], origin["lng"], pickup["lat"], pickup["lng"]) * 1.2, 2)
                    leg2_mi = round(total_m * METERS_TO_MILES - leg1_mi, 2)

                total_mi = round(leg1_mi + leg2_mi, 2)
                result = {
                    "geometry": simplify_geometry(route_lat_lng, max_points=600),
                    "total_distance_miles": total_mi,
                    "pickup_distance_miles": leg1_mi,
                    "legs": [
                        {
                            "from": origin.get("label", "Current Location"),
                            "to": pickup.get("label", "Pickup Location"),
                            "miles": leg1_mi,
                            "hours": round(leg1_mi / avg_speed_mph, 2),
                        },
                        {
                            "from": pickup.get("label", "Pickup Location"),
                            "to": dropoff.get("label", "Dropoff Location"),
                            "miles": leg2_mi,
                            "hours": round(leg2_mi / avg_speed_mph, 2),
                        },
                    ],
                }
                cache.set(cache_key, result, timeout=86400)
                return result
    except Exception as exc:
        logger.error(f"OSRM routing failed: {exc}")

    raise RoutingProviderError(
        "Both OpenRouteService and OSRM routing providers were unreachable. "
        "Please check your network connection or try again later."
    )
