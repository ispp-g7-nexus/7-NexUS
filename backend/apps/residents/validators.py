from datetime import date
import re

from django.core.validators import EmailValidator
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers


class ResidentFieldValidatorMixin:
    """Mixin con los validadores de campo comunes a todos los serializers
    de escritura de residente.
    """

    NAME_TOKEN_RE = re.compile(r"[A-Za-zÀ-ÿ'\-]{2,}")

    def validate_full_name(self, value: str) -> str:
        value = (value or "").strip()
        if not value:
            raise serializers.ValidationError("El nombre no puede estar vacío.")

        tokens = value.split()
        valid_tokens = [t for t in tokens if self.NAME_TOKEN_RE.search(t)]
        if len(valid_tokens) < 2:
            raise serializers.ValidationError(
                "Introduce al menos un nombre y un apellido válidos."
            )

        alpha_match = re.search(r"[A-Za-zÀ-ÿ]", value)
        if not alpha_match:
            raise serializers.ValidationError("Nombre inválido.")

        return value

    def validate_email(self, value: str) -> str:
        value = (value or "").strip().lower()
        validator = EmailValidator()
        try:
            validator(value)
        except DjangoValidationError:
            raise serializers.ValidationError("Por favor, introduce un correo electrónico válido.")
        parts = value.split("@", 1)
        if len(parts) != 2:
            raise serializers.ValidationError("Por favor, introduce un correo electrónico válido.")
        local, domain = parts

        if not re.search(r"[A-Za-z0-9]", local):
            raise serializers.ValidationError("Por favor, introduce un correo electrónico válido.")
        if not re.match(r"^[A-Za-z0-9]", local):
            raise serializers.ValidationError("El correo debe empezar por una letra o número.")

        if not re.search(r"\.[A-Za-z]{2,}$", domain):
            raise serializers.ValidationError("Dominio del correo inválido.")

        return value

    def validate_checkin_date_not_past(self, value):
        if value is None:
            return value
        if isinstance(value, date) and value < date.today():
            raise serializers.ValidationError("La fecha de check-in no puede ser pasada.")
        return value

