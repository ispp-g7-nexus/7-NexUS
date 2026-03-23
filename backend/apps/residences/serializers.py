from rest_framework import serializers

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
