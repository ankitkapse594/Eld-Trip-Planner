"""
Tests for Daily Log Builder and 24.00h Largest-Remainder Balancing.
Verifies Test 6 from specifications.
"""

from unittest.mock import patch
from datetime import datetime
import pytest
from trips.services.hos_planner import plan_trip
from trips.services.log_builder import build_daily_logs, largest_remainder_hours
from trips.services.geo_utils import compute_cumulative_distances



def test_largest_remainder_hours_precision():
    # Various arbitrary minute distributions that total 1440 minutes
    test_cases = [
        {"OFF": 480, "SB": 600, "DRIVING": 300, "ON_DUTY": 60},  # 8h, 10h, 5h, 1h
        {"OFF": 437, "SB": 193, "DRIVING": 623, "ON_DUTY": 187}, # primes / arbitrary
        {"OFF": 1440, "SB": 0, "DRIVING": 0, "ON_DUTY": 0},      # entire day off
        {"OFF": 33, "SB": 33, "DRIVING": 34, "ON_DUTY": 1340},
    ]

    for minutes in test_cases:
        res = largest_remainder_hours(minutes)
        total_hours = round(res["off"] + res["sb"] + res["driving"] + res["on_duty"], 2)
        assert total_hours == 24.00, f"Expected 24.00, got {total_hours} from {res}"


def test_daily_logs_every_day_sums_to_24_and_miles_match():
    """
    Test 6: Every daily log sums to exactly 24.00 hours and miles match
    the sum of driving segments for multi-day trips.
    """
    # 2,200-mile trip spanning ~4 days
    total_dist = 2200.0
    pickup_dist = 250.0
    cycle_used = 12.0
    start_dt = datetime(2026, 10, 5, 8, 0, 0)

    segments = plan_trip(
        total_distance_mi=total_dist,
        pickup_dist_mi=pickup_dist,
        cycle_used_hr=cycle_used,
        start_dt=start_dt,
        speed_mph=55.0,
    )

    # Synthetic straight line coordinates for testing
    coords = [
        [41.8781, -87.6298],
        [32.7767, -96.7970],
        [33.7490, -84.3880],
    ]
    cum_miles, _ = compute_cumulative_distances(coords)

    header = {
        "carrier_name": "Test Express",
        "main_office_address": "123 Main St",
        "home_terminal_address": "456 Term Ave",
        "vehicle_numbers": "TRK-101",
        "driver_name": "John Doe",
        "co_driver": "",
        "shipper_commodity": "General Freight",
        "shipping_doc_no": "BOL-001",
        "from_location": "Chicago, IL",
        "to_location": "Atlanta, GA",
    }

    with patch("trips.services.log_builder.batch_reverse_geocode", side_effect=lambda pts: [f"{p[0]:.2f}, {p[1]:.2f}" for p in pts]):
        daily_logs = build_daily_logs(
            segments=segments,
            route_geometry=coords,
            route_cumulative_miles=cum_miles,
            cycle_used_at_start=cycle_used,
            header_info=header,
        )

    assert len(daily_logs) >= 3, f"Expected >= 3 daily logs for 2,200-mile trip, got {len(daily_logs)}"

    for day_idx, log in enumerate(daily_logs):
        h = log["hours"]
        tot = round(h["off"] + h["sb"] + h["driving"] + h["on_duty"], 2)
        assert tot == 24.00, f"Day {day_idx + 1} ({log['date']}) sum is {tot} != 24.00"

        # Check total driving miles match sum of driving segments for this day
        driving_segs_miles = sum(
            s["miles"] for s in log["segments"] if s["status"] == "DRIVING"
        )
        assert abs(log["total_miles"] - round(driving_segs_miles, 1)) <= 0.2, (
            f"Day {day_idx + 1} total_miles {log['total_miles']} != segment sum {driving_segs_miles}"
        )

        # Recap line checks
        recap = log["recap"]
        assert recap["on_duty_today"] == round(h["driving"] + h["on_duty"], 2)
        assert recap["line_b"] == round(max(0.0, 70.0 - recap["line_a"]), 2)
        assert recap["line_a"] >= recap["on_duty_today"]
