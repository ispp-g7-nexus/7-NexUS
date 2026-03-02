from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models


class Residence(models.Model):
    name = models.CharField(max_length=180)
    slug = models.SlugField(unique=True)
    code = models.CharField(max_length=30, unique=True)
    timezone = models.CharField(max_length=50, default="Europe/Madrid")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class ResidenceBranding(models.Model):
    residence = models.OneToOneField(Residence, on_delete=models.CASCADE, related_name="branding")
    primary_color = models.CharField(max_length=7, default="#0F4C81")
    secondary_color = models.CharField(max_length=7, default="#F4B400")
    accent_color = models.CharField(max_length=7, default="#2E7D32")
    logo_url = models.URLField(blank=True)
    favicon_url = models.URLField(blank=True)
    custom_css = models.TextField(blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return f"Branding: {self.residence.name}"


class ResidenceDomain(models.Model):
    residence = models.ForeignKey(Residence, on_delete=models.CASCADE, related_name="domains")
    domain = models.CharField(max_length=253, unique=True)
    is_primary = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["domain"]

    def __str__(self) -> str:
        return self.domain


class Membership(models.Model):
    class Role(models.TextChoices):
        PORTFOLIO_ADMIN = "portfolio_admin", "Admin de grupo"
        RESIDENCE_ADMIN = "residence_admin", "Admin de residencia"
        RESIDENT = "resident", "Residente"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="memberships",
    )
    role = models.CharField(max_length=32, choices=Role.choices)
    residence = models.ForeignKey(
        Residence,
        on_delete=models.CASCADE,
        related_name="memberships",
        null=True,
        blank=True,
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
        if self.role == self.Role.PORTFOLIO_ADMIN and self.residence_id is not None:
            raise ValidationError("El rol de admin de grupo no puede ligarse a una residencia concreta.")
        if self.role in {self.Role.RESIDENCE_ADMIN, self.Role.RESIDENT} and self.residence_id is None:
            raise ValidationError("Este rol requiere una residencia asociada.")

    def __str__(self) -> str:
        if self.residence_id:
            return f"{self.user} - {self.get_role_display()} ({self.residence})"
        return f"{self.user} - {self.get_role_display()}"


class Residente(models.Model):
    """
    Perfil extendido del residente con información adicional
    """
    class Genero(models.TextChoices):
        MASCULINO = "M", "Masculino"
        FEMENINO = "F", "Femenino"
        OTRO = "O", "Otro"

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="perfil_residente",
    )
    residence = models.ForeignKey(
        Residence,
        on_delete=models.CASCADE,
        related_name="residentes",
    )
    genero = models.CharField(max_length=1, choices=Genero.choices)
    fecha_nacimiento = models.DateField(null=True, blank=True)
    telefono = models.CharField(max_length=20, blank=True)
    fecha_ingreso = models.DateField()
    fecha_baja = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)  # Soft delete
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["user__last_name", "user__first_name"]
        verbose_name = "Residente"
        verbose_name_plural = "Residentes"

    def __str__(self) -> str:
        return f"{self.user.get_full_name() or self.user.username} - {self.residence.name}"


class Habitacion(models.Model):
    """
    Habitación dentro de una residencia
    """
    class TipoHabitacion(models.TextChoices):
        INDIVIDUAL = "IND", "Individual"
        COMPARTIDA = "COMP", "Compartida"

    residence = models.ForeignKey(
        Residence,
        on_delete=models.CASCADE,
        related_name="habitaciones",
    )
    numero = models.CharField(max_length=10)
    piso = models.IntegerField(default=1)
    tipo = models.CharField(max_length=4, choices=TipoHabitacion.choices)
    capacidad_maxima = models.PositiveIntegerField(default=1)
    
    # Campo añadido según R1 & R5: género asignado para habitaciones compartidas
    genero_asignado = models.CharField(
        max_length=1,
        choices=Residente.Genero.choices,
        null=True,
        blank=True,
        help_text="Género asignado para habitaciones compartidas. Se establece con el primer residente."
    )
    
    is_active = models.BooleanField(default=True)  # Soft delete
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["numero"]
        verbose_name = "Habitación"
        verbose_name_plural = "Habitaciones"
        constraints = [
            models.UniqueConstraint(
                fields=["residence", "numero"],
                name="uniq_habitacion_residence_numero",
            ),
        ]

    def clean(self) -> None:
        if self.capacidad_maxima < 1:
            raise ValidationError("La capacidad máxima debe ser al menos 1.")
        if self.tipo == self.TipoHabitacion.INDIVIDUAL and self.capacidad_maxima > 1:
            raise ValidationError("Una habitación individual solo puede tener capacidad para 1 persona.")

    def __str__(self) -> str:
        return f"Habitación {self.numero} - {self.residence.name}"

    @property
    def asignaciones_activas_count(self) -> int:
        """Cuenta las asignaciones activas actuales"""
        return self.asignaciones.filter(estado=AsignacionHabitacion.Estado.ACTIVA).count()

    @property
    def esta_llena(self) -> bool:
        """Verifica si la habitación está a capacidad máxima"""
        return self.asignaciones_activas_count >= self.capacidad_maxima

    @property
    def esta_vacia(self) -> bool:
        """Verifica si la habitación no tiene asignaciones activas"""
        return self.asignaciones_activas_count == 0


class AsignacionHabitacion(models.Model):
    """
    Registro de asignación de un residente a una habitación
    """
    class Estado(models.TextChoices):
        ACTIVA = "ACTIVA", "Activa"
        FINALIZADA = "FINALIZADA", "Finalizada"
        CANCELADA = "CANCELADA", "Cancelada"

    residente = models.ForeignKey(
        Residente,
        on_delete=models.CASCADE,
        related_name="asignaciones",
    )
    habitacion = models.ForeignKey(
        Habitacion,
        on_delete=models.CASCADE,
        related_name="asignaciones",
    )
    estado = models.CharField(
        max_length=10,
        choices=Estado.choices,
        default=Estado.ACTIVA,
    )
    fecha_inicio = models.DateField()
    fecha_fin = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-fecha_inicio"]
        verbose_name = "Asignación de Habitación"
        verbose_name_plural = "Asignaciones de Habitaciones"
        indexes = [
            models.Index(fields=["residente", "estado"]),
            models.Index(fields=["habitacion", "estado"]),
        ]

    def clean(self) -> None:
        if self.fecha_fin and self.fecha_inicio and self.fecha_fin < self.fecha_inicio:
            raise ValidationError("La fecha de fin no puede ser anterior a la fecha de inicio.")

    def __str__(self) -> str:
        return f"{self.residente.user.get_full_name()} -> Hab. {self.habitacion.numero} ({self.get_estado_display()})"
