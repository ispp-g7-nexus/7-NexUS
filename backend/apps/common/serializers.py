from rest_framework import serializers
from apps.residences.models import StudentProfile


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
        min_length=8,
        error_messages={
            "min_length": "La contraseña debe tener al menos 8 caracteres."
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


class StudentProfileSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source="user.get_full_name", read_only=True)
    room = serializers.SerializerMethodField()

    class Meta:
        model = StudentProfile
        fields = [
            "id",
            "name",
            "nickname",
            "bio",
            "birth_year",
            "birthplace",
            "room",
            "room_number",
            "profile_image",
            "chronotype",
            "study_level",
            "noise_sensitivity",
            "temperature_preference",
            "order_level",
            "interests",
            "custom_interests",
            "lifestyle",
            "music_genres",
            "dealbreakers",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "name", "room", "created_at", "updated_at"]

    def get_room(self, obj):
        from apps.membership.models import Membership
        membership = Membership.objects.filter(user=obj.user, role__name__iexact="Student", is_active=True).first()
        if membership and membership.bedroom:
            return membership.bedroom.numero
        return obj.room_number or ""

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return StudentProfile.objects.create(**validated_data)

    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance
