from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('objects', '0007_objectrental_admin_cancellation_tracking'),
    ]

    operations = [
        migrations.AddField(
            model_name='objectrental',
            name='user_dismissed_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
