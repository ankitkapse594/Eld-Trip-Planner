"""
Geospatial and Polyline Utility Functions.
Includes Haversine distance, cumulative distance indexing, mile marker interpolation,
and polyline simplification.
"""

import math
from typing import List, Tuple


EARTH_RADIUS_MILES = 3958.7613


def haversine_distance_miles(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Computes great-circle distance between two (lat, lon) coordinates in statute miles.
    """
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return EARTH_RADIUS_MILES * c


def compute_cumulative_distances(coords: List[List[float]]) -> Tuple[List[float], float]:
    """
    Given a list of [lat, lng] points, computes cumulative distances in miles.
    Returns:
        (cumulative_distances, total_miles)
    """
    if not coords:
        return [0.0], 0.0

    cumulative = [0.0]
    total = 0.0

    for i in range(1, len(coords)):
        lat1, lon1 = coords[i - 1][0], coords[i - 1][1]
        lat2, lon2 = coords[i][0], coords[i][1]
        d = haversine_distance_miles(lat1, lon1, lat2, lon2)
        total += d
        cumulative.append(total)

    return cumulative, total


def interpolate_coord_at_mile(
    coords: List[List[float]],
    cumulative_miles: List[float],
    target_mile: float,
) -> Tuple[float, float]:
    """
    Interpolates [lat, lng] along a polyline at a specified target mile marker.
    """
    if not coords:
        return 0.0, 0.0

    if target_mile <= 0.0 or len(coords) == 1:
        return coords[0][0], coords[0][1]

    if target_mile >= cumulative_miles[-1]:
        return coords[-1][0], coords[-1][1]

    # Binary search for segment containing target_mile
    low = 0
    high = len(cumulative_miles) - 1

    while low <= high:
        mid = (low + high) // 2
        if cumulative_miles[mid] < target_mile:
            low = mid + 1
        else:
            high = mid - 1

    i = max(1, low)
    d0 = cumulative_miles[i - 1]
    d1 = cumulative_miles[i]
    span = d1 - d0

    if span < 1e-6:
        return coords[i][0], coords[i][1]

    fraction = (target_mile - d0) / span
    fraction = max(0.0, min(1.0, fraction))

    lat = coords[i - 1][0] + fraction * (coords[i][0] - coords[i - 1][0])
    lon = coords[i - 1][1] + fraction * (coords[i][1] - coords[i - 1][1])
    return round(lat, 5), round(lon, 5)


def simplify_geometry(coords: List[List[float]], max_points: int = 400) -> List[List[float]]:
    """
    Subsamples polyline points if total exceeds max_points to ensure crisp rendering.
    Always preserves first and last points.
    """
    if len(coords) <= max_points:
        return coords

    step = len(coords) / float(max_points - 1)
    simplified = [coords[0]]
    for i in range(1, max_points - 1):
        idx = int(round(i * step))
        if idx < len(coords) - 1:
            simplified.append(coords[idx])
    simplified.append(coords[-1])
    return simplified
