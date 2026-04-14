from django.db import models
from django.conf import settings
from apps.residences.models import Residence
from django.utils import timezone
from django.db.models import Q

class Object(models.Model):
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    location = models.CharField(max_length=255, blank=True)
    residence = models.ForeignKey('residences.Residence', on_delete=models.CASCADE, related_name='residence_objects')
    available = models.BooleanField(default=True)
    stock_total = models.PositiveIntegerField(default=1)
    image_url = models.URLField(max_length=300, blank=True, null=True)
    tags = models.CharField(max_length=255, blank=True)
    labels = models.ManyToManyField('ObjectLabel', blank=True, related_name='tagged_objects')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name

    def can_rent(self):
        # available flag indicates whether the object may be lent at all
        if not self.available:
            return False

        # An object is rentable when at least one unit is free right now.
        now = timezone.now()
        active_rentals_now = self.rentals.filter(
            Q(status=ObjectRental.Status.IN_PROGRESS)
            | Q(
                status=ObjectRental.Status.ACTIVE,
                start_date__lt=now,
                end_date__gt=now,
            )
        ).count()
        return active_rentals_now < self.stock_total


class ObjectRental(models.Model):
    class Status(models.TextChoices):
        ACTIVE = 'ACTIVE', 'Activa'
        IN_PROGRESS = 'IN_PROGRESS', 'En curso'
        CANCELLED = 'CANCELLED', 'Cancelada'
        COMPLETED = 'COMPLETED', 'Completada'
    
    object = models.ForeignKey(Object, on_delete=models.CASCADE, related_name='rentals')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='object_rentals')
    start_date = models.DateTimeField()
    end_date = models.DateTimeField()
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.ACTIVE,
    )
    reminder_viewed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    admin_cancelled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='cancelled_object_rentals',
    )
    admin_cancelled_reason = models.TextField(blank=True)
    admin_cancelled_at = models.DateTimeField(null=True, blank=True)
    user_dismissed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-start_date']

    def __str__(self):
        return f"{self.user} -> {self.object} ({self.start_date.isoformat()} - {self.end_date.isoformat()}) [{self.status}]"


class ObjectLabel(models.Model):
    """Etiquetas personalizadas de objetos creadas por el admin."""

    residence = models.ForeignKey(
        Residence,
        on_delete=models.CASCADE,
        related_name='object_labels',
    )
    name = models.CharField(max_length=30)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']
        constraints = [
            models.UniqueConstraint(
                fields=['residence', 'name'],
                name='uniq_object_label_per_residence',
            )
        ]

    def __str__(self):
        return self.name
