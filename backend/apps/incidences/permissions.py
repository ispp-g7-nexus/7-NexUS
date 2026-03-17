
from rest_framework import permissions

class IsAdminOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        # El usuario debe estar autenticado para cualquier acción
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        user = request.user
        
        # 1. Permiso para Superusuarios de Django (is_staff=True en la DB)
        if user.is_staff:
            return True

        # Obtenemos los roles activos del usuario
        user_roles = [r.lower() for r in user.memberships.filter(is_active=True).values_list('role__name', flat=True)]

        # 2. Permiso para el rol 'admin' de tu aplicación
        if "admin" in user_roles:
            return True

        # 3. Lógica para EMPLEADOS / STAFF (No estudiantes)
        if "student" not in user_roles:
            # Pueden actualizar si: 
            # - Son el técnico asignado (comparando el usuario del Staff)
            # - O si ellos mismos crearon la incidencia (obj.student)
            is_assignee = obj.assigned_staff and obj.assigned_staff.user == user
            is_creator = obj.student == user
            
            if is_assignee or is_creator:
                return True
            
            # Para el resto de incidencias, el staff solo tiene lectura
            return request.method in permissions.SAFE_METHODS

        # 4. Lógica para ESTUDIANTES
        if "student" in user_roles:
            # Pueden editar solo lo que ellos crearon
            if obj.student == user:
                return True
            # En áreas comunes, solo pueden ver (lectura)
            return obj.location_type != 'habitacion' and request.method in permissions.SAFE_METHODS

        # 5. Por defecto, solo permitir métodos de lectura (GET, HEAD, OPTIONS)
        return request.method in permissions.SAFE_METHODS