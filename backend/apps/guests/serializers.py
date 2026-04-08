from datetime import timedelta

from django.utils import timezone
from rest_framework import serializers
from django.utils import timezone

from .models import GuestPass, GuestPassPolicy


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

    def validate(self, attrs):
        valid_from = attrs["valid_from"]
        valid_until = attrs["valid_until"]
        now = timezone.now()
        max_duration_hours = self.context.get("max_duration_hours", 24)
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
        ]

    def get_resident_name(self, obj) -> str:
        resident = getattr(obj, "resident", None)
        user = getattr(resident, "user", None)
        if user is None:
            return "—"
        return user.get_full_name() or user.email


class GuestPassPolicyReadSerializer(serializers.ModelSerializer):
    class Meta:
        model = GuestPassPolicy
        fields = [
            "max_duration_hours",
            "max_concurrent_passes",
        ]


class GuestPassPolicyUpdateSerializer(serializers.Serializer):
    max_duration_hours = serializers.IntegerField(min_value=1, max_value=168, required=False)
    max_concurrent_passes = serializers.IntegerField(min_value=1, max_value=20, required=False)

    def validate(self, attrs):
        if not attrs:
            raise serializers.ValidationError(
                {"detail": "Debes enviar al menos un campo para actualizar."}
            )
        return attrs
