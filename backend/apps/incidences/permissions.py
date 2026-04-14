from rest_framework import permissions

from apps.membership.permissions import has_screen_permission


class IsIncidenceAdmin(permissions.BasePermission):
    """Permite el acceso solo a administradores o usuarios con permiso de incidencias."""

    message = "No tienes permisos para ver las analíticas de incidencias."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if getattr(request.user, "is_staff", False):
            return True
        residence = getattr(request, "residence", None)
        return has_screen_permission(request.user, residence, "incidences")


class IsAdminOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        user = request.user
        residence = getattr(request, "residence", None)

        if has_screen_permission(user, residence, "incidences"):
            return True

        if request.method in permissions.SAFE_METHODS:
            if obj.student == user:
                return True
            return obj.location_type != "habitacion"

        if request.method in ["PUT", "PATCH", "DELETE"]:
            return obj.student == user and obj.status == "pending"

        return False
