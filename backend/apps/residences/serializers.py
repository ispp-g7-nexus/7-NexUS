"""
Serializers para la gestión de residentes, habitaciones y asignaciones.
"""
from rest_framework import serializers
from django.contrib.auth import get_user_model

from .models import Residente, Habitacion, AsignacionHabitacion

User = get_user_model()


class UserBasicSerializer(serializers.ModelSerializer):
    """Serializer básico para información del usuario"""
    full_name = serializers.CharField(source='get_full_name', read_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'full_name']
        read_only_fields = ['id', 'username', 'email']


class ResidenteListSerializer(serializers.ModelSerializer):
    """Serializer para listados de residentes (información resumida)"""
    user = UserBasicSerializer(read_only=True)
    genero_display = serializers.CharField(source='get_genero_display', read_only=True)
    asignacion_actual = serializers.SerializerMethodField()
    
    class Meta:
        model = Residente
        fields = [
            'id', 'user', 'genero', 'genero_display', 
            'fecha_ingreso', 'fecha_baja', 'is_active',
            'asignacion_actual', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_asignacion_actual(self, obj):
        """Obtiene la asignación activa del residente si existe"""
        asignacion = obj.asignaciones.filter(
            estado=AsignacionHabitacion.Estado.ACTIVA
        ).select_related('habitacion').first()
        
        if asignacion:
            return {
                'id': asignacion.id,
                'habitacion_id': asignacion.habitacion.id,
                'habitacion_numero': asignacion.habitacion.numero,
                'fecha_inicio': asignacion.fecha_inicio
            }
        return None


class ResidenteDetailSerializer(serializers.ModelSerializer):
    """Serializer detallado para residentes"""
    user = UserBasicSerializer(read_only=True)
    user_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source='user',
        write_only=True
    )
    genero_display = serializers.CharField(source='get_genero_display', read_only=True)
    residence_name = serializers.CharField(source='residence.name', read_only=True)
    
    class Meta:
        model = Residente
        fields = [
            'id', 'user', 'user_id', 'residence', 'residence_name',
            'genero', 'genero_display', 'fecha_nacimiento', 'telefono',
            'fecha_ingreso', 'fecha_baja', 'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class HabitacionListSerializer(serializers.ModelSerializer):
    """Serializer para listados de habitaciones"""
    tipo_display = serializers.CharField(source='get_tipo_display', read_only=True)
    genero_asignado_display = serializers.CharField(
        source='get_genero_asignado_display', 
        read_only=True
    )
    asignaciones_activas_count = serializers.IntegerField(read_only=True)
    esta_llena = serializers.BooleanField(read_only=True)
    esta_vacia = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = Habitacion
        fields = [
            'id', 'numero', 'piso', 'tipo', 'tipo_display',
            'capacidad_maxima', 'genero_asignado', 'genero_asignado_display',
            'asignaciones_activas_count', 'esta_llena', 'esta_vacia',
            'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'genero_asignado', 'asignaciones_activas_count',
            'esta_llena', 'esta_vacia', 'created_at', 'updated_at'
        ]


class HabitacionDetailSerializer(serializers.ModelSerializer):
    """Serializer detallado para habitaciones"""
    tipo_display = serializers.CharField(source='get_tipo_display', read_only=True)
    genero_asignado_display = serializers.CharField(
        source='get_genero_asignado_display', 
        read_only=True
    )
    residence_name = serializers.CharField(source='residence.name', read_only=True)
    asignaciones_activas_count = serializers.IntegerField(read_only=True)
    esta_llena = serializers.BooleanField(read_only=True)
    esta_vacia = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = Habitacion
        fields = [
            'id', 'residence', 'residence_name', 'numero', 'piso',
            'tipo', 'tipo_display', 'capacidad_maxima',
            'genero_asignado', 'genero_asignado_display',
            'asignaciones_activas_count', 'esta_llena', 'esta_vacia',
            'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'genero_asignado', 'asignaciones_activas_count',
            'esta_llena', 'esta_vacia', 'created_at', 'updated_at'
        ]
    
    def validate(self, attrs):
        """Validaciones adicionales"""
        capacidad = attrs.get('capacidad_maxima')
        tipo = attrs.get('tipo')
        
        if capacidad and capacidad < 1:
            raise serializers.ValidationError({
                'capacidad_maxima': 'La capacidad máxima debe ser al menos 1.'
            })
        
        if tipo == Habitacion.TipoHabitacion.INDIVIDUAL and capacidad and capacidad > 1:
            raise serializers.ValidationError({
                'capacidad_maxima': 'Una habitación individual solo puede tener capacidad para 1 persona.'
            })
        
        return attrs


class AsignacionHabitacionListSerializer(serializers.ModelSerializer):
    """Serializer para listados de asignaciones"""
    residente_nombre = serializers.CharField(
        source='residente.user.get_full_name',
        read_only=True
    )
    residente_email = serializers.EmailField(
        source='residente.user.email',
        read_only=True
    )
    habitacion_numero = serializers.CharField(
        source='habitacion.numero',
        read_only=True
    )
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)
    
    class Meta:
        model = AsignacionHabitacion
        fields = [
            'id', 'residente', 'residente_nombre', 'residente_email',
            'habitacion', 'habitacion_numero', 'estado', 'estado_display',
            'fecha_inicio', 'fecha_fin', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class AsignacionHabitacionDetailSerializer(serializers.ModelSerializer):
    """Serializer detallado para asignaciones"""
    residente = ResidenteListSerializer(read_only=True)
    habitacion = HabitacionListSerializer(read_only=True)
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)
    
    class Meta:
        model = AsignacionHabitacion
        fields = [
            'id', 'residente', 'habitacion', 'estado', 'estado_display',
            'fecha_inicio', 'fecha_fin', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class AsignacionCreateSerializer(serializers.Serializer):
    """Serializer para crear una nueva asignación"""
    residente_id = serializers.IntegerField()
    habitacion_id = serializers.IntegerField()
    fecha_inicio = serializers.DateField(required=False)
    
    def validate_residente_id(self, value):
        """Valida que el residente existe"""
        if not Residente.objects.filter(id=value, is_active=True).exists():
            raise serializers.ValidationError("El residente no existe o no está activo.")
        return value
    
    def validate_habitacion_id(self, value):
        """Valida que la habitación existe"""
        if not Habitacion.objects.filter(id=value, is_active=True).exists():
            raise serializers.ValidationError("La habitación no existe o no está activa.")
        return value


class ResidenteReleaseSerializer(serializers.Serializer):
    """Serializer para dar de baja a un residente"""
    residente_id = serializers.IntegerField()
    fecha_baja = serializers.DateField(required=False)
    
    def validate_residente_id(self, value):
        """Valida que el residente existe"""
        if not Residente.objects.filter(id=value, is_active=True).exists():
            raise serializers.ValidationError("El residente no existe o no está activo.")
        return value


class RoomChangeSerializer(serializers.Serializer):
    """Serializer para cambio de habitación"""
    residente_id = serializers.IntegerField()
    nueva_habitacion_id = serializers.IntegerField()
    fecha_cambio = serializers.DateField(required=False)
    
    def validate_residente_id(self, value):
        """Valida que el residente existe"""
        if not Residente.objects.filter(id=value, is_active=True).exists():
            raise serializers.ValidationError("El residente no existe o no está activo.")
        return value
    
    def validate_nueva_habitacion_id(self, value):
        """Valida que la habitación existe"""
        if not Habitacion.objects.filter(id=value, is_active=True).exists():
            raise serializers.ValidationError("La habitación no existe o no está activa.")
        return value
