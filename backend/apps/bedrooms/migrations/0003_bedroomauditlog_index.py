from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('bedrooms', '0002_bedroomauditlog'),
    ]

    operations = [
        migrations.AddIndex(
            model_name='bedroomauditlog',
            index=models.Index(fields=['bedroom', '-timestamp'], name='bedroomauditlog_bedroom_ts_idx'),
        ),
    ]
