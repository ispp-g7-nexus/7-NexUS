from django.urls import path
from .views import (
    ObjectListView,
    ObjectDetailView,
    ObjectAvailabilityView,
    ObjectReserveView,
    ObjectCancelView,
    ObjectRentalsView,
    UserReservationsView,
    AdminObjectNotificationsView,
)

urlpatterns = [
    path('objects/', ObjectListView.as_view(), name='object-list'),
    path('objects/<int:object_id>/', ObjectDetailView.as_view(), name='object-detail'),
    path('objects/<int:object_id>/availability/', ObjectAvailabilityView.as_view(), name='object-availability'),
    path('objects/<int:object_id>/reserve/', ObjectReserveView.as_view(), name='object-reserve'),
    path('objects/<int:object_id>/cancel/', ObjectCancelView.as_view(), name='object-cancel'),
    path('objects/<int:object_id>/rentals/', ObjectRentalsView.as_view(), name='object-rentals'),
    path('my-reservations/', UserReservationsView.as_view(), name='user-reservations'),
    path('admin/objects/notifications/', AdminObjectNotificationsView.as_view(), name='admin-object-notifications'),
]