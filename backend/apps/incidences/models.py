from django.db import models
from django.conf import settings

class Incidence(models.Model):
    LOCATION_CHOICES = [
        ('habitacion', 'Mi Habitación'),
        ('baño', 'Baño Común'),
        ('cocina', 'Cocina'),
        ('zonas_comunes', 'Zonas Comunes'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pendiente'),      
        ('reviewing', 'En revisión'), # Naranja
        ('in_progress', 'En proceso'), # Azul
        ('resolved', 'Resuelto'),      # Verde
    ]

    PRIORITY_CHOICES = [
        ('low', 'BAJA'),
        ('high', 'URGENTE'),
    ]

    title = models.CharField(max_length=150)
    description = models.TextField()
    location_type = models.CharField(max_length=20, choices=LOCATION_CHOICES)
    room_number = models.CharField(max_length=20, blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='low')
    
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='incidences'
    )
    
    assigned_technician = models.CharField(max_length=100, blank=True, null=True)
    admin_notes = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

class IncidenceUpdate(models.Model):
    """
    Este modelo es el que alimenta el 'HISTORIAL DE ACTUALIZACIONES' 
    """
    incidence = models.ForeignKey(
        Incidence, 
        on_delete=models.CASCADE, 
        related_name='updates'
    )
    author_name = models.CharField(max_length=50, default="Admin") # Quién escribe (Admin/Sistema)
    text = models.TextField() # El comentario del historial
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']