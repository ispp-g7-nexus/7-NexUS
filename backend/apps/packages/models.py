import string
import random
from django.core.exceptions import ValidationError
from django.conf import settings
from django.db import models
from django.utils import timezone

from apps.membership.models import Membership
from apps.residences.models import Residence

def generate_delivery_code():
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=5))

class Package(models.Model):
    class Status(models.TextChoices):
        RECEIVED = "RECEIVED", "Recibido"
        DELIVERED = "DELIVERED", "Entregado"

    residence = models.ForeignKey(
        Residence,
        on_delete=models.CASCADE,
        related_name="packages",
    )
    resident = models.ForeignKey(
        Membership,
        on_delete=models.PROTECT,
        related_name="packages",
        limit_choices_to={"role__name__iexact": "Student"},
    )
    resident_name_snapshot = models.CharField(max_length=200)
    room_snapshot = models.CharField(max_length=50)
    building_snapshot = models.CharField(max_length=100, blank=True)
    carrier = models.CharField(max_length=120, blank=True)
    tracking_number = models.CharField(max_length=120, blank=True)
    delivery_code = models.CharField(max_length=5, default=generate_delivery_code)
    notes = models.TextField(blank=True, max_length=2000)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.RECEIVED,
        db_index=True,
    )
    received_at = models.DateTimeField(default=timezone.now)
    delivered_at = models.DateTimeField(null=True, blank=True)
    resident_notified_at = models.DateTimeField(null=True, blank=True)
    resident_viewed_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_packages",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def clean(self) -> None:
        super().clean()

        errors = {}
        now = timezone.now()

        if self.received_at and self.received_at > now:
            errors["received_at"] = "La fecha de recepción no puede ser futura."

        if self.delivered_at and self.received_at and self.delivered_at < self.received_at:
            errors["delivered_at"] = "La fecha de entrega no puede ser anterior a la fecha de recepción."

        if self.status == self.Status.DELIVERED:
            if self.delivered_at is None:
                errors["delivered_at"] = "Los paquetes entregados deben tener fecha de entrega."
            elif self.delivered_at > now:
                errors["delivered_at"] = "La fecha de entrega no puede ser futura."

        if self.status != self.Status.DELIVERED and self.delivered_at is not None:
            errors["delivered_at"] = "Solo los paquetes entregados pueden tener fecha de entrega."

        if errors:
            raise ValidationError(errors)

    class Meta:
        ordering = ["-received_at", "-created_at"]
        indexes = [
            models.Index(fields=["residence", "status"]),
            models.Index(fields=["resident", "status"]),
            models.Index(fields=["residence", "resident_viewed_at"]),
        ]
        constraints = [
            models.CheckConstraint(
                name="package_delivered_at_matches_status",
                check=(
                    (
                        models.Q(status="DELIVERED")
                        & models.Q(delivered_at__isnull=False)
                    )
                    | (
                        ~models.Q(status="DELIVERED")
                        & models.Q(delivered_at__isnull=True)
                    )
                ),
            ),
        ]

    def __str__(self) -> str:
        return f"Paquete #{self.pk} - {self.resident_name_snapshot}"
