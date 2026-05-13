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
    VisitorAnalyticsResponseSerializer,
)
from .services import (
    cancel_guest_pass_for_resident,
    create_guest_pass_for_resident,
    get_active_guest_passes_queryset,
    get_admin_visitors_analytics,
    get_guest_pass_history_queryset,
    get_or_create_guest_pass_policy,
    get_resident_membership_for_user,
    get_upcoming_guest_passes_queryset,
    reject_guest_pass_admin,
    unreject_guest_pass_admin,
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


class AdminGuestPassRejectView(AdminGuestPassBaseView):
    def post(self, request, pass_id: int):
        guest_pass = reject_guest_pass_admin(pass_id, self._get_residence(request))
        return Response(GuestPassAdminReadSerializer(guest_pass).data)


class AdminGuestPassUnrejectView(AdminGuestPassBaseView):
    def post(self, request, pass_id: int):
        guest_pass = unreject_guest_pass_admin(pass_id, self._get_residence(request))
        return Response(GuestPassAdminReadSerializer(guest_pass).data)


class AdminGuestPassListView(AdminGuestPassBaseView):
    def get(self, request):
        residence = self._get_residence(request)
        policy = get_or_create_guest_pass_policy(residence)

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

        serializer = GuestPassAdminReadSerializer(
            queryset,
            many=True,
            context={
                "visit_start_time": policy.visit_start_time,
                "visit_end_time": policy.visit_end_time,
            },
        )
        return Response(serializer.data)


class AdminGuestPassNotificationsView(AdminGuestPassBaseView):
    NOTIFICATION_LIMIT = 8

    def get(self, request):
        residence = self._get_residence(request)
        policy = get_or_create_guest_pass_policy(residence)

        if policy.visit_end_time is None:
            return Response([], status=status.HTTP_200_OK)

        now = timezone.now()
        current_time = timezone.localtime(now).time().replace(tzinfo=None)
        if current_time < policy.visit_end_time:
            return Response([], status=status.HTTP_200_OK)

        guest_passes = (
            GuestPass.objects.filter(
                residence=residence,
                status=GuestPass.Status.ACTIVE,
                cancelled_at__isnull=True,
                revoked_at__isnull=True,
                valid_from__lte=now,
                valid_until__gte=now,
            )
            .select_related("resident__user")
            .order_by("valid_until", "-created_at")[: self.NOTIFICATION_LIMIT]
        )

        data = []
        for guest_pass in guest_passes:
            resident_user = getattr(getattr(guest_pass, "resident", None), "user", None)
            resident_name = (
                resident_user.get_full_name() if resident_user else ""
            ) or (resident_user.email if resident_user else "un residente")

            data.append(
                {
                    "id": guest_pass.id,
                    "title": "Visitante fuera de horario",
                    "message": (
                        f"El invitado del estudiante {resident_name} está fuera de horario."
                    ),
                    "created_at": guest_pass.updated_at.isoformat(),
                    "end_time": guest_pass.valid_until.isoformat(),
                }
            )

        return Response(data, status=status.HTTP_200_OK)


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


class AdminVisitorsAnalyticsView(AdminGuestPassBaseView):
    required_permission = "analytics"
    strict_permission = True

    def get(self, request):
        residence = self._get_residence(request)

        payload = get_admin_visitors_analytics(
            residence=residence,
            from_value=request.query_params.get("from"),
            to_value=request.query_params.get("to"),
            granularity_value=request.query_params.get("granularity"),
            compare_value=request.query_params.get("compare"),
        )
        serializer = VisitorAnalyticsResponseSerializer(data=payload)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.validated_data, status=status.HTTP_200_OK)
