from celery import shared_task
from django.utils import timezone
from datetime import timedelta
from .models import ObjectRental


@shared_task
def send_return_reminders():
    """Find rentals that will end within the reminder window and emit a reminder.

    This task is intentionally simple: it logs or returns the list of rentals
    that should receive reminders. Integrate with the project's notification
    system (email/notifications) as needed.
    """
    now = timezone.now()
    window_start = now
    window_end = now + timedelta(hours=24)

    rentals = ObjectRental.objects.filter(
        end_date__gt=window_start,
        end_date__lte=window_end,
    ).select_related('user', 'object')
    reminders = []
    for r in rentals:
        reminders.append({
            'rental_id': r.id,
            'user_id': r.user_id,
            'user_email': getattr(r.user, 'email', None),
            'object_id': r.object_id,
            'object_name': r.object.name,
            'end_date': r.end_date.isoformat(),
        })
        # TODO: send email/notification to r.user

    # For now return the list for visibility in task runs
    return {'count': len(reminders), 'reminders': reminders} 
