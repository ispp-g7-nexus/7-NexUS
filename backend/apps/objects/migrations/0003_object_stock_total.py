from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('objects', '0002_objectrental_status_and_updated_at'),
    ]

    operations = [
        migrations.AddField(
            model_name='object',
            name='stock_total',
            field=models.PositiveIntegerField(default=1),
        ),
    ]
