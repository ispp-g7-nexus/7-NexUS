from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ResidentPreferenceViewSet

router = DefaultRouter()
router.register(r"preferences", ResidentPreferenceViewSet, basename="resident-preference")

app_name = "onboarding"

urlpatterns = [
    path("", include(router.urls)),
]
