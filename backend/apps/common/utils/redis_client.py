import json
from typing import Any

from django_redis import get_redis_connection


def get_redis_client(alias: str = "default"):
    return get_redis_connection(alias)


def set_json(key: str, payload: Any, ttl_seconds: int | None = None) -> bool:
    client = get_redis_client()
    value = json.dumps(payload)
    return bool(client.set(name=key, value=value, ex=ttl_seconds))


def get_json(key: str, default: Any = None) -> Any:
    client = get_redis_client()
    raw = client.get(key)
    if raw is None:
        return default
    if isinstance(raw, bytes):
        raw = raw.decode("utf-8")
    return json.loads(raw)
