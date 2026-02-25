import json
from datetime import timedelta

import jwt
from django.conf import settings
from django.contrib.auth import authenticate, get_user_model
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from apps.common.decorators import tenant_required
from apps.common.utils.jwt_auth import resolve_user_from_request
from apps.residences.models import Membership, ResidenceBranding


def _serialize_plan(plan):
    if not plan:
        return None

    return {
        "code": plan.code,
        "name": plan.name,
        "max_residences": plan.max_residences,
        "allows_whitelabel": plan.allows_whitelabel,
    }


def _serialize_branding(residence):
    if not residence:
        return None

    try:
        branding = residence.branding
    except ResidenceBranding.DoesNotExist:
        return None

    return {
        "primary_color": branding.primary_color,
        "secondary_color": branding.secondary_color,
        "accent_color": branding.accent_color,
        "logo_url": branding.logo_url,
        "favicon_url": branding.favicon_url,
        "custom_css": branding.custom_css,
    }


@tenant_required
def tenant_context(request):
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
            "plan": _serialize_plan(tenant.plan),
            "whitelabel_enabled": tenant.whitelabel_enabled,
            "can_use_whitelabel": tenant.can_use_whitelabel,
            "metadata": tenant.metadata,
        },
        "residence": None,
    }

    if residence:
        payload["residence"] = {
            "id": residence.id,
            "name": residence.name,
            "slug": residence.slug,
            "code": residence.code,
            "timezone": residence.timezone,
            "is_active": residence.is_active,
            "branding": _serialize_branding(residence),
        }

    return JsonResponse(payload)


def auth_me(request):
    user_data = resolve_user_from_request(request)
    payload = {
        "authenticated": bool(user_data),
        "user": user_data,
    }
    return JsonResponse(payload)


def _parse_json_body(request):
    try:
        raw_body = request.body.decode("utf-8") if request.body else "{}"
        return json.loads(raw_body)
    except (UnicodeDecodeError, json.JSONDecodeError):
        return None


def _get_user_by_email(email: str):
    UserModel = get_user_model()
    if not email:
        return None
    return UserModel.objects.filter(email__iexact=email).first()


def _authenticate_user(request, identity: str, password: str):
    if not identity or not password:
        return None

    attempts = [identity]
    user_by_email = _get_user_by_email(identity)
    if user_by_email:
        username = user_by_email.get_username()
        if username and username not in attempts:
            attempts.insert(0, username)

    for candidate in attempts:
        user = authenticate(request, username=candidate, password=password)
        if user:
            return user

    return None


def _has_access_for_portal(user, portal: str, residence):
    memberships = Membership.objects.filter(user=user, is_active=True)

    if portal == "student":
        if residence:
            return memberships.filter(role=Membership.Role.RESIDENT, residence=residence).exists()
        return memberships.filter(role=Membership.Role.RESIDENT).exists()

    if portal == "admin":
        if memberships.filter(role=Membership.Role.PORTFOLIO_ADMIN).exists():
            return True
        if residence:
            return memberships.filter(role=Membership.Role.RESIDENCE_ADMIN, residence=residence).exists()
        return memberships.filter(role=Membership.Role.RESIDENCE_ADMIN).exists()

    return False


def _build_access_token(user, tenant, residence):
    now = timezone.now()
    lifetime_seconds = int(getattr(settings, "JWT_ACCESS_TOKEN_LIFETIME_SECONDS", 3600))
    expires_at = now + timedelta(seconds=lifetime_seconds)

    roles = list(
        Membership.objects.filter(user=user, is_active=True).values_list("role", flat=True).distinct()
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

    token = jwt.encode(payload, settings.JWT_SIGNING_KEY, algorithm=settings.JWT_ALGORITHM)
    return token, lifetime_seconds


@csrf_exempt
@tenant_required
@require_http_methods(["POST"])
def auth_login(request):
    body = _parse_json_body(request)
    if body is None:
        return JsonResponse({"detail": "JSON invalido."}, status=400)

    email = str(body.get("email", "")).strip().lower()
    password = str(body.get("password", "")).strip()
    portal = str(body.get("portal", "")).strip().lower()

    if portal not in {"student", "admin"}:
        return JsonResponse({"detail": "Portal invalido. Usa 'student' o 'admin'."}, status=400)

    if not email or not password:
        return JsonResponse({"detail": "Email y contrasena son obligatorios."}, status=400)

    user = _authenticate_user(request, email, password)
    if not user or not user.is_active:
        return JsonResponse({"detail": "Credenciales invalidas."}, status=401)

    residence = getattr(request, "residence", None)
    if not _has_access_for_portal(user, portal, residence):
        return JsonResponse({"detail": "No tienes permisos para este portal en esta residencia."}, status=403)

    token, max_age = _build_access_token(user, request.tenant, residence)

    response = JsonResponse(
        {
            "ok": True,
            "portal": portal,
            "detail": "Login correcto.",
        }
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


@csrf_exempt
@require_http_methods(["POST"])
def auth_logout(_request):
    response = JsonResponse({"ok": True, "detail": "Sesion cerrada."})
    response.delete_cookie(
        key=settings.JWT_ACCESS_COOKIE_NAME,
        path="/",
        samesite=str(getattr(settings, "JWT_COOKIE_SAMESITE", "Lax")),
    )
    return response
