import logging

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Q
from rest_framework import serializers, status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Role
from .permissions import IsResidenceAdmin
from .serializers import RoleSerializer
from .services import RoleService

# Inicializamos el logger para el ViewSet
logger = logging.getLogger(__name__)


class RoleViewSet(viewsets.ModelViewSet):
    """
    CRUD completo de Roles (List, Retrieve, Create, Update, Destroy).
    """

    serializer_class = RoleSerializer
    permission_classes = [IsAuthenticated, IsResidenceAdmin]

    def get_queryset(self):
        """
        Filtra los roles para que el admin solo vea los del sistema
        y los creados específicamente para su residencia.
        """
        residence = getattr(self.request, "residence", None)
        user = getattr(self.request, "user", None)

        logger.debug(
            f"Obteniendo roles para el usuario '{user}' en la residencia '{residence}'"
        )

        if not residence:
            logger.debug(
                "Petición rechazada: No se detectó ninguna residencia en el request."
            )
            return Role.objects.none()

        roles = Role.objects.filter(Q(is_system_default=True) | Q(residence=residence))
        logger.debug(f"Devolviendo {roles.count()} roles.")
        return roles

    def perform_create(self, serializer):
        residence = getattr(self.request, "residence", None)
        logger.debug(
            f"Petición para crear rol. Datos recibidos: {serializer.validated_data}, Residencia: '{residence}'"
        )

        try:
            role_instance = RoleService.create_role(
                name=serializer.validated_data.get("name"),
                description=serializer.validated_data.get("description", ""),
                residence=residence,
                permissions=serializer.validated_data.get("permissions", []),
            )
            serializer.instance = role_instance
            logger.debug(
                f"Rol '{role_instance.name}' creado con éxito (ID: {role_instance.id})."
            )
        except DjangoValidationError as e:
            logger.error(f"Error de validación al crear rol: {str(e)}")
            raise serializers.ValidationError({"detail": str(e)})

    def perform_update(self, serializer):
        role_id = self.get_object().id
        logger.debug(
            f"Petición para actualizar rol (ID: {role_id}). Nuevos datos: {serializer.validated_data}"
        )

        try:
            role_instance = RoleService.update_role(
                role_instance=self.get_object(), **serializer.validated_data
            )
            serializer.instance = role_instance
            logger.debug(f"Rol (ID: {role_instance.id}) actualizado con éxito.")
        except DjangoValidationError as e:
            logger.error(f"Error de validación al actualizar rol: {str(e)}")
            raise serializers.ValidationError({"detail": str(e)})

    def destroy(self, request, *args, **kwargs):
        role = self.get_object()
        logger.debug(f"Petición para eliminar rol '{role.name}' (ID: {role.id})")

        try:
            RoleService.delete_role(role)
            logger.debug(f"Rol '{role.name}' eliminado con éxito.")
            return Response(status=status.HTTP_204_NO_CONTENT)
        except DjangoValidationError as e:
            error_msg = list(e)[0] if hasattr(e, "__iter__") else str(e)
            logger.error(f"Error al eliminar rol: {error_msg}")
            return Response(
                {"detail": error_msg},
                status=status.HTTP_400_BAD_REQUEST,
            )
