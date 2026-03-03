from rest_framework import permissions

from apps.common.utils.jwt_auth import resolve_user_from_request


class IsResidenceAdmin(permissions.BasePermission):
    """
    Permite acceso únicamente a usuarios con rol 'residence_admin'
    o 'portfolio_admin' en el JWT.
    """

    message = "No tienes permisos para gestionar residentes."

    def has_permission(self, request, view):
        caller = resolve_user_from_request(request)
        if not caller:
            return False
        roles = caller.get("roles", [])
        return any(r in ["residence_admin", "portfolio_admin"] for r in roles)
