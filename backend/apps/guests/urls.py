from django.urls import path

from .views import ResidentActiveGuestPassListView


urlpatterns = [
    path(
        "guest-passes/me/active/",
        ResidentActiveGuestPassListView.as_view(),
        name="guest-pass-me-active-list",
    ),
]
