from typing import Any

import jwt
from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework.authentication import TokenAuthentication
from rest_framework.exceptions import AuthenticationFailed

UserModel = get_user_model()


def _first_string(data: dict[str, Any], keys: list[str]) -> str:
    for key in keys:
        value = data.get(key)
        if isinstance(value, str) and value.strip():
            return value
    return ""


def _get_roles(claims: dict[str, Any]) -> list[str]:
    raw_roles = claims.get("roles") or claims.get("role") or claims.get("groups")

    if isinstance(raw_roles, list):
        return [item for item in raw_roles if isinstance(item, str)]

    if isinstance(raw_roles, str):
        return [raw_roles]

    return []


def _serialize_user_claims(claims: dict[str, Any]) -> dict[str, Any]:
    user_id = _first_string(claims, ["user_id", "sub", "id"]) or "anon"
    email = _first_string(claims, ["email"])
    username = _first_string(claims, ["username", "preferred_username", "name"])
    if not username and email:
        username = email.split("@", 1)[0]
    if not username:
        username = "usuario"

    exp = claims.get("exp")
    exp_value = exp if isinstance(exp, int) else None

    return {
        "id": user_id,
        "username": username,
        "email": email,
        "roles": _get_roles(claims),
        "exp": exp_value,
        "raw": claims,
    }


def _get_token_from_request(request) -> str | None:
    auth_header = request.META.get("HTTP_AUTHORIZATION", "")
    if auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1].strip()
        if token:
            return token

    cookie_name = getattr(settings, "JWT_ACCESS_COOKIE_NAME", "access_token")
    token = request.COOKIES.get(cookie_name)
    return token or None


def resolve_user_from_request(request) -> dict[str, Any] | None:
    token = _get_token_from_request(request)
    if not token:
        return None

    key = getattr(settings, "JWT_SIGNING_KEY", settings.SECRET_KEY)
    algorithm = getattr(settings, "JWT_ALGORITHM", "HS256")
    audience = getattr(settings, "JWT_AUDIENCE", None)

    decode_kwargs: dict[str, Any] = {
        "key": key,
        "algorithms": [algorithm],
        "options": {"verify_aud": bool(audience)},
    }
    if audience:
        decode_kwargs["audience"] = audience

    try:
        claims = jwt.decode(token, **decode_kwargs)
    except jwt.PyJWTError:
        return None

    if not isinstance(claims, dict):
        return None

    user_claims = _serialize_user_claims(claims)

    try:
        user_id = user_claims.get("id")
        if user_id and user_id != "anon":
            user = UserModel.objects.get(id=user_id)
        else:
            email = user_claims.get("email")
            if not email:
                return None
            user = UserModel.objects.get(email=email)
    except UserModel.DoesNotExist:
        return None

    if not user.is_active:
        return None

    user_claims["id"] = str(user.pk)
    user_claims["email"] = getattr(user, "email", "") or ""
    user_claims["username"] = user.get_username()

    return user_claims


class CustomJWTAuthentication(TokenAuthentication):
    """Custom JWT authentication that reads tokens from cookies or Authorization header"""
    
    def authenticate(self, request):
        token = _get_token_from_request(request)
        if not token:
            return None
        
        key = getattr(settings, 'JWT_SIGNING_KEY', settings.SECRET_KEY)
        algorithm = getattr(settings, 'JWT_ALGORITHM', 'HS256')
        audience = getattr(settings, 'JWT_AUDIENCE', None)
        
        decode_kwargs = {
            'key': key,
            'algorithms': [algorithm],
            'options': {'verify_aud': bool(audience)},
        }
        if audience:
            decode_kwargs['audience'] = audience
        
        try:
            claims = jwt.decode(token, **decode_kwargs)
        except jwt.PyJWTError as e:
            raise AuthenticationFailed(f'Invalid token: {str(e)}')
        
        if not isinstance(claims, dict):
            raise AuthenticationFailed('Invalid token claims')
        
        user_claims = _serialize_user_claims(claims)
        
        
        try:
            user_id = user_claims.get('id')
            if user_id and user_id != 'anon':
                user = UserModel.objects.get(id=user_id)
            else:
                email = user_claims.get('email')
                if email:
                    user = UserModel.objects.get(email=email)
                else:
                    raise UserModel.DoesNotExist
        except UserModel.DoesNotExist:
            raise AuthenticationFailed('User not found')

        if not user.is_active:
            raise AuthenticationFailed('User is inactive')

        return (user, token)
