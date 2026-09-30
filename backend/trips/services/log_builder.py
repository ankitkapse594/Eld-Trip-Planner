"""
Daily Log Builder and FMCSR Log Sheet Engine.
Transforms continuous HOS trip segments into calendar-day Daily Log Sheets matching
the paper format in blank-paper-log.png.
Includes Largest-Remainder 24.00h balancing, recap block calculations, and
mile-marker reverse-geocoding.
"""

from datetime import datetime, date, time, timedelta
from typing import List, Dict, Any, Tuple
from .hos_planner import (
    Segment,
    STATUS_OFF,
    STATUS_SB,
    STATUS_DRIVING,
    STATUS_ON_DUTY,
)
from .geo_utils import interpolate_coord_at_mile
from .geocoding import batch_reverse_geocode


def largest_remainder_hours(minutes_by_status: Dict[str, int]) -> Dict[str, float]:
    """
    Applies the Largest Remainder (Hare-Niemeyer) method to guarantee that
    the 4 status totals rounded to 2 decimal places sum to EXACTLY 24.00 hours.
    """
    # Target is 24.00 hours = 2400 hundredths of an hour
    # 1440 minutes = 24.00 hours
    statuses = [STATUS_OFF, STATUS_SB, STATUS_DRIVING, STATUS_ON_DUTY]
    
    # Check total minutes
    tot_min = sum(minutes_by_status.get(s, 0) for s in statuses)
    if tot_min == 0:
        return {STATUS_OFF: 24.00, STATUS_SB: 0.00, STATUS_DRIVING: 0.00, STATUS_ON_DUTY: 0.00}

    # hundredths of hour = (minutes * 100) / 60 = minutes * 5 / 3
    exact_hundredths = {s: (minutes_by_status.get(s, 0) * 100.0) / 60.0 for s in statuses}
    floored_hundredths = {s: int(exact_hundredths[s]) for s in statuses}
    remainders = {s: exact_hundredths[s] - floored_hundredths[s] for s in statuses}

    sum_floored = sum(floored_hundredths.values())
    deficit = 2400 - sum_floored

    # Distribute the deficit to the statuses with highest remainders
    sorted_by_remainder = sorted(statuses, key=lambda s: remainders[s], reverse=True)

    result_hundredths = dict(floored_hundredths)
    for i in range(deficit):
        st = sorted_by_remainder[i % len(sorted_by_remainder)]
        result_hundredths[st] += 1

    return {
        "off": round(result_hundredths[STATUS_OFF] / 100.0, 2),
        "sb": round(result_hundredths[STATUS_SB] / 100.0, 2),
        "driving": round(result_hundredths[STATUS_DRIVING] / 100.0, 2),
        "on_duty": round(result_hundredths[STATUS_ON_DUTY] / 100.0, 2),
    }


def split_segments_by_day(segments: List[Segment]) -> Dict[date, List[Segment]]:
    """
    Splits segments that cross midnight into separate single-day sub-segments.
    Returns a dictionary mapping date -> list of segments for that calendar day.
    """
    if not segments:
        return {}

    days_map: Dict[date, List[Segment]] = {}

    for seg in segments:
        cur_start = seg.start
        end_dt = seg.end
        total_duration_sec = (end_dt - cur_start).total_seconds()
        total_miles = seg.end_mi - seg.start_mi

        while cur_start < end_dt:
            cur_date = cur_start.date()
            next_midnight = datetime.combine(cur_date + timedelta(days=1), time(0, 0, 0))
            cur_end = min(end_dt, next_midnight)

            sub_sec = (cur_end - cur_start).total_seconds()
            fraction = (sub_sec / total_duration_sec) if total_duration_sec > 0 else 0.0

            sub_start_mi = seg.start_mi + ((cur_start - seg.start).total_seconds() / total_duration_sec * total_miles if total_duration_sec > 0 else 0.0)
            sub_end_mi = sub_start_mi + (fraction * total_miles)

            sub_seg = Segment(
                status=seg.status,
                start=cur_start,
                end=cur_end,
                start_mi=round(sub_start_mi, 3),
                end_mi=round(sub_end_mi, 3),
                location_index=seg.location_index,
                reason=seg.reason,
            )

            days_map.setdefault(cur_date, []).append(sub_seg)
            cur_start = cur_end

    return days_map


def build_daily_logs(
    segments: List[Segment],
    route_geometry: List[List[float]],
    route_cumulative_miles: List[float],
    cycle_used_at_start: float,
    header_info: Dict[str, Any],
) -> List[Dict[str, Any]]:
    """
    Builds the complete daily log sheets for the trip.
    Pads start and end of trip with OFF duty to ensure every day spans 00:00 to 24:00.
    Calculates exact Largest-Remainder hours, recap block values, and geocoded remarks.
    """
    if not segments:
        return []

    trip_start_date = segments[0].start.date()
    trip_end_date = segments[-1].end.date()

    # Split segments by calendar day
    days_map = split_segments_by_day(segments)

    # Determine all calendar dates from start to end
    all_dates: List[date] = []
    curr = trip_start_date
    while curr <= trip_end_date:
        all_dates.append(curr)
        curr += timedelta(days=1)

    daily_logs: List[Dict[str, Any]] = []

    # Track on-duty history for recap calculations
    # day_on_duty_history: list of float hours
    on_duty_days: List[float] = []
    prior_cycle_carried = cycle_used_at_start
    restart_occurred = False

    # Collect points needing reverse-geocoding for remarks
    # (lat, lng) list
    points_to_geocode: List[Tuple[float, float]] = []
    day_status_changes: List[List[Dict[str, Any]]] = []

    for d in all_dates:
        day_segs = days_map.get(d, [])
        midnight_start = datetime.combine(d, time(0, 0, 0))
        midnight_end = datetime.combine(d + timedelta(days=1), time(0, 0, 0))

        # Pad 00:00 to first segment with OFF if needed
        full_day_segs: List[Segment] = []
        if not day_segs:
            # Entire day is off-duty
            full_day_segs.append(
                Segment(
                    status=STATUS_OFF,
                    start=midnight_start,
                    end=midnight_end,
                    start_mi=segments[0].start_mi if d < trip_start_date else segments[-1].end_mi,
                    end_mi=segments[0].start_mi if d < trip_start_date else segments[-1].end_mi,
                    reason="Off Duty",
                )
            )
        else:
            if day_segs[0].start > midnight_start:
                full_day_segs.append(
                    Segment(
                        status=STATUS_OFF,
                        start=midnight_start,
                        end=day_segs[0].start,
                        start_mi=day_segs[0].start_mi,
                        end_mi=day_segs[0].start_mi,
                        reason="Off Duty",
                    )
                )
            full_day_segs.extend(day_segs)
            if full_day_segs[-1].end < midnight_end:
                full_day_segs.append(
                    Segment(
                        status=STATUS_OFF,
                        start=full_day_segs[-1].end,
                        end=midnight_end,
                        start_mi=full_day_segs[-1].end_mi,
                        end_mi=full_day_segs[-1].end_mi,
                        reason="Off Duty",
                    )
                )

        # Detect 34h restart
        for s in full_day_segs:
            if "34-hour restart" in s.reason.lower() or (s.status in (STATUS_OFF, STATUS_SB) and s.duration_minutes >= 2040):
                restart_occurred = True

        # Compute status durations in minutes
        minutes_by_status = {STATUS_OFF: 0, STATUS_SB: 0, STATUS_DRIVING: 0, STATUS_ON_DUTY: 0}
        day_driving_miles = 0.0

        changes_today: List[Dict[str, Any]] = []

        for seg_idx, s in enumerate(full_day_segs):
            dur_m = s.duration_minutes
            minutes_by_status[s.status] = minutes_by_status.get(s.status, 0) + dur_m
            if s.status == STATUS_DRIVING:
                day_driving_miles += s.miles

            # Record duty change remark at start of segment (except trivial 00:00 off-duty if continuing)
            time_str = s.start.strftime("%H:%M")
            lat, lng = interpolate_coord_at_mile(route_geometry, route_cumulative_miles, s.start_mi)
            points_to_geocode.append((lat, lng))

            changes_today.append({
                "time": time_str,
                "lat": lat,
                "lng": lng,
                "status": s.status,
                "reason": s.reason or s.status,
                "mile": round(s.start_mi, 1),
            })

        day_status_changes.append(changes_today)

        # 24.00h balanced hours
        balanced_hours = largest_remainder_hours(minutes_by_status)

        # On-duty today = Driving + On-Duty (rows 3 & 4)
        on_duty_today = round(balanced_hours["driving"] + balanced_hours["on_duty"], 2)
        on_duty_days.append(on_duty_today)

        # Recap calculations:
        # If a 34h restart occurred, prior cycle hours are zeroed
        if restart_occurred:
            prior_cycle_carried = 0.0

        # Line A: Total on duty last 7 days + today (up to 8 days total)
        recent_days = on_duty_days[-8:]
        line_a = round(sum(recent_days) + prior_cycle_carried, 2)
        line_b = max(0.0, round(70.0 - line_a, 2))

        # Line C: Total hours on duty last 5 days including today
        last_5 = on_duty_days[-5:]
        line_c = round(sum(last_5), 2)

        daily_logs.append({
            "date": d.isoformat(),
            "total_miles": round(day_driving_miles, 1),
            "total_mileage": round(day_driving_miles, 1),
            "hours": balanced_hours,
            "segments": [s.to_dict() for s in full_day_segs],
            "recap": {
                "on_duty_today": on_duty_today,
                "line_a": line_a,
                "line_b": line_b,
                "line_c": line_c,
            },
            "header": {
                **header_info,
                "date": d.strftime("%m/%d/%Y"),
                "date_iso": d.isoformat(),
            },
        })

    # Batch reverse-geocode all collected remark coordinates
    geocoded_labels = batch_reverse_geocode(points_to_geocode)

    label_idx = 0
    for day_idx, log in enumerate(daily_logs):
        remarks = []
        changes = day_status_changes[day_idx]
        for ch in changes:
            loc_label = geocoded_labels[label_idx] if label_idx < len(geocoded_labels) else f"{ch['lat']:.3f}, {ch['lng']:.3f}"
            label_idx += 1

            note = ch["reason"]
            if ch["status"] == STATUS_DRIVING:
                note = "Driving"
            elif ch["status"] == STATUS_ON_DUTY and "fuel" in note.lower():
                note = "Fuel"
            elif ch["status"] == STATUS_ON_DUTY and "pickup" in note.lower():
                note = "Loading / Pickup"
            elif ch["status"] == STATUS_ON_DUTY and "dropoff" in note.lower():
                note = "Unloading / Dropoff"
            elif ch["status"] == STATUS_SB:
                note = "Sleeper Berth Rest"
            elif ch["status"] == STATUS_OFF and "restart" in note.lower():
                note = "34-hr Restart"
            elif ch["status"] == STATUS_OFF and "break" in note.lower():
                note = "30-min Break"

            remarks.append({
                "time": ch["time"],
                "location": loc_label,
                "note": note,
                "status": ch["status"],
            })
        log["remarks"] = remarks

    return daily_logs
