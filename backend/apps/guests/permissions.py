from rest_framework import permissions

from apps.membership.permissions import has_screen_permission


class IsGuestAdmin(permissions.BasePermission):
    """
    Permite acceso solo a administradores con permiso para el módulo de 'guests' (Visitantes).
    """

    message = "No tienes permisos para gestionar visitantes en esta residencia."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        residence = getattr(request, "residence", None)
        return has_screen_permission(request.user, residence, "guests")
