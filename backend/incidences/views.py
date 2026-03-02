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
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update','destroy']:
            permission_classes = [IsAdminOrReadOnly]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]