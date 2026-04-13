import logging

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Q
from rest_framework import serializers, status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.decorators import action

from .models import Role
from .permissions import IsResidenceAdmin, RequireScreenAccess
from .serializers import RoleSerializer
from .services import RoleService
from . import analytics_services

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


class MembershipAnalyticsViewSet(viewsets.ViewSet):
    """
    ViewSet for membership analytics.
    """
    permission_classes = [IsAuthenticated, RequireScreenAccess('analytics')]

    @action(detail=False, methods=['get'])
    def summary(self, request):
        try:
            residence = getattr(request, 'residence', None)
            if residence is None:
                return Response(
                    {"detail": "No se pudo determinar la residencia del contexto."},
                    status=status.HTTP_400_BAD_REQUEST,
               )
            active_members_by_role = list(analytics_services.get_active_members_by_role(residence))
            active_vs_inactive = list(analytics_services.get_active_vs_inactive_members(residence))
            membership_evolution = analytics_services.get_membership_evolution(residence)
            average_stay = analytics_services.get_average_stay(residence)
            staff_capacity = analytics_services.get_staff_capacity(residence)
            staff_vacation = analytics_services.get_staff_vacation(residence)
            residents_without_room = analytics_services.get_residents_without_room(residence)

            data = {
                "active_members_by_role": active_members_by_role,
                "active_vs_inactive": active_vs_inactive,
                "membership_evolution": membership_evolution,
                "average_stay": average_stay,
                "staff_capacity": staff_capacity,
                "staff_vacation": staff_vacation,
                "residents_without_room": residents_without_room,
            }
            return Response(data)
        except Exception as e:
            logger.exception("Error generating analytics summary")
            return Response({"detail": "Error generating analytics summary"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
