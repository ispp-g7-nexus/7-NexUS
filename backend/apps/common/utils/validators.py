"""Validadores reutilizables compartidos entre apps."""

import re

from rest_framework import serializers

# Caracteres válidos en un nombre/apellido: letras (incluidos acentos y la ñ),
# espacios, guiones y apóstrofes. Rechaza dígitos y símbolos como , · $ % & /
NAME_ALLOWED_RE = re.compile(r"^[A-Za-zÀ-ÿ'\- ]+$")
NAME_HAS_LETTER_RE = re.compile(r"[A-Za-zÀ-ÿ]")


def validate_person_name(value: str, field_label: str = "El nombre") -> str:
    """Valida que un nombre o apellido solo contenga caracteres propios de un nombre.

    Devuelve el valor saneado (sin espacios sobrantes) o lanza un
    ``serializers.ValidationError`` con un mensaje en español.
    """
    value = (value or "").strip()
    if not value:
        raise serializers.ValidationError(f"{field_label} no puede estar vacío.")
    if not NAME_HAS_LETTER_RE.search(value):
        raise serializers.ValidationError(f"{field_label} no es válido.")
    if not NAME_ALLOWED_RE.match(value):
        raise serializers.ValidationError(
            f"{field_label} solo puede contener letras, espacios, guiones y apóstrofes."
        )
    return value
