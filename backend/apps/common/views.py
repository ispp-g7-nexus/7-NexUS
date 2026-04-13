# apps/common/views.py
import base64
import logging
import uuid
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.files.base import ContentFile
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.utils.jwt_auth import resolve_user_from_request
from apps.membership.models import Membership, Role
from apps.residences.models import ResidenceBranding
from apps.residents.models import StudentProfile

from .serializers import (
    AdminCreateResidentSerializer,
    AdminProfileUpdateSerializer,
    BrandingSerializer,
    LoginInputSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    PlanSerializer,
    StudentProfileSerializer,
)
from .services import (
    authenticate_user,
    build_access_token,
    has_access_for_portal,
    process_password_reset_confirm,
    process_password_reset_request,
)

UserModel = get_user_model()
logger = logging.getLogger(__name__)


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
        if user_data:
            user_pk = (
                user_data.get("user_id") or user_data.get("id") or user_data.get("sub")
            )
            try:
                user_obj = UserModel.objects.get(pk=user_pk)
                user_data["first_name"] = user_obj.first_name
                user_data["last_name"] = user_obj.last_name
            except UserModel.DoesNotExist:
                pass

        return Response(
            {
                "authenticated": bool(user_data),
                "user": user_data,
            }
        )

    def patch(self, request):
        user_data = resolve_user_from_request(request)
        if not user_data:
            return Response(
                {"detail": "No autenticado."}, status=status.HTTP_401_UNAUTHORIZED
            )

        user_pk = (
            user_data.get("user_id") or user_data.get("id") or user_data.get("sub")
        )
        try:
            user = UserModel.objects.get(pk=user_pk)
        except UserModel.DoesNotExist:
            return Response(
                {"detail": "Usuario no encontrado."}, status=status.HTTP_404_NOT_FOUND
            )

        serializer = AdminProfileUpdateSerializer(user, data=request.data, partial=True)

        if serializer.is_valid():
            serializer.save()
            return Response(
                {
                    "detail": "Perfil actualizado correctamente.",
                    "user": serializer.data,
                },
                status=status.HTTP_200_OK,
            )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AuthLoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = LoginInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data
        email = data["email"]
        password = data["password"]
        portal = data["portal"]
        remember_me = data.get("rememberMe", False)

        user = authenticate_user(request, email, password)
        if not user or not user.is_active:
            return Response(
                {"detail": "Credenciales inválidas."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        residence = getattr(request, "residence", None)
        if not has_access_for_portal(user, portal, residence):
            
            has_any_access = False
            fallback_residence = None

            if portal == "student":
                member = Membership.objects.filter(user=user, role__name__iexact="Student", is_active=True).first()
                if member and member.residence:
                    has_any_access = True
                    fallback_residence = member.residence
            else:
                memberList = Membership.objects.filter(user=user, is_active=True).exclude(role__name__iexact="Student")
                if memberList.exists():
                    has_any_access = True
                    # Prefer the first one that has a residence attached, if any
                    fallback_residence = memberList.exclude(residence__isnull=True).first()
                    if fallback_residence:
                        fallback_residence = fallback_residence.residence
                    else:
                        fallback_residence = None

            if has_any_access:
                residence = fallback_residence
                request.residence = fallback_residence
            else:
                return Response(
                    {"detail": "No tienes permisos para este portal en esta ni en ninguna otra residencia válida."},
                    status=status.HTTP_403_FORBIDDEN,
                )

        token, max_age = build_access_token(
            user, request.tenant, residence, remember_me
        )

        final_max_age = max_age if remember_me else None

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
            max_age=final_max_age,
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
    authentication_classes = []

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
    authentication_classes = []

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

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = AdminCreateResidentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        caller = resolve_user_from_request(request)
        if not caller:
            return Response(
                {"detail": "No autenticado."}, status=status.HTTP_401_UNAUTHORIZED
            )

        caller_roles = caller.get("roles", [])
        allowed = any(r in ["residence_admin", "portfolio_admin"] for r in caller_roles)
        if not allowed:
            return Response(
                {"detail": "No tienes permisos para crear residentes."},
                status=status.HTTP_403_FORBIDDEN,
            )

        residence = getattr(request, "residence", None)
        if not residence:
            return Response(
                {"detail": "No se ha determinado la residencia."},
                status=status.HTTP_400_BAD_REQUEST,
            )

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

        student_role, _ = Role.objects.get_or_create(
            name="Student",
            residence=None,
            defaults={
                "description": "Estudiante / Residente",
                "is_system_default": True,
            },
        )

        membership_exists = Membership.objects.filter(
            user=user,
            role=student_role,
            residence=residence,
        ).exists()
        if not membership_exists:
            Membership.objects.create(
                user=user,
                role=student_role,
                residence=residence,
                is_active=True,
            )

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

        return Response(
            {"ok": True, "created": created, "email": user.email},
            status=status.HTTP_201_CREATED,
        )


class StudentProfileView(APIView):
    """Get or update student profile"""

    permission_classes = [AllowAny]

    def get(self, request):
        user_data = resolve_user_from_request(request)
        if not user_data:
            return Response(
                {"detail": "No autenticado."}, status=status.HTTP_401_UNAUTHORIZED
            )

        user_pk = user_data.get("user_id") or user_data.get("id") or user_data.get("sub")
        try:
            user = UserModel.objects.get(pk=user_pk)
        except UserModel.DoesNotExist:
            return Response(
                {"detail": "Usuario no encontrado."}, status=status.HTTP_404_NOT_FOUND
            )

        try:
            profile, _ = StudentProfile.objects.get_or_create(
                user=user,
                defaults={"residence": getattr(request, "residence", None)},
            )
            serializer = StudentProfileSerializer(profile)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception:
            logger.exception("Error retrieving student profile for user_id=%s", user_pk)
            return Response(
                {"detail": "Error al procesar el perfil."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def post(self, request):
        """Create or update student profile"""
        user_data = resolve_user_from_request(request)
        if not user_data:
            return Response(
                {"detail": "No autenticado."}, status=status.HTTP_401_UNAUTHORIZED
            )

        user_pk = (
            user_data.get("user_id") or user_data.get("id") or user_data.get("sub")
        )
        try:
            user = UserModel.objects.get(pk=user_pk)
        except UserModel.DoesNotExist:
            return Response(
                {"detail": "Usuario no encontrado."}, status=status.HTTP_404_NOT_FOUND
            )

        request.user = user

        mutable_data = request.data.copy()
        profile_image_b64 = mutable_data.pop("profile_image", None)

        # Handle base64 image if present
        if (
            profile_image_b64
            and isinstance(profile_image_b64, str)
            and profile_image_b64.startswith("data:image")
        ):
            try:
                image_format, imgstr = profile_image_b64.split(";base64,")
                ext = image_format.split("/")[-1]
                ext = ext.split(";")[0] if ";" in ext else ext
                file_name = f"{uuid.uuid4().hex}.{ext}"
                mutable_data["profile_image"] = ContentFile(
                    base64.b64decode(imgstr), name=file_name
                )
            except Exception:
                logger.exception(
                    "Failed to decode student profile image for user_id=%s", user_pk
                )
                return Response(
                    {"profile_image": ["Formato de imagen no valido."]},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        try:
            profile = StudentProfile.objects.get(user=user)
            serializer = StudentProfileSerializer(
                profile, data=mutable_data, partial=True, context={"request": request}
            )
        except StudentProfile.DoesNotExist:
            serializer = StudentProfileSerializer(
                data=mutable_data, context={"request": request}
            )

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AdminStudentProfileView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, user_id):
        user_data = resolve_user_from_request(request)
        if not user_data:
            return Response(
                {"detail": "No autenticado."}, status=status.HTTP_401_UNAUTHORIZED
            )

        admin_pk = (
            user_data.get("user_id") or user_data.get("id") or user_data.get("sub")
        )
        try:
            admin_user = UserModel.objects.get(pk=admin_pk)
        except UserModel.DoesNotExist:
            return Response(
                {"detail": "Usuario no encontrado."}, status=status.HTTP_404_NOT_FOUND
            )

        if not admin_user.is_staff:
            return Response(
                {"detail": "Admin privileges required."},
                status=status.HTTP_403_FORBIDDEN,
            )

        residence = getattr(request, "residence", None)
        if not residence:
            return Response(
                {"detail": "No residence context."}, status=status.HTTP_400_BAD_REQUEST
            )

        membership = (
            Membership.objects.filter(
                user_id=user_id,
                residence=residence,
                role__name__iexact="Student",
                is_active=True,
            )
            .select_related("user", "bedroom")
            .first()
        )
        if membership is None:
            return Response(
                {"detail": "Perfil no encontrado."}, status=status.HTTP_404_NOT_FOUND
            )

        from apps.residences.models import StudentProfile

        profile = StudentProfile.objects.filter(
            user_id=user_id, residence=residence
        ).first() or StudentProfile.objects.filter(user_id=user_id).first()

        if profile is None:
            profile = StudentProfile(
                user=membership.user,
                residence=residence,
                room_number=membership.bedroom.numero if membership.bedroom else "",
            )

        serializer = StudentProfileSerializer(profile)
        return Response(serializer.data, status=status.HTTP_200_OK)
