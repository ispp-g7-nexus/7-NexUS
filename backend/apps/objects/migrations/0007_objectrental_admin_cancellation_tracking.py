from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('objects', '0006_objectrental_add_in_progress_status'),
    ]

    operations = [
        migrations.AddField(
            model_name='objectrental',
            name='admin_cancelled_by',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='cancelled_object_rentals',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name='objectrental',
            name='admin_cancelled_reason',
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name='objectrental',
            name='admin_cancelled_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
