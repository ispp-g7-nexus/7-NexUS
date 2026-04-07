from rest_framework import permissions

from apps.membership.models import Membership
from apps.membership.permissions import has_screen_permission


class IsResidenceAdmin(permissions.BasePermission):
    """Permite acceso solo a administradores con permiso de 'chats'."""

    message = "No tienes permisos para gestionar chats."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        residence = getattr(request, "residence", None)
        return has_screen_permission(request.user, residence, "chats")


class IsChatGroupManager(permissions.BasePermission):
    """Permite gestionar grupos a Admin de chats o Admin de grupo (segun queryset)."""

    message = "No tienes permisos para gestionar chats."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        residence = getattr(request, "residence", None)
        if not residence:
            return False

        # Si tiene el permiso del módulo, acceso total
        if has_screen_permission(request.user, residence, "chats"):
            return True

        # Crear/eliminar grupos queda reservado estrictamente a los admins de chats
        action = getattr(view, "action", None)
        if action in {"create", "destroy"}:
            return False

        # Para participar, simplemente verificamos que sea un residente activo
        return Membership.objects.filter(
            user=request.user,
            residence=residence,
            is_active=True,
        ).exists()


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
