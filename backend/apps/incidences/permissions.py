from rest_framework import permissions

class IsAdminOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        if request.user.is_staff:
            return True
        if getattr(request.user, 'is_student', False):
            return obj.student == request.user

        return request.method in permissions.SAFE_METHODS