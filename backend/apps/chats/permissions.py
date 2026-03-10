from rest_framework import permissions

from apps.membership.models import Membership


class IsResidenceAdmin(permissions.BasePermission):
    """Permite acceso solo a miembros activos con un rol distinto de Student."""

    message = "No tienes permisos para gestionar chats."

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


class IsAuthenticatedResident(permissions.BasePermission):
    """Permite acceso a cualquier usuario autenticado con membresía activa en la residencia."""

    message = "Debes ser residente de esta residencia."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        residence = getattr(request, "residence", None)
        if not residence:
            return False

        return Membership.objects.filter(
            user=request.user,
            residence=residence,
            is_active=True,
        ).exists()
