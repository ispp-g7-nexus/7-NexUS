from django.db import models
from django.conf import settings
from apps.residences.models import Residence
from django.utils import timezone

class Object(models.Model):
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    location = models.CharField(max_length=255, blank=True)
    residence = models.ForeignKey('residences.Residence', on_delete=models.CASCADE, related_name='residence_objects')
    available = models.BooleanField(default=True)
    stock_total = models.PositiveIntegerField(default=1)
    image_url = models.URLField(blank=True, null=True)
    tags = models.CharField(max_length=255, blank=True)
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
        active_rentals_now = self.rentals.filter(status='ACTIVE', start_date__lt=now, end_date__gt=now).count()
        return active_rentals_now < self.stock_total


class ObjectRental(models.Model):
    STATUS_CHOICES = (
        ('ACTIVE', 'Activa'),
        ('CANCELLED', 'Cancelada'),
        ('COMPLETED', 'Completada'),
    )
    
    object = models.ForeignKey(Object, on_delete=models.CASCADE, related_name='rentals')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='object_rentals')
    start_date = models.DateTimeField()
    end_date = models.DateTimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ACTIVE')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-start_date']

    def __str__(self):
        return f"{self.user} -> {self.object} ({self.start_date.isoformat()} - {self.end_date.isoformat()}) [{self.status}]"