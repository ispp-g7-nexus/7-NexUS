import logging
from datetime import timedelta

import jwt
from django.conf import settings
from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils import timezone
from django.utils.encoding import force_bytes, force_str
from django.utils.html import strip_tags
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework import authentication
from rest_framework.exceptions import APIException, AuthenticationFailed, NotFound

from apps.membership.models import Membership

UserModel = get_user_model()


def get_user_by_email(email: str):
    if not email:
        return None
    return UserModel.objects.filter(email__iexact=email).first()


def authenticate_user(request, identity: str, password: str):
    if not identity or not password:
        return None

    attempts = [identity]
    user_by_email = get_user_by_email(identity)
    if user_by_email:
        username = user_by_email.get_username()
        if username and username not in attempts:
            attempts.insert(0, username)

    for candidate in attempts:
        user = authenticate(request, username=candidate, password=password)
        if user:
            return user
    return None


def has_access_for_portal(user, portal: str, residence):
    """
    Verifica si el usuario tiene acceso al portal solicitado basándose en el nuevo modelo dinámico de Roles.
    """
    memberships = Membership.objects.filter(user=user, is_active=True)

    if portal == "student":
        if residence:
            return memberships.filter(
                role__name__iexact="Student", residence=residence
            ).exists()
        return memberships.filter(role__name__iexact="Student").exists()

    if portal == "admin":
        admin_memberships = memberships.exclude(role__name__iexact="Student")

        if residence:
            return admin_memberships.filter(residence=residence).exists()
        return admin_memberships.exists()

    return False


def build_access_token(user, tenant, residence):
    now = timezone.now()
    lifetime_seconds = int(getattr(settings, "JWT_ACCESS_TOKEN_LIFETIME_SECONDS", 3600))
    expires_at = now + timedelta(seconds=lifetime_seconds)

    roles = list(
        Membership.objects.filter(user=user, is_active=True)
        .values_list("role__name", flat=True)
        .distinct()
    )

    payload = {
        "sub": str(user.pk),
        "user_id": str(user.pk),
        "username": user.get_username(),
        "email": getattr(user, "email", "") or "",
        "roles": roles,
        "tenant_id": tenant.id,
        "tenant_slug": tenant.slug,
        "residence_id": residence.id if residence else None,
        "iat": int(now.timestamp()),
        "exp": int(expires_at.timestamp()),
    }

    if settings.JWT_AUDIENCE:
        payload["aud"] = settings.JWT_AUDIENCE

    token = jwt.encode(
        payload, settings.JWT_SIGNING_KEY, algorithm=settings.JWT_ALGORITHM
    )
    return token, lifetime_seconds


logger = logging.getLogger(__name__)
UserModel = get_user_model()


class SMTPServerError(APIException):
    status_code = 500
    default_detail = "El email no se pudo enviar debido a un error interno. Por favor, inténtalo de nuevo más tarde."
    default_code = "smtp_error"


def process_password_reset_request(email: str, request):
    """Genera el token y envía el correo usando SMTP nativo de Django."""
    user = get_user_by_email(email)

    if user and user.is_active:
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)

        domain = request.get_host()
        scheme = request.scheme
        reset_link = f"{scheme}://{domain}/reset-password?uid={uid}&token={token}"

        html_message = render_to_string(
            "password_reset_email.html", {"reset_link": reset_link}
        )
        plain_message = strip_tags(html_message)

        try:
            send_mail(
                subject="Recuperación de contraseña en NexUS",
                message=plain_message,
                html_message=html_message,
                from_email=getattr(
                    settings, "DEFAULT_FROM_EMAIL", "nbynexus@gmail.com"
                ),
                recipient_list=[user.email],
                fail_silently=False,
            )
            return (
                True,
                "Si el email está registrado, recibirás un correo con las instrucciones.",
            )

        except Exception as e:
            logger.error(f"Error al enviar correo SMTP a {user.email}: {e}")
            raise SMTPServerError()

    else:
        logger.error(f"Solicitud de recuperación para email no registrado: {email}")
        raise NotFound(detail="El email no está registrado en el sistema.")


def process_password_reset_confirm(uid: str, token: str, new_password: str):
    """Valida el token y actualiza la contraseña en la base de datos."""
    try:
        uid_decoded = force_str(urlsafe_base64_decode(uid))
        user = UserModel.objects.get(pk=uid_decoded)
    except (TypeError, ValueError, OverflowError, UserModel.DoesNotExist):
        user = None

    if user is not None and default_token_generator.check_token(user, token):
        user.set_password(new_password)
        user.save()
        return True, "Tu contraseña se ha actualizado correctamente."

    return False, "El enlace de recuperación es inválido o ha expirado."


class CustomJWTAuthentication(authentication.BaseAuthentication):
    """
    Clase para que DRF entienda los tokens generados por build_access_token.
    """

    def authenticate(self, request):
        token = None
        auth_header = request.headers.get("Authorization")

        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
        else:
            token = request.COOKIES.get(
                getattr(settings, "JWT_ACCESS_COOKIE_NAME", "access_token")
            )

        if not token:
            return None

        try:
            payload = jwt.decode(
                token,
                settings.JWT_SIGNING_KEY,
                algorithms=[settings.JWT_ALGORITHM],
                audience=getattr(settings, "JWT_AUDIENCE", None),
            )
        except Exception:
            raise AuthenticationFailed("Token inválido o ha expirado.")

        try:
            user = UserModel.objects.get(pk=payload.get("user_id"))
        except UserModel.DoesNotExist:
            raise AuthenticationFailed("El usuario del token no existe.")

        residence_id = payload.get("residence_id")
        if residence_id and getattr(request, "residence", None) is None:
            from apps.residences.models import Residence

            try:
                request.residence = Residence.objects.get(pk=residence_id)
            except Residence.DoesNotExist:
                pass

        return (user, token)
