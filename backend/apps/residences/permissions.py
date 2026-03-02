"""
Permisos personalizados para la gestión de residentes y habitaciones.
"""
from rest_framework import permissions

from apps.common.utils.jwt_auth import resolve_user_from_request
from apps.residences.models import Membership


def _resolve_request_user_id(request):
    user_data = resolve_user_from_request(request)
    if not user_data:
        return None

    raw_user_id = user_data.get("id")
    try:
        return int(raw_user_id)
    except (TypeError, ValueError):
        return None


def _is_admin_membership(user_id: int) -> bool:
    return Membership.objects.filter(
        user_id=user_id,
        role__in=[
            Membership.Role.PORTFOLIO_ADMIN,
            Membership.Role.RESIDENCE_ADMIN,
        ],
        is_active=True,
    ).exists()


class IsResidenceAdmin(permissions.BasePermission):
    """
    Permiso que permite acceso solo a administradores de residencia.
    """
    
    def has_permission(self, request, view):
        """Verifica si el usuario es administrador de residencia"""
        user_id = _resolve_request_user_id(request)
        if not user_id:
            return False
        return _is_admin_membership(user_id)


class IsResidenceAdminOrReadOnly(permissions.BasePermission):
    """
    Permiso que permite lectura a todos los usuarios autenticados,
    pero solo permite escritura a administradores de residencia.
    """
    
    def has_permission(self, request, view):
        """Verifica permisos a nivel de vista"""
        user_id = _resolve_request_user_id(request)
        if not user_id:
            return False

        # Permitir métodos de lectura a todos los usuarios autenticados
        if request.method in permissions.SAFE_METHODS:
            return True

        # Métodos de escritura solo para administradores
        return _is_admin_membership(user_id)


class CanManageAssignments(permissions.BasePermission):
    """
    Permiso específico para gestionar asignaciones de habitaciones.
    Solo administradores pueden crear, modificar o eliminar asignaciones.
    """
    
    def has_permission(self, request, view):
        """Verifica permisos para gestionar asignaciones"""
        user_id = _resolve_request_user_id(request)
        if not user_id:
            return False

        # Permitir GET (lectura) a todos los usuarios autenticados
        if request.method == 'GET':
            return True

        # POST (crear asignaciones) solo para administradores
        return _is_admin_membership(user_id)
    
    def has_object_permission(self, request, view, obj):
        """Verifica permisos a nivel de objeto"""
        user_id = _resolve_request_user_id(request)
        if not user_id:
            return False

        # Permitir lectura a todos
        if request.method in permissions.SAFE_METHODS:
            return True

        # Modificación solo para administradores
        return _is_admin_membership(user_id)
