from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import ChatGroupViewSet, MyGroupsViewSet, PrivateConversationViewSet, ResidentListForChatView

router = DefaultRouter()
router.register(r"chats/groups", ChatGroupViewSet, basename="chat-group")
router.register(r"chats/my-groups", MyGroupsViewSet, basename="my-chat-group")
router.register(r"chats/conversations", PrivateConversationViewSet, basename="private-conversation")

urlpatterns = [
	path("", include(router.urls)),
	path("chats/residents/", ResidentListForChatView.as_view(), name="chat-residents"),
]


