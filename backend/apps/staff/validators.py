from rest_framework import serializers

from apps.common.utils.validators import validate_person_name


class StaffFieldValidatorMixin:
    """Validadores de campo reutilizados en todos los serializers de escritura."""

    def validate_full_name(self, value: str) -> str:
        return validate_person_name(value, "El nombre")

    def validate_email(self, value: str) -> str:
        return value.lower().strip()

    def validate_password(self, value: str) -> str:
        if value and len(value.strip()) < 8:
            raise serializers.ValidationError(
                "La contraseña debe tener al menos 8 caracteres."
            )
        return value
