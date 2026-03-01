from django.urls import path, include
from rest_framework.routers import DefaultRouter

from backend.apps.residents.views import ResidentViewSet


router = DefaultRouter()

router.register(r'residents', ResidentViewSet, basename='resident')
urlpatterns = [
    path('', include(router.urls)),]
