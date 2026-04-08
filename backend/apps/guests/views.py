from django.utils import timezone
from rest_framework import status
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.membership.permissions import IsResident

from .models import GuestPass
from .permissions import IsGuestAdmin
from .serializers import (
    GuestPassAdminReadSerializer,
    GuestPassCreateSerializer,
    GuestPassPolicyReadSerializer,
    GuestPassPolicyUpdateSerializer,
    GuestPassReadSerializer,
)
from .services import (
    cancel_guest_pass_for_resident,
    create_guest_pass_for_resident,
    get_active_guest_passes_queryset,
    get_guest_pass_history_queryset,
    get_or_create_guest_pass_policy,
    get_resident_membership_for_user,
    get_upcoming_guest_passes_queryset,
    revoke_guest_pass_admin,
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


class ResidentGuestPassHistoryListView(ResidentGuestPassBaseView):
    def get(self, request):
        membership, residence = self.get_membership(request)
        queryset = get_guest_pass_history_queryset(membership, residence)
        serializer = GuestPassReadSerializer(queryset, many=True)
        return Response(serializer.data)


class ResidentGuestPassCreateView(ResidentGuestPassBaseView):
    def post(self, request):
        membership, residence = self.get_membership(request)
        policy = get_or_create_guest_pass_policy(residence)

        serializer = GuestPassCreateSerializer(
            data=request.data,
            context={
                "max_duration_hours": policy.max_duration_hours,
                "visit_start_time": policy.visit_start_time,
                "visit_end_time": policy.visit_end_time,
            },
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
    def post(self, request, pass_id: int):
        membership, residence = self.get_membership(request)
        guest_pass = cancel_guest_pass_for_resident(pass_id, membership, residence)
        return Response(
            {
                "detail": "Pase cancelado correctamente.",
                "guest_pass": GuestPassReadSerializer(guest_pass).data,
            }
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


class AdminGuestPassBaseView(APIView):
    permission_classes = [IsAuthenticated, IsGuestAdmin]

    def _get_residence(self, request):
        residence = getattr(request, "residence", None)
        if not residence:
            raise ValidationError({"detail": ERROR_NO_RESIDENCE})
        return residence


class AdminGuestPassRevokeView(AdminGuestPassBaseView):
    def post(self, request, pass_id: int):
        guest_pass = revoke_guest_pass_admin(pass_id, self._get_residence(request))
        return Response(GuestPassAdminReadSerializer(guest_pass).data)


class AdminGuestPassListView(AdminGuestPassBaseView):
    def get(self, request):
        residence = self._get_residence(request)

        queryset = residence.guest_passes.select_related("resident__user").order_by(
            "-created_at"
        )
        status_filter = request.query_params.get("status")
        if status_filter:
            normalized_status = status_filter.strip().upper()
            now = timezone.now()
            if normalized_status == GuestPass.Status.ACTIVE:
                queryset = queryset.filter(
                    status=GuestPass.Status.ACTIVE,
                    cancelled_at__isnull=True,
                    revoked_at__isnull=True,
                    valid_from__lte=now,
                    valid_until__gte=now,
                )
            elif normalized_status == GuestPass.Status.INACTIVE:
                queryset = queryset.filter(
                    status=GuestPass.Status.ACTIVE,
                    cancelled_at__isnull=True,
                    revoked_at__isnull=True,
                    valid_until__lt=now,
                )
            else:
                queryset = queryset.filter(status=normalized_status)

        serializer = GuestPassAdminReadSerializer(queryset, many=True)
        return Response(serializer.data)


class AdminGuestPassPolicyView(AdminGuestPassBaseView):
    def get(self, request):
        policy = get_or_create_guest_pass_policy(self._get_residence(request))
        return Response(
            GuestPassPolicyReadSerializer(policy).data,
            status=status.HTTP_200_OK,
        )

    def patch(self, request):
        policy = get_or_create_guest_pass_policy(self._get_residence(request))
        serializer = GuestPassPolicyUpdateSerializer(
            data=request.data,
            partial=True,
            context={"current_policy": policy},
        )
        serializer.is_valid(raise_exception=True)

        for field, value in serializer.validated_data.items():
            setattr(policy, field, value)
        policy.full_clean()
        policy.save(update_fields=[*serializer.validated_data.keys(), "updated_at"])

        return Response(
            GuestPassPolicyReadSerializer(policy).data,
            status=status.HTTP_200_OK,
        )
