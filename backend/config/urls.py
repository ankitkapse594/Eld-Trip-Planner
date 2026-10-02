"""
URL configuration for ELD Trip Planner backend.
"""

from django.urls import path, include

urlpatterns = [
    path("api/", include("trips.urls")),
    path("", include("trips.urls")),
]
