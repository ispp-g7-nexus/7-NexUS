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
    sex = models.CharField(max_length=20, blank=True)
    age = models.PositiveSmallIntegerField(null=True, blank=True)
    schedule = models.CharField(max_length=20, blank=True)
    study_location = models.CharField(max_length=100, blank=True)
    social_level = models.PositiveSmallIntegerField(null=True, blank=True)
    weekend_return = models.CharField(max_length=50, blank=True)
    outside_plans_importance = models.CharField(max_length=50, blank=True)
    desired_activity = models.CharField(max_length=50, blank=True)
    order_importance = models.PositiveSmallIntegerField(null=True, blank=True)
    noise_tolerance = models.PositiveSmallIntegerField(null=True, blank=True)
    smoking_vaping = models.CharField(max_length=50, blank=True)
    visitors_preference = models.CharField(max_length=100, blank=True)
    basic_items_preference = models.CharField(max_length=100, blank=True)
    temperature_preference = models.CharField(max_length=50, blank=True)

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
