from rest_framework import serializers
from django.contrib.auth import get_user_model

from apps.residents.validators import ResidentFieldValidatorMixin
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
        error_messages={"invalid": "Por favor, introduce un correo electrónico válido."},
    )
    password = serializers.CharField(
        write_only=True,
        min_length=8,
        required=False,
        allow_blank=True,
        max_length=128,
        error_messages={"min_length": "La contraseña debe tener al menos 8 caracteres."},
    )
    room = serializers.CharField(max_length=20, allow_blank=True, default="")
    building = serializers.CharField(max_length=100, allow_blank=True, default="")
    checkin_date = serializers.DateField(required=False, allow_null=True)
    is_active = serializers.BooleanField(default=True)

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

        email = attrs.get("email")
        room = attrs.get("room")
        building = attrs.get("building")

        if residence:
            if email:
                user = UserModel.objects.filter(email__iexact=email).first()
                if user:
                    student_role, _ = Role.objects.get_or_create(
                        name="Student",
                        residence=None,
                        defaults={"description": "Estudiante / Residente", "is_system_default": True},
                    )
                    if Membership.objects.filter(user=user, role=student_role, residence=residence).exists():
                        raise serializers.ValidationError({"email": "Ya existe un residente con ese correo en esta residencia."})

            if room and building:
                if not Bedroom.objects.filter(residence=residence, numero=room, edificio=building, is_active=True).exists():
                    raise serializers.ValidationError({"room": "La habitación indicada no existe en esta residencia."})

        return attrs


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
        error_messages={"invalid": "Por favor, introduce un correo electrónico válido."},
    )
    room = serializers.CharField(max_length=20, required=False, allow_blank=True)
    building = serializers.CharField(max_length=100, required=False, allow_blank=True)
    check_in_date = serializers.DateField(required=False, allow_null=True)
    is_active = serializers.BooleanField(required=False)
