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
    nickname = models.CharField(max_length=100, blank=True)
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
