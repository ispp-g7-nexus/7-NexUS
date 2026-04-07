from rest_framework import permissions

from apps.membership.permissions import has_screen_permission


class IsStaffOrReadOnly(permissions.BasePermission):
    """
    Permiso personalizado:
    - Cualquier usuario autenticado puede leer o marcar como visto
    - Solo los administradores con acceso a 'announcements' pueden crear, modificar o eliminar
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        if getattr(view, "action", None) in {"mark_as_viewed"}:
            return True

        if request.method in permissions.SAFE_METHODS:
            return True

        residence = getattr(request, "residence", None)
        return has_screen_permission(request.user, residence, "announcements")
