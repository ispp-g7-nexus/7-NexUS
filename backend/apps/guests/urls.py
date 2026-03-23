from django.urls import path

from .views import (
    AdminGuestPassListView,
    AdminGuestPassPolicyView,
    ResidentActiveGuestPassListView,
    ResidentGuestPassCancelView,
    ResidentGuestPassCreateView,
    ResidentGuestPassPolicyView,
    ResidentUpcomingGuestPassListView,
)


urlpatterns = [
    path(
        "guest-passes/me/",
        ResidentGuestPassCreateView.as_view(),
        name="guest-pass-me-create",
    ),
    path(
        "guest-passes/me/active/",
        ResidentActiveGuestPassListView.as_view(),
        name="guest-pass-me-active-list",
    ),
    path(
        "guest-passes/me/upcoming/",
        ResidentUpcomingGuestPassListView.as_view(),
        name="guest-pass-me-upcoming-list",
    ),
    path(
        "guest-passes/me/<int:guest_pass_id>/cancel/",
        ResidentGuestPassCancelView.as_view(),
        name="guest-pass-me-cancel",
    ),
    path(
        "guest-passes/me/policy/",
        ResidentGuestPassPolicyView.as_view(),
        name="guest-pass-me-policy",
    ),
    path(
        "admin/guest-passes/",
        AdminGuestPassListView.as_view(),
        name="admin-guest-pass-list",
    ),
    path(
        "admin/guest-passes/policy/",
        AdminGuestPassPolicyView.as_view(),
        name="admin-guest-pass-policy",
    ),
]
