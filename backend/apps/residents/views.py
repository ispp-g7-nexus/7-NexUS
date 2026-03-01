from rest_framework import viewsets
from .models import Resident
from apps.residents.serializers import ResidentSerializer


class ResidentViewSet(viewsets.ModelViewSet):
    queryset = Resident.objects.all()
    serializer_class = ResidentSerializer
# para saber el tema de permisos y demas necesito el modelo e-r asique no puedo agregarlo.

