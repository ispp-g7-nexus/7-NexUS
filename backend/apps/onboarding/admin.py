from django.contrib import admin
from .models import ResidentPreference


@admin.register(ResidentPreference)
class ResidentPreferenceAdmin(admin.ModelAdmin):
    list_display = ["id", "get_user_name", "get_residence_name", "is_completed", "created_at"]
    list_filter = ["is_completed", "created_at"]
    search_fields = ["membership__user__email", "membership__residence__name"]
    readonly_fields = ["created_at", "updated_at"]
    
    def get_user_name(self, obj):
        return obj.membership.user.email
    get_user_name.short_description = "Usuario"
    
    def get_residence_name(self, obj):
        return obj.membership.residence.name if obj.membership.residence else "N/A"
    get_residence_name.short_description = "Residencia"
