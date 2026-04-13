from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MenuWeekViewSet, MealViewSet, SpecialMenuRequestViewSet

router = DefaultRouter()
router.register(r'menu/weeks', MenuWeekViewSet, basename='menu-week')
router.register(r'menu/meals', MealViewSet, basename='menu-meal')
router.register(r'menu/special-requests', SpecialMenuRequestViewSet, basename='special-requests')

urlpatterns = [
    path(
        'menu/days/<int:day_id>/meals/',
        MealViewSet.as_view({'get': 'list', 'post': 'create'}),
        name='day-meals',
    ),
    path('', include(router.urls)),
]
