from django.urls import path

from .views import ResidenceBrandingAdminView


urlpatterns = [
    path(
        "residences/branding/",
        ResidenceBrandingAdminView.as_view(),
        name="residence-branding-admin",
    ),
]
