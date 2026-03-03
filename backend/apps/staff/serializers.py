from rest_framework import serializers

from .models import Staff
from .validators import StaffFieldValidatorMixin


class StaffReadSerializer(serializers.ModelSerializer):
    """
    Serializa un Staff para operaciones de lectura.
    Expone datos del perfil (Staff) + datos del usuario asociado (User).
    El campo `role` se devuelve como string libre (sin validar contra Membership).
    """

    full_name = serializers.SerializerMethodField()
    email = serializers.EmailField(source="user.email", read_only=True)
    role = serializers.SerializerMethodField()

    class Meta:
        model = Staff
        fields = [
            "id",
            "full_name",
            "email",
            "role",
            "job_title",
            "department",
            "location",
            "schedule",
            "status",
        ]

    def get_full_name(self, obj: Staff) -> str:
        return obj.user.get_full_name() or obj.user.username

    def get_role(self, obj: Staff) -> str:
        """Devuelve el primer rol activo del usuario en la residencia, si existe."""
        membership = (
            obj.user.memberships
            .filter(is_active=True)
            .values_list("role", flat=True)
            .first()
        )
        return membership or ""

class StaffCreateSerializer(StaffFieldValidatorMixin, serializers.Serializer):
    """
    Datos de entrada para dar de alta a un miembro del personal.
    Incluye campos del User (nombre, email, contraseña) y del perfil Staff.
    """
    full_name = serializers.CharField(
        max_length=150,
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
    role = serializers.CharField(max_length=50, required=False, allow_blank=True, default="")
    job_title = serializers.CharField(
        max_length=100,
        allow_blank=False,
        error_messages={"blank": "El cargo no puede estar vacío."},
    )
    department = serializers.CharField(
        max_length=100,
        allow_blank=False,
        error_messages={"blank": "El departamento no puede estar vacío."},
    )
    location = serializers.CharField(max_length=255, allow_blank=True, default="")
    schedule = serializers.CharField(max_length=100, allow_blank=True, default="")
    status = serializers.ChoiceField(
        choices=Staff.StatusChoices.choices,
        default=Staff.StatusChoices.ACTIVO,
    )

class StaffUpdateSerializer(StaffFieldValidatorMixin, serializers.Serializer):
    """
    Datos de entrada para actualizar un miembro del personal.
    Todos los campos son opcionales para soportar PATCH parcial.
    """
    full_name = serializers.CharField(
        max_length=150,
        required=False,
        allow_blank=False,
        error_messages={"blank": "El nombre no puede estar vacío."},
    )
    email = serializers.EmailField(
        required=False,
        error_messages={"invalid": "Por favor, introduce un correo electrónico válido."},
    )
    password = serializers.CharField(
        write_only=True,
        min_length=8,
        required=False,
        allow_blank=True,
        error_messages={"min_length": "La contraseña debe tener al menos 8 caracteres."},
    )
    role = serializers.CharField(max_length=50, required=False, allow_blank=True)
    job_title = serializers.CharField(max_length=100, required=False, allow_blank=False)
    department = serializers.CharField(max_length=100, required=False, allow_blank=False)
    location = serializers.CharField(max_length=255, required=False, allow_blank=True)
    schedule = serializers.CharField(max_length=100, required=False, allow_blank=True)
    status = serializers.ChoiceField(
        choices=Staff.StatusChoices.choices,
        required=False,
    )
