from django.urls import path
from .views import (
    RecursoListView,
    RecursoDetailView,
    ReservaListView,
    ReservaDetailView,
    ReservasByRecursoView,
)

urlpatterns = [
    # Recursos
    path('recursos/', RecursoListView.as_view(), name='recurso-list'),
    path('recursos/<int:recurso_id>/', RecursoDetailView.as_view(), name='recurso-detail'),
    path('recursos/<int:recurso_id>/reservas/', ReservasByRecursoView.as_view(), name='recurso-reservas'),

    # Reservas
    path('reservas/', ReservaListView.as_view(), name='reserva-list'),
    path('reservas/<int:reserva_id>/', ReservaDetailView.as_view(), name='reserva-detail'),
]
