from rest_framework import permissions

class IsAdminOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        user = request.user
        user_roles = [r.lower() for r in user.memberships.filter(is_active=True).values_list('role__name', flat=True)]
        is_admin = user.is_staff or "admin" in user_roles

        if request.method in permissions.SAFE_METHODS:
            if is_admin or obj.student == user:
                return True
            return obj.location_type != 'habitacion'

        if request.method == 'DELETE':
            return obj.student == user

        if request.method in ['PUT', 'PATCH']:
            if obj.student == user:
                return obj.status == 'pending'
            return is_admin

        return False