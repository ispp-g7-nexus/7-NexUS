from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError
from apps.tenants.models import Client

def validate_not_digit(value):
    if value.isdigit():
        raise ValidationError(
            "Este campo no puede contener solo números."
        )

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
    def clean(self):
        super().clean()
        if self.week_start and self.week_end and self.week_end < self.week_start:
            raise ValidationError({
                'week_end': 'La fecha de fin debe ser posterior o igual a la fecha de inicio.'
            })

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

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
        max_length=200,
        validators=[validate_not_digit]
    )

    description = models.TextField(
        "Descripción",
        blank=True,
        default="",
        validators=[validate_not_digit]
    )

    type = models.CharField(
        "Tipo de comida",
        max_length=10,
        choices=MealType.choices,
        default=MealType.LUNCH
    )

    allergens = models.TextField(
        'Alérgenos',
        max_length=100,
        blank=True,
        default="",
        help_text="Ejemplo: Gluten, Lactosa, Frutos de cáscara",
        validators=[validate_not_digit]
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

    image = models.ImageField(
        "Imagen",
        upload_to='meals/%Y/%m/',
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

class SpecialMenuRequest(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pendiente'),
        ('approved', 'Aprobado'),
        ('rejected', 'Rechazado'),
    ]
    residence = models.ForeignKey(
        Client,
        on_delete=models.CASCADE,
        related_name='special_menu_requests',
        verbose_name="Residencia"
    )

    user = models.ForeignKey(
        'auth.User',
        on_delete=models.CASCADE,
        related_name='special_menu_requests',
        default=2
    )
    date = models.DateField("Fecha solicitada")
    description = models.TextField("Motivo/Descripción", validators=[validate_not_digit])
    status = models.CharField(
        max_length=10, 
        choices=STATUS_CHOICES, 
        default='pending'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "Petición especial"
        verbose_name_plural = "Peticiones especiales"
        ordering = ['-date']

    def __str__(self):
        return f"Petición de {self.user} para el {self.date}"