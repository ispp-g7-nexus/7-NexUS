import functools
from typing import Callable

from django.core.exceptions import PermissionDenied

from apps.common.utils.redis_client import get_redis_client


def tenant_required(view_func: Callable):
    @functools.wraps(view_func)
    def _wrapped_view(request, *args, **kwargs):
        tenant = getattr(request, "tenant", None)
        if not tenant or getattr(tenant, "schema_name", "public") == "public":
            raise PermissionDenied("Se requiere contexto de tenant.")
        return view_func(request, *args, **kwargs)

    return _wrapped_view


def redis_lock(key_builder: Callable, timeout: int = 20, blocking_timeout: int = 3):
    """
    Fabrica de decoradores para bloqueo distribuido con Redis.

    key_builder recibe (*args, **kwargs) y debe devolver una clave de bloqueo.
    """

    def _decorator(func: Callable):
        @functools.wraps(func)
        def _wrapped(*args, **kwargs):
            key = key_builder(*args, **kwargs)
            client = get_redis_client()
            lock = client.lock(key, timeout=timeout, blocking_timeout=blocking_timeout)
            acquired = lock.acquire(blocking=True)
            if not acquired:
                raise TimeoutError(f"No se pudo adquirir el bloqueo: {key}")
            try:
                return func(*args, **kwargs)
            finally:
                lock.release()

        return _wrapped

    return _decorator


def residence_access_required(*allowed_roles: str):
    """
    Valida acceso por tenant y residencia usando Membership.

    Espera `residence_id` en los kwargs de la URL.
    """

    def _decorator(view_func: Callable):
        @functools.wraps(view_func)
        def _wrapped_view(request, *args, **kwargs):
            from apps.membership.models import Membership

            tenant = getattr(request, "tenant", None)
            if not tenant or getattr(tenant, "schema_name", "public") == "public":
                raise PermissionDenied("Se requiere contexto de tenant.")

            if not request.user.is_authenticated:
                raise PermissionDenied("Se requiere autenticacion.")

            residence_id = kwargs.get("residence_id")
            if residence_id is None:
                residence = getattr(request, "residence", None)
                residence_id = getattr(residence, "id", None)
            if residence_id is None:
                raise PermissionDenied("Falta el contexto de residencia.")

            memberships = Membership.objects.filter(user=request.user, is_active=True)
            if allowed_roles:
                memberships = memberships.filter(role__name__in=allowed_roles)

            has_access = memberships.filter(residence_id=residence_id).exists() or memberships.filter(
                role__name__iexact="portfolio_admin"
            ).exists()
            if not has_access:
                raise PermissionDenied("Permisos insuficientes para la residencia.")

            return view_func(request, *args, **kwargs)

        return _wrapped_view

    return _decorator
