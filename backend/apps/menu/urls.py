from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MenuWeekViewSet, MealViewSet

router = DefaultRouter()
router.register(r'menu/weeks', MenuWeekViewSet, basename='menu-week')
router.register(r'menu/meals', MealViewSet, basename='menu-meal')

urlpatterns = [
    path(
        'menu/days/<int:day_id>/meals/',
        MealViewSet.as_view({'get': 'list', 'post': 'create'}),
        name='day-meals',
    ),
    path('', include(router.urls)),
]
