from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models

from apps.residences.models import Residence


class Role(models.Model):
    name = models.CharField(max_length=50, verbose_name="Nombre del Rol")
    description = models.TextField(blank=True, verbose_name="Descripción")

    # Identifica si es "Admin" o "Student"
    is_system_default = models.BooleanField(default=False)

    # Si es un rol personalizado, se asigna a la residencia del admin que lo creó
    residence = models.ForeignKey(
        Residence,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="custom_roles",
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["name", "residence"], name="unique_role_name_per_residence"
            )
        ]

    def clean(self):
        if not self.is_system_default and self.residence is None:
            raise ValidationError(
                "Los roles personalizados deben pertenecer a una residencia específica."
            )
        if self.is_system_default and self.residence is not None:
            raise ValidationError(
                "Los roles del sistema no pueden estar atados a una residencia."
            )

    def __str__(self):
        return (
            f"{self.name} (Sistema)"
            if self.is_system_default
            else f"{self.name} ({self.residence.name})"
        )


class Membership(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="memberships",
    )
    role = models.ForeignKey(
        Role,
        on_delete=models.PROTECT,
        related_name="memberships",
    )
    residence = models.ForeignKey(
        Residence,
        on_delete=models.CASCADE,
        related_name="memberships",
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["user_id", "role"]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "role", "residence"],
                name="uniq_membership_user_role_residence",
            ),
        ]

    def clean(self) -> None:
        if not self.role.is_system_default and self.role.residence != self.residence:
            raise ValidationError("Este rol no pertenece a la residencia seleccionada.")

    def __str__(self) -> str:
        return f"{self.user} - {self.role.name} ({self.residence})"
