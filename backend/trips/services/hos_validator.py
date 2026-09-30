"""
Independent HOS Rule Validation Oracle.
Re-checks all 7 FMCSR Part 395 compliance rules on the planned segments:
1. 11-Hour Driving Limit (§ 395.3(a)(3)(i))
2. 14-Hour Driving Window (§ 395.3(a)(2))
3. 30-Minute Rest Break after 8h cumulative driving (§ 395.3(a)(3)(ii))
4. 70-Hour / 8-Day Cycle Limit with 34-hr Restarts (§ 395.3(b)(2) & (c))
5. Fueling Requirement (<= 1,000 miles between fuel stops)
6. Terminal operations (1h On Duty at Pickup, 1h On Duty at Dropoff)
7. Segment continuity (strictly non-overlapping, zero gaps)
"""

from typing import List
from datetime import datetime, timedelta
from .hos_planner import Segment, STATUS_DRIVING, STATUS_ON_DUTY, STATUS_OFF, STATUS_SB


def validate_hos(segments: List[Segment], cycle_used_at_start: float = 0.0) -> List[str]:
    """
    Validates a list of Segments against FMCSR Part 395 property-carrying regulations.

    Returns:
        A list of human-readable violation descriptions. Returns [] if 100% compliant.
    """
    violations: List[str] = []

    if not segments:
        return ["No segments provided in plan."]

    # 1. Check continuity and non-overlapping timeline
    for i in range(len(segments)):
        seg = segments[i]
        if seg.end <= seg.start:
            violations.append(
                f"Invalid segment duration at index {i}: start {seg.start} >= end {seg.end}."
            )
        if i > 0:
            prev_seg = segments[i - 1]
            if seg.start != prev_seg.end:
                violations.append(
                    f"Timeline gap or overlap between segment {i-1} (ends {prev_seg.end}) and {i} (starts {seg.start})."
                )

    # 2. Check Pickup and Dropoff terminal requirements
    pickup_found = False
    dropoff_found = False
    for seg in segments:
        if seg.status == STATUS_ON_DUTY and "pickup" in seg.reason.lower():
            if seg.duration_minutes >= 59:  # tolerance for minute rounding
                pickup_found = True
        if seg.status == STATUS_ON_DUTY and "dropoff" in seg.reason.lower():
            if seg.duration_minutes >= 59:
                dropoff_found = True

    if not pickup_found:
        violations.append("Missing mandatory 1-hour On Duty Pickup service.")
    if not dropoff_found:
        violations.append("Missing mandatory 1-hour On Duty Dropoff service.")

    # 3. Simulate shift-level rules: 11h driving, 14h window, 30m break, 70h cycle, fuel gap
    shift_driving_min = 0
    cumulative_driving_since_break_min = 0
    window_start: datetime | None = None
    cycle_used_min = int(round(cycle_used_at_start * 60))
    miles_since_fuel = 0.0

    for i, seg in enumerate(segments):
        dur_min = seg.duration_minutes

        # Check for 34-hour restart (§ 395.3(c))
        if seg.status in (STATUS_OFF, STATUS_SB) and dur_min >= (34 * 60):
            cycle_used_min = 0
            shift_driving_min = 0
            window_start = None
            cumulative_driving_since_break_min = 0
            continue

        # Check for 10-hour rest (§ 395.1(g) / § 395.3(a)(1))
        if seg.status in (STATUS_OFF, STATUS_SB) and dur_min >= (10 * 60):
            shift_driving_min = 0
            window_start = None
            cumulative_driving_since_break_min = 0
            continue

        # Check if non-driving segment >= 30 min resets the 30-min break clock
        if seg.status != STATUS_DRIVING and dur_min >= 30:
            cumulative_driving_since_break_min = 0

        # Check fuel reset
        if seg.status == STATUS_ON_DUTY and "fuel" in seg.reason.lower():
            miles_since_fuel = 0.0

        # Process duty time (DRIVING or ON_DUTY)
        if seg.status in (STATUS_DRIVING, STATUS_ON_DUTY):
            if window_start is None:
                window_start = seg.start

            cycle_used_min += dur_min
            # Cycle limit check (§ 395.3(b)): Cannot drive when cycle > 70 hours (4200 min)
            if seg.status == STATUS_DRIVING and cycle_used_min > 4200:
                violations.append(
                    f"§ 395.3(b) violation at {seg.start}: Driving with {cycle_used_min/60:.2f}h accumulated in cycle (>70h)."
                )

        if seg.status == STATUS_DRIVING:
            miles_driven = seg.miles
            miles_since_fuel += miles_driven
            if miles_since_fuel > 1000.5:  # small tolerance
                violations.append(
                    f"Fueling violation at {seg.end}: Exceeded 1,000 miles without fueling ({miles_since_fuel:.1f} mi)."
                )

            # 30-min break check (§ 395.3(a)(3)(ii)): cumulative driving cannot exceed 8h (480 min)
            if cumulative_driving_since_break_min + dur_min > 480:
                violations.append(
                    f"§ 395.3(a)(3)(ii) violation at {seg.end}: Driven {(cumulative_driving_since_break_min + dur_min)/60:.2f}h without a 30-minute break."
                )
            cumulative_driving_since_break_min += dur_min

            # 11-hour driving limit (§ 395.3(a)(3)(i)): driving in shift cannot exceed 11h (660 min)
            if shift_driving_min + dur_min > 660:
                violations.append(
                    f"§ 395.3(a)(3)(i) violation at {seg.end}: Exceeded 11 hours driving in shift ({(shift_driving_min + dur_min)/60:.2f}h)."
                )
            shift_driving_min += dur_min

            # 14-hour window limit (§ 395.3(a)(2)): no driving after 14 consecutive hours from window_start
            if window_start is not None:
                elapsed_window = (seg.end - window_start).total_seconds() / 60.0
                if elapsed_window > 840.5:  # small tolerance for rounding
                    violations.append(
                        f"§ 395.3(a)(2) violation at {seg.end}: Driving {elapsed_window/60:.2f}h after shift window start {window_start} (>14h)."
                    )

    return violations
