from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings


class HealthCheckView(APIView):
    """
    Health check endpoint for container / serverless liveness probes.
    """

    def get(self, request):
        provider = "openrouteservice" if settings.ORS_API_KEY else "osrm/nominatim"
        return Response(
            {
                "status": "ok",
                "service": "eld-trip-planner-backend",
                "provider": provider,
                "avg_speed_mph": settings.AVG_SPEED_MPH,
            },
            status=status.HTTP_200_OK,
        )
