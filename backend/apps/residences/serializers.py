from rest_framework import serializers
import re

from .models import ResidenceBranding


class ResidenceBrandingSerializer(serializers.ModelSerializer):
    class Meta:
        model = ResidenceBranding
        fields = [
            "primary_color",
            "secondary_color",
            "accent_color",
            "logo_url",
            "favicon_url",
            "custom_css",
            "updated_at",
        ]
        read_only_fields = ["updated_at"]
        extra_kwargs = {
            "logo_url": {
                "error_messages": {
                    "invalid": "La URL del logo debe ser válida (ej: https://ejemplo.com/logo.png)",
                    "max_length": "La URL del logo no debe exceder 200 caracteres (actualmente: {input_len})",
                    "blank": "Este campo es opcional pero si se proporciona debe contener una URL válida",
                }
            },
            "favicon_url": {
                "error_messages": {
                    "invalid": "La URL del favicon debe ser válida (ej: https://ejemplo.com/favicon.ico)",
                    "max_length": "La URL del favicon no debe exceder 200 caracteres (actualmente: {input_len})",
                    "blank": "Este campo es opcional pero si se proporciona debe contener una URL válida",
                }
            },
        }

    def validate_logo_url(self, value: str) -> str:
        if not value:
            return value

        value = value.strip()
        if len(value) > 200:
            raise serializers.ValidationError(
                f"La URL del logo no debe exceder 200 caracteres (proporcionados: {len(value)})"
            )

        if not value.startswith(("http://", "https://")):
            raise serializers.ValidationError(
                "La URL del logo debe comenzar con http:// o https://"
            )

        return value

    def validate_favicon_url(self, value: str) -> str:
        if not value:
            return value

        value = value.strip()
        if len(value) > 200:
            raise serializers.ValidationError(
                f"La URL del favicon no debe exceder 200 caracteres (proporcionados: {len(value)})"
            )

        if not value.startswith(("http://", "https://")):
            raise serializers.ValidationError(
                "La URL del favicon debe comenzar con http:// o https://"
            )

        return value

    def validate_primary_color(self, value: str) -> str:
        if not re.match(r"^#[0-9a-fA-F]{6}$", value):
            raise serializers.ValidationError(
                "El color principal debe ser un código hexadecimal válido (ej: #0F4C81)"
            )
        return value

    def validate_secondary_color(self, value: str) -> str:
        if not re.match(r"^#[0-9a-fA-F]{6}$", value):
            raise serializers.ValidationError(
                "El color secundario debe ser un código hexadecimal válido (ej: #F4B400)"
            )
        return value

    def validate_accent_color(self, value: str) -> str:
        if not re.match(r"^#[0-9a-fA-F]{6}$", value):
            raise serializers.ValidationError(
                "El color acento debe ser un código hexadecimal válido (ej: #2E7D32)"
            )
        return value
