from django.db import models


class Staff(models.Model):
    class StatusChoices(models.TextChoices):
        ACTIVO = 'active', 'Activo'
        INACTIVO = 'inactive', 'Inactivo'
        VACACIONES = 'holidays', 'Vacaciones'

    full_name = models.CharField(max_length=150,
                                 verbose_name="Nombre Completo")

    job_title = models.CharField(max_length=100, verbose_name="Cargo")
    department = models.CharField(max_length=100, verbose_name="Departamento")
    email = models.EmailField(unique=True, verbose_name="Email")
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
        return f"{self.full_name} - {self.job_title}"
