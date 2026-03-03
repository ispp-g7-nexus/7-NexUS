from django.db import models
from django.conf import settings
from apps.residences.models import Residence

class Event(models.Model):
    title = models.CharField(max_length=200)
    description = models.TextField()
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    location = models.CharField(max_length=255)
    image_url = models.URLField(max_length=500, null=True, blank=True)
    tags = models.CharField(max_length=255, null=True, blank=True)
    max_participants = models.PositiveIntegerField(null=True, blank=True)
    residence = models.ForeignKey(Residence, on_delete=models.CASCADE, related_name='events')
    host = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='hosted_events')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-start_time']

    def __str__(self):
        return self.title

    @property
    def participants_count(self):
        return self.participations.count()

    def can_join(self):
        if self.max_participants is None:
            return True
        return self.participants_count < self.max_participants

class EventParticipation(models.Model):
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='participations')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='event_participations')
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('event', 'user')
        ordering = ['joined_at']

    def __str__(self):
        return f"{self.user} -> {self.event}"
