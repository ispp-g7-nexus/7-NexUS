from rest_framework import status, viewsets
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.response import Response

from .permissions import IsResidenceAdmin
from .serializers import (
    AdminCreateResidentSerializer,
    ResidentReadSerializer,
    ResidentUpdateSerializer,
)
from .services import (
    create_resident,
    delete_resident,
    get_resident,
    list_residents,
    update_resident,
)


class ResidentViewSet(viewsets.ViewSet):
    """
    CRUD de residentes. Los datos se mapean a User + Membership (sin tabla propia en BD).

    Rutas:
      GET    /residents/         → Listar residentes de la residencia
      POST   /residents/         → Crear residente
      GET    /residents/{id}/    → Detalle de residente
      PUT    /residents/{id}/    → Actualizar residente
      PATCH  /residents/{id}/    → Actualización parcial
      DELETE /residents/{id}/    → Hard-delete (elimina Membership y, si aplica, User)
    """

    permission_classes = [IsResidenceAdmin]

    def _get_residence(self, request):
        residence = getattr(request, "residence", None)
        if not residence:
            raise ValidationError({"detail": "No se ha determinado la residencia."})
        return residence

    def list(self, request):
        """GET /residents/ — Lista todos los residentes de la residencia."""
        residence = self._get_residence(request)
        residents = list_residents(residence)
        serializer = ResidentReadSerializer(residents, many=True)
        return Response(serializer.data)

    def retrieve(self, request, pk=None):
        """GET /residents/{id}/ — Detalle de un residente por ID de Membership."""
        residence = self._get_residence(request)
        resident = get_resident(pk, residence)
        if not resident:
            raise NotFound("Residente no encontrado.")
        return Response(ResidentReadSerializer(resident).data)

    def create(self, request):
        """POST /residents/ — Crea un User + Membership con rol RESIDENT."""
        residence = self._get_residence(request)
        serializer = AdminCreateResidentSerializer(data=request.data, context={"request": request, "residence": residence})
        serializer.is_valid(raise_exception=True)
        result = create_resident(serializer.validated_data, residence, request)
        return Response({"ok": True, **result}, status=status.HTTP_201_CREATED)

    def update(self, request, pk=None):
        """PUT /residents/{id}/ — Actualiza email, nombre y/o estado."""
        return self._do_update(request, pk, partial=False)

    def partial_update(self, request, pk=None):
        """PATCH /residents/{id}/ — Actualización parcial."""
        return self._do_update(request, pk, partial=True)

    def _do_update(self, request, pk, partial: bool):
        serializer = ResidentUpdateSerializer(data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        residence = self._get_residence(request)
        result = update_resident(pk, serializer.validated_data, residence, performed_by=request.user)
        if not result:
            raise NotFound("Residente no encontrado.")
        return Response(ResidentReadSerializer(result).data)

    def destroy(self, request, pk=None):
        """DELETE /residents/{id}/ — Hard-delete: elimina Membership y, si aplica, User."""
        residence = self._get_residence(request)
        deleted = delete_resident(pk, residence, user=request.user)
        if not deleted:
            raise NotFound("Residente no encontrado.")
        return Response(status=status.HTTP_204_NO_CONTENT)
