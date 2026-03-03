from rest_framework import serializers


class AdminCreateResidentSerializer(serializers.Serializer):
    """Serializador de entrada (POST) para que un admin dé de alta a un residente."""

    full_name = serializers.CharField(allow_blank=True, default="")
    email = serializers.EmailField(
        error_messages={"invalid": "Por favor, introduce un correo electrónico válido."}
    )
    password = serializers.CharField(write_only=True, min_length=6, required=False, allow_blank=True)
    room = serializers.CharField(allow_blank=True, default="")
    building = serializers.CharField(allow_blank=True, default="")
    checkin_date = serializers.DateField(required=False, allow_null=True)
    state = serializers.ChoiceField(choices=["Activo", "Inactivo"])
