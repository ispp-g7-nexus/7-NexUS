from django.urls import path

from .views import (
    AdminGuestPassListView,
    AdminGuestPassPolicyView,
    ResidentActiveGuestPassListView,
    ResidentGuestPassCreateView,
    ResidentGuestPassPolicyView,
    ResidentUpcomingGuestPassListView,
    ResidentGuestPassHistoryListView,
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
        "guest-passes/me/history/",
        ResidentGuestPassHistoryListView.as_view(),
        name="guest-pass-me-history-list",
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
