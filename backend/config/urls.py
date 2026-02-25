from django.http import JsonResponse
from django.urls import path

from apps.common.views import auth_login, auth_logout, auth_me, tenant_context


def healthcheck(_request):
    return JsonResponse({"status": "ok"})


urlpatterns = [
    path("health/", healthcheck, name="healthcheck"),
    path("api/public/tenant-context/", tenant_context, name="tenant-context"),
    path("api/auth/login/", auth_login, name="auth-login"),
    path("api/auth/logout/", auth_logout, name="auth-logout"),
    path("api/auth/me/", auth_me, name="auth-me"),
]
