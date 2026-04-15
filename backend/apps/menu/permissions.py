from rest_framework import permissions
from apps.common.utils.jwt_auth import resolve_user_from_request


def _normalize_roles(raw_roles):
    if isinstance(raw_roles, str):
        raw_roles = [r.strip() for r in raw_roles.split(",") if r.strip()]
    normalized_roles = set()
    for role in raw_roles or []:
        if not isinstance(role, str):
            continue
        normalized_roles.add(role.strip().lower().replace(" ", "_"))
    return normalized_roles


class IsStaffOrReadOnly(permissions.BasePermission):

    def has_permission(self, request, view):
        user_data = resolve_user_from_request(request)
        if not user_data:
            return False

        # Permitir lectura a cualquier usuario autenticado
        if request.method in permissions.SAFE_METHODS:
            return True

        # Solo admin puede modificar
        roles = _normalize_roles(user_data.get("roles", []))
        allowed_admin_roles = {"admin"}
        return bool(roles.intersection(allowed_admin_roles))
