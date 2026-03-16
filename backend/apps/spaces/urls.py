from django.urls import path
from .views import (
    MyReservationsView,
    SpaceAvailabilityView,
    SpaceListView,
    SpaceReservationCancelView,
    SpaceReservationCreateView,
    # Admin
    AdminSpaceListCreateView,
    AdminSpaceDetailView,
    AdminSpaceReservationsView,
    AdminSpaceNotificationsView,
)

urlpatterns = [
    # ── Usuario ──────────────────────────────────────────────────────
    path("spaces/", SpaceListView.as_view(), name="space-list"),
    path("spaces/<int:space_id>/availability/", SpaceAvailabilityView.as_view(), name="space-availability"),
    path("spaces/<int:space_id>/reservations/", SpaceReservationCreateView.as_view(), name="space-reservation-create"),
    path("spaces/reservations/me/", MyReservationsView.as_view(), name="space-reservations-me"),
    path("spaces/reservations/<int:reservation_id>/cancel/", SpaceReservationCancelView.as_view(), name="space-reservation-cancel"),

    # ── Admin ─────────────────────────────────────────────────────────
    path("admin/spaces/", AdminSpaceListCreateView.as_view(), name="admin-space-list-create"),
    path("admin/spaces/<int:space_id>/", AdminSpaceDetailView.as_view(), name="admin-space-detail"),
    path("admin/spaces/<int:space_id>/reservations/", AdminSpaceReservationsView.as_view(), name="admin-space-reservations"),
    path("admin/spaces/notifications/", AdminSpaceNotificationsView.as_view(), name="admin-space-notifications"),
]