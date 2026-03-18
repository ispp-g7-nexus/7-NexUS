from django.db import models
from django.conf import settings
from apps.tenants.models import Client


class MenuWeek(models.Model):

    residence = models.ForeignKey(
        Client,
        on_delete=models.CASCADE,
        related_name='menu_weeks',
        verbose_name="Residencia"
    )

    week_start = models.DateField(
        "Inicio de la semana"
    )

    week_end = models.DateField(
        "Fin de la semana"
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='menu_weeks_created',
        verbose_name="Creado por"
    )

    created_at = models.DateTimeField(
        "Fecha de creación",
        auto_now_add=True
    )

    is_published = models.BooleanField(
        "Publicado",
        default=False
    )

    updated_at = models.DateTimeField(
        "Última modificación",
        auto_now=True
    )

    class Meta:
        verbose_name = "Menú semanal"
        verbose_name_plural = "Menús semanales"
        ordering = ['-week_start']
        unique_together = ('residence', 'week_start')
        indexes = [
            models.Index(fields=['residence', 'week_start']),
        ]

    def __str__(self):
        return f"Menú {self.week_start} - {self.week_end}"


class MenuDay(models.Model):

    DAY_CHOICES = [
        ('lunes', 'Lunes'),
        ('martes', 'Martes'),
        ('miércoles', 'Miércoles'),
        ('jueves', 'Jueves'),
        ('viernes', 'Viernes'),
        ('sábado', 'Sábado'),
        ('domingo', 'Domingo'),
    ]

    menu_week = models.ForeignKey(
        MenuWeek,
        on_delete=models.CASCADE,
        related_name='days',
        verbose_name="Semana"
    )

    day = models.CharField(
        "Día de la semana",
        max_length=10,
        choices=DAY_CHOICES
    )

    date = models.DateField(
        "Fecha"
    )

    class Meta:
        verbose_name = "Día del menú"
        verbose_name_plural = "Días del menú"
        ordering = ['date']
        unique_together = ('menu_week', 'date')

    def __str__(self):
        return f"{self.get_day_display()} - {self.date}"


class Meal(models.Model):

    class MealType(models.TextChoices):
        BREAKFAST = 'breakfast', 'Desayuno'
        LUNCH = 'lunch', 'Comida'
        DINNER = 'dinner', 'Cena'
        SNACK = 'snack', 'Merienda'

    menu_day = models.ForeignKey(
        MenuDay,
        on_delete=models.CASCADE,
        related_name='meals',
        verbose_name="Día del menú"
    )

    name = models.CharField(
        "Nombre",
        max_length=200
    )

    description = models.TextField(
        "Descripción",
        blank=True,
        default=""
    )

    type = models.CharField(
        "Tipo de comida",
        max_length=10,
        choices=MealType.choices,
        default=MealType.LUNCH
    )

    is_gluten_free = models.BooleanField(
        "Sin gluten",
        default=False
    )

    is_vegetarian = models.BooleanField(
        "Vegetariano",
        default=False
    )

    is_vegan = models.BooleanField(
        "Vegano",
        default=False
    )

    image_url = models.URLField(
        "URL de la imagen",
        max_length=5000,
        blank=True,
        null=True
    )

    created_at = models.DateTimeField(
        "Fecha de creación",
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        "Última modificación",
        auto_now=True
    )

    class Meta:
        verbose_name = "Comida"
        verbose_name_plural = "Comidas"
        ordering = ['type', 'name']

    def __str__(self):
        return f"{self.name} ({self.get_type_display()})"
