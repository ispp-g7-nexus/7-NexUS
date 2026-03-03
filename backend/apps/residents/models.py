import datetime
from datetime import timezone
from django.db import models


class Resident(models.Model):
    class ResidentState(models.TextChoices):
        ACTIVE = "active", "Activo"
        INACTIVE = "inactive", "Inactivo"
        PENDING = "pending", "Pendiente"

    fullname = models.CharField(max_length=100, verbose_name="Nombre Completo")
    age = models.IntegerField(verbose_name="Edad")
    email = models.EmailField(unique=True, verbose_name="Correo Electrónico")
    state = models.CharField(
        max_length=20,
        choices=ResidentState.choices,
        default=ResidentState.PENDING,
        verbose_name="Estado"
    )
    room = models.CharField(max_length=10, verbose_name="Habitación")
    building = models.CharField(max_length=100, verbose_name="Edificio")
    check_in_date = models.DateField(
        default=datetime.datetime.now(tz=timezone.utc).date(),
        verbose_name="Fecha de Registro"
    )

    def __str__(self):
        return self.fullname

    class Meta:
        managed = False
        db_table = "residents_resident"
