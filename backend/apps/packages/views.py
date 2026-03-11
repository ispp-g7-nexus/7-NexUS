from django.db.models import Q
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.membership.permissions import IsResident
from apps.residents.permissions import IsResidenceAdmin

from .models import Package
from .serializers import (
    LabelPreviewInputSerializer,
    PackageDeliverByQrSerializer,
    PackageCreateSerializer,
    PackageReadSerializer,
    PackageUpdateSerializer,
)
from .services import (
    LabelAIError,
    build_delivery_qr_token,
    create_package,
    deliver_package_by_qr,
    extract_package_label_preview,
    get_resident_membership_for_user,
    get_resident_packages_queryset,
    mark_packages_as_viewed,
    unread_packages_count,
    update_package,
)


class PackageAdminViewSet(viewsets.ModelViewSet):
    permission_classes = [IsResidenceAdmin]
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    http_method_names = ["get", "post", "patch", "put", "delete", "head", "options"]

    def _get_residence(self):
        residence = getattr(self.request, "residence", None)
        if not residence:
            raise ValidationError({"detail": "No se ha determinado la residencia."})
        return residence

    def get_queryset(self):
        residence = self._get_residence()
        queryset = Package.objects.filter(residence=residence).select_related(
            "resident__user",
            "resident__bedroom",
            "created_by",
        )

        status_filter = (self.request.query_params.get("status") or "").strip().upper()
        if status_filter in {Package.Status.RECEIVED, Package.Status.DELIVERED}:
            queryset = queryset.filter(status=status_filter)

        resident_id = (self.request.query_params.get("resident_id") or "").strip()
        if resident_id:
            try:
                queryset = queryset.filter(resident_id=int(resident_id))
            except ValueError as exc:
                raise ValidationError({"resident_id": "resident_id debe ser un entero."}) from exc

        search = (self.request.query_params.get("search") or self.request.query_params.get("q") or "").strip()
        if search:
            queryset = queryset.filter(
                Q(resident_name_snapshot__icontains=search)
                | Q(room_snapshot__icontains=search)
                | Q(building_snapshot__icontains=search)
                | Q(carrier__icontains=search)
                | Q(tracking_number__icontains=search)
                | Q(notes__icontains=search)
            )

        return queryset

    def get_serializer_class(self):
        if self.action == "create":
            return PackageCreateSerializer
        if self.action in {"update", "partial_update"}:
            return PackageUpdateSerializer
        return PackageReadSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        package = create_package(
            serializer.validated_data,
            residence=self._get_residence(),
            created_by=request.user,
        )
        return Response(
            PackageReadSerializer(package).data,
            status=status.HTTP_201_CREATED,
        )

    def update(self, request, *args, **kwargs):
        return self._do_update(request, partial=False)

    def partial_update(self, request, *args, **kwargs):
        return self._do_update(request, partial=True)

    def _do_update(self, request, *, partial: bool):
        package = self.get_object()
        serializer = self.get_serializer(data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        updated = update_package(
            package,
            serializer.validated_data,
            residence=self._get_residence(),
        )
        return Response(PackageReadSerializer(updated).data)

    def destroy(self, request, *args, **kwargs):
        package = self.get_object()
        package.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"], url_path="deliver-by-qr")
    def deliver_by_qr(self, request, pk=None):
        serializer = PackageDeliverByQrSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        updated = deliver_package_by_qr(
            self.get_object(),
            serializer.validated_data["qr_token"],
            residence=self._get_residence(),
        )
        return Response(PackageReadSerializer(updated).data)


class PackageLabelPreviewView(APIView):
    permission_classes = [IsResidenceAdmin]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        residence = getattr(request, "residence", None)
        if not residence:
            raise ValidationError({"detail": "No se ha determinado la residencia."})

        serializer = LabelPreviewInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            preview = extract_package_label_preview(
                serializer.validated_data["label_image"],
                residence,
            )
        except LabelAIError as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        return Response(preview, status=status.HTTP_200_OK)


class ResidentPackageBaseView(APIView):
    permission_classes = [IsResident]

    def get_membership(self, request):
        residence = getattr(request, "residence", None)
        if not residence:
            raise ValidationError({"detail": "No se ha determinado la residencia."})

        membership = get_resident_membership_for_user(request.user, residence)
        if membership is None:
            raise NotFound("Residente no encontrado.")
        return membership, residence


class ResidentPackageListView(ResidentPackageBaseView):
    def get(self, request):
        membership, residence = self.get_membership(request)
        queryset = get_resident_packages_queryset(membership, residence)

        status_filter = (request.query_params.get("status") or "").strip().upper()
        if status_filter in {Package.Status.RECEIVED, Package.Status.DELIVERED}:
            queryset = queryset.filter(status=status_filter)

        serializer = PackageReadSerializer(queryset, many=True)
        return Response(serializer.data)


class ResidentPackageDeliveryQrView(ResidentPackageBaseView):
    def get(self, request):
        membership, residence = self.get_membership(request)
        return Response(
            build_delivery_qr_token(membership, residence),
            status=status.HTTP_200_OK,
        )


class ResidentPackageUnreadCountView(ResidentPackageBaseView):
    def get(self, request):
        membership, residence = self.get_membership(request)
        return Response(
            {"count": unread_packages_count(membership, residence)},
            status=status.HTTP_200_OK,
        )


class ResidentPackageMarkAsViewedView(ResidentPackageBaseView):
    def post(self, request):
        membership, residence = self.get_membership(request)
        marked_count = mark_packages_as_viewed(membership, residence)
        return Response(
            {
                "message": "Paquetes marcados como vistos.",
                "marked_count": marked_count,
            },
            status=status.HTTP_200_OK,
        )
