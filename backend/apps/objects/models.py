from django.db import models
from django.conf import settings
from apps.residences.models import Residence
from django.utils import timezone

class Object(models.Model):
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    location = models.CharField(max_length=255, blank=True)
    residence = models.ForeignKey(Residence, on_delete=models.CASCADE, related_name='objects')
    available = models.BooleanField(default=True)
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

        # If there are any active rentals overlapping 'now', object is not available
        now = timezone.now()
        return not self.rentals.filter(start_date__lt=now, end_date__gt=now).exists()


class ObjectRental(models.Model):
    object = models.ForeignKey(Object, on_delete=models.CASCADE, related_name='rentals')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='object_rentals')
    start_date = models.DateTimeField()
    end_date = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-start_date']

    def __str__(self):
        return f"{self.user} -> {self.object} ({self.start_date.isoformat()} - {self.end_date.isoformat()})"