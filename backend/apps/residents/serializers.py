from rest_framework import serializers


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


class AdminCreateResidentSerializer(serializers.Serializer):
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
    room = serializers.CharField(max_length=20, allow_blank=True, default="")
    building = serializers.CharField(max_length=100, allow_blank=True, default="")
    checkin_date = serializers.DateField(required=False, allow_null=True)
    is_active = serializers.BooleanField(default=True)

    def validate_full_name(self, value: str) -> str:
        value = value.strip()
        if not value:
            raise serializers.ValidationError("El nombre no puede estar vacío.")
        return value

    def validate_email(self, value: str) -> str:
        return value.lower().strip()

    def validate_password(self, value: str) -> str:
        if value and len(value.strip()) < 8:
            raise serializers.ValidationError(
                "La contraseña debe tener al menos 8 caracteres."
            )
        return value


class ResidentUpdateSerializer(serializers.Serializer):
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

    def validate_full_name(self, value: str) -> str:
        value = value.strip()
        if not value:
            raise serializers.ValidationError("El nombre no puede estar vacío.")
        return value

    def validate_email(self, value: str) -> str:
        return value.lower().strip()
