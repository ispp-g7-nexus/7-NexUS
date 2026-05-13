from rest_framework import serializers

from .models import Package


class PackageReadSerializer(serializers.ModelSerializer):
    resident_id = serializers.IntegerField(read_only=True)
    resident_name = serializers.CharField(source="resident_name_snapshot", read_only=True)
    room = serializers.CharField(source="room_snapshot", read_only=True)
    building = serializers.CharField(source="building_snapshot", read_only=True)
    is_unread = serializers.SerializerMethodField()

    class Meta:
        model = Package
        fields = [
            "id",
            "resident_id",
            "resident_name",
            "room",
            "building",
            "carrier",
            "tracking_number",
            "delivery_code",
            "notes",
            "status",
            "received_at",
            "delivered_at",
            "created_at",
            "updated_at",
            "is_unread",
        ]

    def get_is_unread(self, obj: Package) -> bool:
        return (
            obj.status == Package.Status.RECEIVED
            and obj.resident_viewed_at is None
        )


class PackageCreateSerializer(serializers.Serializer):
    resident_id = serializers.IntegerField(required=True)
    carrier = serializers.CharField(required=False, allow_blank=True, max_length=120)
    tracking_number = serializers.CharField(required=False, allow_blank=True, max_length=120)
    notes = serializers.CharField(required=False, allow_blank=True, max_length=2000)
    status = serializers.ChoiceField(
        choices=Package.Status.choices,
        required=False,
        default=Package.Status.RECEIVED,
    )
    received_at = serializers.DateTimeField(required=False)


class PackageUpdateSerializer(serializers.Serializer):
    resident_id = serializers.IntegerField(required=False)
    carrier = serializers.CharField(required=False, allow_blank=True, max_length=120)
    tracking_number = serializers.CharField(required=False, allow_blank=True, max_length=120)
    notes = serializers.CharField(required=False, allow_blank=True, max_length=2000)
    status = serializers.ChoiceField(choices=Package.Status.choices, required=False)
    received_at = serializers.DateTimeField(required=False)


class LabelPreviewInputSerializer(serializers.Serializer):
    # FileField avoids coupling the OCR flow to Pillow image validation.
    label_image = serializers.FileField(required=True)

    def validate_label_image(self, value):
        content_type = (getattr(value, "content_type", "") or "").lower()
        if not content_type.startswith("image/"):
            raise serializers.ValidationError("El archivo debe ser una imagen.")
        return value


class PackageDeliverByQrSerializer(serializers.Serializer):
    qr_token = serializers.CharField(required=True, allow_blank=False)
