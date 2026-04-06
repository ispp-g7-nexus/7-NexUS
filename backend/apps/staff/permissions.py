from rest_framework import permissions

from apps.membership.permissions import has_screen_permission


class IsStaffAdmin(permissions.BasePermission):
    """
    Permite acceso solo a usuarios autenticados que sean administradores principales
    o que tengan el permiso explícito de 'staff' (Gestión de Personal).
    """

    message = "No tienes permisos para gestionar al personal de la residencia."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        residence = getattr(request, "residence", None)
        return has_screen_permission(request.user, residence, "staff")
