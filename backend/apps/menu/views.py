import datetime
from django.forms import ValidationError
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
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
    SpecialMenuRequestSerializer
)
from .permissions import IsStaffOrReadOnly


class MenuWeekViewSet(viewsets.ModelViewSet):

    queryset = MenuWeek.objects.all()
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
            return MenuWeek.objects.none()

        qs = MenuWeek.objects.filter(
            residence=tenant
        ).prefetch_related('days__meals')

        user_data = resolve_user_from_request(self.request)
        is_admin = False
        if user_data:
            roles = set(r.strip().lower().replace(" ", "_") for r in user_data.get("roles", []) if isinstance(r, str))
            is_admin = bool(roles.intersection({"admin"}))

        if not is_admin:
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
        resolved_user = self._resolve_user()

        menu_week = serializer.save(
            residence=tenant,
            created_by=resolved_user,
        )

        current_date = menu_week.week_start
        day_names = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']

        while current_date <= menu_week.week_end:
            day_index = current_date.weekday() 
            MenuDay.objects.create(
                menu_week=menu_week,
                day=day_names[day_index],
                date=current_date,
            )
            current_date += datetime.timedelta(days=1)

        return menu_week

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        menu_week = self.perform_create(serializer)

        # Devolver con el serializer completo (con días)
        output_serializer = MenuWeekSerializer(menu_week)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'])
    def current(self, request):
        today = datetime.date.today()
        tenant = self._resolve_tenant()
        if not tenant:
            return Response(
                {'detail': 'Tenant no encontrado.'},
                status=status.HTTP_404_NOT_FOUND
            )

        base_qs = MenuWeek.objects.filter(
            residence=tenant
        ).prefetch_related('days__meals')

        user_data = resolve_user_from_request(self.request)
        is_admin = False
        if user_data:
            roles = set(r.strip().lower().replace(" ", "_") for r in user_data.get("roles", []) if isinstance(r, str))
            is_admin = bool(roles.intersection({"admin"}))

        if not is_admin:
            base_qs = base_qs.filter(is_published=True)

        menu_week = base_qs.filter(
            week_start__lte=today,
            week_end__gte=today,
        ).first()

        if not menu_week:
            menu_week = base_qs.filter(
                week_start__gt=today,
            ).order_by('week_start').first()

        if not menu_week:
            menu_week = base_qs.filter(
                week_end__lt=today,
            ).order_by('-week_start').first()

        if not menu_week:
            return Response(
                {'detail': 'No hay ningún menú semanal disponible.'},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = MenuWeekSerializer(menu_week)
        return Response(serializer.data)


class MealViewSet(viewsets.ModelViewSet):

    queryset = Meal.objects.all()
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

    def get_queryset(self):
        tenant = self._resolve_tenant()
        if not tenant:
            return Meal.objects.none()

        queryset = Meal.objects.filter(
            menu_day__menu_week__residence=tenant
        )

        day_id = self.kwargs.get('day_id')
        if day_id:
            queryset = queryset.filter(menu_day_id=day_id)

        return queryset

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return MealCreateSerializer
        return MealSerializer

    def perform_create(self, serializer):
        day_id = self.kwargs.get('day_id')
        if not day_id:
            return Response(
                {'detail': 'Se requiere el ID del día.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        tenant = self._resolve_tenant()
        try:
            menu_day = MenuDay.objects.get(
                id=day_id,
                menu_week__residence=tenant,
            )
        except MenuDay.DoesNotExist:
            return Response(
                {'detail': 'Día del menú no encontrado.'},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer.save(menu_day=menu_day)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)

        output_serializer = MealSerializer(serializer.instance)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        output_serializer = MealSerializer(instance)
        return Response(output_serializer.data)
    
class SpecialMenuRequestViewSet(viewsets.ModelViewSet):
    serializer_class = SpecialMenuRequestSerializer
    queryset = SpecialMenuRequest.objects.all()
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        from apps.residents.models import Resident 
        
        resident = Resident.objects.first()
        
        if not resident:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({"detail": "No hay residentes en la base de datos. Ejecuta el comando de la terminal."})
        print(f"Archivos recibidos: {self.request.FILES}")
        serializer.save(resident=resident)
