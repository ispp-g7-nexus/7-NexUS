from rest_framework import permissions

class IsAdminOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        if request.user.is_staff:
            return True
        if request.user.is_student:
            if request.method == 'POST':
                return True
        
        if request.method in permissions.SAFE_METHODS:
            return obj.student == request.user

        return False