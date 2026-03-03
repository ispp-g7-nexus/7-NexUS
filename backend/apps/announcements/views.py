from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from apps.tenants.models import Domain
from apps.common.utils.jwt_auth import resolve_user_from_request

from .models import Announcement
from .serializers import AnnouncementSerializer, AnnouncementListSerializer
from .permissions import IsStaffOrReadOnly


class AnnouncementViewSet(viewsets.ModelViewSet):
    """ViewSet para gestionar avisos por tenant con CRUD estándar."""

    queryset = Announcement.objects.all()
    serializer_class = AnnouncementSerializer
    permission_classes = [IsStaffOrReadOnly]

    def _resolve_tenant(self):
        tenant = getattr(self.request, 'tenant', None)
        if tenant:
            return tenant

        host = self.request.get_host().split(':')[0].lower()
        try:
            return Domain.objects.select_related('tenant').get(domain=host).tenant
        except Domain.DoesNotExist:
            return None

    def _resolve_user(self):
        user_data = resolve_user_from_request(self.request)
        if not user_data:
            return None

        email = user_data.get('email')
        if not email:
            return None

        user_model = get_user_model()
        return user_model.objects.filter(email=email).first()

    def get_queryset(self):
        tenant = self._resolve_tenant()
        if not tenant:
            return Announcement.objects.none()

        queryset = Announcement.objects.filter(residence=tenant)

        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category=category)
        
        featured = self.request.query_params.get('featured')
        if featured is not None:
            queryset = queryset.filter(featured=featured.lower() == 'true')

        return queryset

    def get_serializer_class(self):
        return AnnouncementListSerializer if self.action == 'list' else AnnouncementSerializer

    def perform_create(self, serializer):
        serializer.save(
            residence=self._resolve_tenant(),
            user=self._resolve_user(),
        )

    @action(detail=True, methods=['post'])
    def toggle_featured(self, request, pk=None):
        """Marca/desmarca un aviso como destacado."""
        announcement = self.get_object()
        announcement.featured = not announcement.featured
        announcement.save()

        serializer = self.get_serializer(announcement)
        return Response(serializer.data)
