from django.contrib.auth import get_user_model
from rest_framework import authentication
from rest_framework import exceptions

from apps.common.utils.jwt_auth import resolve_user_from_request


class CookieJWTAuthentication(authentication.BaseAuthentication):
    def authenticate(self, request):
        user_data = resolve_user_from_request(request)
        if not user_data:
            return None

        user_id = user_data.get("id")
        if not user_id:
            return None

        user_model = get_user_model()
        try:
            user = user_model.objects.get(pk=user_id)
        except user_model.DoesNotExist as exc:
            raise exceptions.AuthenticationFailed("User not found.") from exc

        return (user, None)