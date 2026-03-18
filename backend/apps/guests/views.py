from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.membership.permissions import IsResident

from .serializers import GuestPassReadSerializer
from .services import (
    get_active_guest_passes_queryset,
    get_resident_membership_for_user,
)

ERROR_NO_RESIDENCE = "No se ha determinado la residencia."


class ResidentGuestPassBaseView(APIView):
    permission_classes = [IsResident]

    def get_membership(self, request):
        residence = getattr(request, "residence", None)
        if not residence:
            raise ValidationError({"detail": ERROR_NO_RESIDENCE})

        membership = get_resident_membership_for_user(request.user, residence)
        if membership is None:
            raise NotFound("Residente no encontrado.")
        return membership, residence


class ResidentActiveGuestPassListView(ResidentGuestPassBaseView):
    def get(self, request):
        membership, residence = self.get_membership(request)
        queryset = get_active_guest_passes_queryset(membership, residence)
        serializer = GuestPassReadSerializer(queryset, many=True)
        return Response(serializer.data)
