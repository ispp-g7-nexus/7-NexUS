from django.db import models
from django.utils import timezone
from apps.tenants.models import Client
from django.conf import settings

class Announcement(models.Model):
    """
    Modelo para gestionar los avisos de la residencia.
    Cada aviso pertenece a un tenant (residencia) específico.
    """
    
    class Category(models.TextChoices):
        URGENT = 'URGENT', 'Urgente'
        MAINTENANCE = 'MAINTENANCE', 'Mantenimiento'
        EVENT = 'EVENT', 'Evento'
        GENERAL = 'GENERAL', 'General'
    

    residence = models.ForeignKey(
        Client,
        on_delete=models.CASCADE,
        related_name='announcements',
        verbose_name="Residencia"
    )
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='announcements_created',
        verbose_name="Creado por"
    )
    
    
    title = models.CharField(
        "Título",
        max_length=200
    )
    
    description = models.TextField(
        "Descripción"
    )
    
    category = models.CharField(
        "Categoría",
        max_length=20,
        choices=Category.choices,
        default=Category.GENERAL
    )
    
    featured = models.BooleanField(
        "Destacado",
        default=False
    )
    
    publication_date = models.DateTimeField(
        "Fecha de publicación",
        default=timezone.now
    )
    
    announcement_date = models.DateField(
        "Fecha del aviso"  # Cuando acaba el aviso
    )
    
    created_at = models.DateTimeField(
        "Fecha de creación",
        auto_now_add=True
    )
    
    updated_at = models.DateTimeField(
        "Última modificación",
        auto_now=True
    )
    
    class Meta:
        verbose_name = "Announcement"
        verbose_name_plural = "Announcements"
        ordering = ['-publication_date', '-featured', '-created_at']
        indexes = [
            models.Index(fields=['residence', 'category']),
            models.Index(fields=['publication_date']),
        ]
    
    def __str__(self):
        return f"{self.title} - {self.get_category_display()}"
    
    @property
    def has_passed(self):
        """Indica si la fecha del aviso ya pasó (para mostrar en gris)"""
        if self.announcement_date:
            today = timezone.now().date()
            return self.announcement_date < today
        return False

