import datetime
import logging
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, ValidationError
from django.contrib.auth import get_user_model
from apps.tenants.models import Domain
from apps.common.utils.jwt_auth import resolve_user_from_request

from .models import MenuWeek, MenuDay, Meal, SpecialMenuRequest
from apps.residents.models import Resident
from .serializers import (
    MenuWeekSerializer,
    MenuWeekListSerializer,
    MenuWeekCreateSerializer,
    MealSerializer,
    MealCreateSerializer,
    SpecialMenuRequestSerializer,
)
from .permissions import IsStaffOrReadOnly

logger = logging.getLogger(__name__)


def resolve_roles(user_data: dict) -> set:
    return {
        r.strip().lower().replace(" ", "_")
        for r in user_data.get("roles", [])
        if isinstance(r, str)
    }


class TenantMixin:
    def _resolve_tenant(self):
        tenant = getattr(self.request, 'tenant', None)
        if tenant:
            return tenant
        host = self.request.get_host().split(':')[0].lower()
        try:
            return Domain.objects.select_related('tenant').get(domain=host).tenant
        except Domain.DoesNotExist:
            return None


class MenuWeekViewSet(TenantMixin, viewsets.ModelViewSet):
    queryset = MenuWeek.objects.all()
    permission_classes = [IsStaffOrReadOnly]

    def _resolve_user(self):
        user_data = resolve_user_from_request(self.request)
        if not user_data:
            return None
        email = user_data.get('email')
        if not email:
            return None
        return get_user_model().objects.filter(email=email).first()

    def _is_admin(self):
        user_data = resolve_user_from_request(self.request)
        if not user_data:
            return False
        return bool(resolve_roles(user_data).intersection({"admin"}))

    def get_queryset(self):
        tenant = self._resolve_tenant()
        if not tenant:
            return MenuWeek.objects.none()

        qs = MenuWeek.objects.filter(residence=tenant).prefetch_related('days__meals')
        if not self._is_admin():
            qs = qs.filter(is_published=True)
        return qs

    def get_serializer_class(self):
        if self.action == 'list':
            return MenuWeekListSerializer
        if self.action == 'create':
            return MenuWeekCreateSerializer
        return MenuWeekSerializer

    def perform_create(self, serializer):
        tenant = self._resolve_tenant()
        menu_week = serializer.save(residence=tenant, created_by=self._resolve_user())

        current_date = menu_week.week_start
        day_names = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']
        while current_date <= menu_week.week_end:
            MenuDay.objects.create(
                menu_week=menu_week,
                day=day_names[current_date.weekday()],
                date=current_date,
            )
            current_date += datetime.timedelta(days=1)

        return menu_week

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        menu_week = self.perform_create(serializer)
        return Response(MenuWeekSerializer(menu_week).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'])
    def current(self, request):
        today = datetime.date.today()
        tenant = self._resolve_tenant()
        if not tenant:
            return Response({'detail': 'Tenant no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        qs = MenuWeek.objects.filter(residence=tenant).prefetch_related('days__meals')
        if not self._is_admin():
            qs = qs.filter(is_published=True)

        menu_week = (
            qs.filter(week_start__lte=today, week_end__gte=today).first()
            or qs.filter(week_start__gt=today).order_by('week_start').first()
            or qs.filter(week_end__lt=today).order_by('-week_start').first()
        )

        if not menu_week:
            return Response({'detail': 'No hay ningún menú semanal disponible.'}, status=status.HTTP_404_NOT_FOUND)

        return Response(MenuWeekSerializer(menu_week).data)


class MealViewSet(TenantMixin, viewsets.ModelViewSet):
    queryset = Meal.objects.all()
    permission_classes = [IsStaffOrReadOnly]

    def _is_admin(self):
        user_data = resolve_user_from_request(self.request)
        if not user_data:
            return False
        return bool(resolve_roles(user_data).intersection({"admin"}))

    def get_queryset(self):
        tenant = self._resolve_tenant()
        if not tenant:
            return Meal.objects.none()

        qs = Meal.objects.filter(menu_day__menu_week__residence=tenant)
        if not self._is_admin():
            qs = qs.filter(menu_day__menu_week__is_published=True)
        day_id = self.kwargs.get('day_id')
        if day_id:
            qs = qs.filter(menu_day_id=day_id)
        return qs

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return MealCreateSerializer
        return MealSerializer

    def perform_create(self, serializer):
        day_id = self.kwargs.get('day_id')
        if not day_id:
            raise ValidationError({'detail': 'Se requiere el ID del día.'})

        tenant = self._resolve_tenant()
        try:
            menu_day = MenuDay.objects.get(id=day_id, menu_week__residence=tenant)
        except MenuDay.DoesNotExist:
            raise ValidationError({'detail': 'Día del menú no encontrado.'})

        serializer.save(menu_day=menu_day)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(MealSerializer(serializer.instance).data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(MealSerializer(instance).data)


class SpecialMenuRequestViewSet(viewsets.ModelViewSet):
    serializer_class = SpecialMenuRequestSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return SpecialMenuRequest.objects.none()
        return SpecialMenuRequest.objects.filter(user=user)

    def perform_create(self, serializer):
        user = self.request.user
        if not user.is_authenticated:
            raise PermissionDenied({"detail": "Usuario no autenticado."})
        
        serializer.save(user=user)

    @action(detail=False, methods=['get'])
    def list_requests(self, request):
        """GET /api/menu/special-requests/list_requests/ - Listar solicitudes (pending primero, luego historial)"""
        if not request.user.is_staff:
            raise PermissionDenied({"detail": "Solo el personal puede ver todas las peticiones."})
        
        # Pendientes primero, luego aprobadas/rechazadas ordenadas por fecha (más recientes primero)
        from django.db.models import Case, When, Value, IntegerField
        
        requests_list = SpecialMenuRequest.objects.all().annotate(
            status_order=Case(
                When(status='pending', then=Value(0)),
                When(status='approved', then=Value(1)),
                When(status='rejected', then=Value(2)),
                output_field=IntegerField()
            )
        ).order_by('status_order', '-created_at')
        
        serializer = self.get_serializer(requests_list, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['patch'])
    def update_status(self, request, pk=None):
        """PATCH /api/menu/special-requests/{id}/update_status/ - Actualizar estado"""
        if not request.user.is_staff:
            raise PermissionDenied({"detail": "Solo el personal puede actualizar el estado."})
        
        # No usar get_object() para evitar filtrado por usuario
        try:
            instance = SpecialMenuRequest.objects.get(pk=pk)
        except SpecialMenuRequest.DoesNotExist:
            raise ValidationError({'detail': 'Solicitud no encontrada.'})
        
        new_status = request.data.get('status')
        
        if not new_status:
            raise ValidationError({'detail': 'Se requiere el campo status.'})
        
        valid_statuses = ['pending', 'approved', 'rejected']
        if new_status not in valid_statuses:
            raise ValidationError({'detail': f'Estado inválido. Opciones: {", ".join(valid_statuses)}'})
        
        instance.status = new_status
        instance.save()
        
        serializer = self.get_serializer(instance)
        return Response(serializer.data)