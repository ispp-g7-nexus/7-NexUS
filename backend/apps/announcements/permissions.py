from rest_framework import permissions
from apps.common.utils.jwt_auth import resolve_user_from_request

class IsStaffOrReadOnly(permissions.BasePermission):
    """
    Permiso personalizado:
    - Cualquier usuario autenticado puede leer
    - Solo el personal (admin) puede crear, modificar o eliminar
    """
    
    def has_permission(self, request, view):
        user_data = resolve_user_from_request(request)
        if not user_data:
            return False

        if request.method in permissions.SAFE_METHODS:
            return True

        roles = set(user_data.get("roles", []))
        return bool(roles.intersection({"portfolio_admin", "residence_admin", "staff"}))