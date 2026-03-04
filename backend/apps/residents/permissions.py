from rest_framework import permissions

from apps.membership.models import Membership


class IsResidenceAdmin(permissions.BasePermission):
    """
    Permite acceso únicamente a usuarios con un rol de administración
    (cualquier rol distinto de 'Student') en la residencia actual.
    Compatible con el modelo dinámico de entidad Role.
    """

    message = "No tienes permisos para gestionar residentes."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        residence = getattr(request, "residence", None)

        qs = Membership.objects.filter(
            user=request.user,
            is_active=True,
        ).exclude(role__name__iexact="Student")

        if residence:
            return qs.filter(residence=residence).exists()

        return qs.exists()
