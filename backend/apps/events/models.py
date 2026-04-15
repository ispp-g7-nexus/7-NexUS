from django.db import models
from django.conf import settings
from apps.residences.models import Residence
from apps.spaces.models import CommonSpace, SpaceReservation
from apps.chats.models import ChatGroup

class Event(models.Model):
    class Type(models.TextChoices):
        INTERNAL = "internal", "Interno"
        EXTERNAL = "external", "Externo"

    title = models.CharField(max_length=200)
    description = models.TextField()
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    event_type = models.CharField(
        max_length=16,
        choices=Type.choices,
        default=Type.EXTERNAL,
    )
    location = models.CharField(max_length=255, blank=True, default="")
    space = models.ForeignKey(
        CommonSpace,
        on_delete=models.PROTECT,
        related_name="events",
        null=True,
        blank=True,
    )
    reservation = models.OneToOneField(
        SpaceReservation,
        on_delete=models.PROTECT,
        related_name="event",
        null=True,
        blank=True,
    )
    image_url = models.URLField(max_length=500, null=True, blank=True)
    tags = models.CharField(max_length=255, null=True, blank=True)
    max_participants = models.PositiveIntegerField(null=True, blank=True)
    residence = models.ForeignKey(Residence, on_delete=models.CASCADE, related_name='events')
    host = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='hosted_events')
    chat_group = models.OneToOneField(
        ChatGroup,
        on_delete=models.SET_NULL,
        related_name='event',
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-start_time']
        constraints = [
            models.CheckConstraint(
                name="event_internal_requires_space_and_reservation",
                condition=(
                    models.Q(event_type="internal", space__isnull=False, reservation__isnull=False)
                    | models.Q(event_type="external")
                ),
            ),
            models.CheckConstraint(
                name="event_external_forbids_space_and_reservation",
                condition=(
                    models.Q(event_type="external", space__isnull=True, reservation__isnull=True)
                    | models.Q(event_type="internal")
                ),
            ),
        ]

    def __str__(self):
        return self.title

    @property
    def participants_count(self):
        return self.participations.count()

    def can_join(self):
        if self.event_type == self.Type.INTERNAL and self.space_id:
            effective_limit = self.space.capacity
            if self.max_participants is not None:
                effective_limit = min(self.max_participants, self.space.capacity)
            return self.participants_count < effective_limit

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
