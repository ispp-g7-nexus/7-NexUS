from django.conf import settings
from django.db import models
from django.db.models import F, Q

from apps.residences.models import Residence


class CommonSpace(models.Model):
    name = models.CharField(max_length=140)
    description = models.TextField(blank=True)
    capacity = models.PositiveIntegerField(default=1)
    is_active = models.BooleanField(default=True)
    open_time = models.TimeField()
    close_time = models.TimeField()
    residence = models.ForeignKey(
        Residence,
        on_delete=models.CASCADE,
        related_name="common_spaces",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(
                fields=["residence", "name"],
                name="uniq_common_space_name_residence",
            ),
            models.CheckConstraint(
                condition=Q(close_time__gt=F("open_time")),
                name="common_space_close_after_open",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.name} ({self.residence.name})"


class SpaceReservation(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "active", "Activa"
        CANCELLED = "cancelled", "Cancelada"

    space = models.ForeignKey(
        CommonSpace,
        on_delete=models.CASCADE,
        related_name="reservations",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="space_reservations",
    )
    residence = models.ForeignKey(
        Residence,
        on_delete=models.CASCADE,
        related_name="space_reservations",
    )
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.ACTIVE)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["start_time"]
        indexes = [
            models.Index(fields=["residence", "space", "status", "start_time"]),
            models.Index(fields=["residence", "user", "status", "start_time"]),
        ]
        constraints = [
            models.CheckConstraint(
                condition=Q(end_time__gt=F("start_time")),
                name="space_reservation_end_after_start",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.space.name}: {self.start_time.isoformat()} - {self.end_time.isoformat()}"
