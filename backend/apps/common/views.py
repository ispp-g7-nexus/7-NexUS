# apps/common/views.py
from django.conf import settings
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.utils.jwt_auth import resolve_user_from_request
from apps.residences.models import ResidenceBranding

from .serializers import (
    BrandingSerializer,
    LoginInputSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    PlanSerializer,
)
from .services import (
    authenticate_user,
    build_access_token,
    has_access_for_portal,
    process_password_reset_confirm,
    process_password_reset_request,
)


class TenantContextView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        tenant = request.tenant
        residence = getattr(request, "residence", None)

        payload = {
            "domain": request.get_host().split(":", 1)[0].lower().strip(),
            "tenant": {
                "id": tenant.id,
                "schema_name": tenant.schema_name,
                "name": tenant.name,
                "slug": tenant.slug,
                "is_active": tenant.is_active,
                "plan": PlanSerializer(tenant.plan).data if tenant.plan else None,
                "whitelabel_enabled": tenant.whitelabel_enabled,
                "can_use_whitelabel": tenant.can_use_whitelabel,
                "metadata": tenant.metadata,
            },
            "residence": None,
        }

        if residence:
            branding = None
            try:
                branding = BrandingSerializer(residence.branding).data
            except ResidenceBranding.DoesNotExist:
                pass

            payload["residence"] = {
                "id": residence.id,
                "name": residence.name,
                "slug": residence.slug,
                "code": residence.code,
                "timezone": residence.timezone,
                "is_active": residence.is_active,
                "branding": branding,
            }

        return Response(payload)


class AuthMeView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        user_data = resolve_user_from_request(request)
        return Response(
            {
                "authenticated": bool(user_data),
                "user": user_data,
            }
        )


class AuthLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data
        email = data["email"]
        password = data["password"]
        portal = data["portal"]

        user = authenticate_user(request, email, password)
        if not user or not user.is_active:
            return Response(
                {"detail": "Credenciales inválidas."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        residence = getattr(request, "residence", None)
        if not has_access_for_portal(user, portal, residence):
            return Response(
                {"detail": "No tienes permisos para este portal en esta residencia."},
                status=status.HTTP_403_FORBIDDEN,
            )

        token, max_age = build_access_token(user, request.tenant, residence)

        response = Response(
            {
                "ok": True,
                "portal": portal,
                "detail": "Login correcto.",
            },
            status=status.HTTP_200_OK,
        )

        response.set_cookie(
            key=settings.JWT_ACCESS_COOKIE_NAME,
            value=token,
            max_age=max_age,
            httponly=True,
            secure=bool(getattr(settings, "JWT_COOKIE_SECURE", False)),
            samesite=str(getattr(settings, "JWT_COOKIE_SAMESITE", "Lax")),
            path="/",
        )
        return response


class AuthLogoutView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        response = Response(
            {"ok": True, "detail": "Sesión cerrada."}, status=status.HTTP_200_OK
        )
        response.delete_cookie(
            key=settings.JWT_ACCESS_COOKIE_NAME,
            path="/",
            samesite=str(getattr(settings, "JWT_COOKIE_SAMESITE", "Lax")),
        )
        return response


class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]
        process_password_reset_request(email, request)

        return Response(
            {
                "ok": True,
                "detail": "Si el email está registrado, recibirás un correo con las instrucciones.",
            },
            status=status.HTTP_200_OK,
        )


class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data
        success, message = process_password_reset_confirm(
            data["uid"], data["token"], data["new_password"]
        )

        if success:
            return Response({"ok": True, "detail": message}, status=status.HTTP_200_OK)
        else:
            return Response({"detail": message}, status=status.HTTP_400_BAD_REQUEST)
