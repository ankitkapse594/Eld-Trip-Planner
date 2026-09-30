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
from typing import List, Optional, Dict, Any


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
    Merges adjacent segments that share the same duty status and reason.
    """
    if not segments:
        return []

    merged: List[Segment] = []
    current = segments[0]

    for next_seg in segments[1:]:
        if next_seg.status == current.status and next_seg.reason == current.reason and current.end == next_seg.start:
            # Merge
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
    total_distance_mi: float,
    pickup_dist_mi: float,
    cycle_used_hr: float,
    start_dt: datetime,
    speed_mph: float = 55.0,
) -> List[Segment]:
    """
    Plans an HOS-compliant CMV trip schedule from start to dropoff.

    Args:
        total_distance_mi: Total driving distance (Current -> Pickup -> Dropoff) in miles.
        pickup_dist_mi: Distance from start to pickup location in miles.
        cycle_used_hr: Accumulated on-duty hours in the prior 8-day cycle (0.0 to 70.0).
        start_dt: Departure datetime in home-terminal time.
        speed_mph: Average driving speed in miles per hour (default: 55.0).

    Returns:
        List of Segment objects representing the complete continuous trip.
    """
    if speed_mph <= 0:
        raise ValueError("speed_mph must be positive.")
    if pickup_dist_mi < 0 or total_distance_mi < pickup_dist_mi:
        raise ValueError("pickup_dist_mi must be >= 0 and <= total_distance_mi.")

    # State variables
    t: datetime = start_dt
    pos_mi: float = 0.0
    drive_in_shift_min: int = 0
    window_start: Optional[datetime] = None
    drive_since_break_min: int = 0
    cycle_used_min: int = int(round(cycle_used_hr * 60))
    miles_since_fuel: float = 0.0

    raw_segments: List[Segment] = []
    pickup_done = (pickup_dist_mi == 0.0)

    # 1. § 395.3(c): If cycle_used_at_start >= 70 hours (4200 min), mandatory 34-hour restart before starting
    if cycle_used_min >= 4200:
        restart_end = t + timedelta(hours=34)
        raw_segments.append(
            Segment(
                status=STATUS_OFF,
                start=t,
                end=restart_end,
                start_mi=pos_mi,
                end_mi=pos_mi,
                reason="34-hour restart",
            )
        )
        t = restart_end
        cycle_used_min = 0
        drive_in_shift_min = 0
        window_start = None
        drive_since_break_min = 0

    max_iterations = 2000  # Guard against infinite loops
    iteration = 0

    while iteration < max_iterations:
        iteration += 1

        # Check milestones: Pickup and Dropoff
        if abs(pos_mi - pickup_dist_mi) < 1e-4 and not pickup_done:
            # 1 hour On Duty for Pickup
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
                    reason="Pickup",
                )
            )
            t = end_t
            cycle_used_min += dur_min
            # Any non-driving segment >= 30 min resets drive_since_break
            drive_since_break_min = 0
            pickup_done = True
            continue

        if abs(pos_mi - total_distance_mi) < 1e-4 and pickup_done:
            # 1 hour On Duty for Dropoff
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
                    reason="Dropoff",
                )
            )
            t = end_t
            cycle_used_min += dur_min
            drive_since_break_min = 0
            # Trip is complete
            break

        # Next milestone
        next_milestone_mi = pickup_dist_mi if not pickup_done else total_distance_mi

        # Compute constraints in minutes
        # § 395.3(a)(3)(i): 11h driving in shift
        shift_drive_left_min = max(0, (11 * 60) - drive_in_shift_min)

        # § 395.3(a)(2): 14h window from first on-duty
        if window_start is not None:
            elapsed_window_min = int(round((t - window_start).total_seconds() / 60.0))
            window_left_min = max(0, (14 * 60) - elapsed_window_min)
        else:
            window_left_min = 14 * 60

        # § 395.3(a)(3)(ii): 30-min break after 8h cumulative driving
        break_left_min = max(0, (8 * 60) - drive_since_break_min)

        # § 395.3(b)(2): 70h cycle
        cycle_left_min = max(0, (70 * 60) - cycle_used_min)

        # Fuel: Stop every 1000 miles
        fuel_miles_left = max(0.0, 1000.0 - miles_since_fuel)
        fuel_left_min = int(round((fuel_miles_left / speed_mph) * 60.0))

        # Milestone distance
        milestone_miles_left = max(0.0, next_milestone_mi - pos_mi)
        milestone_left_min = int(round((milestone_miles_left / speed_mph) * 60.0))

        # Can we drive?
        drive_for_min = min(
            shift_drive_left_min,
            window_left_min,
            break_left_min,
            cycle_left_min,
            fuel_left_min,
            milestone_left_min,
        )

        if drive_for_min > 0:
            # We drive for drive_for_min minutes
            drive_hours = drive_for_min / 60.0
            
            # If reaching milestone, snap exact distance to prevent float drift
            if drive_for_min == milestone_left_min:
                delta_miles = milestone_miles_left
                new_pos_mi = next_milestone_mi
            else:
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
                    reason=driving_reason,
                )
            )

            # Advance state
            if window_start is None:
                window_start = t
            t = end_t
            pos_mi = new_pos_mi
            drive_in_shift_min += drive_for_min
            drive_since_break_min += drive_for_min
            cycle_used_min += drive_for_min
            miles_since_fuel += delta_miles

        else:
            # drive_for_min == 0: Resolve binding constraint in priority order
            if milestone_miles_left < 1e-4:
                # Milestone reached, next iteration will handle pickup or dropoff
                continue

            elif cycle_left_min <= 0:
                # § 395.3(c): 34-hour restart resets 70-hour clock
                dur_min = 34 * 60
                end_t = t + timedelta(minutes=dur_min)
                raw_segments.append(
                    Segment(
                        status=STATUS_OFF,
                        start=t,
                        end=end_t,
                        start_mi=pos_mi,
                        end_mi=pos_mi,
                        reason="34-hour restart",
                    )
                )
                t = end_t
                cycle_used_min = 0
                drive_in_shift_min = 0
                window_start = None
                drive_since_break_min = 0

            elif shift_drive_left_min <= 0 or window_left_min <= 0:
                # § 395.1(g) / § 395.3(a)(1): 10-hour rest in sleeper berth
                dur_min = 10 * 60
                end_t = t + timedelta(minutes=dur_min)
                raw_segments.append(
                    Segment(
                        status=STATUS_SB,
                        start=t,
                        end=end_t,
                        start_mi=pos_mi,
                        end_mi=pos_mi,
                        reason="10-hour rest",
                    )
                )
                t = end_t
                drive_in_shift_min = 0
                window_start = None
                drive_since_break_min = 0

            elif break_left_min <= 0:
                # § 395.3(a)(3)(ii): 30-min break
                dur_min = 30
                end_t = t + timedelta(minutes=dur_min)
                raw_segments.append(
                    Segment(
                        status=STATUS_OFF,
                        start=t,
                        end=end_t,
                        start_mi=pos_mi,
                        end_mi=pos_mi,
                        reason="30-min break",
                    )
                )
                t = end_t
                drive_since_break_min = 0
                # Off duty break does NOT pause or reset the 14-hour window!

            elif fuel_left_min <= 0:
                # Fuel stop: 30 min On Duty
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
                        reason="Fuel",
                    )
                )
                t = end_t
                cycle_used_min += dur_min
                miles_since_fuel = 0.0
                # >= 30 min on-duty also satisfies the 30-min break requirement (§ 395.3(a)(3)(ii))
                drive_since_break_min = 0

            else:
                # Safety fallback to prevent unexpected deadlock
                dur_min = 10 * 60
                end_t = t + timedelta(minutes=dur_min)
                raw_segments.append(
                    Segment(
                        status=STATUS_SB,
                        start=t,
                        end=end_t,
                        start_mi=pos_mi,
                        end_mi=pos_mi,
                        reason="10-hour rest",
                    )
                )
                t = end_t
                drive_in_shift_min = 0
                window_start = None
                drive_since_break_min = 0

    return merge_adjacent_segments(raw_segments)
