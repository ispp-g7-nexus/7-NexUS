from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import Incidence, incidence
from .serializers import IncidenceSerializer, incidenceSerializer
from .permissions import IsAdminOrReadOnly

class IncidenceViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminOrReadOnly]

    """
CRUD completo para el modelo incidence.
Rutas generadas:
- GET /incidences/ (Listar)
- POST /incidences/ (Crear)
- GET /incidences/{id}/ (Detalle)
- PUT/PATCH /incidences/{id}/ (Actualizar)
- DELETE /incidences/{id}/ (Eliminar)
"""
    queryset = Incidence.objects.all()
    serializer_class = IncidenceSerializer
    # Aplicamos permisos dinámicos según la acción HTTP
    # C. Intercepción de Búsquedas (GET) - Seguridad de lectura
    def get_queryset(self):
        """El residente solo ve sus quejas; el admin ve todas."""
        user = self.request.user
        if user.is_staff:
            return Incidence.objects.filter(is_active=True)
        return Incidence.objects.filter(student=user, is_active=True)

    # A. Intercepción de Creación (POST) - Seguridad de escritura
    def perform_create(self, serializer):
        """Inyectamos el usuario de la sesión como autor de la incidencia."""
        serializer.save(student=self.request.user)

    # B. Intercepción de Borrado (DELETE) - Soft Delete
    def perform_destroy(self, instance):
        """No borramos de la BD, solo marcamos como inactiva."""
        instance.is_active = False
        # Si tienes el campo deleted_at en tu modelo, úsalo:
        # instance.deleted_at = timezone.now() 
        instance.save()