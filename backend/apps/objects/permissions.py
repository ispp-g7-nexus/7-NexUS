from rest_framework import permissions

from apps.membership.models import Membership
from apps.membership.permissions import has_screen_permission


class IsObjectsAdmin(permissions.BasePermission):
    message = "No tienes permisos para gestionar recursos y objetos."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        residence = getattr(request, "residence", None)

        if request.method in permissions.SAFE_METHODS:
            return (
                Membership.objects.filter(
                    user=request.user, residence=residence, is_active=True
                )
                .exclude(role__name__iexact="student")
                .exists()
            )

        return has_screen_permission(request.user, residence, "reservations")


# Mantenemos la función original por compatibilidad
def is_reservations_admin(user, residence) -> bool:
    if not user or not user.is_authenticated:
        return False
    return has_screen_permission(user, residence, "reservations")
