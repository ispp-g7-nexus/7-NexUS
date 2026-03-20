from rest_framework import permissions

from apps.membership.models import Membership


class IsResidenceAdmin(permissions.BasePermission):
    """Permite acceso solo a miembros activos con rol Admin en la residencia actual."""

    message = "No tienes permisos para gestionar chats."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        residence = getattr(request, "residence", None)

        qs = Membership.objects.filter(
            user=request.user,
            is_active=True,
            role__name__iexact="Admin",
        )

        if residence:
            return qs.filter(residence=residence).exists()

        return False


class IsChatGroupManager(permissions.BasePermission):
    """Permite gestionar grupos a Admin de residencia o Admin de grupo (segun queryset)."""

    message = "No tienes permisos para gestionar chats."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        residence = getattr(request, "residence", None)
        if not residence:
            return False

        membership = Membership.objects.filter(
            user=request.user,
            residence=residence,
            is_active=True,
        ).select_related("role").first()
        if not membership:
            return False

        if membership.role and membership.role.name.lower() == "admin":
            return True

        # Crear/eliminar grupos queda reservado al admin de residencia.
        action = getattr(view, "action", None)
        if action in {"create", "destroy"}:
            return False

        return True


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
