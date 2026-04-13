from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import RoleViewSet, MembershipAnalyticsViewSet

router = DefaultRouter()

router.register(r'roles', RoleViewSet, basename='role')
router.register(r'analytics', MembershipAnalyticsViewSet, basename='membership-analytics')

urlpatterns = [
    path('', include(router.urls)),
]