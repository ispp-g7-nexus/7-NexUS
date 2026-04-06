from rest_framework import permissions

from apps.membership.permissions import has_screen_permission


class IsResidenceAdmin(permissions.BasePermission):
    """
    Permite acceso únicamente a administradores con permiso para el módulo de 'students' (Residentes).
    Compatible con el modelo dinámico de entidad Role.
    """

    message = "No tienes permisos para gestionar residentes en esta residencia."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        residence = getattr(request, "residence", None)

        return has_screen_permission(request.user, residence, "students")
