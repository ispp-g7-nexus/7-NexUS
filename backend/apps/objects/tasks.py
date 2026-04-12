from celery import shared_task
from django.utils import timezone
from datetime import timedelta
from django_tenants.utils import schema_context, get_public_schema_name
from apps.chats.realtime import publish_chat_event
from apps.tenants.models import Client
from .models import ObjectRental

@shared_task
def send_return_reminders():
    """Find rentals ending within 15 minutes and push a real-time reminder
    via the existing Redis pub/sub → WebSocket infrastructure.

    Iterates over all tenant schemas since ObjectRental is a tenant-scoped model.
    This task should be scheduled to run every minute by Celery Beat.
    """
    now = timezone.now()
    window_end = now + timedelta(minutes=15)

    all_reminders = []

    public_schema = get_public_schema_name()
    for tenant in Client.objects.exclude(schema_name=public_schema):
        with schema_context(tenant.schema_name):
            rentals = ObjectRental.objects.filter(
                status__in=["ACTIVE", "IN_PROGRESS"],
                end_date__gt=now,
                end_date__lte=window_end,
                reminder_viewed_at__isnull=True,
            ).select_related("user", "object", "object__residence")

            for rental in rentals:
                residence_id = rental.object.residence_id
                if not residence_id:
                    continue

                minutes_remaining = max(0, int((rental.end_date - now).total_seconds() / 60))

                payload = {
                    "rental_id": rental.id,
                    "user_id": rental.user_id,
                    "user_email": getattr(rental.user, "email", ""),
                    "object_name": rental.object.name,
                    "object_id": rental.object_id,
                    "end_date": rental.end_date.isoformat(),
                    "minutes_remaining": minutes_remaining,
                }

                publish_chat_event(residence_id, "object_rental_reminder", payload)

                all_reminders.append({
                    "rental_id": rental.id,
                    "user_id": rental.user_id,
                    "object_name": rental.object.name,
                    "end_date": rental.end_date.isoformat(),
                    "minutes_remaining": minutes_remaining,
                    "tenant": tenant.schema_name,
                })

    return {"count": len(all_reminders), "reminders": all_reminders} 
