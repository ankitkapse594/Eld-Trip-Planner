"""
Geocoding and Reverse-Geocoding Service.
Integrates with OpenRouteService (primary) and Nominatim / OpenStreetMap (resilient fallback).
Includes local memory caching and concurrent reverse-geocoding thread pool.
"""

import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List, Dict, Any, Tuple, Optional
import requests
from django.conf import settings
from django.core.cache import cache

logger = logging.getLogger(__name__)

USER_AGENT = "ELD-Trip-Planner-App/1.0 (FMCSA-395; contact: support@antigravity.ai)"
TIMEOUT = getattr(settings, "HTTP_TIMEOUT_SECONDS", 8.0)


def _format_nominatim_address(data: Dict[str, Any], default_lat: float, default_lng: float) -> str:
    """Extracts a concise 'City, ST' or 'Town, ST' label from Nominatim response."""
    address = data.get("address", {})
    city = (
        address.get("city")
        or address.get("town")
        or address.get("village")
        or address.get("municipality")
        or address.get("hamlet")
        or address.get("county")
    )
    state = address.get("state_code") or address.get("state")

    if city and state:
        # Standardize 2-letter state code if state is longer
        return f"{city}, {state}"
    elif city:
        country = address.get("country_code", "").upper()
        return f"{city}, {country}" if country else city
    elif data.get("display_name"):
        parts = [p.strip() for p in data["display_name"].split(",")]
        if len(parts) >= 2:
            return f"{parts[0]}, {parts[1]}"
        return parts[0]

    return f"{default_lat:.3f}, {default_lng:.3f}"


def search_locations(query: str, limit: int = 5) -> List[Dict[str, Any]]:
    """
    Searches for locations by address/place name with autocomplete support.
    Cached for fast repeated queries.
    """
    clean_query = query.strip()
    if len(clean_query) < 2:
        return []

    cache_key = f"geo_search:{clean_query.lower()}:{limit}"
    cached_val = cache.get(cache_key)
    if cached_val is not None:
        return cached_val

    results: List[Dict[str, Any]] = []

    # 1. Primary: OpenRouteService if API key configured
    if settings.ORS_API_KEY:
        try:
            url = "https://api.openrouteservice.org/geocode/search"
            params = {
                "api_key": settings.ORS_API_KEY,
                "text": clean_query,
                "size": limit,
            }
            resp = requests.get(url, params=params, timeout=TIMEOUT)
            if resp.status_code == 200:
                data = resp.json()
                for feature in data.get("features", []):
                    coords = feature.get("geometry", {}).get("coordinates", [])
                    props = feature.get("properties", {})
                    if len(coords) >= 2:
                        label = props.get("label") or props.get("name") or clean_query
                        results.append({
                            "label": label,
                            "lat": coords[1],
                            "lng": coords[0],
                        })
                if results:
                    cache.set(cache_key, results, timeout=86400)
                    return results
        except Exception as exc:
            logger.warning(f"ORS geocoding search failed: {exc}. Trying Nominatim fallback.")

    # 2. Resilient Fallback: Nominatim (OpenStreetMap)
    try:
        url = "https://nominatim.openstreetmap.org/search"
        headers = {"User-Agent": USER_AGENT}
        params = {
            "q": clean_query,
            "format": "json",
            "addressdetails": 1,
            "limit": limit,
        }
        resp = requests.get(url, params=params, headers=headers, timeout=TIMEOUT)
        if resp.status_code == 200:
            items = resp.json()
            for item in items:
                lat = float(item["lat"])
                lng = float(item["lon"])
                label = _format_nominatim_address(item, lat, lng)
                results.append({
                    "label": item.get("display_name", label),
                    "lat": lat,
                    "lng": lng,
                })
            cache.set(cache_key, results, timeout=86400)
            return results
    except Exception as exc:
        logger.error(f"Nominatim geocoding search fallback failed: {exc}")

    return results


def reverse_geocode(lat: float, lng: float) -> str:
    """
    Reverse geocodes a (lat, lng) coordinate into 'City, State'.
    Guaranteed not to raise an unhandled exception.
    """
    # Round coordinates to ~100m for cache reuse
    cache_key = f"revgeo:{round(lat, 3)}:{round(lng, 3)}"
    cached_name = cache.get(cache_key)
    if cached_name:
        return cached_name

    fallback_label = f"{lat:.3f}, {lng:.3f}"

    # 1. Primary: OpenRouteService
    if settings.ORS_API_KEY:
        try:
            url = "https://api.openrouteservice.org/geocode/reverse"
            params = {
                "api_key": settings.ORS_API_KEY,
                "point.lon": lng,
                "point.lat": lat,
                "size": 1,
            }
            resp = requests.get(url, params=params, timeout=TIMEOUT)
            if resp.status_code == 200:
                data = resp.json()
                features = data.get("features", [])
                if features:
                    props = features[0].get("properties", {})
                    locality = props.get("locality") or props.get("county") or props.get("name")
                    region = props.get("region_a") or props.get("region")
                    if locality and region:
                        label = f"{locality}, {region}"
                    else:
                        label = props.get("label", fallback_label)
                    cache.set(cache_key, label, timeout=86400)
                    return label
        except Exception as exc:
            logger.warning(f"ORS reverse geocoding failed for ({lat}, {lng}): {exc}")

    # 2. Resilient Fallback: Nominatim
    try:
        url = "https://nominatim.openstreetmap.org/reverse"
        headers = {"User-Agent": USER_AGENT}
        params = {
            "lat": lat,
            "lon": lng,
            "format": "json",
            "zoom": 10,
            "addressdetails": 1,
        }
        resp = requests.get(url, params=params, headers=headers, timeout=TIMEOUT)
        if resp.status_code == 200:
            data = resp.json()
            label = _format_nominatim_address(data, lat, lng)
            cache.set(cache_key, label, timeout=86400)
            return label
    except Exception as exc:
        logger.warning(f"Nominatim reverse geocode failed for ({lat}, {lng}): {exc}")

    return fallback_label


def batch_reverse_geocode(coords: List[Tuple[float, float]], max_workers: int = 5) -> List[str]:
    """
    Reverse-geocodes a list of (lat, lng) pairs concurrently using ThreadPoolExecutor.
    Maintains exact input ordering.
    """
    if not coords:
        return []

    results: List[str] = [""] * len(coords)

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_to_idx = {
            executor.submit(reverse_geocode, pt[0], pt[1]): idx
            for idx, pt in enumerate(coords)
        }
        for future in as_completed(future_to_idx):
            idx = future_to_idx[future]
            try:
                results[idx] = future.result()
            except Exception:
                pt = coords[idx]
                results[idx] = f"{pt[0]:.3f}, {pt[1]:.3f}"

    return results
