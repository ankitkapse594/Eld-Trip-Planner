"""
Serializers for ELD Trip Planner API.
Validates trip inputs, locations, and geocode queries.
"""

from rest_framework import serializers
from datetime import datetime, timedelta


class LocationSerializer(serializers.Serializer):
    label = serializers.CharField(max_length=255, required=True)
    lat = serializers.FloatField(min_value=-90.0, max_value=90.0, required=True)
    lng = serializers.FloatField(min_value=-180.0, max_value=180.0, required=True)


class TripPlanRequestSerializer(serializers.Serializer):
    current_location = LocationSerializer(required=True)
    pickup_location = LocationSerializer(required=True)
    dropoff_location = LocationSerializer(required=True)

    cycle_used_hours = serializers.FloatField(
        min_value=0.0,
        max_value=70.0,
        default=0.0,
        help_text="Hours on duty accumulated in current 70-hour / 8-day cycle.",
    )
    start_datetime = serializers.DateTimeField(
        required=False,
        default=None,
        allow_null=True,
        help_text="Trip start datetime in home-terminal time.",
    )

    # Optional Carrier and Driver Metadata for log sheets
    carrier_name = serializers.CharField(
        required=False, allow_blank=True, default="Antigravity Freight Lines"
    )
    main_office_address = serializers.CharField(
        required=False, allow_blank=True, default="100 S. Wacker Dr, Chicago, IL"
    )
    home_terminal_address = serializers.CharField(
        required=False, allow_blank=True, default="400 Logistics Blvd, Joliet, IL"
    )
    vehicle_numbers = serializers.CharField(
        required=False, allow_blank=True, default="TRK-9042 / TRL-4410"
    )
    driver_name = serializers.CharField(
        required=False, allow_blank=True, default="Alex Vance"
    )
    co_driver = serializers.CharField(
        required=False, allow_blank=True, default=""
    )
    shipper_commodity = serializers.CharField(
        required=False, allow_blank=True, default="Apex Industrial / Auto Components"
    )
    shipping_doc_no = serializers.CharField(
        required=False, allow_blank=True, default="BOL-8829104"
    )
    offline = serializers.BooleanField(
        required=False, default=False, help_text="Run offline without external reverse-geocoding."
    )

    def validate_start_datetime(self, value):
        if value is None:
            # Default to now rounded up to next 15-minute mark (naive local time)
            now = datetime.now()
            minute = (now.minute // 15 + 1) * 15
            if minute >= 60:
                now = now + timedelta(hours=1)
                minute = 0
            return now.replace(minute=minute, second=0, microsecond=0)
        # Strip timezone info if present to treat as home terminal naive local time
        if value.tzinfo is not None:
            return value.replace(tzinfo=None)
        return value


class GeocodeQuerySerializer(serializers.Serializer):
    q = serializers.CharField(min_length=2, max_length=255, required=True)
