from django.contrib import admin

from django.contrib import admin
from .models import Incidence

@admin.register(Incidence)
class IncidenceAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'student', 'location_type', 'room_number', 'status', 'img', 'created_at')
    search_fields = ('title', 'student__username', 'room_number')
    list_editable = ('status',)