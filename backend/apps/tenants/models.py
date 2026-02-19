from django.core.exceptions import ValidationError
from django.db import models
from django_tenants.models import DomainMixin, TenantMixin


class Plan(models.Model):
    code = models.SlugField(unique=True)
    name = models.CharField(max_length=120)
    description = models.TextField(blank=True)
    max_residences = models.PositiveIntegerField(default=1)
    allows_whitelabel = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class Client(TenantMixin):
    name = models.CharField(max_length=150)
    slug = models.SlugField(unique=True)
    plan = models.ForeignKey(
        Plan,
        on_delete=models.PROTECT,
        related_name="clients",
        null=True,
        blank=True,
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    paid_until = models.DateField(null=True, blank=True)
    on_trial = models.BooleanField(default=True)
    whitelabel_enabled = models.BooleanField(default=False)
    metadata = models.JSONField(default=dict, blank=True)

    auto_create_schema = True

    class Meta:
        ordering = ["name"]

    def clean(self) -> None:
        if self.whitelabel_enabled and self.plan and not self.plan.allows_whitelabel:
            raise ValidationError("El plan actual no permite activar white label.")

    @property
    def can_use_whitelabel(self) -> bool:
        return bool(self.plan and self.plan.allows_whitelabel and self.whitelabel_enabled)

    def __str__(self) -> str:
        return self.name


class Domain(DomainMixin):
    class Meta:
        ordering = ["domain"]

    def __str__(self) -> str:
        return self.domain
