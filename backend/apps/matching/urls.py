from django.urls import path

from .views import (
    MatchLikeDeleteView,
    MatchLikeView,
    MyMatchesView,
    StartMatchChatView,
)


urlpatterns = [
    path("matching/me/", MyMatchesView.as_view(), name="matching-me"),
    path("matching/likes/", MatchLikeView.as_view(), name="matching-like"),
    path(
        "matching/likes/<int:membership_id>/",
        MatchLikeDeleteView.as_view(),
        name="matching-like-delete",
    ),
    path(
        "matching/chats/start/",
        StartMatchChatView.as_view(),
        name="matching-chat-start",
    ),
]
