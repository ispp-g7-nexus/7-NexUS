from rest_framework.permissions import BasePermission

from .models import Membership


def has_screen_permission(user, residence, screen_name: str) -> bool:
    """
    Verifica si el usuario tiene acceso a una pantalla específica basándose en su rol
    y el campo JSON `permissions`. Los administradores principales tienen acceso total.
    """
    if not user or not user.is_authenticated or not residence:
        return False

    # Superusers de Django siempre pasan
    if getattr(user, "is_staff", False):
        return True

    membership = (
        Membership.objects.filter(user=user, residence=residence, is_active=True)
        .select_related("role")
        .first()
    )

    if not membership or not membership.role:
        return False

    role_name = membership.role.name.lower()

    # El administrador principal tiene Full Access a todo el panel
    if role_name in ["admin", "residence_admin", "portfolio_admin"]:
        return True

    # Los estudiantes NO tienen acceso al panel de administración por esta vía
    if role_name == "student":
        return False

    # Comprobamos si la pantalla solicitada está dentro del JSON de permisos del rol
    role_permissions = membership.role.permissions or []
    return screen_name in role_permissions


def RequireScreenAccess(screen_name: str):
    """
    Fábrica de permisos para usar en DRF: permission_classes = [RequireScreenAccess('incidences')]
    Utiliza el motor central (has_screen_permission) por debajo.
    """

    class _RequireScreenAccess(BasePermission):
        message = f"Acceso denegado. No tienes permisos para ver el módulo de '{screen_name}'."

        def has_permission(self, request, view):
            residence = getattr(request, "residence", None)
            return has_screen_permission(request.user, residence, screen_name)

    return _RequireScreenAccess


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
    """Permite el acceso solo si el usuario tiene un rol de Administración total."""

    message = "Acceso denegado. Se requiere nivel de Administración."

    def has_permission(self, request, view):
        user = request.user
        residence = getattr(request, "residence", None)

        if not user or not user.is_authenticated or not residence:
            return False

        if getattr(user, "is_staff", False):
            return True

        return Membership.objects.filter(
            user=user,
            residence=residence,
            role__name__iregex=r"^(admin|residence_admin|portfolio_admin)$",
            is_active=True,
        ).exists()
