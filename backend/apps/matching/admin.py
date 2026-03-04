from django.contrib import admin

from .models import ResidenceCompatibility


@admin.register(ResidenceCompatibility)
class ResidenceCompatibilityAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "residence",
        "source_membership",
        "target_membership",
        "score",
        "updated_at",
    ]
    list_filter = ["residence", "updated_at"]
    search_fields = [
        "source_membership__user__email",
        "target_membership__user__email",
    ]
    ordering = ["-score"]
