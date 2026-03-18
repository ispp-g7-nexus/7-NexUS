import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(BASE_DIR / ".env")

SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "unsafe-dev-key")
DEBUG = os.getenv("DJANGO_DEBUG", "0") == "1"

ALLOWED_HOSTS = [
    host.strip()
    for host in os.getenv("DJANGO_ALLOWED_HOSTS", "localhost").split(",")
    if host.strip()
]
CSRF_TRUSTED_ORIGINS = [
    origin.strip()
    for origin in os.getenv("DJANGO_CSRF_TRUSTED_ORIGINS", "http://localhost").split(
        ","
    )
    if origin.strip()
]

SHARED_APPS = [
    "django_tenants",
    "apps.tenants",
    "rest_framework",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
]

MATCHING_ENABLED = os.getenv("MATCHING_ENABLED", "0") == "1"

TENANT_APPS = [
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "apps.common",
    "apps.residences",
    "apps.staff",
    "apps.events",
    "apps.bedrooms",
    "apps.incidences",
    "apps.membership",
    "apps.announcements",
    "apps.spaces",
    "apps.residents",
    "apps.onboarding",
    "apps.objects",
    "apps.packages",
    "apps.menu",
]

if MATCHING_ENABLED:
    TENANT_APPS.append("apps.matching")

INSTALLED_APPS = SHARED_APPS + [app for app in TENANT_APPS if app not in SHARED_APPS]

MIDDLEWARE = [
    "django_tenants.middleware.main.TenantMainMiddleware",
    "apps.residences.middleware.ResidenceByDomainMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"
PUBLIC_SCHEMA_URLCONF = "config.urls"
USE_X_FORWARDED_HOST = True

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django_tenants.postgresql_backend",
        "NAME": os.getenv("POSTGRES_DB", "nexus"),
        "USER": os.getenv("POSTGRES_USER", "postgres"),
        "PASSWORD": os.getenv("POSTGRES_PASSWORD", "postgres"),
        "HOST": os.getenv("POSTGRES_HOST", "localhost"),
        "PORT": os.getenv("POSTGRES_PORT", "5432"),
    }
}

DATABASE_ROUTERS = ("django_tenants.routers.TenantSyncRouter",)

TENANT_MODEL = "tenants.Client"
TENANT_DOMAIN_MODEL = "tenants.Domain"

LANGUAGE_CODE = "es-es"
TIME_ZONE = "Europe/Madrid"
USE_I18N = True
USE_TZ = True

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": REDIS_URL,
        "OPTIONS": {
            "CLIENT_CLASS": "django_redis.client.DefaultClient",
        },
    }
}

CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", REDIS_URL)
CELERY_RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/1")
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE = TIME_ZONE
CELERY_TASK_TRACK_STARTED = True
CELERY_TASK_ALWAYS_EAGER = os.getenv("CELERY_TASK_ALWAYS_EAGER", "0") == "1"
CELERY_IMPORTS = tuple(
    module
    for module in (
        "apps.matching.tasks" if MATCHING_ENABLED else None,
    )
    if module
)

MATCHING_ROOM_CHANGE_MODEL = os.getenv("MATCHING_ROOM_CHANGE_MODEL", "")
MATCHING_ROOM_CHANGE_MEMBERSHIP_FIELD = os.getenv(
    "MATCHING_ROOM_CHANGE_MEMBERSHIP_FIELD",
    "membership_id",
)

JWT_ACCESS_COOKIE_NAME = os.getenv("JWT_ACCESS_COOKIE_NAME", "access_token")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_SIGNING_KEY = os.getenv("JWT_SIGNING_KEY", SECRET_KEY)
JWT_AUDIENCE = os.getenv("JWT_AUDIENCE") or None
JWT_ACCESS_TOKEN_LIFETIME_SECONDS = int(
    os.getenv("JWT_ACCESS_TOKEN_LIFETIME_SECONDS", "3600")
)
JWT_COOKIE_SECURE = os.getenv("JWT_COOKIE_SECURE", "0") == "1"
JWT_COOKIE_SAMESITE = os.getenv("JWT_COOKIE_SAMESITE", "Lax")

FIREWORKS_API_KEY = os.getenv("FIREWORKS_API_KEY", "")
FIREWORKS_LABEL_MODEL = os.getenv("FIREWORKS_LABEL_MODEL", "")
FIREWORKS_BASE_URL = os.getenv(
    "FIREWORKS_BASE_URL",
    "https://api.fireworks.ai/inference/v1",
)
PACKAGE_QR_TOKEN_MAX_AGE_SECONDS = int(
    os.getenv("PACKAGE_QR_TOKEN_MAX_AGE_SECONDS", "300")
)

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": ("apps.common.services.CustomJWTAuthentication",),
    "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.IsAuthenticated",),
}
