from django.db import models
from django.conf import settings


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
    residence = models.OneToOneField(
        Residence, on_delete=models.CASCADE, related_name="branding"
    )
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
    residence = models.ForeignKey(
        Residence, on_delete=models.CASCADE, related_name="domains"
    )
    domain = models.CharField(max_length=253, unique=True)
    is_primary = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["domain"]

    def __str__(self) -> str:
        return self.domain
