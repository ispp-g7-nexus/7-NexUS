from django.db import models
from django.utils import timezone
from django.conf import settings
from apps.residences.models import Residence

class Resident(models.Model):
    class ResidentState(models.TextChoices):
        ACTIVE = "active", "Activo"
        INACTIVE = "inactive", "Inactivo"
        PENDING = "pending", "Pendiente"

    fullname = models.CharField(max_length=100, verbose_name="Nombre Completo")
    age = models.PositiveSmallIntegerField(verbose_name="Edad")
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
        default=timezone.now,
        verbose_name="Fecha de Registro"
    )

    def __str__(self):
        return self.fullname

class StudentProfile(models.Model):
    class ChronotypeChoice(models.TextChoices):
        MORNING = "morning", "Madrugador/a"
        MIDDAY = "midday", "Normal"
        NIGHT = "night", "Nocturno/a"

    class TemperatureChoice(models.TextChoices):
        COLD = "cold", "Frío"
        COOL = "cool", "Fresco"
        WARM = "warm", "Cálido"
        HOT = "hot", "Muy cálido"

    class OrderLevelChoice(models.TextChoices):
        VERY_MESSY = "very_messy", "Muy desorganizado"
        SOMEWHAT_MESSY = "somewhat_messy", "Un poco desordenado"
        ORGANIZED = "organized", "Organizado"
        VERY_ORGANIZED = "very_organized", "Muy organizado"

    class LifestyleChoice(models.TextChoices):
        PARTY = "party", "Fiestas frecuentes"
        SOCIAL = "social", "Social/reuniones"
        QUIET = "quiet", "Tranquilo/a"
        HOMEBODY = "homebody", "Casero/a"

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="student_profile"
    )
    residence = models.ForeignKey(
        Residence,
        on_delete=models.CASCADE,
        related_name="student_profiles",
        null=True,
        blank=True
    )

    # Bio Information
    nickname = models.CharField(max_length=30, blank=True)
    bio = models.TextField(max_length=300, blank=True)
    birth_year = models.IntegerField(null=True, blank=True)
    birthplace = models.CharField(max_length=255, blank=True)
    room_number = models.CharField(max_length=20, blank=True)
    profile_image = models.ImageField(upload_to="profiles/", null=True, blank=True)

    # Preferences
    chronotype = models.CharField(
        max_length=20,
        choices=ChronotypeChoice.choices,
        blank=True
    )
    study_level = models.IntegerField(default=3, help_text="1-5 scale")
    noise_sensitivity = models.IntegerField(default=3, help_text="1-5 scale")
    temperature_preference = models.CharField(
        max_length=20,
        choices=TemperatureChoice.choices,
        blank=True
    )
    order_level = models.CharField(
        max_length=20,
        choices=OrderLevelChoice.choices,
        blank=True
    )

    # Interests & Hobbies
    interests = models.JSONField(default=list, blank=True, help_text="List of interest strings")
    custom_interests = models.JSONField(default=list, blank=True, help_text="User-added interests")

    # Lifestyle
    lifestyle = models.JSONField(default=list, blank=True, help_text="List of lifestyle choices")

    # Music Genres
    music_genres = models.JSONField(default=list, blank=True, help_text="List of music genres")

    # Dealbreakers
    dealbreakers = models.JSONField(default=list, blank=True, help_text="List of dealbreakers")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"Profile: {self.user.get_full_name() or self.user.username}"
