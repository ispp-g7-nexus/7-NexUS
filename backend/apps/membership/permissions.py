from rest_framework import permissions
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

    memberships = Membership.objects.filter(
        user=user, residence=residence, is_active=True
    ).select_related("role")

    for membership in memberships:
        if not membership.role:
            continue

        role_name = membership.role.name.lower()

        # El administrador principal tiene Full Access a todo el panel
        if role_name in ["admin", "residence_admin", "portfolio_admin"]:
            return True

        # Los estudiantes NO tienen acceso al panel de administración por esta vía
        if role_name == "student":
            continue

        # Comprobamos si la pantalla solicitada está dentro del JSON de permisos del rol
        role_permissions = membership.role.permissions or []
        is_analytics_request = screen_name == "analytics" or screen_name.startswith(
            "analytics_"
        )
        if is_analytics_request and "analytics" in role_permissions:
            return True
        if screen_name in role_permissions or "full_access" in role_permissions:
            return True

    return False


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


class BaseModuleAdminPermission(BasePermission):
    """
    Clase base DRY para evitar código duplicado en los módulos (SonarQube).
    Solo define 'module_name' y 'message' en las clases hijas.
    """

    module_name = None
    message = "No tienes permisos para realizar esta acción."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        residence = getattr(request, "residence", None)

        # Lectura pública para staff o roles distintos de "student"
        if request.method in permissions.SAFE_METHODS:
            return (
                Membership.objects.filter(
                    user=request.user, residence=residence, is_active=True
                )
                .exclude(role__name__iexact="student")
                .exists()
            )

        # Escritura reservada al admin del módulo
        return has_screen_permission(request.user, residence, self.module_name)


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
    """
    Permite el acceso a la configuración core del panel.
    Se sustituye el Regex antiguo por el nuevo motor de permisos dinámico.
    """

    message = "Acceso denegado. Se requiere nivel de Administración."

    def has_permission(self, request, view):
        residence = getattr(request, "residence", None)

        return has_screen_permission(request.user, residence, "roles")
