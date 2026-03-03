from django.conf import settings
from django.db import models


class Staff(models.Model):
    # No seria un nuevo modelo sino que seria un User con un perfil concreto, este si que lo sería
    class StatusChoices(models.TextChoices):
        ACTIVO = 'active', 'Activo'
        INACTIVO = 'inactive', 'Inactivo'
        VACACIONES = 'holidays', 'Vacaciones'
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="staff_profile",
    )
    job_title = models.CharField(max_length=100, verbose_name="Cargo")
    department = models.CharField(max_length=100, verbose_name="Departamento")
    location = models.CharField(max_length=255, verbose_name="Ubicación")
    schedule = models.CharField(max_length=100, verbose_name="Horario")
    status = models.CharField(
        max_length=20,
        choices=StatusChoices.choices,
        default=StatusChoices.ACTIVO,
        verbose_name="Estado"
    )

    class Meta:
        verbose_name = "Personal"
        verbose_name_plural = "Personal"

    def __str__(self):
        return f"{self.user.get_full_name()} - {self.job_title}"
