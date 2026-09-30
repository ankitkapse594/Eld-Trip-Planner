"""
API Integration and Provider Mock Tests for ELD Trip Planner.
Verifies:
- POST /api/trips/plan/ (happy path, 422 validation, 502 provider failure, stop reverse-geocoding)
- GET /api/geocode/ (autocomplete queries, input validation)
- GET /api/health/ (service status)
- routing.py (ORS primary, OSRM fallback, error handling, caching, timeouts)
- geocoding.py (ORS primary, Nominatim fallback, safe failure, thread pool batching, caching)
"""

from unittest.mock import patch, MagicMock
import pytest
from rest_framework.test import APIClient
from django.core.cache import cache
from django.conf import settings

from trips.services.routing import get_route, RoutingProviderError
from trips.services.geocoding import (
    search_locations,
    reverse_geocode,
    batch_reverse_geocode,
)


@pytest.fixture(autouse=True)
def clear_django_cache():
    cache.clear()
    yield
    cache.clear()


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
        "offline": True,
    }


# =============================================================================
# API Endpoint Tests
# =============================================================================

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

    # Check stops structure
    assert len(data["stops"]) >= 4
    origin_stop = data["stops"][0]
    assert origin_stop["type"] == "origin"
    assert origin_stop["location"]["lat"] == 41.8781


def test_api_reverse_geocoding_stops_enrichment(api_client, valid_payload):
    """
    Verifies that intermediate stops are reverse-geocoded via batch_reverse_geocode.
    """
    payload = dict(valid_payload)
    payload["offline"] = False  # Enable reverse-geocoding

    mock_route = {
        "geometry": [
            [41.8781, -87.6298],
            [38.0000, -90.0000],
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

    with patch("trips.views.get_route", return_value=mock_route), \
         patch("trips.views.batch_reverse_geocode", return_value=["Effingham, IL", "Mt Vernon, IL", "West Memphis, AR"]):
        response = api_client.post("/api/trips/plan/", payload, format="json")

    assert response.status_code == 200
    data = response.json()
    intermediate_stops = [s for s in data["stops"] if s["type"] not in ("origin", "pickup", "dropoff")]
    assert len(intermediate_stops) > 0
    # Stop labels should be populated with mocked reverse-geocode names
    assert any("IL" in s["location"]["label"] or "AR" in s["location"]["label"] for s in intermediate_stops)


def test_api_validation_errors(api_client, valid_payload):
    """
    Test 8b: Field validation errors (cycle > 70, missing required fields).
    Returns 422 Unprocessable Entity with field-specific errors.
    """
    # 1. Invalid cycle_used_hours (> 70)
    invalid_cycle = dict(valid_payload)
    invalid_cycle["cycle_used_hours"] = 85.0
    resp1 = api_client.post("/api/trips/plan/", invalid_cycle, format="json")
    assert resp1.status_code == 422
    assert "cycle_used_hours" in resp1.json()["details"]

    # 2. Missing dropoff_location
    invalid_drop = dict(valid_payload)
    del invalid_drop["dropoff_location"]
    resp2 = api_client.post("/api/trips/plan/", invalid_drop, format="json")
    assert resp2.status_code == 422
    assert "dropoff_location" in resp2.json()["details"]

    # 3. Invalid latitude out of bounds
    invalid_lat = dict(valid_payload)
    invalid_lat["current_location"] = {"label": "North Pole", "lat": 95.0, "lng": 0.0}
    resp3 = api_client.post("/api/trips/plan/", invalid_lat, format="json")
    assert resp3.status_code == 422
    assert "current_location" in resp3.json()["details"]


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


def test_api_geocode_query_validation(api_client):
    """
    Test geocode validation when query is too short or missing.
    """
    resp_short = api_client.get("/api/geocode/?q=a")
    assert resp_short.status_code == 400
    assert "details" in resp_short.json()

    resp_empty = api_client.get("/api/geocode/")
    assert resp_empty.status_code == 400


# =============================================================================
# Routing Provider Unit & Mock Tests (routing.py)
# =============================================================================

def test_routing_ors_primary_success():
    """
    Tests get_route using mocked OpenRouteService directions response.
    """
    origin = {"label": "Chicago", "lat": 41.8781, "lng": -87.6298}
    pickup = {"label": "Dallas", "lat": 32.7767, "lng": -96.7970}
    dropoff = {"label": "Atlanta", "lat": 33.7490, "lng": -84.3880}

    mock_ors_resp = MagicMock()
    mock_ors_resp.status_code = 200
    mock_ors_resp.json.return_value = {
        "features": [
            {
                "geometry": {
                    "coordinates": [
                        [-87.6298, 41.8781],
                        [-96.7970, 32.7767],
                        [-84.3880, 33.7490],
                    ]
                },
                "properties": {
                    "segments": [
                        {"distance": 1480596.0},  # ~920 miles
                        {"distance": 1239194.0},  # ~770 miles
                    ],
                    "summary": {"distance": 2719790.0},
                },
            }
        ]
    }

    with patch.object(settings, "ORS_API_KEY", "test_ors_key"), \
         patch("requests.post", return_value=mock_ors_resp) as mock_post:
        result = get_route(origin, pickup, dropoff, avg_speed_mph=55.0)

    assert mock_post.called
    assert result["total_distance_miles"] > 1600.0
    assert result["pickup_distance_miles"] > 900.0
    assert len(result["legs"]) == 2
    assert result["geometry"][0] == [41.8781, -87.6298]


def test_routing_ors_failure_falls_back_to_osrm():
    """
    Tests get_route when ORS fails (returns 500), falling back seamlessly to OSRM.
    """
    origin = {"label": "Chicago", "lat": 41.8781, "lng": -87.6298}
    pickup = {"label": "Dallas", "lat": 32.7767, "lng": -96.7970}
    dropoff = {"label": "Atlanta", "lat": 33.7490, "lng": -84.3880}

    mock_ors_fail = MagicMock()
    mock_ors_fail.status_code = 500

    mock_osrm_resp = MagicMock()
    mock_osrm_resp.status_code = 200
    mock_osrm_resp.json.return_value = {
        "code": "Ok",
        "routes": [
            {
                "geometry": {
                    "coordinates": [
                        [-87.6298, 41.8781],
                        [-96.7970, 32.7767],
                        [-84.3880, 33.7490],
                    ]
                },
                "legs": [
                    {"distance": 1480596.0},
                    {"distance": 1239194.0},
                ],
                "distance": 2719790.0,
            }
        ],
    }

    with patch.object(settings, "ORS_API_KEY", "test_ors_key"), \
         patch("requests.post", return_value=mock_ors_fail), \
         patch("requests.get", return_value=mock_osrm_resp) as mock_get:
        result = get_route(origin, pickup, dropoff, avg_speed_mph=55.0)

    assert mock_get.called
    assert result["total_distance_miles"] > 1600.0
    assert len(result["legs"]) == 2


def test_routing_both_providers_fail_raises_exception():
    """
    Tests get_route when both ORS and OSRM fail, raising RoutingProviderError.
    """
    origin = {"label": "Chicago", "lat": 41.8781, "lng": -87.6298}
    pickup = {"label": "Dallas", "lat": 32.7767, "lng": -96.7970}
    dropoff = {"label": "Atlanta", "lat": 33.7490, "lng": -84.3880}

    with patch.object(settings, "ORS_API_KEY", "test_ors_key"), \
         patch("requests.post", side_effect=Exception("ORS timeout")), \
         patch("requests.get", side_effect=Exception("OSRM down")):
        with pytest.raises(RoutingProviderError):
            get_route(origin, pickup, dropoff)


def test_routing_caching():
    """
    Tests that duplicate calls to get_route return from cache without re-requesting.
    """
    origin = {"label": "A", "lat": 40.0, "lng": -88.0}
    pickup = {"label": "B", "lat": 39.0, "lng": -89.0}
    dropoff = {"label": "C", "lat": 38.0, "lng": -90.0}

    mock_osrm = MagicMock()
    mock_osrm.status_code = 200
    mock_osrm.json.return_value = {
        "routes": [{
            "geometry": {"coordinates": [[-88.0, 40.0], [-89.0, 39.0], [-90.0, 38.0]]},
            "legs": [{"distance": 100000.0}, {"distance": 100000.0}],
            "distance": 200000.0,
        }]
    }

    with patch.object(settings, "ORS_API_KEY", ""), \
         patch("requests.get", return_value=mock_osrm) as mock_get:
        res1 = get_route(origin, pickup, dropoff)
        assert mock_get.call_count == 1

        # Second call with identical arguments
        res2 = get_route(origin, pickup, dropoff)
        assert mock_get.call_count == 1  # Should NOT call requests again
        assert res1 == res2


# =============================================================================
# Geocoding Provider Unit & Mock Tests (geocoding.py)
# =============================================================================

def test_geocoding_ors_search_primary():
    """
    Tests search_locations via ORS geocode search.
    """
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "features": [
            {
                "geometry": {"coordinates": [-87.6298, 41.8781]},
                "properties": {"label": "Chicago, IL, United States", "name": "Chicago"},
            }
        ]
    }

    with patch.object(settings, "ORS_API_KEY", "test_key"), \
         patch("requests.get", return_value=mock_resp) as mock_get:
        results = search_locations("Chicago", limit=5)

    assert mock_get.called
    assert len(results) == 1
    assert results[0]["label"] == "Chicago, IL, United States"
    assert results[0]["lat"] == 41.8781
    assert results[0]["lng"] == -87.6298


def test_geocoding_nominatim_search_fallback():
    """
    Tests search_locations falling back to Nominatim when ORS is unavailable or fails.
    """
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = [
        {
            "lat": "41.8781",
            "lon": "-87.6298",
            "display_name": "Chicago, Cook County, Illinois, United States",
            "address": {"city": "Chicago", "state": "Illinois", "country_code": "us"},
        }
    ]

    with patch.object(settings, "ORS_API_KEY", ""), \
         patch("requests.get", return_value=mock_resp) as mock_get:
        results = search_locations("Chicago", limit=5)

    assert mock_get.called
    assert len(results) == 1
    assert results[0]["lat"] == 41.8781
    assert results[0]["lng"] == -87.6298


def test_reverse_geocode_ors_primary():
    """
    Tests reverse_geocode via ORS reverse endpoint.
    """
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "features": [
            {
                "properties": {
                    "locality": "Effingham",
                    "region_a": "IL",
                    "label": "Effingham, IL, USA",
                }
            }
        ]
    }

    with patch.object(settings, "ORS_API_KEY", "test_key"), \
         patch("requests.get", return_value=mock_resp):
        label = reverse_geocode(39.120, -88.543)

    assert label == "Effingham, IL"


def test_reverse_geocode_nominatim_fallback():
    """
    Tests reverse_geocode fallback to Nominatim.
    """
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "lat": "39.120",
        "lon": "-88.543",
        "display_name": "Effingham, Effingham County, Illinois, United States",
        "address": {"city": "Effingham", "state": "IL", "country_code": "us"},
    }

    with patch.object(settings, "ORS_API_KEY", ""), \
         patch("requests.get", return_value=mock_resp):
        label = reverse_geocode(39.120, -88.543)

    assert label == "Effingham, IL"


def test_reverse_geocode_safe_fallback_on_total_failure():
    """
    Tests reverse_geocode when both providers fail: safely returns formatted lat/lng string without throwing.
    """
    with patch.object(settings, "ORS_API_KEY", ""), \
         patch("requests.get", side_effect=Exception("Network error")):
        label = reverse_geocode(39.1234, -88.5678)

    assert label == "39.123, -88.568"


def test_batch_reverse_geocode_thread_pool():
    """
    Tests batch_reverse_geocode concurrent execution across multiple coordinates.
    """
    points = [
        (41.878, -87.630),
        (39.120, -88.543),
        (35.149, -90.049),
    ]

    def mock_rev(lat, lng):
        return f"City ({lat:.1f}, {lng:.1f})"

    with patch("trips.services.geocoding.reverse_geocode", side_effect=mock_rev):
        labels = batch_reverse_geocode(points, max_workers=3)

    assert len(labels) == 3
    assert labels[0] == "City (41.9, -87.6)"
    assert labels[1] == "City (39.1, -88.5)"
    assert labels[2] == "City (35.1, -90.0)"
