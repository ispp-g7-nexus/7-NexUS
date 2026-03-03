from django.urls import path
from .views import (
	BedroomListView,
	BedroomCreateView,
	BedroomRetrieveView,
	BedroomUpdateView,
	BedroomDeleteView,
	BedroomResidentsView,
)

urlpatterns = [
	path('bedrooms/', BedroomListView.as_view(), name='bedroom-list'),
	path('bedrooms/create/', BedroomCreateView.as_view(), name='bedroom-create'),
	path('bedrooms/<int:bedroom_id>/', BedroomRetrieveView.as_view(), name='bedroom-retrieve'),
	path('bedrooms/<int:bedroom_id>/update/', BedroomUpdateView.as_view(), name='bedroom-update'),
	path('bedrooms/<int:bedroom_id>/delete/', BedroomDeleteView.as_view(), name='bedroom-delete'),
	path('bedrooms/residents/', BedroomResidentsView.as_view(), name='bedroom-residents'),
]
