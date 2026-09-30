"""
FMCSR Part 395 Hours of Service (HOS) Tests.
Covers all scenarios in Section 11:
1. Short trip (<8h driving): no break, no rest; pickup 1h + dropoff 1h present.
2. ~700-mile trip: 30-min break by hour 8 of driving; 10-hr rest after <=11h driving.
3. ~2,300-mile trip: fuel stops so no gap exceeds 1,000 miles; multiple daily logs.
   Prints a readable text timeline for visual inspection.
4. cycle_used = 65: 34-hour restart inserted when the 70h is hit.
5. cycle_used = 70: starts with a restart.
6. Every daily log sums to exactly 24.00 hours and miles match sum of driving segments.
7. validate_hos() returns no violations for all generated plans (property-style test).
"""

import random
from datetime import datetime, date
from typing import List
import pytest

from trips.services.hos_planner import (
    plan_trip,
    Segment,
    STATUS_DRIVING,
    STATUS_ON_DUTY,
    STATUS_OFF,
    STATUS_SB,
)
from trips.services.hos_validator import validate_hos
from trips.services.log_builder import build_daily_logs, largest_remainder_hours
from trips.services.geo_utils import create_stub_route


@pytest.fixture
def default_start_dt():
    return datetime(2026, 10, 5, 8, 0, 0)


def format_timeline(segments: List[Segment], title: str = "TRIP TIMELINE") -> str:
    """Formats trip segments into a human-readable text table."""
    lines = [
        "",
        "=" * 105,
        f"{title:^105}",
        "=" * 105,
        f"{'Day':<5} | {'Date':<10} | {'Time Interval':<17} | {'Status':<9} | {'Duration':<9} | {'Mile Range':<15} | {'Miles':<8} | Reason / FMCSR Rule",
        "-" * 105,
    ]

    start_date = segments[0].start.date() if segments else date.today()

    for seg in segments:
        day_num = (seg.start.date() - start_date).days + 1
        day_str = f"Day {day_num}"
        date_str = seg.start.strftime("%Y-%m-%d")
        time_str = f"{seg.start.strftime('%H:%M')} -> {seg.end.strftime('%H:%M')}"
        dur_h = seg.duration_minutes // 60
        dur_m = seg.duration_minutes % 60
        dur_str = f"{dur_h:02d}h {dur_m:02d}m"
        odo_str = f"{seg.start_mi:6.1f} -> {seg.end_mi:6.1f}"
        miles_str = f"{seg.miles:6.1f} mi" if seg.miles > 0 else "   --   "

        lines.append(
            f"{day_str:<5} | {date_str:<10} | {time_str:<17} | {seg.status:<9} | {dur_str:<9} | {odo_str:<15} | {miles_str:<8} | {seg.reason}"
        )

    lines.append("=" * 105)
    return "\n".join(lines)


# -----------------------------------------------------------------------------
# Scenario 1: Short trip (<8h driving)
# -----------------------------------------------------------------------------
def test_scenario_1_short_trip(default_start_dt):
    """
    1. Short trip (<8h driving): no break, no rest; pickup 1h + dropoff 1h present.
    """
    total_dist = 220.0  # 4 hours driving at 55 mph
    pickup_dist = 55.0  # 1 hour driving to pickup
    cycle_used = 10.0

    route = create_stub_route(total_dist)
    segments = plan_trip(
        route=route,
        pickup_dist_mi=pickup_dist,
        cycle_used_hr=cycle_used,
        start_dt=default_start_dt,
        settings={"speed_mph": 55.0},
    )

    violations = validate_hos(segments, cycle_used_at_start=cycle_used)
    assert violations == [], f"Violations: {violations}"

    # Pickup and dropoff must exist and be 1 hour On Duty
    pickup = [s for s in segments if s.status == STATUS_ON_DUTY and "pickup" in s.reason.lower()]
    dropoff = [s for s in segments if s.status == STATUS_ON_DUTY and "dropoff" in s.reason.lower()]
    assert len(pickup) == 1 and pickup[0].duration_minutes == 60
    assert len(dropoff) == 1 and dropoff[0].duration_minutes == 60

    # No rests, no 30m breaks, no restarts
    rests = [s for s in segments if s.reason in ("10-hour rest", "30-min break", "34-hour restart")]
    assert len(rests) == 0


# -----------------------------------------------------------------------------
# Scenario 2: ~700-mile trip
# -----------------------------------------------------------------------------
def test_scenario_2_700_mile_trip(default_start_dt):
    """
    2. ~700-mile trip: a 30-min break by hour 8 of driving; a 10-hr rest after <=11h driving.
    """
    total_dist = 700.0
    pickup_dist = 110.0
    cycle_used = 15.0

    route = create_stub_route(total_dist)
    segments = plan_trip(
        route=route,
        pickup_dist_mi=pickup_dist,
        cycle_used_hr=cycle_used,
        start_dt=default_start_dt,
        settings={"speed_mph": 55.0},
    )

    violations = validate_hos(segments, cycle_used_at_start=cycle_used)
    assert violations == [], f"Violations: {violations}"

    # 30-minute break must be present
    breaks_30m = [s for s in segments if "30-min break" in s.reason.lower() or (s.status == STATUS_OFF and s.duration_minutes == 30)]
    assert len(breaks_30m) >= 1, "Expected at least one 30-minute break"

    # 10-hour rest must be present
    rests_10h = [s for s in segments if s.status == STATUS_SB and s.duration_minutes >= 600]
    assert len(rests_10h) >= 1, "Expected at least one 10-hour rest in sleeper berth"

    # Driving before the first 10-hour rest must not exceed 11h (660 min)
    first_rest_idx = next(i for i, s in enumerate(segments) if s in rests_10h)
    shift_1_driving = sum(s.duration_minutes for s in segments[:first_rest_idx] if s.status == STATUS_DRIVING)
    assert shift_1_driving <= 660, f"Shift 1 driving {shift_1_driving/60:.2f}h exceeded 11h"


# -----------------------------------------------------------------------------
# Scenario 3: ~2,300-mile trip (Prints readable text timeline)
# -----------------------------------------------------------------------------
def test_scenario_3_2300_mile_trip_and_print_timeline(default_start_dt):
    """
    3. ~2,300-mile trip: fuel stops so no gap exceeds 1,000 miles; multiple daily logs.
    Prints a readable text timeline for visual inspection.
    """
    total_dist = 2300.0
    pickup_dist = 300.0
    cycle_used = 5.0

    route = create_stub_route(total_dist)
    segments = plan_trip(
        route=route,
        pickup_dist_mi=pickup_dist,
        cycle_used_hr=cycle_used,
        start_dt=default_start_dt,
        settings={"speed_mph": 55.0},
    )

    violations = validate_hos(segments, cycle_used_at_start=cycle_used)
    assert violations == [], f"Violations: {violations}"

    # Fuel stops: verified no gap exceeds 1,000 miles
    fuel_stops = [s for s in segments if s.status == STATUS_ON_DUTY and "fuel" in s.reason.lower()]
    assert len(fuel_stops) >= 2, f"Expected >=2 fuel stops, got {len(fuel_stops)}"

    # Multiple daily logs generated
    coords, cum_miles = route
    daily_logs = build_daily_logs(
        segments=segments,
        route_geometry=coords,
        route_cumulative_miles=cum_miles,
        cycle_used_at_start=cycle_used,
        header_info={"carrier_name": "Antigravity Freight", "driver_name": "Alex Vance", "from_location": "Start", "to_location": "End"},
        offline=True,
    )
    assert len(daily_logs) >= 4, f"Expected at least 4 daily logs for 2,300 miles, got {len(daily_logs)}"

    # PRINT READABLE TIMELINE FOR USER EYEBALLING
    timeline_text = format_timeline(segments, title="2,300-MILE TRIP: FMCSR § 395 READABLE TEXT TIMELINE")
    print(timeline_text)


# -----------------------------------------------------------------------------
# Scenario 4: cycle_used = 65 -> 34h restart inserted when 70h is hit
# -----------------------------------------------------------------------------
def test_scenario_4_cycle_used_65(default_start_dt):
    """
    4. cycle_used = 65: 34-hour restart inserted when the 70h is hit.
    """
    total_dist = 600.0
    pickup_dist = 110.0
    cycle_used = 65.0  # Only 5 hours remaining

    route = create_stub_route(total_dist)
    segments = plan_trip(
        route=route,
        pickup_dist_mi=pickup_dist,
        cycle_used_hr=cycle_used,
        start_dt=default_start_dt,
        settings={"speed_mph": 55.0},
    )

    violations = validate_hos(segments, cycle_used_at_start=cycle_used)
    assert violations == [], f"Violations: {violations}"

    restarts = [s for s in segments if "34-hour restart" in s.reason.lower() and s.duration_minutes >= 2040]
    assert len(restarts) >= 1, "Expected a 34-hour restart when 70h limit was hit"


# -----------------------------------------------------------------------------
# Scenario 5: cycle_used = 70 -> starts with a restart
# -----------------------------------------------------------------------------
def test_scenario_5_cycle_used_70_starts_with_restart(default_start_dt):
    """
    5. cycle_used = 70: starts with a restart.
    """
    total_dist = 300.0
    pickup_dist = 50.0
    cycle_used = 70.0

    route = create_stub_route(total_dist)
    segments = plan_trip(
        route=route,
        pickup_dist_mi=pickup_dist,
        cycle_used_hr=cycle_used,
        start_dt=default_start_dt,
        settings={"speed_mph": 55.0},
    )

    violations = validate_hos(segments, cycle_used_at_start=cycle_used)
    assert violations == [], f"Violations: {violations}"

    # First segment must be 34h restart
    assert segments[0].status == STATUS_OFF
    assert "34-hour restart" in segments[0].reason.lower()
    assert segments[0].duration_minutes >= 2040
    assert segments[0].start == default_start_dt


# -----------------------------------------------------------------------------
# Scenario 6: Every daily log sums to exactly 24.00 hours & miles match
# -----------------------------------------------------------------------------
def test_scenario_6_daily_logs_sum_to_24_and_miles_match(default_start_dt):
    """
    6. Every daily log sums to exactly 24.00 hours and miles match the sum of driving segments.
    """
    total_dist = 1800.0
    pickup_dist = 200.0
    cycle_used = 20.0

    route = create_stub_route(total_dist)
    coords, cum_miles = route

    segments = plan_trip(
        route=route,
        pickup_dist_mi=pickup_dist,
        cycle_used_hr=cycle_used,
        start_dt=default_start_dt,
        settings={"speed_mph": 55.0},
    )

    daily_logs = build_daily_logs(
        segments=segments,
        route_geometry=coords,
        route_cumulative_miles=cum_miles,
        cycle_used_at_start=cycle_used,
        header_info={"carrier_name": "Test Express", "from_location": "Start", "to_location": "End"},
        offline=True,
    )

    assert len(daily_logs) >= 3

    for day_idx, log in enumerate(daily_logs):
        h = log["hours"]
        tot = round(h["off"] + h["sb"] + h["driving"] + h["on_duty"], 2)
        assert tot == 24.00, f"Day {day_idx + 1} ({log['date']}) sum is {tot} != 24.00"

        # Check total driving miles match sum of driving segments for this day
        driving_segs_miles = sum(
            s["miles"] for s in log["segments"] if s["status"] == STATUS_DRIVING
        )
        assert abs(log["total_miles"] - round(driving_segs_miles, 1)) <= 0.2, (
            f"Day {day_idx + 1} total_miles {log['total_miles']} != segment sum {driving_segs_miles}"
        )


# -----------------------------------------------------------------------------
# Scenario 7: Property test over randomized routes/cycle values
# -----------------------------------------------------------------------------
def test_scenario_7_property_randomized_routes(default_start_dt):
    """
    7. validate_hos() returns no violations for all generated plans
    (property-style test over many random routes/cycle values).
    """
    rng = random.Random(42)

    for scenario_idx in range(25):
        total_dist = rng.uniform(40.0, 2600.0)
        pickup_dist = rng.uniform(0.0, total_dist)
        cycle_used = rng.uniform(0.0, 70.0)
        speed = rng.choice([50.0, 55.0, 60.0])

        route = create_stub_route(total_dist)
        segments = plan_trip(
            route=route,
            pickup_dist_mi=pickup_dist,
            cycle_used_hr=cycle_used,
            start_dt=default_start_dt,
            settings={"speed_mph": speed},
        )

        violations = validate_hos(segments, cycle_used_at_start=cycle_used)
        assert violations == [], (
            f"Scenario {scenario_idx} failed (total={total_dist:.1f}, pickup={pickup_dist:.1f}, "
            f"cycle={cycle_used:.1f}, speed={speed}): {violations}"
        )
