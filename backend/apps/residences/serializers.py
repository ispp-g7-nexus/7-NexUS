import re

from rest_framework import serializers

from .models import ResidenceBranding


class ResidenceBrandingSerializer(serializers.ModelSerializer):
    FALLBACK_COLOR = "#000000"

    class Meta:
        model = ResidenceBranding
        fields = [
            "primary_color",
            "secondary_color",
            "accent_color",
            "logo_url",
            "favicon_url",
            "custom_css",
            "legal_terms",
            "updated_at",
        ]
        read_only_fields = ["updated_at"]
        extra_kwargs = {
            "logo_url": {
                "error_messages": {
                    "invalid": "La URL del logo debe ser válida (ej: https://ejemplo.com/logo.png)",
                    "max_length": "La URL del logo no debe exceder {max_length} caracteres",
                    "blank": "Este campo es opcional pero si se proporciona debe contener una URL válida",
                }
            },
            "favicon_url": {
                "error_messages": {
                    "invalid": "La URL del favicon debe ser válida (ej: https://ejemplo.com/favicon.ico)",
                    "max_length": "La URL del favicon no debe exceder {max_length} caracteres",
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

        if not value.startswith(("http://", "https://")):  # NOSONAR
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

        if not value.startswith(("http://", "https://")):  # NOSONAR
            raise serializers.ValidationError(
                "La URL del favicon debe comenzar con http:// o https://"
            )

        return value

    def _normalize_color_or_default(self, value: str) -> str:
        normalized = str(value or "").strip().upper()
        if re.match(r"^#[0-9A-F]{6}$", normalized):
            return normalized
        return self.FALLBACK_COLOR

    def validate_primary_color(self, value: str) -> str:
        return self._normalize_color_or_default(value)

    def validate_secondary_color(self, value: str) -> str:
        return self._normalize_color_or_default(value)

    def validate_accent_color(self, value: str) -> str:
        return self._normalize_color_or_default(value)
