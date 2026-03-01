from django.urls import path, include
from rest_framework.routers import DefaultRouter

from backend.apps.staff.views import StaffViewSet


router = DefaultRouter()

router.register(r'staff', StaffViewSet, basename='staff')
urlpatterns = [
    path('', include(router.urls)),]
