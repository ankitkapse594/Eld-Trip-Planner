"""
API Integration Tests for Trip Planning and Geocoding Endpoints.
Verifies Test 8: happy path with mocked route, 422 validation errors, and 502 provider failure.
"""

from unittest.mock import patch
import pytest
from rest_framework.test import APIClient
from trips.services.routing import RoutingProviderError


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def valid_payload():
    return {
        "current_location": {"label": "Chicago, IL", "lat": 41.8781, "lng": -87.6298},
        "pickup_location": {"label": "Dallas, TX", "lat": 32.7767, "lng": -96.7970},
        "dropoff_location": {"label": "Atlanta, GA", "lat": 33.7490, "lng": -84.3880},
        "cycle_used_hours": 30.0,
        "start_datetime": "2026-10-05T08:00:00",
        "carrier_name": "Antigravity Freight",
        "driver_name": "Alex Vance",
    }


def test_api_happy_path(api_client, valid_payload):
    """
    Test 8a: Happy path with mocked routing response.
    Returns 200 OK with full trip plan structure and hos_valid: True.
    """
    mock_route = {
        "geometry": [
            [41.8781, -87.6298],
            [36.0000, -92.0000],
            [32.7767, -96.7970],
            [33.7490, -84.3880],
        ],
        "total_distance_miles": 1690.0,
        "pickup_distance_miles": 920.0,
        "legs": [
            {"from": "Chicago, IL", "to": "Dallas, TX", "miles": 920.0, "hours": 16.73},
            {"from": "Dallas, TX", "to": "Atlanta, GA", "miles": 770.0, "hours": 14.00},
        ],
    }

    with patch("trips.views.get_route", return_value=mock_route):
        response = api_client.post("/api/trips/plan/", valid_payload, format="json")

    assert response.status_code == 200
    data = response.json()

    assert "summary" in data
    assert "route" in data
    assert "stops" in data
    assert "segments" in data
    assert "daily_logs" in data
    assert "assumptions" in data

    summary = data["summary"]
    assert summary["total_miles"] == 1690.0
    assert summary["hos_valid"] is True
    assert summary["violations"] == []
    assert summary["fuel_stops"] >= 1
    assert summary["rests"] >= 1

    # Check that stops have coordinates and types
    assert len(data["stops"]) >= 4
    origin_stop = data["stops"][0]
    assert origin_stop["type"] == "origin"
    assert origin_stop["location"]["lat"] == 41.8781


def test_api_validation_errors(api_client, valid_payload):
    """
    Test 8b: Field validation errors (cycle > 70, missing required fields).
    Returns 422 Unprocessable Entity with field-specific errors.
    """
    # 1. Invalid cycle_used_hours (> 70)
    invalid_cycle_payload = dict(valid_payload)
    invalid_cycle_payload["cycle_used_hours"] = 85.0
    resp = api_client.post("/api/trips/plan/", invalid_cycle_payload, format="json")
    assert resp.status_code == 422
    assert "cycle_used_hours" in resp.json()["details"]

    # 2. Missing dropoff_location
    invalid_loc_payload = dict(valid_payload)
    del invalid_loc_payload["dropoff_location"]
    resp2 = api_client.post("/api/trips/plan/", invalid_loc_payload, format="json")
    assert resp2.status_code == 422
    assert "dropoff_location" in resp2.json()["details"]


def test_api_provider_failure_returns_502(api_client, valid_payload):
    """
    Test 8c: External routing provider failure returns 502 Bad Gateway.
    """
    with patch(
        "trips.views.get_route",
        side_effect=RoutingProviderError("ORS and OSRM unreachable."),
    ):
        response = api_client.post("/api/trips/plan/", valid_payload, format="json")

    assert response.status_code == 502
    assert "Routing Provider" in response.json()["error"]


def test_api_health_endpoint(api_client):
    """
    Test health check endpoint.
    """
    response = api_client.get("/api/health/")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_api_geocode_autocomplete(api_client):
    """
    Test geocode autocomplete endpoint with mock.
    """
    mock_results = [
        {"label": "Chicago, IL, USA", "lat": 41.8781, "lng": -87.6298}
    ]
    with patch("trips.views.search_locations", return_value=mock_results):
        response = api_client.get("/api/geocode/?q=Chicago")

    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["lat"] == 41.8781
