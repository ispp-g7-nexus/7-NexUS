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
    AdminCreateResidentSerializer,
)
from .services import (
    authenticate_user,
    build_access_token,
    has_access_for_portal,
    process_password_reset_confirm,
    process_password_reset_request,
)
from django.contrib.auth import get_user_model
from apps.membership.models import Membership

UserModel = get_user_model()


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


class AdminCreateResidentView(APIView):
    """Endpoint para que un administrador cree una cuenta de residente.

    Crea el `User` si no existe, asocia una `Membership` con rol `resident`
    y envía un correo de restablecimiento para que el residente configure su contraseña.
    """

    def post(self, request):
        serializer = AdminCreateResidentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        from apps.common.utils.jwt_auth import resolve_user_from_request

        caller = resolve_user_from_request(request)
        if not caller:
            return Response({"detail": "No autenticado."}, status=status.HTTP_401_UNAUTHORIZED)

        caller_roles = caller.get("roles", [])
        allowed = any(r in ["residence_admin", "portfolio_admin"] for r in caller_roles)
        if not allowed:
            return Response({"detail": "No tienes permisos para crear residentes."}, status=status.HTTP_403_FORBIDDEN)

        residence = getattr(request, "residence", None)
        if not residence:
            return Response({"detail": "No se ha determinado la residencia."}, status=status.HTTP_400_BAD_REQUEST)

        email = data["email"].lower()

        user = UserModel.objects.filter(email__iexact=email).first()
        created = False
        if not user:
            base_username = email.split("@", 1)[0][:30]
            username = base_username
            counter = 1
            while UserModel.objects.filter(username=username).exists():
                username = f"{base_username}{counter}"
                counter += 1

            names = (data.get("full_name") or "").strip().split(None, 1)
            first_name = names[0] if names else ""
            last_name = names[1] if len(names) > 1 else ""
            user = UserModel.objects.create(
                username=username,
                email=email,
                first_name=first_name,
                last_name=last_name,
                is_active=True,
            )
            created = True
            passwd = data.get("password")
            if passwd:
                user.set_password(passwd)
                user.save()

        membership_exists = Membership.objects.filter(user=user, role=Membership.Role.RESIDENT, residence=residence).exists()
        if not membership_exists:
            Membership.objects.create(user=user, role=Membership.Role.RESIDENT, residence=residence, is_active=True)

        try:
            if data.get("password"):
                if not created:
                    passwd = data.get("password")
                    if passwd:
                        user.set_password(passwd)
                        user.save()
            else:
                process_password_reset_request(user.email, request)
        except Exception:
            pass

        return Response({"ok": True, "created": created, "email": user.email}, status=status.HTTP_201_CREATED)


class StudentProfileView(APIView):
    """Get or update student profile"""
    
    permission_classes = [AllowAny]

    def get(self, request):
        user_data = resolve_user_from_request(request)
        if not user_data:
            return Response({"detail": "No autenticado."}, status=status.HTTP_401_UNAUTHORIZED)

        from apps.residences.models import StudentProfile
        
        try:
            user_pk = user_data.get("user_id") or user_data.get("id") or user_data.get("sub")
            user = UserModel.objects.get(pk=user_pk)
            profile = StudentProfile.objects.get(user=user)
            from .serializers import StudentProfileSerializer
            serializer = StudentProfileSerializer(profile)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except StudentProfile.DoesNotExist:
            return Response({"detail": "Perfil no encontrado."}, status=status.HTTP_404_NOT_FOUND)

    def post(self, request):
        """Create or update student profile"""
        user_data = resolve_user_from_request(request)
        if not user_data:
            return Response({"detail": "No autenticado."}, status=status.HTTP_401_UNAUTHORIZED)

        from apps.residences.models import StudentProfile
        from .serializers import StudentProfileSerializer

        user_pk = user_data.get("user_id") or user_data.get("id") or user_data.get("sub")
        user = UserModel.objects.get(pk=user_pk)
        
        request.user = user

        try:
            profile = StudentProfile.objects.get(user=user)
            serializer = StudentProfileSerializer(profile, data=request.data, partial=True, context={"request": request})
        except StudentProfile.DoesNotExist:
            serializer = StudentProfileSerializer(data=request.data, context={"request": request})

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)