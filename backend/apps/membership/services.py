import logging

from django.core.exceptions import ValidationError
from django.db.models import Q

from .models import Role

# Inicializamos el logger para este módulo
logger = logging.getLogger(__name__)


class RoleService:
    @staticmethod
    def create_role(name: str, description: str, residence) -> Role:
        logger.debug(
            f"Iniciando creación de rol: name='{name}', residence={getattr(residence, 'id', None)}"
        )

        if not residence:
            logger.debug(
                "Fallo de validación: Se intentó crear un rol sin una residencia asignada."
            )
            raise ValidationError(
                "No se puede crear un rol sin una residencia asignada."
            )

        logger.debug(
            "Comprobando colisiones de nombre en roles del sistema y de la residencia..."
        )
        if Role.objects.filter(
            Q(name__iexact=name, is_system_default=True)
            | Q(name__iexact=name, residence=residence)
        ).exists():
            logger.debug(f"Fallo de validación: Ya existe un rol llamado '{name}'.")
            raise ValidationError(
                f"Ya existe el rol '{name}' en el sistema o en tu residencia."
            )

        role = Role.objects.create(
            name=name,
            description=description,
            is_system_default=False,
            residence=residence,
        )
        logger.debug(f"Rol creado exitosamente: ID={role.id}, Name='{role.name}'")
        return role

    @staticmethod
    def update_role(role_instance: Role, **validated_data) -> Role:
        logger.debug(
            f"Iniciando actualización de rol: ID={role_instance.id}, Name='{role_instance.name}'. Datos recibidos: {validated_data}"
        )

        if role_instance.is_system_default:
            logger.debug(
                f"Fallo de validación: Intento de editar el rol del sistema '{role_instance.name}'."
            )
            raise ValidationError(
                "No se pueden editar los roles por defecto del sistema (Admin, Student)."
            )

        if "name" in validated_data:
            name = validated_data["name"]
            logger.debug(
                f"Se solicitó cambio de nombre a '{name}'. Comprobando colisiones..."
            )

            if (
                Role.objects.filter(
                    Q(name__iexact=name, is_system_default=True)
                    | Q(name__iexact=name, residence=role_instance.residence)
                )
                .exclude(id=role_instance.id)
                .exists()
            ):
                logger.debug(
                    f"Fallo de validación: El nombre '{name}' ya está en uso por otro rol."
                )
                raise ValidationError(f"Ya existe un rol llamado '{name}'.")

        for attr, value in validated_data.items():
            setattr(role_instance, attr, value)

        role_instance.save()
        logger.debug(f"Rol actualizado exitosamente: ID={role_instance.id}")
        return role_instance

    @staticmethod
    def delete_role(role_instance: Role) -> None:
        logger.debug(
            f"Iniciando eliminación de rol: ID={role_instance.id}, Name='{role_instance.name}'"
        )

        if role_instance.is_system_default:
            logger.debug(
                f"Fallo de validación: Intento de eliminar el rol del sistema '{role_instance.name}'."
            )
            raise ValidationError(
                "Acción denegada: No se pueden eliminar los roles del sistema."
            )

        logger.debug(
            "Comprobando si hay usuarios (memberships) asignados a este rol..."
        )
        if role_instance.memberships.exists():
            logger.debug(
                f"Fallo de validación: El rol '{role_instance.name}' tiene usuarios activos y no puede eliminarse."
            )
            raise ValidationError(
                "Acción denegada: No puedes eliminar este rol porque hay usuarios asignados a él."
            )

        role_instance.delete()
        logger.debug(f"Rol eliminado exitosamente: ID={role_instance.id}")
