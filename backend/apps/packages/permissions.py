from rest_framework import permissions

from apps.membership.permissions import has_screen_permission


class IsPackageAdmin(permissions.BasePermission):
    """
    Permite acceso solo a administradores con permiso para el módulo de 'packages' (Paquetería).
    """

    message = "No tienes permisos para gestionar la paquetería en esta residencia."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        residence = getattr(request, "residence", None)
        return has_screen_permission(request.user, residence, "packages")
