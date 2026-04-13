from django.contrib import admin
from .models import MenuWeek, MenuDay, Meal, SpecialMenuRequest


@admin.register(MenuWeek)
class MenuWeekAdmin(admin.ModelAdmin):
    list_display = ('residence', 'week_start', 'week_end', 'is_published', 'created_at')
    list_filter = ('residence', 'is_published', 'created_at')
    search_fields = ('residence__name',)
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        ('Información básica', {
            'fields': ('residence', 'week_start', 'week_end')
        }),
        ('Publicación', {
            'fields': ('is_published', 'created_by')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(MenuDay)
class MenuDayAdmin(admin.ModelAdmin):
    list_display = ('menu_week', 'day', 'date')
    list_filter = ('menu_week', 'date')
    search_fields = ('menu_week__residence__name',)


@admin.register(Meal)
class MealAdmin(admin.ModelAdmin):
    list_display = ('name', 'type', 'menu_day', 'is_vegetarian', 'is_vegan', 'is_gluten_free')
    list_filter = ('type', 'is_vegetarian', 'is_vegan', 'is_gluten_free', 'created_at')
    search_fields = ('name', 'description')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(SpecialMenuRequest)
class SpecialMenuRequestAdmin(admin.ModelAdmin):
    list_display = ('user', 'date', 'status', 'created_at')
    list_filter = ('status', 'date', 'created_at')
    search_fields = ('user__email', 'user__first_name', 'user__last_name', 'description')
    readonly_fields = ('created_at',)
    fieldsets = (
        ('Información de la petición', {
            'fields': ('user', 'date', 'description')
        }),
        ('Estado', {
            'fields': ('status',)
        }),
        ('Timestamps', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )
