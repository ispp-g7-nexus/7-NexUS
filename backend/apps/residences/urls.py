"""
URLs para la gestión de residentes, habitaciones y asignaciones.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    ResidenteViewSet,
    HabitacionViewSet,
    AsignacionHabitacionViewSet,
)

# Configurar router de DRF
router = DefaultRouter()
router.register(r'residentes', ResidenteViewSet, basename='residente')
router.register(r'habitaciones', HabitacionViewSet, basename='habitacion')
router.register(r'asignaciones', AsignacionHabitacionViewSet, basename='asignacion')

urlpatterns = [
    path('', include(router.urls)),
]
