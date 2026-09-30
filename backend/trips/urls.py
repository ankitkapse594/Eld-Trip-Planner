"""
URL patterns for trips API.
"""

from django.urls import path
from .views import TripPlanView, GeocodeView, HealthCheckView

urlpatterns = [
    path("trips/plan/", TripPlanView.as_view(), name="trip-plan"),
    path("geocode/", GeocodeView.as_view(), name="geocode"),
    path("health/", HealthCheckView.as_view(), name="health"),
]
