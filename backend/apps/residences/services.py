"""
Servicios de lógica de negocio para gestión de asignaciones de habitaciones.
Implementa las reglas de negocio R1-R6 según especificación NX-S1.17.
"""
from datetime import date
from typing import Optional, Tuple

from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from .models import AsignacionHabitacion, Habitacion, Residente


class AssignmentService:
    """
    Servicio para gestionar asignaciones de residentes a habitaciones.
    Centraliza toda la lógica de negocio relacionada con asignaciones.
    """

    @staticmethod
    def _validate_room_capacity(habitacion: Habitacion) -> None:
        """
        Valida que la habitación tenga capacidad disponible.
        
        :raises ValidationError: Si la habitación está llena
        """
        if habitacion.esta_llena:
            raise ValidationError(
                f"La habitación {habitacion.numero} está llena. "
                f"Capacidad: {habitacion.capacidad_maxima}, "
                f"Ocupadas: {habitacion.asignaciones_activas_count}"
            )

    @staticmethod
    def _validate_gender_compatibility(
        habitacion: Habitacion, 
        residente: Residente
    ) -> None:
        """
        R1 & R5: Valida compatibilidad de género en habitaciones compartidas.
        
        - Si la habitación es individual, no hay restricción.
        - Si es compartida y está vacía, cualquier género es válido (el primer residente define el género).
        - Si es compartida y tiene residentes, debe coincidir el género.
        
        :raises ValidationError: Si hay incompatibilidad de género
        """
        # Las habitaciones individuales no tienen restricción de género
        if habitacion.tipo == Habitacion.TipoHabitacion.INDIVIDUAL:
            return
        
        # Para habitaciones compartidas
        if habitacion.tipo == Habitacion.TipoHabitacion.COMPARTIDA:
            # Si la habitación está vacía, cualquier género es válido
            if habitacion.esta_vacia:
                return
            
            # Si ya tiene un género asignado, debe coincidir
            if habitacion.genero_asignado and habitacion.genero_asignado != residente.genero:
                raise ValidationError(
                    f"La habitación {habitacion.numero} está asignada para género "
                    f"{habitacion.get_genero_asignado_display()}. "
                    f"El residente es de género {residente.get_genero_display()}."
                )

    @staticmethod
    def _validate_no_active_assignment(residente: Residente) -> None:
        """
        R2: Valida que el residente no tenga otra asignación activa.
        
        :raises ValidationError: Si el residente ya tiene una asignación activa
        """
        active_assignment = AsignacionHabitacion.objects.filter(
            residente=residente,
            estado=AsignacionHabitacion.Estado.ACTIVA
        ).first()
        
        if active_assignment:
            raise ValidationError(
                f"El residente {residente.user.get_full_name()} ya tiene una asignación activa "
                f"en la habitación {active_assignment.habitacion.numero}. "
                f"Debe finalizar la asignación actual antes de crear una nueva."
            )

    @staticmethod
    def _validate_resident_is_active(residente: Residente) -> None:
        """
        Valida que el residente esté activo (no dado de baja).
        
        :raises ValidationError: Si el residente está dado de baja
        """
        if not residente.is_active:
            raise ValidationError(
                f"El residente {residente.user.get_full_name()} está dado de baja "
                f"y no puede ser asignado a una habitación."
            )

    @staticmethod
    def _update_room_gender(habitacion: Habitacion, genero: str) -> None:
        """
        R5: Actualiza el género asignado de la habitación compartida si es el primer residente.
        
        :param habitacion: Habitación a actualizar
        :param genero: Género del residente
        """
        if (habitacion.tipo == Habitacion.TipoHabitacion.COMPARTIDA and 
            habitacion.esta_vacia and 
            not habitacion.genero_asignado):
            habitacion.genero_asignado = genero
            habitacion.save(update_fields=["genero_asignado", "updated_at"])

    @staticmethod
    def _clear_room_gender_if_empty(habitacion: Habitacion) -> None:
        """
        R5: Limpia el género asignado si la habitación compartida queda vacía.
        
        :param habitacion: Habitación a verificar
        """
        if (habitacion.tipo == Habitacion.TipoHabitacion.COMPARTIDA and 
            habitacion.esta_vacia and 
            habitacion.genero_asignado):
            habitacion.genero_asignado = None
            habitacion.save(update_fields=["genero_asignado", "updated_at"])

    @staticmethod
    @transaction.atomic
    def assign_resident(
        residente: Residente,
        habitacion: Habitacion,
        fecha_inicio: Optional[date] = None
    ) -> AsignacionHabitacion:
        """
        Asigna un residente a una habitación.
        
        Aplica todas las validaciones de reglas de negocio:
        - R1: Validación de género en habitaciones compartidas
        - R2: Un residente solo puede tener una asignación activa
        - R5: El primer residente define el género en habitaciones compartidas
        
        :param residente: Residente a asignar
        :param habitacion: Habitación destino
        :param fecha_inicio: Fecha de inicio (por defecto, hoy)
        :return: AsignacionHabitacion creada
        :raises ValidationError: Si alguna validación falla
        """
        # Validaciones
        AssignmentService._validate_resident_is_active(residente)
        AssignmentService._validate_no_active_assignment(residente)
        AssignmentService._validate_room_capacity(habitacion)
        AssignmentService._validate_gender_compatibility(habitacion, residente)
        
        # Si todo es válido, actualizar género de habitación si es necesario
        AssignmentService._update_room_gender(habitacion, residente.genero)

        # Si tenía fecha de baja previa, se considera reactivación al reasignar.
        if residente.fecha_baja is not None:
            residente.fecha_baja = None
            residente.save(update_fields=["fecha_baja", "updated_at"])
        
        # Crear asignación
        asignacion = AsignacionHabitacion.objects.create(
            residente=residente,
            habitacion=habitacion,
            estado=AsignacionHabitacion.Estado.ACTIVA,
            fecha_inicio=fecha_inicio or timezone.now().date()
        )
        
        return asignacion

    @staticmethod
    @transaction.atomic
    def release_room(
        residente: Residente,
        fecha_fin: Optional[date] = None
    ) -> Tuple[Optional[AsignacionHabitacion], Optional[Habitacion]]:
        """
        R6: Libera la habitación de un residente.
        
        - Marca la asignación activa como FINALIZADA
        - Actualiza el género de la habitación si queda vacía
        - Si se envía fecha_fin explícita, también marca fecha_baja en el residente
        
        :param residente: Residente a dar de baja
        :param fecha_fin: Fecha de fin de la asignación (por defecto, hoy)
        :return: Tupla (asignación actualizada, habitación liberada) o (None, None) si no hay asignación activa
        """
        # Buscar asignación activa
        asignacion = AsignacionHabitacion.objects.filter(
            residente=residente,
            estado=AsignacionHabitacion.Estado.ACTIVA
        ).select_related('habitacion').first()
        
        if not asignacion:
            return None, None
        
        habitacion = asignacion.habitacion
        fecha_baja = fecha_fin or timezone.now().date()
        
        # Actualizar asignación
        asignacion.estado = AsignacionHabitacion.Estado.FINALIZADA
        asignacion.fecha_fin = fecha_baja
        asignacion.save(update_fields=["estado", "fecha_fin", "updated_at"])
        
        # Solo marcamos fecha_baja si se solicita explícitamente.
        if fecha_fin is not None:
            residente.fecha_baja = fecha_baja
            residente.save(update_fields=["fecha_baja", "updated_at"])
        
        # Limpiar género de habitación si quedó vacía
        AssignmentService._clear_room_gender_if_empty(habitacion)
        
        return asignacion, habitacion

    @staticmethod
    @transaction.atomic
    def change_room(
        residente: Residente,
        nueva_habitacion: Habitacion,
        fecha_cambio: Optional[date] = None
    ) -> Tuple[Optional[AsignacionHabitacion], AsignacionHabitacion]:
        """
        Cambia un residente de habitación.
        
        Finaliza la asignación actual y crea una nueva en la habitación destino.
        
        :param residente: Residente a cambiar
        :param nueva_habitacion: Nueva habitación
        :param fecha_cambio: Fecha del cambio (por defecto, hoy)
        :return: Tupla (asignación anterior, nueva asignación)
        :raises ValidationError: Si alguna validación falla
        """
        fecha = fecha_cambio or timezone.now().date()
        
        # Liberar habitación actual (sin establecer fecha_baja en residente)
        asignacion_anterior = AsignacionHabitacion.objects.filter(
            residente=residente,
            estado=AsignacionHabitacion.Estado.ACTIVA
        ).select_related('habitacion').first()
        
        if asignacion_anterior:
            habitacion_anterior = asignacion_anterior.habitacion
            asignacion_anterior.estado = AsignacionHabitacion.Estado.FINALIZADA
            asignacion_anterior.fecha_fin = fecha
            asignacion_anterior.save(update_fields=["estado", "fecha_fin", "updated_at"])
            
            # Limpiar género de habitación anterior si quedó vacía
            AssignmentService._clear_room_gender_if_empty(habitacion_anterior)
        
        # Crear nueva asignación
        nueva_asignacion = AssignmentService.assign_resident(
            residente=residente,
            habitacion=nueva_habitacion,
            fecha_inicio=fecha
        )
        
        return asignacion_anterior, nueva_asignacion

    @staticmethod
    def get_available_rooms_for_resident(
        residente: Residente,
        residence=None
    ) -> list[Habitacion]:
        """
        Obtiene las habitaciones disponibles para un residente específico.
        
        Filtra según:
        - Capacidad disponible
        - Compatibilidad de género (para compartidas)
        - Residencia
        
        :param residente: Residente para el que buscar habitaciones
        :param residence: Residencia específica (opcional, por defecto la del residente)
        :return: Lista de habitaciones disponibles
        """
        residence = residence or residente.residence
        
        # Habitaciones activas de la residencia con capacidad
        habitaciones = Habitacion.objects.filter(
            residence=residence,
            is_active=True
        ).prefetch_related('asignaciones')
        
        habitaciones_disponibles = []
        
        for habitacion in habitaciones:
            # Verificar capacidad
            if habitacion.esta_llena:
                continue
            
            # Verificar compatibilidad de género
            try:
                AssignmentService._validate_gender_compatibility(habitacion, residente)
                habitaciones_disponibles.append(habitacion)
            except ValidationError:
                continue
        
        return habitaciones_disponibles
