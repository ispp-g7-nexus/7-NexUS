from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.membership.permissions import IsResidenceAdmin

from .models import ResidenceBranding
from .serializers import ResidenceBrandingSerializer
from apps.chats.realtime import publish_chat_event


class ResidenceBrandingAdminView(APIView):
    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAuthenticated()]
        return [IsAuthenticated(), IsResidenceAdmin()]

    def _get_branding(self, request):
        residence = getattr(request, "residence", None)
        if not residence:
            return None

        branding, _ = ResidenceBranding.objects.get_or_create(residence=residence)
        return branding

    def get(self, request):
        branding = self._get_branding(request)
        if not branding:
            return Response(
                {"detail": "No se ha determinado la residencia."},
                status=400,
            )

        serializer = ResidenceBrandingSerializer(branding)
        return Response(serializer.data)

    def patch(self, request):
        branding = self._get_branding(request)
        if not branding:
            return Response(
                {"detail": "No se ha determinado la residencia."},
                status=400,
            )

        serializer = ResidenceBrandingSerializer(
            branding,
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        publish_chat_event(
            branding.residence_id,
            "branding_updated",
            serializer.data,
        )

        return Response(serializer.data)
