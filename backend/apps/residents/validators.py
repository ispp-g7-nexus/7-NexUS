from datetime import date
import re

from django.core.validators import EmailValidator
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from apps.common.utils.validators import validate_person_name


# Mensajes reutilizables
INVALID_EMAIL_MESSAGE = "Por favor, introduce un correo electrónico válido."


class ResidentFieldValidatorMixin:
    """Mixin con los validadores de campo comunes a todos los serializers
    de escritura de residente.
    """

    def validate_full_name(self, value: str) -> str:
        # Validamos que el nombre solo contenga caracteres propios de un nombre
        # (letras, espacios, guiones y apóstrofes). No se exige un número
        # concreto de palabras: el campo admite el nombre tal y como lo
        # escriba el administrador.
        return validate_person_name(value, "El nombre")

    def validate_email(self, value: str) -> str:
        value = (value or "").strip().lower()
        validator = EmailValidator()
        try:
            validator(value)
        except DjangoValidationError:
            raise serializers.ValidationError(INVALID_EMAIL_MESSAGE)
        parts = value.split("@", 1)
        if len(parts) != 2:
            raise serializers.ValidationError(INVALID_EMAIL_MESSAGE)
        local, domain = parts

        if not re.search(r"[A-Za-z0-9]", local):
            raise serializers.ValidationError(INVALID_EMAIL_MESSAGE)
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

