from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import IncidenceAnalyticsView, IncidenceViewSet

router = DefaultRouter()
router.register(r'', IncidenceViewSet, basename='incidence')

urlpatterns = [
    path('analytics/', IncidenceAnalyticsView.as_view(), name='incidence-analytics'),
    path('', include(router.urls)),
]