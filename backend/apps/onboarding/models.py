from django.db import models
from django.conf import settings
from apps.residences.models import Membership


class ResidentPreference(models.Model):
    """Stores preferences and likes of residents for personalization"""
    
    membership = models.OneToOneField(
        Membership,
        on_delete=models.CASCADE,
        related_name="resident_preferences",
        limit_choices_to={"role": Membership.Role.RESIDENT}
    )
    interests = models.JSONField(
        default=list,
        blank=True,
        help_text="JSON array of interest IDs (e.g., ['sports', 'music', 'reading'])"
    )
    dietary_restrictions = models.JSONField(
        default=list,
        blank=True,
        help_text="JSON array of dietary restrictions"
    )
    hobbies = models.TextField(blank=True)
    additional_info = models.TextField(blank=True)
    is_completed = models.BooleanField(
        default=False,
        help_text="Whether the resident has completed their preference form"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Resident Preference"
        verbose_name_plural = "Resident Preferences"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"Preferences: {self.membership.user}"
