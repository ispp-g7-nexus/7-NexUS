"""
ViewSets para la gestión de residentes, habitaciones y asignaciones.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.core.exceptions import ValidationError
from django.shortcuts import get_object_or_404

from .models import Residente, Habitacion, AsignacionHabitacion
from .serializers import (
    ResidenteListSerializer,
    ResidenteDetailSerializer,
    HabitacionListSerializer,
    HabitacionDetailSerializer,
    AsignacionHabitacionListSerializer,
    AsignacionHabitacionDetailSerializer,
    AsignacionCreateSerializer,
    ResidenteReleaseSerializer,
    RoomChangeSerializer,
)
from .services import AssignmentService
from .permissions import IsResidenceAdminOrReadOnly, CanManageAssignments


class ResidenteViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestión de residentes.
    
    list: Listar todos los residentes
    retrieve: Obtener detalle de un residente
    create: Crear un nuevo residente
    update: Actualizar un residente
    partial_update: Actualizar parcialmente un residente
    destroy: Soft delete de un residente
    release: Dar de baja a un residente (acción personalizada)
    """
    queryset = Residente.objects.select_related('user', 'residence').all()
    permission_classes = [IsResidenceAdminOrReadOnly]
    
    def get_serializer_class(self):
        if self.action == 'list':
            return ResidenteListSerializer
        elif self.action == 'release':
            return ResidenteReleaseSerializer
        return ResidenteDetailSerializer
    
    def get_queryset(self):
        """Filtrar por residencia si existe en el request"""
        queryset = super().get_queryset()
        
        # Filtrar por residencia si está disponible en el request
        if hasattr(self.request, 'residence') and self.request.residence:
            queryset = queryset.filter(residence=self.request.residence)
        
        # Filtrar por estado activo por defecto
        is_active = self.request.query_params.get('is_active')
        if is_active is None or is_active.lower() in ['true', '1']:
            queryset = queryset.filter(is_active=True)
        
        return queryset
    
    def perform_destroy(self, instance):
        """Soft delete: marcar como inactivo en lugar de eliminar"""
        instance.is_active = False
        instance.save(update_fields=['is_active', 'updated_at'])
    
    @action(detail=False, methods=['post'], url_path='release')
    def release(self, request):
        """
        R6: Acción personalizada para dar de baja a un residente.
        POST /api/residentes/release/
        Body: {"residente_id": 1, "fecha_baja": "2024-03-15"}
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        residente_id = serializer.validated_data['residente_id']
        fecha_baja = serializer.validated_data.get('fecha_baja')
        
        residente = get_object_or_404(Residente, id=residente_id, is_active=True)
        
        try:
            asignacion, habitacion = AssignmentService.release_room(
                residente=residente,
                fecha_fin=fecha_baja
            )
            
            if not asignacion:
                return Response(
                    {'detail': 'El residente no tiene ninguna asignación activa.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            return Response({
                'message': 'Residente dado de baja exitosamente',
                'residente_id': residente.id,
                'asignacion_id': asignacion.id,
                'habitacion_id': habitacion.id,
                'fecha_baja': asignacion.fecha_fin
            }, status=status.HTTP_200_OK)
            
        except ValidationError as e:
            return Response(
                {'detail': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class HabitacionViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestión de habitaciones.
    
    list: Listar todas las habitaciones
    retrieve: Obtener detalle de una habitación
    create: Crear una nueva habitación
    update: Actualizar una habitación
    partial_update: Actualizar parcialmente una habitación
    destroy: Soft delete de una habitación
    available_for_resident: Obtener habitaciones disponibles para un residente específico
    """
    queryset = Habitacion.objects.select_related('residence').all()
    permission_classes = [IsResidenceAdminOrReadOnly]
    
    def get_serializer_class(self):
        if self.action == 'list':
            return HabitacionListSerializer
        return HabitacionDetailSerializer
    
    def get_queryset(self):
        """Filtrar por residencia si existe en el request"""
        queryset = super().get_queryset()
        
        # Filtrar por residencia si está disponible en el request
        if hasattr(self.request, 'residence') and self.request.residence:
            queryset = queryset.filter(residence=self.request.residence)
        
        # Filtrar por estado activo por defecto
        is_active = self.request.query_params.get('is_active')
        if is_active is None or is_active.lower() in ['true', '1']:
            queryset = queryset.filter(is_active=True)
        
        # Filtro adicional por disponibilidad
        disponible = self.request.query_params.get('disponible')
        if disponible and disponible.lower() in ['true', '1']:
            # Filtrar habitaciones que tienen espacio disponible
            queryset = [h for h in queryset if not h.esta_llena]
        
        return queryset
    
    def perform_destroy(self, instance):
        """Soft delete: marcar como inactivo solo si está vacía"""
        if not instance.esta_vacia:
            raise ValidationError(
                "No se puede eliminar una habitación con asignaciones activas."
            )
        instance.is_active = False
        instance.save(update_fields=['is_active', 'updated_at'])
    
    @action(detail=False, methods=['get'], url_path='available-for-resident/(?P<residente_id>[^/.]+)')
    def available_for_resident(self, request, residente_id=None):
        """
        Obtiene las habitaciones disponibles para un residente específico.
        GET /api/habitaciones/available-for-resident/{residente_id}/
        """
        residente = get_object_or_404(Residente, id=residente_id, is_active=True)
        
        habitaciones_disponibles = AssignmentService.get_available_rooms_for_resident(
            residente=residente
        )
        
        serializer = HabitacionListSerializer(habitaciones_disponibles, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class AsignacionHabitacionViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestión de asignaciones de habitaciones.
    
    list: Listar todas las asignaciones
    retrieve: Obtener detalle de una asignación
    create: Crear una nueva asignación usando el servicio
    update: No permitido
    partial_update: No permitido
    destroy: No permitido (usar change_room o release en su lugar)
    change_room: Cambiar a un residente de habitación
    """
    queryset = AsignacionHabitacion.objects.select_related(
        'residente__user',
        'habitacion__residence'
    ).all()
    permission_classes = [CanManageAssignments]
    http_method_names = ['get', 'post']  # Solo GET y POST permitidos
    
    def get_serializer_class(self):
        if self.action == 'list':
            return AsignacionHabitacionListSerializer
        elif self.action == 'create':
            return AsignacionCreateSerializer
        elif self.action == 'change_room':
            return RoomChangeSerializer
        return AsignacionHabitacionDetailSerializer
    
    def get_queryset(self):
        """Filtrar por residencia y estado si se especifica"""
        queryset = super().get_queryset()
        
        # Filtrar por residencia si está disponible en el request
        if hasattr(self.request, 'residence') and self.request.residence:
            queryset = queryset.filter(habitacion__residence=self.request.residence)
        
        # Filtrar por estado
        estado = self.request.query_params.get('estado')
        if estado:
            queryset = queryset.filter(estado=estado)
        
        # Filtrar por residente
        residente_id = self.request.query_params.get('residente_id')
        if residente_id:
            queryset = queryset.filter(residente_id=residente_id)
        
        # Filtrar por habitación
        habitacion_id = self.request.query_params.get('habitacion_id')
        if habitacion_id:
            queryset = queryset.filter(habitacion_id=habitacion_id)
        
        return queryset
    
    def create(self, request, *args, **kwargs):
        """
        Crea una nueva asignación usando AssignmentService.
        POST /api/asignaciones/
        Body: {"residente_id": 1, "habitacion_id": 2, "fecha_inicio": "2024-03-01"}
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        residente_id = serializer.validated_data['residente_id']
        habitacion_id = serializer.validated_data['habitacion_id']
        fecha_inicio = serializer.validated_data.get('fecha_inicio')
        
        residente = get_object_or_404(Residente, id=residente_id, is_active=True)
        habitacion = get_object_or_404(Habitacion, id=habitacion_id, is_active=True)
        
        try:
            asignacion = AssignmentService.assign_resident(
                residente=residente,
                habitacion=habitacion,
                fecha_inicio=fecha_inicio
            )
            
            # Serializar la asignación creada
            response_serializer = AsignacionHabitacionDetailSerializer(asignacion)
            return Response(
                response_serializer.data,
                status=status.HTTP_201_CREATED
            )
            
        except ValidationError as e:
            return Response(
                {'detail': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['post'], url_path='change-room')
    def change_room(self, request):
        """
        Cambia a un residente de habitación.
        POST /api/asignaciones/change-room/
        Body: {"residente_id": 1, "nueva_habitacion_id": 3, "fecha_cambio": "2024-03-15"}
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        residente_id = serializer.validated_data['residente_id']
        nueva_habitacion_id = serializer.validated_data['nueva_habitacion_id']
        fecha_cambio = serializer.validated_data.get('fecha_cambio')
        
        residente = get_object_or_404(Residente, id=residente_id, is_active=True)
        nueva_habitacion = get_object_or_404(Habitacion, id=nueva_habitacion_id, is_active=True)
        
        try:
            asignacion_anterior, nueva_asignacion = AssignmentService.change_room(
                residente=residente,
                nueva_habitacion=nueva_habitacion,
                fecha_cambio=fecha_cambio
            )
            
            return Response({
                'message': 'Cambio de habitación exitoso',
                'asignacion_anterior': AsignacionHabitacionDetailSerializer(asignacion_anterior).data if asignacion_anterior else None,
                'nueva_asignacion': AsignacionHabitacionDetailSerializer(nueva_asignacion).data
            }, status=status.HTTP_200_OK)
            
        except ValidationError as e:
            return Response(
                {'detail': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
