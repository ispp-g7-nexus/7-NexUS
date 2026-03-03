from django.db import models
from django.conf import settings
from apps.residences.models import Residence


class Recurso(models.Model):
    TIPO_CHOICES = [
        ('sala', 'Sala'),
        ('pista', 'Pista'),
        ('equipamiento', 'Equipamiento'),
        ('otro', 'Otro'),
    ]

    nombre = models.CharField(max_length=200)
    tipo = models.CharField(max_length=100, choices=TIPO_CHOICES)
    aforo_maximo = models.PositiveIntegerField(null=True, blank=True)
    descripcion = models.TextField(blank=True)
    id_residencia = models.ForeignKey(
        Residence,
        on_delete=models.CASCADE,
        related_name='recursos'
    )

    class Meta:
        ordering = ['nombre']

    def __str__(self):
        return f"{self.nombre} ({self.tipo})"


class Reserva(models.Model):
    ESTADO_CHOICES = [
        ('pendiente', 'Pendiente'),
        ('confirmada', 'Confirmada'),
        ('cancelada', 'Cancelada'),
    ]

    id_usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='reservas'
    )
    id_recurso = models.ForeignKey(
        Recurso,
        on_delete=models.CASCADE,
        related_name='reservas'
    )
    fecha_inicio = models.DateTimeField()
    fecha_fin = models.DateTimeField()
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='pendiente')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-fecha_inicio']

    def __str__(self):
        return f"{self.id_usuario} -> {self.id_recurso} ({self.fecha_inicio})"
