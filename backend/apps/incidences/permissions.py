from rest_framework import permissions

class IsAdminOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        user = request.user
        try:
            user_roles = [r.lower() for r in user.memberships.filter(is_active=True).values_list('role__name', flat=True)]
        except Exception:
            user_roles = []

        is_admin = (getattr(user, 'is_staff', False) is True) or "admin" in user_roles or "residence_admin" in user_roles

        if is_admin:
            return True
        
        if request.method in permissions.SAFE_METHODS:
            if obj.student == user:
                return True
            return obj.location_type != 'habitacion'

        if request.method in ['PUT', 'PATCH', 'DELETE']:
            return obj.student == user and obj.status == 'pending'

        return False