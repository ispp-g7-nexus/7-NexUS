from datetime import timedelta

from rest_framework import serializers

from .models import GuestPass, GuestPassPolicy


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
        max_duration_hours = self.context.get("max_duration_hours", 24)
        max_duration = timedelta(hours=max_duration_hours)

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
