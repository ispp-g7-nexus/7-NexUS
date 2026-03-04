from rest_framework import serializers


class ResidentFieldValidatorMixin:
    """Mixin con los validadores de campo comunes a todos los serializers
    de escritura de residente."""

    def validate_full_name(self, value: str) -> str:
        value = value.strip()
        if not value:
            raise serializers.ValidationError("El nombre no puede estar vacío.")
        return value

    def validate_email(self, value: str) -> str:
        return value.lower().strip()

