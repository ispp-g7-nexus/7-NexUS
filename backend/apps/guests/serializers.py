from rest_framework import serializers

from .models import GuestPass


class GuestPassReadSerializer(serializers.ModelSerializer):
    class Meta:
        model = GuestPass
        fields = [
            "id",
            "full_name",
            "pass_code",
            "valid_from",
            "valid_until",
        ]
