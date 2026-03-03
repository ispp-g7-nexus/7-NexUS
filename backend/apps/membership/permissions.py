from rest_framework.permissions import BasePermission

from .models import Membership


class IsResident(BasePermission):
    """Permite el acceso solo si el usuario tiene el rol 'Student' en esta residencia."""

    message = "Acceso denegado. Se requiere rol de Residente (Student)."

    def has_permission(self, request, view):
        user = request.user
        residence = getattr(request, "residence", None)

        if not user or not user.is_authenticated or not residence:
            return False

        return Membership.objects.filter(
            user=user,
            residence=residence,
            role__name__iexact="Student",
            is_active=True,
        ).exists()


class IsResidenceAdmin(BasePermission):
    """Permite el acceso solo si el usuario tiene el rol 'Admin' en esta residencia."""

    message = "Acceso denegado. Se requiere nivel de Administración."

    def has_permission(self, request, view):
        user = request.user
        residence = getattr(request, "residence", None)

        if not user or not user.is_authenticated or not residence:
            return False

        return Membership.objects.filter(
            user=user,
            residence=residence,
            role__name__iexact="Admin",
            is_active=True,
        ).exists()
