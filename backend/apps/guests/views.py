from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone

from apps.membership.permissions import IsResidenceAdmin, IsResident

from .models import GuestPass
from .serializers import (
    GuestPassAdminReadSerializer,
    GuestPassCreateSerializer,
    GuestPassPolicyReadSerializer,
    GuestPassPolicyUpdateSerializer,
    GuestPassReadSerializer,
)
from .services import (
    create_guest_pass_for_resident,
    get_active_guest_passes_queryset,
    get_or_create_guest_pass_policy,
    get_resident_membership_for_user,
    get_upcoming_guest_passes_queryset,
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


class ResidentUpcomingGuestPassListView(ResidentGuestPassBaseView):
    def get(self, request):
        membership, residence = self.get_membership(request)
        queryset = get_upcoming_guest_passes_queryset(membership, residence)
        serializer = GuestPassReadSerializer(queryset, many=True)
        return Response(serializer.data)


class ResidentGuestPassCreateView(ResidentGuestPassBaseView):
    def post(self, request):
        membership, residence = self.get_membership(request)
        policy = get_or_create_guest_pass_policy(residence)

        serializer = GuestPassCreateSerializer(
            data=request.data,
            context={"max_duration_hours": policy.max_duration_hours},
        )
        serializer.is_valid(raise_exception=True)

        guest_pass = create_guest_pass_for_resident(
            membership=membership,
            residence=residence,
            guest_first_name=serializer.validated_data["guest_first_name"],
            guest_last_name=serializer.validated_data["guest_last_name"],
            valid_from=serializer.validated_data["valid_from"],
            valid_until=serializer.validated_data["valid_until"],
            comment=serializer.validated_data.get("comment", ""),
            policy=policy,
        )

        return Response(
            GuestPassReadSerializer(guest_pass).data,
            status=status.HTTP_201_CREATED,
        )


class ResidentGuestPassCancelView(ResidentGuestPassBaseView):
    def post(self, request, guest_pass_id: int):
        membership, residence = self.get_membership(request)
        guest_pass = GuestPass.objects.filter(
            id=guest_pass_id,
            residence=residence,
            resident=membership,
        ).first()
        if guest_pass is None:
            raise NotFound("Pase no encontrado.")

        if guest_pass.cancelled_at is not None or guest_pass.status == GuestPass.Status.CANCELLED:
            raise ValidationError({"detail": "El pase ya está cancelado."})

        if guest_pass.revoked_at is not None or guest_pass.status == GuestPass.Status.REVOKED:
            raise ValidationError(
                {"detail": "El pase está revocado y no puede cancelarse."}
            )

        now = timezone.now()
        is_cancellable = (
            guest_pass.status == GuestPass.Status.ACTIVE
            and guest_pass.valid_until >= now
            and guest_pass.cancelled_at is None
            and guest_pass.revoked_at is None
        )
        if not is_cancellable:
            raise ValidationError(
                {"detail": "Solo puedes cancelar pases activos o próximos."}
            )

        guest_pass.status = GuestPass.Status.CANCELLED
        guest_pass.cancelled_at = now
        guest_pass.save(update_fields=["status", "cancelled_at", "updated_at"])

        return Response(
            {
                "detail": "Pase cancelado correctamente.",
                "guest_pass": GuestPassReadSerializer(guest_pass).data,
            },
            status=status.HTTP_200_OK,
        )


class ResidentGuestPassPolicyView(ResidentGuestPassBaseView):
    permission_classes = [IsResident]

    def get(self, request):
        _, residence = self.get_membership(request)
        policy = get_or_create_guest_pass_policy(residence)
        return Response(
            GuestPassPolicyReadSerializer(policy).data,
            status=status.HTTP_200_OK,
        )


class AdminGuestPassListView(APIView):
    permission_classes = [IsAuthenticated, IsResidenceAdmin]

    def get(self, request):
        residence = getattr(request, "residence", None)
        if not residence:
            raise ValidationError({"detail": ERROR_NO_RESIDENCE})

        queryset = (
            residence.guest_passes
            .select_related("resident__user")
            .order_by("-created_at")
        )
        status_filter = request.query_params.get("status")
        if status_filter:
            queryset = queryset.filter(status=status_filter.upper())

        serializer = GuestPassAdminReadSerializer(queryset, many=True)
        return Response(serializer.data)


class AdminGuestPassPolicyView(APIView):
    permission_classes = [IsAuthenticated, IsResidenceAdmin]

    def _get_residence(self, request):
        residence = getattr(request, "residence", None)
        if not residence:
            raise ValidationError({"detail": ERROR_NO_RESIDENCE})
        return residence

    def get(self, request):
        policy = get_or_create_guest_pass_policy(self._get_residence(request))
        return Response(
            GuestPassPolicyReadSerializer(policy).data,
            status=status.HTTP_200_OK,
        )

    def patch(self, request):
        policy = get_or_create_guest_pass_policy(self._get_residence(request))
        serializer = GuestPassPolicyUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        for field, value in serializer.validated_data.items():
            setattr(policy, field, value)
        policy.full_clean()
        policy.save(update_fields=[*serializer.validated_data.keys(), "updated_at"])

        return Response(
            GuestPassPolicyReadSerializer(policy).data,
            status=status.HTTP_200_OK,
        )
