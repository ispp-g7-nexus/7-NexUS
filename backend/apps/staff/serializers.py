from rest_framework import serializers

from .models import Staff
from .validators import StaffFieldValidatorMixin


class StaffReadSerializer(serializers.ModelSerializer):
    """
    Serializa un Staff para operaciones de lectura.
    Expone datos del perfil (Staff) + datos del usuario asociado (User).
    El campo `role` devuelve {id, name} de la entidad Role via Membership.
    """

    full_name = serializers.SerializerMethodField()
    email = serializers.EmailField(source="user.email", read_only=True)
    role_id = serializers.SerializerMethodField()
    role_name = serializers.SerializerMethodField()

    class Meta:
        model = Staff
        fields = [
            "id",
            "full_name",
            "email",
            "role_id",
            "role_name",
            "job_title",
            "department",
            "location",
            "schedule",
            "status",
        ]

    def get_full_name(self, obj: Staff) -> str:
        return obj.user.get_full_name() or obj.user.username

    def _get_membership(self, obj: Staff):
        """Devuelve la Membership activa del staff excluyendo el rol Student."""
        return (
            obj.user.memberships
            .filter(is_active=True)
            .exclude(role__name__iexact="Student")
            .select_related("role")
            .first()
        )

    def get_role_id(self, obj: Staff):
        membership = self._get_membership(obj)
        return membership.role.id if membership else None

    def get_role_name(self, obj: Staff) -> str:
        membership = self._get_membership(obj)
        return membership.role.name if membership else ""

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
        max_length=64,
        required=False,
        allow_blank=True,
        error_messages={
            "min_length": "La contraseña debe tener al menos 8 caracteres.",
            "max_length": "La contraseña no puede superar 64 caracteres."
        },
    )
    role_id = serializers.IntegerField(
        required=False,
        allow_null=True,
        help_text="ID del Role (entidad) a asignar como Membership. Debe ser un rol no-Student.",
    )
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
        max_length=64,
        required=False,
        allow_blank=True,
        error_messages={
            "min_length": "La contraseña debe tener al menos 8 caracteres.",
            "max_length": "La contraseña no puede superar 64 caracteres."
        },
    )
    role_id = serializers.IntegerField(
        required=False,
        allow_null=True,
        help_text="ID del Role a reasignar en la Membership.",
    )
    job_title = serializers.CharField(max_length=100, required=False, allow_blank=False)
    department = serializers.CharField(max_length=100, required=False, allow_blank=False)
    location = serializers.CharField(max_length=255, required=False, allow_blank=True)
    schedule = serializers.CharField(max_length=100, required=False, allow_blank=True)
    status = serializers.ChoiceField(
        choices=Staff.StatusChoices.choices,
        required=False,
    )
