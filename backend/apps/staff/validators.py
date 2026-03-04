from rest_framework import serializers


class StaffFieldValidatorMixin:
    """Validadores de campo reutilizados en todos los serializers de escritura."""

    def validate_full_name(self, value: str) -> str:
        value = value.strip()
        if not value:
            raise serializers.ValidationError("El nombre no puede estar vacío.")
        return value

    def validate_email(self, value: str) -> str:
        return value.lower().strip()

    def validate_password(self, value: str) -> str:
        if value and len(value.strip()) < 8:
            raise serializers.ValidationError(
                "La contraseña debe tener al menos 8 caracteres."
            )
        return value
