"""
Unit and Property Tests for HOS Planner and Validator.
Verifies compliance against FMCSR Part 395 regulations.
"""

import random
from datetime import datetime
import pytest
from trips.services.hos_planner import (
    plan_trip,
    STATUS_DRIVING,
    STATUS_ON_DUTY,
    STATUS_OFF,
    STATUS_SB,
)
from trips.services.hos_validator import validate_hos


@pytest.fixture
def default_start_dt():
    return datetime(2026, 10, 5, 8, 0, 0)


def test_short_trip_no_break_no_rest(default_start_dt):
    """
    Test 1: Short trip (<8h driving).
    No 30-min break, no 10-h rest; pickup 1h + dropoff 1h present.
    """
    total_dist = 220.0  # 4 hours driving at 55 mph
    pickup_dist = 55.0  # 1 hour driving to pickup
    cycle_used = 10.0

    segments = plan_trip(
        total_distance_mi=total_dist,
        pickup_dist_mi=pickup_dist,
        cycle_used_hr=cycle_used,
        start_dt=default_start_dt,
        speed_mph=55.0,
    )

    # Validate HOS compliance
    violations = validate_hos(segments, cycle_used_at_start=cycle_used)
    assert violations == [], f"Violations found: {violations}"

    # Check that pickup and dropoff exist
    pickup_segs = [s for s in segments if s.status == STATUS_ON_DUTY and "pickup" in s.reason.lower()]
    dropoff_segs = [s for s in segments if s.status == STATUS_ON_DUTY and "dropoff" in s.reason.lower()]
    assert len(pickup_segs) == 1
    assert pickup_segs[0].duration_minutes == 60
    assert len(dropoff_segs) == 1
    assert dropoff_segs[0].duration_minutes == 60

    # Ensure no rests or 30-min breaks were inserted
    rests = [s for s in segments if s.status in (STATUS_SB, STATUS_OFF) and s.reason in ("10-hour rest", "30-min break", "34-hour restart")]
    assert len(rests) == 0

    # Total driving hours should be ~4.0h
    driving_minutes = sum(s.duration_minutes for s in segments if s.status == STATUS_DRIVING)
    assert abs(driving_minutes - 240) <= 2


def test_700_mile_trip_break_and_rest(default_start_dt):
    """
    Test 2: ~700-mile trip.
    Total driving ~12.7h -> 30-min break by hour 8 of driving; 10-hr rest after <=11h driving.
    """
    total_dist = 700.0
    pickup_dist = 110.0
    cycle_used = 15.0

    segments = plan_trip(
        total_distance_mi=total_dist,
        pickup_dist_mi=pickup_dist,
        cycle_used_hr=cycle_used,
        start_dt=default_start_dt,
        speed_mph=55.0,
    )

    violations = validate_hos(segments, cycle_used_at_start=cycle_used)
    assert violations == [], f"Violations found: {violations}"

    # Verify at least one 30-min break and one 10-hour rest were inserted
    breaks_30m = [s for s in segments if "30-min break" in s.reason.lower() or ("break" in s.reason.lower() and s.duration_minutes == 30)]
    rests_10h = [s for s in segments if "10-hour rest" in s.reason.lower() and s.duration_minutes >= 600]

    assert len(breaks_30m) >= 1, "Expected at least one 30-minute break"
    assert len(rests_10h) >= 1, "Expected at least one 10-hour rest"

    # Verify driving in first shift did not exceed 11h
    first_rest_idx = next(i for i, s in enumerate(segments) if s in rests_10h)
    shift_1_driving = sum(s.duration_minutes for s in segments[:first_rest_idx] if s.status == STATUS_DRIVING)
    assert shift_1_driving <= 660, f"Shift 1 driving {shift_1_driving/60:.2f}h exceeded 11h"


def test_2300_mile_trip_fuel_and_multiple_days(default_start_dt):
    """
    Test 3: ~2,300-mile trip.
    Fuel stops ensure no gap exceeds 1,000 miles; multiple shifts/rests.
    """
    total_dist = 2300.0
    pickup_dist = 300.0
    cycle_used = 5.0

    segments = plan_trip(
        total_distance_mi=total_dist,
        pickup_dist_mi=pickup_dist,
        cycle_used_hr=cycle_used,
        start_dt=default_start_dt,
        speed_mph=55.0,
    )

    violations = validate_hos(segments, cycle_used_at_start=cycle_used)
    assert violations == [], f"Violations found: {violations}"

    fuel_stops = [s for s in segments if s.status == STATUS_ON_DUTY and "fuel" in s.reason.lower()]
    assert len(fuel_stops) >= 2, f"Expected at least 2 fuel stops for 2,300 miles, got {len(fuel_stops)}"

    # Multiple 10-hour rests expected (~41h driving -> ~4 shifts)
    rests_10h = [s for s in segments if "10-hour rest" in s.reason.lower()]
    assert len(rests_10h) >= 3


def test_cycle_used_65_triggers_restart_when_70_hit(default_start_dt):
    """
    Test 4: cycle_used = 65.
    Trip requires >5 hours of on-duty time -> 34-hour restart must be inserted when 70h is hit.
    """
    total_dist = 550.0  # 10 hours driving + 2 hours terminal = 12h on-duty
    pickup_dist = 110.0
    cycle_used = 65.0  # Only 5 hours remaining before 70h limit

    segments = plan_trip(
        total_distance_mi=total_dist,
        pickup_dist_mi=pickup_dist,
        cycle_used_hr=cycle_used,
        start_dt=default_start_dt,
        speed_mph=55.0,
    )

    violations = validate_hos(segments, cycle_used_at_start=cycle_used)
    assert violations == [], f"Violations found: {violations}"

    restarts = [s for s in segments if "34-hour restart" in s.reason.lower() and s.duration_minutes >= 2040]
    assert len(restarts) >= 1, "Expected a 34-hour restart to be inserted when 70h limit was hit"


def test_cycle_used_70_starts_with_restart(default_start_dt):
    """
    Test 5: cycle_used = 70.
    Must begin with a 34-hour restart before any driving or pickup.
    """
    total_dist = 300.0
    pickup_dist = 50.0
    cycle_used = 70.0

    segments = plan_trip(
        total_distance_mi=total_dist,
        pickup_dist_mi=pickup_dist,
        cycle_used_hr=cycle_used,
        start_dt=default_start_dt,
        speed_mph=55.0,
    )

    violations = validate_hos(segments, cycle_used_at_start=cycle_used)
    assert violations == [], f"Violations found: {violations}"

    # First segment must be 34h restart
    assert segments[0].status == STATUS_OFF
    assert "34-hour restart" in segments[0].reason.lower()
    assert segments[0].duration_minutes >= 2040
    assert segments[0].start == default_start_dt


def test_randomized_property_routes_hos_valid(default_start_dt):
    """
    Test 7: Property-style randomized tests over various route distances and cycle values.
    Verifies that validate_hos() returns NO violations for any planned trip.
    """
    rng = random.Random(42)  # Deterministic seed for reproducible tests

    for scenario_idx in range(25):
        total_dist = rng.uniform(50.0, 2800.0)
        pickup_dist = rng.uniform(0.0, total_dist)
        cycle_used = rng.uniform(0.0, 70.0)
        speed = rng.choice([50.0, 55.0, 60.0])

        segments = plan_trip(
            total_distance_mi=total_dist,
            pickup_dist_mi=pickup_dist,
            cycle_used_hr=cycle_used,
            start_dt=default_start_dt,
            speed_mph=speed,
        )

        violations = validate_hos(segments, cycle_used_at_start=cycle_used)
        assert violations == [], (
            f"Scenario {scenario_idx} failed (total={total_dist:.1f}, pickup={pickup_dist:.1f}, "
            f"cycle={cycle_used:.1f}, speed={speed}): {violations}"
        )
