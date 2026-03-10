from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import ChatGroupViewSet

router = DefaultRouter()
router.register(r"chats/groups", ChatGroupViewSet, basename="chat-group")

urlpatterns = [
	path("", include(router.urls)),
]
