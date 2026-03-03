from apps.common.views import (
    AuthLoginView,
    AuthLogoutView,
    AuthMeView,
    PasswordResetConfirmView,
    PasswordResetRequestView,
    TenantContextView,
)
from django.http import JsonResponse
from django.urls import path, include


def healthcheck(_request):
    return JsonResponse({"status": "ok"})


urlpatterns = [
    path("health/", healthcheck, name="healthcheck"),
    path(
        "api/public/tenant-context/", TenantContextView.as_view(), name="tenant-context"
    ),
    path("api/auth/login/", AuthLoginView.as_view(), name="auth-login"),
    path("api/auth/logout/", AuthLogoutView.as_view(), name="auth-logout"),
    path("api/auth/me/", AuthMeView.as_view(), name="auth-me"),
    path(
        "api/auth/password-reset/request/",
        PasswordResetRequestView.as_view(),
        name="password-reset-request",
    ),
    path("api/auth/password-reset/confirm/", PasswordResetConfirmView.as_view(), name="password-reset-confirm"),
    path("api/", include("apps.events.urls")),
    path("api/", include("apps.bedrooms.urls")),
]
