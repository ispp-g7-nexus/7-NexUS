from rest_framework import serializers


class LoginInputSerializer(serializers.Serializer):
    email = serializers.EmailField(
        error_messages={"invalid": "Por favor, introduce un correo electrónico válido."}
    )
    password = serializers.CharField(write_only=True)
    portal = serializers.ChoiceField(
        choices=["student", "admin"],
        error_messages={"invalid_choice": "Portal inválido. Usa 'student' o 'admin'."},
    )


class PlanSerializer(serializers.Serializer):
    code = serializers.CharField()
    name = serializers.CharField()
    max_residences = serializers.IntegerField()
    allows_whitelabel = serializers.BooleanField()


class BrandingSerializer(serializers.Serializer):
    primary_color = serializers.CharField()
    secondary_color = serializers.CharField()
    accent_color = serializers.CharField()
    logo_url = serializers.URLField()
    favicon_url = serializers.URLField()
    custom_css = serializers.CharField()


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField(
        error_messages={"invalid": "Por favor, introduce un correo electrónico válido."}
    )


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField(
        error_messages={"blank": "Falta el identificador de usuario (uid)."}
    )
    token = serializers.CharField(
        error_messages={"blank": "Falta el token de seguridad."}
    )
    new_password = serializers.CharField(
        write_only=True,
        min_length=6,
        error_messages={
            "min_length": "La contraseña debe tener al menos 6 caracteres."
        },
    )

class AdminCreateResidentSerializer(serializers.Serializer):
    full_name = serializers.CharField(allow_blank=True)
    email = serializers.EmailField(
        error_messages={"invalid": "Por favor, introduce un correo electrónico válido."}
    )
    password = serializers.CharField(write_only=True, min_length=6)
    room = serializers.CharField(allow_blank=True)
    building = serializers.CharField(allow_blank=True)
    checkin_date = serializers.DateField(required=False, allow_null=True)
    state = serializers.ChoiceField(choices=["Activo", "Inactivo"])
