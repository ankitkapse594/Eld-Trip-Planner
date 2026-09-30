"""
Unit tests for Geospatial utilities and providers.
"""

from trips.services.geo_utils import (
    haversine_distance_miles,
    compute_cumulative_distances,
    interpolate_coord_at_mile,
    simplify_geometry,
)


def test_haversine_known_distance():
    # Chicago, IL (41.8781, -87.6298) to Dallas, TX (32.7767, -96.7970)
    # Great-circle distance is approximately 795 miles
    d = haversine_distance_miles(41.8781, -87.6298, 32.7767, -96.7970)
    assert 780.0 < d < 820.0


def test_compute_cumulative_distances():
    coords = [
        [41.8781, -87.6298],
        [41.0000, -88.0000],
        [40.0000, -89.0000],
    ]
    cum, total = compute_cumulative_distances(coords)
    assert len(cum) == 3
    assert cum[0] == 0.0
    assert cum[1] > 0.0
    assert cum[2] == total


def test_interpolate_coord_at_mile():
    coords = [
        [0.0, 0.0],
        [1.0, 0.0],
    ]
    cum, total = compute_cumulative_distances(coords)
    mid_lat, mid_lon = interpolate_coord_at_mile(coords, cum, total / 2.0)
    assert abs(mid_lat - 0.5) < 0.05
    assert abs(mid_lon - 0.0) < 0.05


def test_simplify_geometry():
    coords = [[float(i), float(i)] for i in range(1000)]
    simplified = simplify_geometry(coords, max_points=200)
    assert len(simplified) == 200
    assert simplified[0] == [0.0, 0.0]
    assert simplified[-1] == [999.0, 999.0]
