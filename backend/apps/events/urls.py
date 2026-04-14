from django.urls import path
from .views import (
    EventListView,
    EventDetailView,
    EventJoinView,
    EventJoinChatView,
    EventLeaveView,
    EventParticipantsView,
    AdminEventsAnalyticsView,
)

urlpatterns = [
    path('events/', EventListView.as_view(), name='event-list'),
    path('events/<int:event_id>/', EventDetailView.as_view(), name='event-detail'),
    path('events/<int:event_id>/join/', EventJoinView.as_view(), name='event-join'),
    path('events/<int:event_id>/join-chat/', EventJoinChatView.as_view(), name='event-join-chat'),
    path('events/<int:event_id>/leave/', EventLeaveView.as_view(), name='event-leave'),
    path('events/<int:event_id>/participants/', EventParticipantsView.as_view(), name='event-participants'),
    path(
        "admin/analytics/events/",
        AdminEventsAnalyticsView.as_view(),
        name="admin-events-analytics",
    ),
]
