# Generated migration for adding status and updated_at fields to ObjectRental

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('objects', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='objectrental',
            name='status',
            field=models.CharField(choices=[('ACTIVE', 'Activa'), ('CANCELLED', 'Cancelada'), ('COMPLETED', 'Completada')], default='ACTIVE', max_length=20),
        ),
        migrations.AddField(
            model_name='objectrental',
            name='updated_at',
            field=models.DateTimeField(auto_now=True),
        ),
    ]
