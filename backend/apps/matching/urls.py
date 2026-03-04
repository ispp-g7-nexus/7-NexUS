from django.urls import path

from .views import MyMatchesView


urlpatterns = [
    path("matching/me/", MyMatchesView.as_view(), name="matching-me"),
]
