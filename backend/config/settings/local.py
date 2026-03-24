import os

from . import base as base_settings

for _setting_name in dir(base_settings):
    if _setting_name.isupper():
        globals()[_setting_name] = getattr(base_settings, _setting_name)
del _setting_name

DEBUG = True
ALLOWED_HOSTS = ["*"]

# CONFIGURACIÓN DE EMAIL SMTP
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = "smtp.gmail.com"
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_USE_SSL = False

EMAIL_HOST_USER = os.environ.get("EMAIL_HOST_USER", "nbynexus@gmail.com")
EMAIL_HOST_PASSWORD = os.environ.get("EMAIL_HOST_PASSWORD", "")
DEFAULT_FROM_EMAIL = EMAIL_HOST_USER
