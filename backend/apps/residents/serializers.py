from rest_framework import serializers
from django.contrib.auth import get_user_model

from apps.residents.validators import (
    ResidentFieldValidatorMixin,
    INVALID_EMAIL_MESSAGE,
)
from apps.membership.models import Membership, Role
from apps.bedrooms.models import Bedroom

UserModel = get_user_model()


class ResidentReadSerializer(serializers.Serializer):
    """Serializador de salida (GET) para un residente.
    Compone datos de User + Membership.
    """

    id = serializers.IntegerField(help_text="ID de la Membership")
    full_name = serializers.CharField()
    email = serializers.EmailField()
    is_active = serializers.BooleanField()
    bedroom_id = serializers.IntegerField(allow_null=True)
    room = serializers.CharField(allow_blank=True)
    building = serializers.CharField(allow_blank=True)
    check_in_date = serializers.DateField(allow_null=True)
    created_at = serializers.DateTimeField()


class AdminCreateResidentSerializer(ResidentFieldValidatorMixin, serializers.Serializer):
    """Serializador de entrada (POST) para que un admin dé de alta a un residente."""

    full_name = serializers.CharField(
        max_length=100,
        allow_blank=False,
        error_messages={"blank": "El nombre no puede estar vacío."},
    )
    email = serializers.EmailField(
        max_length=254,
        error_messages={"invalid": INVALID_EMAIL_MESSAGE},
    )
    password = serializers.CharField(
        write_only=True,
        min_length=8,
        required=False,
        allow_blank=True,
        max_length=64,
        error_messages={
            "min_length": "La contraseña debe tener al menos 8 caracteres.",
            "max_length": "La contraseña no puede superar 64 caracteres."
        },
    )
    checkin_date = serializers.DateField(required=False, allow_null=True)
    is_active = serializers.BooleanField(default=True)
    # ID de la habitación a asignar (obligatorio en la creación)
    bedroom_id = serializers.IntegerField(required=True, allow_null=False, error_messages={"required": "Debes asignar una habitación al residente.", "null": "Debes asignar una habitación al residente."})

    def validate_password(self, value: str) -> str:
        if value and len(value.strip()) < 8:
            raise serializers.ValidationError(
                "La contraseña debe tener al menos 8 caracteres."
            )
        return value

    def validate_checkin_date(self, value):
        return self.validate_checkin_date_not_past(value)

    def validate(self, attrs: dict) -> dict:
        residence = self.context.get("residence") if hasattr(self, "context") else None

        self._validate_email_uniqueness(attrs, residence)
        self._validate_room_and_building(attrs, residence)

        return attrs

    def _validate_email_uniqueness(self, attrs: dict, residence):
        """Comprueba que no exista ya un residente con el mismo email en la residencia."""
        if not residence:
            return
        email = attrs.get("email")
        if not email:
            return

        user = UserModel.objects.filter(email__iexact=email).first()
        if not user:
            return

        student_role, _ = Role.objects.get_or_create(
            name="Student",
            residence=None,
            defaults={"description": "Estudiante / Residente", "is_system_default": True},
        )
        if Membership.objects.filter(user=user, role=student_role, residence=residence).exists():
            raise serializers.ValidationError({"email": "Ya existe un residente con ese correo en esta residencia."})

    def _validate_room_and_building(self, attrs: dict, residence):
        """Valida que la habitación indicada exista en la residencia."""
        if not residence:
            return
        room = attrs.get("room")
        building = attrs.get("building")
        if not (room and building):
            return

        if not Bedroom.objects.filter(residence=residence, numero=room, edificio=building, is_active=True).exists():
            raise serializers.ValidationError({"room": "La habitación indicada no existe en esta residencia."})


class ResidentUpdateSerializer(ResidentFieldValidatorMixin, serializers.Serializer):
    """Serializador de entrada (PUT/PATCH) para actualizar un residente."""

    full_name = serializers.CharField(
        max_length=100,
        required=False,
        allow_blank=False,
        error_messages={"blank": "El nombre no puede estar vacío."},
    )
    email = serializers.EmailField(
        required=False,
        error_messages={"invalid": INVALID_EMAIL_MESSAGE},
    )
    check_in_date = serializers.DateField(required=False, allow_null=True)
    is_active = serializers.BooleanField(required=False)
    # ID de la habitación; null para desasignar, omitir para no cambiar
    bedroom_id = serializers.IntegerField(required=False, allow_null=True)
