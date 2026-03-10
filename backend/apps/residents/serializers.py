from rest_framework import serializers
from apps.residents.validators import ResidentFieldValidatorMixin


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
        error_messages={"invalid": "Por favor, introduce un correo electrónico válido."}
    )
    password = serializers.CharField(
        write_only=True,
        min_length=8,
        required=False,
        allow_blank=True,
        error_messages={"min_length": "La contraseña debe tener al menos 8 caracteres."},
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
    check_in_date = serializers.DateField(required=False, allow_null=True)
    is_active = serializers.BooleanField(required=False)
    # ID de la habitación; null para desasignar, omitir para no cambiar
    bedroom_id = serializers.IntegerField(required=False, allow_null=True)
