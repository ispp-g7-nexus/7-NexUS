from datetime import timedelta

from django.utils import timezone
from rest_framework import serializers

from apps.common.utils.validators import validate_person_name

from .models import GuestPass, GuestPassPolicy
from .services import is_guest_pass_out_of_schedule


def get_effective_guest_pass_status(guest_pass: GuestPass) -> str:
    if guest_pass.cancelled_at is not None:
        return GuestPass.Status.CANCELLED
    if guest_pass.revoked_at is not None:
        return GuestPass.Status.REVOKED
    if (
        guest_pass.status == GuestPass.Status.ACTIVE
        and guest_pass.valid_until < timezone.now()
    ):
        return GuestPass.Status.INACTIVE
    return guest_pass.status


class GuestPassCreateSerializer(serializers.Serializer):
    guest_first_name = serializers.CharField(
        required=True,
        allow_blank=False,
        max_length=100,
    )
    guest_last_name = serializers.CharField(
        required=True,
        allow_blank=False,
        max_length=100,
    )
    valid_from = serializers.DateTimeField(required=True)
    valid_until = serializers.DateTimeField(required=True)
    comment = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        max_length=500,
    )

    def validate_guest_first_name(self, value):
        return validate_person_name(value, "El nombre")

    def validate_guest_last_name(self, value):
        return validate_person_name(value, "El apellido")

    def validate(self, attrs):
        valid_from = attrs["valid_from"]
        valid_until = attrs["valid_until"]
        now = timezone.now()
        max_duration_hours = self.context.get("max_duration_hours", 24)
        visit_start_time = self.context.get("visit_start_time")
        visit_end_time = self.context.get("visit_end_time")
        max_duration = timedelta(hours=max_duration_hours)

        if valid_from < now:
            raise serializers.ValidationError(
                {
                    "valid_from": (
                        "La fecha/hora de inicio no puede ser anterior al momento actual."
                    )
                }
            )

        if valid_until < now:
            raise serializers.ValidationError(
                {
                    "valid_until": (
                        "La fecha/hora de fin no puede ser anterior al momento actual."
                    )
                }
            )

        if valid_until <= valid_from:
            raise serializers.ValidationError(
                {"valid_until": "La fecha de fin debe ser posterior a la de inicio."}
            )

        if valid_until - valid_from > max_duration:
            raise serializers.ValidationError(
                {
                    "valid_until": (
                        f"La duración máxima del pase es de {max_duration_hours} horas."
                    )
                }
            )

        valid_from_time = timezone.localtime(valid_from).time().replace(tzinfo=None)
        valid_until_time = timezone.localtime(valid_until).time().replace(tzinfo=None)

        if visit_start_time is not None:
            if valid_from_time < visit_start_time:
                raise serializers.ValidationError(
                    {
                        "valid_from": (
                            "La fecha de inicio no puede ser anterior a la hora de "
                            f"inicio de visitas ({visit_start_time.strftime('%H:%M')})."
                        )
                    }
                )

            if valid_until_time < visit_start_time:
                raise serializers.ValidationError(
                    {
                        "valid_until": (
                            "La fecha de fin no puede ser anterior a la hora de "
                            f"inicio de visitas ({visit_start_time.strftime('%H:%M')})."
                        )
                    }
                )

        if visit_end_time is not None:
            if valid_from_time >= visit_end_time:
                raise serializers.ValidationError(
                    {
                        "valid_from": (
                            "La fecha de inicio debe ser anterior a la hora límite de "
                            f"salida ({visit_end_time.strftime('%H:%M')})."
                        )
                    }
                )

            if valid_until_time >= visit_end_time:
                raise serializers.ValidationError(
                    {
                        "valid_until": (
                            "La fecha de fin debe ser anterior a la hora límite de "
                            f"salida ({visit_end_time.strftime('%H:%M')})."
                        )
                    }
                )

        return attrs


class GuestPassReadSerializer(serializers.ModelSerializer):
    status = serializers.SerializerMethodField()

    def get_status(self, obj: GuestPass) -> str:
        return get_effective_guest_pass_status(obj)

    class Meta:
        model = GuestPass
        fields = [
            "id",
            "full_name",
            "pass_code",
            "valid_from",
            "valid_until",
            "status",
            "comment",
        ]


class GuestPassAdminReadSerializer(serializers.ModelSerializer):
    resident_name = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()
    out_of_schedule = serializers.SerializerMethodField()

    def get_status(self, obj: GuestPass) -> str:
        return get_effective_guest_pass_status(obj)

    class Meta:
        model = GuestPass
        fields = [
            "id",
            "full_name",
            "pass_code",
            "valid_from",
            "valid_until",
            "status",
            "comment",
            "created_at",
            "resident_name",
            "out_of_schedule",
        ]

    def get_resident_name(self, obj) -> str:
        resident = getattr(obj, "resident", None)
        user = getattr(resident, "user", None)
        if user is None:
            return "—"
        return user.get_full_name() or user.email

    def get_out_of_schedule(self, obj: GuestPass) -> bool:
        visit_start_time = self.context.get("visit_start_time")
        visit_end_time = self.context.get("visit_end_time")
        return is_guest_pass_out_of_schedule(
            obj,
            visit_start_time=visit_start_time,
            visit_end_time=visit_end_time,
        )


class GuestPassPolicyReadSerializer(serializers.ModelSerializer):
    class Meta:
        model = GuestPassPolicy
        fields = [
            "max_duration_hours",
            "max_concurrent_passes",
            "visit_start_time",
            "visit_end_time",
        ]


class GuestPassPolicyUpdateSerializer(serializers.Serializer):
    max_duration_hours = serializers.IntegerField(min_value=1, max_value=168, required=False)
    max_concurrent_passes = serializers.IntegerField(min_value=1, max_value=20, required=False)
    visit_start_time = serializers.TimeField(required=False, allow_null=True)
    visit_end_time = serializers.TimeField(required=False, allow_null=True)

    def validate(self, attrs):
        if not attrs:
            raise serializers.ValidationError(
                {"detail": "Debes enviar al menos un campo para actualizar."}
            )

        current_policy = self.context.get("current_policy")
        if current_policy is not None:
            effective_visit_start_time = attrs.get(
                "visit_start_time", current_policy.visit_start_time
            )
            effective_visit_end_time = attrs.get(
                "visit_end_time", current_policy.visit_end_time
            )

            if (
                effective_visit_start_time is not None
                and effective_visit_end_time is not None
                and effective_visit_start_time >= effective_visit_end_time
            ):
                raise serializers.ValidationError(
                    {
                        "visit_start_time": (
                            "La hora de inicio de visitas debe ser anterior a la hora límite de salida."
                        )
                    }
                )
        return attrs


class VisitorAnalyticsSummarySerializer(serializers.Serializer):
    total_visits = serializers.IntegerField(min_value=0)
    total_hosts = serializers.IntegerField(min_value=0)
    compare_value_total_visits = serializers.IntegerField(min_value=0, allow_null=True)
    compare_value_total_hosts = serializers.IntegerField(min_value=0, allow_null=True)
    delta_total_visits = serializers.IntegerField(allow_null=True)
    delta_total_hosts = serializers.IntegerField(allow_null=True)
    delta_pct_total_visits = serializers.FloatField(allow_null=True)
    delta_pct_total_hosts = serializers.FloatField(allow_null=True)


class VisitorAnalyticsByHostSerializer(serializers.Serializer):
    host_id = serializers.IntegerField()
    host_name = serializers.CharField()
    visitors_count = serializers.IntegerField(min_value=0)
    pct_of_total = serializers.FloatField(min_value=0)
    compare_value = serializers.IntegerField(min_value=0, allow_null=True)
    delta = serializers.IntegerField(allow_null=True)
    delta_pct = serializers.FloatField(allow_null=True)


class VisitorAnalyticsPeakHourSerializer(serializers.Serializer):
    hour = serializers.IntegerField(min_value=0, max_value=23)
    label = serializers.CharField()
    visits_count = serializers.IntegerField(min_value=0)
    compare_value = serializers.IntegerField(min_value=0, allow_null=True)
    delta = serializers.IntegerField(allow_null=True)
    delta_pct = serializers.FloatField(allow_null=True)


class VisitorAnalyticsMetaSerializer(serializers.Serializer):
    from_value = serializers.DateTimeField()
    to_value = serializers.DateTimeField()
    granularity = serializers.CharField()
    compare = serializers.CharField()
    compare_from = serializers.DateTimeField(allow_null=True)
    compare_to = serializers.DateTimeField(allow_null=True)


class VisitorAnalyticsResponseSerializer(serializers.Serializer):
    summary = VisitorAnalyticsSummarySerializer()
    visitors_by_host = VisitorAnalyticsByHostSerializer(many=True)
    peak_hours = VisitorAnalyticsPeakHourSerializer(many=True)
    meta = VisitorAnalyticsMetaSerializer()
