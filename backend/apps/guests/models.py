from django.core.validators import MaxValueValidator, MinValueValidator
from django.core.exceptions import ValidationError
from django.db import models

from apps.membership.models import Membership
from apps.residences.models import Residence


class GuestPass(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "ACTIVE", "Activa"
        USED = "USED", "Usada"
        REVOKED = "REVOKED", "Revocada"
        CANCELLED = "CANCELLED", "Cancelada"
        REJECTED = "REJECTED", "Rechazada"
        INACTIVE = "INACTIVE", "Inactiva"

    residence = models.ForeignKey(
        Residence,
        on_delete=models.CASCADE,
        related_name="guest_passes",
    )
    resident = models.ForeignKey(
        Membership,
        on_delete=models.PROTECT,
        related_name="guest_passes",
        limit_choices_to={"role__name__iexact": "Student"},
    )
    full_name = models.CharField(max_length=200)
    id_document = models.CharField(max_length=80, blank=True)
    comment = models.TextField(blank=True)
    pass_code = models.CharField(max_length=40)
    access_type = models.CharField(max_length=60, blank=True)
    valid_from = models.DateTimeField()
    valid_until = models.DateTimeField()
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.ACTIVE,
        db_index=True,
    )
    cancelled_at = models.DateTimeField(null=True, blank=True)
    revoked_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def clean(self) -> None:
        super().clean()
        if self.valid_until <= self.valid_from:
            raise ValidationError(
                {"valid_until": "La fecha de fin debe ser posterior a la de inicio."}
            )

    class Meta:
        ordering = ["valid_until", "-created_at"]
        indexes = [
            models.Index(
                fields=["residence", "resident", "status"],
                name="guests_gues_residen_2d6238_idx",
            ),
            models.Index(
                fields=["residence", "status", "valid_until"],
                name="guests_gues_residen_67d52f_idx",
            ),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["residence", "pass_code"],
                name="uniq_guest_pass_code_per_residence",
            ),
            models.CheckConstraint(
                condition=models.Q(valid_until__gt=models.F("valid_from")),
                name="guest_pass_valid_until_after_valid_from",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.pass_code} - {self.full_name}"


class GuestPassPolicy(models.Model):
    residence = models.OneToOneField(
        Residence,
        on_delete=models.CASCADE,
        related_name="guest_pass_policy",
    )
    max_duration_hours = models.PositiveSmallIntegerField(
        default=24,
        validators=[MinValueValidator(1), MaxValueValidator(168)],
    )
    max_concurrent_passes = models.PositiveSmallIntegerField(
        default=3,
        validators=[MinValueValidator(1), MaxValueValidator(20)],
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Guest pass policy"
        verbose_name_plural = "Guest pass policies"

    def __str__(self) -> str:
        return (
            f"Policy {self.residence_id}: {self.max_duration_hours}h / "
            f"{self.max_concurrent_passes} concurrentes"
        )
