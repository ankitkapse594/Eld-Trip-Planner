"""
FMCSA Hours of Service (HOS) Trip Planner Engine.
Strictly implements 49 CFR Part 395 property-carrying regulations:
- § 395.3(a)(1): 10 consecutive hours off-duty / sleeper berth before driving.
- § 395.3(a)(2): 14-consecutive-hour driving window from start of duty.
- § 395.3(a)(3)(i): 11-hour maximum driving limit within the 14-hour window.
- § 395.3(a)(3)(ii): Mandatory 30-minute rest break after 8 cumulative hours of driving.
- § 395.3(b)(2): 70-hour / 8-day rolling duty cycle limit.
- § 395.3(c): 34-consecutive-hour off-duty restart.
- Fueling rule: Stop at least once every 1,000 miles (30 min On Duty).
- Terminal service: 1 hour On Duty at pickup and 1 hour On Duty at dropoff.
"""

from dataclasses import dataclass
from datetime import datetime, timedelta
import bisect
from typing import List, Optional, Dict, Any, Union
from .geo_utils import compute_cumulative_distances


STATUS_OFF = "OFF"
STATUS_SB = "SB"
STATUS_DRIVING = "DRIVING"
STATUS_ON_DUTY = "ON_DUTY"

ALL_STATUSES = {STATUS_OFF, STATUS_SB, STATUS_DRIVING, STATUS_ON_DUTY}


@dataclass
class Segment:
    """A continuous timeline interval with a single HOS duty status."""
    status: str
    start: datetime
    end: datetime
    start_mi: float
    end_mi: float
    location_index: Optional[int] = None
    reason: str = ""

    @property
    def duration_minutes(self) -> int:
        return int(round((self.end - self.start).total_seconds() / 60.0))

    @property
    def duration_hours(self) -> float:
        return (self.end - self.start).total_seconds() / 3600.0

    @property
    def miles(self) -> float:
        return max(0.0, round(self.end_mi - self.start_mi, 2))

    def to_dict(self) -> Dict[str, Any]:
        return {
            "status": self.status,
            "start": self.start.isoformat(),
            "end": self.end.isoformat(),
            "duration_minutes": self.duration_minutes,
            "start_mi": round(self.start_mi, 2),
            "end_mi": round(self.end_mi, 2),
            "miles": self.miles,
            "location_index": self.location_index,
            "reason": self.reason,
        }


def merge_adjacent_segments(segments: List[Segment]) -> List[Segment]:
    """
    Merges adjacent segments that share the same duty status and reason (§ 395.8).
    """
    if not segments:
        return []

    merged: List[Segment] = []
    current = segments[0]

    for next_seg in segments[1:]:
        if next_seg.status == current.status and next_seg.reason == current.reason and current.end == next_seg.start:
            current = Segment(
                status=current.status,
                start=current.start,
                end=next_seg.end,
                start_mi=current.start_mi,
                end_mi=next_seg.end_mi,
                location_index=current.location_index if current.location_index is not None else next_seg.location_index,
                reason=current.reason,
            )
        else:
            merged.append(current)
            current = next_seg

    merged.append(current)
    return merged


def plan_trip(
    route: Any = None,
    pickup_dist_mi: float = 0.0,
    cycle_used_hr: float = 0.0,
    start_dt: Optional[datetime] = None,
    settings: Optional[Any] = None,
    total_distance_mi: Optional[float] = None,
    speed_mph: Optional[float] = None,
    **kwargs,
) -> List[Segment]:
    """
    Plans an HOS-compliant CMV property-carrying trip schedule.
    Pure function, zero I/O.
    """
    # 1. Resolve Route Distance and Cumulative Mileage
    cumulative_miles: List[float] = []

    if total_distance_mi is not None:
        total_dist_val = float(total_distance_mi)
    elif "total_distance_mi" in kwargs:
        total_dist_val = float(kwargs["total_distance_mi"])
    elif isinstance(route, (int, float)):
        total_dist_val = float(route)
    elif isinstance(route, dict):
        total_dist_val = float(route.get("total_distance_miles", route.get("total_miles", 0.0)))
        cumulative_miles = route.get("cumulative_miles", [])
    elif isinstance(route, list):
        if route and isinstance(route[0], (int, float)):
            total_dist_val = float(route[-1])
            cumulative_miles = [float(x) for x in route]
        elif route and isinstance(route[0], (list, tuple)):
            cumulative_miles, total_dist_val = compute_cumulative_distances(route)
        else:
            total_dist_val = 0.0
    elif isinstance(route, tuple) and len(route) == 2:
        _, cumulative_miles = route
        total_dist_val = cumulative_miles[-1] if cumulative_miles else 0.0
    else:
        total_dist_val = 0.0

    total_distance_mi = total_dist_val

    # 2. Resolve Average Speed
    if speed_mph is not None:
        resolved_speed = float(speed_mph)
    elif "speed_mph" in kwargs:
        resolved_speed = float(kwargs["speed_mph"])
    elif isinstance(settings, dict):
        resolved_speed = float(settings.get("speed_mph", settings.get("avg_speed_mph", 55.0)))
    elif isinstance(settings, (int, float)):
        resolved_speed = float(settings)
    else:
        resolved_speed = 55.0

    speed_mph = resolved_speed

    if speed_mph <= 0:
        raise ValueError("speed_mph must be positive.")
    if pickup_dist_mi < 0 or total_distance_mi < pickup_dist_mi:
        raise ValueError("pickup_dist_mi must be >= 0 and <= total_distance_mi.")

    # 3. Resolve Departure Time (Home terminal naive local time)
    if start_dt is None:
        start_dt = datetime.now().replace(minute=0, second=0, microsecond=0)

    # State variables (in minutes internally for exact precision)
    t: datetime = start_dt
    pos_mi: float = 0.0
    drive_in_shift_min: int = 0
    window_start: Optional[datetime] = None
    drive_since_break_min: int = 0
    cycle_used_min: int = int(round(cycle_used_hr * 60))
    miles_since_fuel: float = 0.0

    raw_segments: List[Segment] = []
    pickup_done = (pickup_dist_mi == 0.0)

    def find_loc_idx(mile: float) -> Optional[int]:
        if not cumulative_miles:
            return None
        idx = bisect.bisect_left(cumulative_miles, mile)
        return min(idx, len(cumulative_miles) - 1)

    # Rule 5: If cycle_used_at_start >= 70 hours (4200 min), begin with 34h restart (§ 395.3(c))
    if cycle_used_min >= 4200:
        restart_end = t + timedelta(hours=34)
        raw_segments.append(
            Segment(
                status=STATUS_OFF,
                start=t,
                end=restart_end,
                start_mi=pos_mi,
                end_mi=pos_mi,
                location_index=find_loc_idx(pos_mi),
                reason="34-hour restart",
            )
        )
        t = restart_end
        cycle_used_min = 0
        drive_in_shift_min = 0
        window_start = None
        drive_since_break_min = 0

    max_steps = 2500
    step_count = 0

    while step_count < max_steps:
        step_count += 1

        # Step 1: Milestone Checks
        if abs(pos_mi - pickup_dist_mi) < 1e-4 and not pickup_done:
            # ON_DUTY 1h reason "Pickup"
            dur_min = 60
            end_t = t + timedelta(minutes=dur_min)
            if window_start is None:
                window_start = t
            raw_segments.append(
                Segment(
                    status=STATUS_ON_DUTY,
                    start=t,
                    end=end_t,
                    start_mi=pos_mi,
                    end_mi=pos_mi,
                    location_index=find_loc_idx(pos_mi),
                    reason="Pickup",
                )
            )
            t = end_t
            cycle_used_min += dur_min
            # Any non-driving segment >= 30 minutes resets drive_since_break
            drive_since_break_min = 0
            pickup_done = True
            continue

        if abs(pos_mi - total_distance_mi) < 1e-4 and pickup_done:
            # ON_DUTY 1h reason "Dropoff" then finish
            dur_min = 60
            end_t = t + timedelta(minutes=dur_min)
            if window_start is None:
                window_start = t
            raw_segments.append(
                Segment(
                    status=STATUS_ON_DUTY,
                    start=t,
                    end=end_t,
                    start_mi=pos_mi,
                    end_mi=pos_mi,
                    location_index=find_loc_idx(pos_mi),
                    reason="Dropoff",
                )
            )
            t = end_t
            cycle_used_min += dur_min
            drive_since_break_min = 0
            break

        # Next milestone
        next_milestone_mi = pickup_dist_mi if not pickup_done else total_distance_mi

        # Step 2: Compute time-until-limit for each constraint (in minutes)
        # a. shift_drive_left = 11 - drive_in_shift (§ 395.3(a)(3)(i))
        shift_drive_left_min = max(0, (11 * 60) - drive_in_shift_min)

        # b. window_left = 14 - hours_since(window_start) (§ 395.3(a)(2))
        if window_start is not None:
            elapsed_window_min = int(round((t - window_start).total_seconds() / 60.0))
            window_left_min = max(0, (14 * 60) - elapsed_window_min)
        else:
            window_left_min = 14 * 60

        # c. break_left = 8 - drive_since_break (§ 395.3(a)(3)(ii))
        break_left_min = max(0, (8 * 60) - drive_since_break_min)

        # d. cycle_left = 70 - cycle_used (§ 395.3(b)(2))
        cycle_left_min = max(0, (70 * 60) - cycle_used_min)

        # e. fuel_left = (1000 - miles_since_fuel) / speed
        fuel_miles_left = max(0.0, 1000.0 - miles_since_fuel)
        fuel_left_min = int(round((fuel_miles_left / speed_mph) * 60.0))

        # f. milestone_left = (next_milestone_mi - pos_mi) / speed
        milestone_miles_left = max(0.0, next_milestone_mi - pos_mi)
        milestone_left_min = int(round((milestone_miles_left / speed_mph) * 60.0))

        # drive_for = min(all)
        drive_for_min = min(
            shift_drive_left_min,
            window_left_min,
            break_left_min,
            cycle_left_min,
            fuel_left_min,
            milestone_left_min,
        )

        if drive_for_min > 0:
            # Append DRIVING segment, advance state
            if drive_for_min == milestone_left_min:
                delta_miles = milestone_miles_left
                new_pos_mi = next_milestone_mi
            else:
                drive_hours = drive_for_min / 60.0
                delta_miles = round(drive_hours * speed_mph, 3)
                new_pos_mi = pos_mi + delta_miles

            end_t = t + timedelta(minutes=drive_for_min)
            driving_reason = "Driving to Pickup" if not pickup_done else "Driving to Dropoff"

            raw_segments.append(
                Segment(
                    status=STATUS_DRIVING,
                    start=t,
                    end=end_t,
                    start_mi=pos_mi,
                    end_mi=new_pos_mi,
                    location_index=find_loc_idx(pos_mi),
                    reason=driving_reason,
                )
            )

            if window_start is None:
                window_start = t
            t = end_t
            pos_mi = new_pos_mi
            drive_in_shift_min += drive_for_min
            drive_since_break_min += drive_for_min
            cycle_used_min += drive_for_min
            miles_since_fuel += delta_miles

        else:
            # Step 3: If drive_for == 0, resolve the binding constraint (priority order)
            if milestone_miles_left < 1e-4:
                # Milestone reached -> step 1 on next loop
                continue

            elif cycle_left_min <= 0:
                # cycle_left <= 0 -> OFF 34h "34-hour restart"
                # reset cycle_used=0, drive_in_shift=0, window_start=None, drive_since_break=0
                dur_min = 34 * 60
                end_t = t + timedelta(minutes=dur_min)
                raw_segments.append(
                    Segment(
                        status=STATUS_OFF,
                        start=t,
                        end=end_t,
                        start_mi=pos_mi,
                        end_mi=pos_mi,
                        location_index=find_loc_idx(pos_mi),
                        reason="34-hour restart",
                    )
                )
                t = end_t
                cycle_used_min = 0
                drive_in_shift_min = 0
                window_start = None
                drive_since_break_min = 0

            elif shift_drive_left_min <= 0 or window_left_min <= 0:
                # shift_drive_left <= 0 or window_left <= 0 -> SB 10h "10-hour rest"
                # reset drive_in_shift=0, window_start=None, drive_since_break=0 (cycle_used unchanged)
                dur_min = 10 * 60
                end_t = t + timedelta(minutes=dur_min)
                raw_segments.append(
                    Segment(
                        status=STATUS_SB,
                        start=t,
                        end=end_t,
                        start_mi=pos_mi,
                        end_mi=pos_mi,
                        location_index=find_loc_idx(pos_mi),
                        reason="10-hour rest",
                    )
                )
                t = end_t
                drive_in_shift_min = 0
                window_start = None
                drive_since_break_min = 0

            elif break_left_min <= 0:
                # break_left <= 0 -> OFF 0.5h "30-min break"
                # drive_since_break=0 (window_start unchanged!)
                dur_min = 30
                end_t = t + timedelta(minutes=dur_min)
                raw_segments.append(
                    Segment(
                        status=STATUS_OFF,
                        start=t,
                        end=end_t,
                        start_mi=pos_mi,
                        end_mi=pos_mi,
                        location_index=find_loc_idx(pos_mi),
                        reason="30-min break",
                    )
                )
                t = end_t
                drive_since_break_min = 0

            elif fuel_left_min <= 0:
                # fuel_left <= 0 -> ON_DUTY 0.5h "Fuel"
                # miles_since_fuel=0 (also resets break because >= 30 min non-driving)
                dur_min = 30
                end_t = t + timedelta(minutes=dur_min)
                if window_start is None:
                    window_start = t
                raw_segments.append(
                    Segment(
                        status=STATUS_ON_DUTY,
                        start=t,
                        end=end_t,
                        start_mi=pos_mi,
                        end_mi=pos_mi,
                        location_index=find_loc_idx(pos_mi),
                        reason="Fuel",
                    )
                )
                t = end_t
                cycle_used_min += dur_min
                miles_since_fuel = 0.0
                drive_since_break_min = 0

            else:
                # Default safety fallback
                dur_min = 10 * 60
                end_t = t + timedelta(minutes=dur_min)
                raw_segments.append(
                    Segment(
                        status=STATUS_SB,
                        start=t,
                        end=end_t,
                        start_mi=pos_mi,
                        end_mi=pos_mi,
                        location_index=find_loc_idx(pos_mi),
                        reason="10-hour rest",
                    )
                )
                t = end_t
                drive_in_shift_min = 0
                window_start = None
                drive_since_break_min = 0

    return merge_adjacent_segments(raw_segments)
