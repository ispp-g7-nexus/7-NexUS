from rest_framework.permissions import BasePermission

from apps.residences.models import Membership


class IsResident(BasePermission):
    """Permite el acceso solo si el usuario es RESIDENTE de la residencia actual."""

    message = "Acceso denegado. Se requiere rol de Residente."

    def has_permission(self, request, view):
        user = request.user
        residence = getattr(request, "residence", None)

        if not user or not user.is_authenticated or not residence:
            return False

        return Membership.objects.filter(
            user=user,
            residence=residence,
            role=Membership.Role.RESIDENT,
            is_active=True,
        ).exists()


class IsStaff(BasePermission):
    """Permite el acceso solo si el usuario es PERSONAL de la residencia actual."""

    message = "Acceso denegado. Se requiere rol de Personal."

    def has_permission(self, request, view):
        user = request.user
        residence = getattr(request, "residence", None)

        if not user or not user.is_authenticated or not residence:
            return False

        return Membership.objects.filter(
            user=user, residence=residence, role=Membership.Role.STAFF, is_active=True
        ).exists()


class IsResidenceAdmin(BasePermission):
    """Permite el acceso si es Admin de esta residencia o Admin de grupo (Portfolio)."""

    message = "Acceso denegado. Se requiere nivel de Administración."

    def has_permission(self, request, view):
        user = request.user
        residence = getattr(request, "residence", None)

        if not user or not user.is_authenticated or not residence:
            return False

        # Verifica si es admin de la residencia específica
        is_residence_admin = Membership.objects.filter(
            user=user,
            residence=residence,
            role=Membership.Role.RESIDENCE_ADMIN,
            is_active=True,
        ).exists()

        # O si es el super admin global del grupo
        is_portfolio_admin = Membership.objects.filter(
            user=user, role=Membership.Role.PORTFOLIO_ADMIN, is_active=True
        ).exists()

        return is_residence_admin or is_portfolio_admin
