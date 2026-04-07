from rest_framework import permissions

from apps.membership.permissions import has_screen_permission


class IsAdminOrReadOnly(permissions.BasePermission):
    """
    Permite lectura a cualquier usuario autenticado, escritura solo a administradores con acceso a 'rooms'.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        if request.method in permissions.SAFE_METHODS:
            return True

        residence = getattr(request, "residence", None)
        return has_screen_permission(request.user, residence, "rooms")
