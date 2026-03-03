import logging
from datetime import timedelta

import jwt
from django.conf import settings
from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.utils import timezone
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode

from apps.residences.models import Membership

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
    memberships = Membership.objects.filter(user=user, is_active=True)

    if portal == "student":
        if residence:
            return memberships.filter(
                role=Membership.Role.RESIDENT, residence=residence
            ).exists()
        return memberships.filter(role=Membership.Role.RESIDENT).exists()

    if portal == "admin":
        if memberships.filter(role=Membership.Role.PORTFOLIO_ADMIN).exists():
            return True
        if residence:
            # Incluimos STAFF como hicimos en la tarea anterior lo voy a cambiar a RESIDENCE_ADMIN que STAFF da fallo
            return memberships.filter(
                role__in=[Membership.Role.RESIDENCE_ADMIN, Membership.Role.RESIDENCE_ADMIN],
                residence=residence,
            ).exists()
        return memberships.filter(
            role__in=[Membership.Role.RESIDENCE_ADMIN, Membership.Role.RESIDENCE_ADMIN]
        ).exists()

    return False


def build_access_token(user, tenant, residence):
    now = timezone.now()
    lifetime_seconds = int(getattr(settings, "JWT_ACCESS_TOKEN_LIFETIME_SECONDS", 3600))
    expires_at = now + timedelta(seconds=lifetime_seconds)

    roles = list(
        Membership.objects.filter(user=user, is_active=True)
        .values_list("role", flat=True)
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


def process_password_reset_request(email: str, request):
    """Genera el token y envía el correo usando SMTP nativo de Django."""
    user = get_user_by_email(email)

    if user and user.is_active:
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)

        domain = request.get_host()
        scheme = request.scheme
        reset_link = f"{scheme}://{domain}/reset-password?uid={uid}&token={token}"

        try:
            send_mail(
                subject="Recuperación de contraseña en NexUS",
                message=f"Para restablecer tu contraseña, haz clic en el siguiente enlace:\n\n{reset_link}\n\nSi no has solicitado este cambio, puedes ignorar este correo de forma segura.",
                from_email=getattr(
                    settings, "DEFAULT_FROM_EMAIL", "nbynexus@gmail.com"
                ),
                recipient_list=[user.email],
                fail_silently=False,
            )
            logger.info(f"Correo de recuperación enviado a: {user.email}")
        except Exception as e:
            logger.error(f"Error al enviar correo SMTP a {user.email}: {e}")


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
