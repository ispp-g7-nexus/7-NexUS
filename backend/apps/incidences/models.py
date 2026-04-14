from django.db import models
from django.conf import settings

class Incidence(models.Model):
    LOCATION_CHOICES = [
        ('habitacion', 'Mi Habitación'),
        ('baño', 'Baño Común'),
        ('cocina', 'Cocina'),
        ('comedor', 'Comedor'),
        ('exterior', 'Zonas Exteriores'),
        ('salas_comunes', 'Salas Comunes'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pendiente'),      
        ('reviewing', 'En revisión'), 
        ('in_progress', 'En proceso'), 
        ('resolved', 'Resuelto'),     
    ]

    PRIORITY_CHOICES = [
        ('low', 'BAJA'),
        ('high', 'URGENTE'),
    ]

    title = models.CharField(max_length=150)
    description = models.TextField()
    location_type = models.CharField(max_length=20, choices=LOCATION_CHOICES)
    room_number = models.ForeignKey(
        'bedrooms.Bedroom',on_delete=models.SET_NULL, null=True, blank=True, related_name='incidences')
    #room_number = models.CharField(max_length=20, blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='low')
    
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='incidences'
    )
    
    assigned_staff = models.ForeignKey(
        'staff.Staff', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='incidences'
    )


    assigned_external_name = models.CharField(
    max_length=100, 
    blank=True, 
    default="",
    verbose_name="Personal externo u otro"
)

    @property
    def assigned_staff_job(self):
        if self.assigned_staff:
            return self.assigned_staff.job_title
        return None

    admin_notes = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    img = models.TextField(blank=True, null=True)
    
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
    author_name = models.CharField(max_length=50, default="Admin") 
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']