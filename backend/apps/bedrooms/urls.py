from django.urls import path
from .views import (
	BedroomListView,
	BedroomCreateView,
	BedroomRetrieveView,
	BedroomUpdateView,
	BedroomDeleteView,
	BedroomResidentsView,
	BedroomResidentsDetailView,
	AvailableBedroomsView,
	BuildingListView,
)

urlpatterns = [
	path('bedrooms/', BedroomListView.as_view(), name='bedroom-list'),
	path('bedrooms/create/', BedroomCreateView.as_view(), name='bedroom-create'),
	# /available/ debe ir antes de /<int:bedroom_id>/ para evitar colisión de rutas
	path('bedrooms/available/', AvailableBedroomsView.as_view(), name='bedroom-available'),
	path('bedrooms/residents/', BedroomResidentsView.as_view(), name='bedroom-residents'),
	path('bedrooms/<int:bedroom_id>/residents/', BedroomResidentsDetailView.as_view(), name='bedroom-residents-detail'),
	path('bedrooms/<int:bedroom_id>/', BedroomRetrieveView.as_view(), name='bedroom-retrieve'),
	path('bedrooms/<int:bedroom_id>/update/', BedroomUpdateView.as_view(), name='bedroom-update'),
	path('bedrooms/<int:bedroom_id>/delete/', BedroomDeleteView.as_view(), name='bedroom-delete'),
	path('bedrooms/buildings/', BuildingListView.as_view(), name='building-list'),
]
