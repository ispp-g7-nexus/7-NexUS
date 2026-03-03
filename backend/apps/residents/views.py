from rest_framework import status, viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from .permissions import IsResidenceAdmin
from .serializers import AdminCreateResidentSerializer
from .services import create_resident


class ResidentViewSet(viewsets.ViewSet):
    """
    ViewSet para crear residentes (sin tablas en BD).
    
    El modelo Resident existe en el código (managed=False) 
    pero los datos se mapean a User + Membership en la BD.
    
    Endpoint:
      POST /residents/        → Crear residente (solo admins)
    """

    permission_classes = [IsResidenceAdmin]

    def create(self, request, *args, **kwargs):
        """
        Crea un nuevo residente mapeando los datos a User + Membership.
        """
        serializer = AdminCreateResidentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        residence = getattr(request, "residence", None)
        if not residence:
            raise ValidationError({"detail": "No se ha determinado la residencia."})

        result = create_resident(serializer.validated_data, residence, request)
        return Response({"ok": True, **result}, status=status.HTTP_201_CREATED)


