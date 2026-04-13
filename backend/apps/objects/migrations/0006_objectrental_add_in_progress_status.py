from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('objects', '0005_alter_object_labels_related_name'),
    ]

    operations = [
        migrations.AlterField(
            model_name='objectrental',
            name='status',
            field=models.CharField(
                choices=[
                    ('ACTIVE', 'Activa'),
                    ('IN_PROGRESS', 'En curso'),
                    ('CANCELLED', 'Cancelada'),
                    ('COMPLETED', 'Completada'),
                ],
                default='ACTIVE',
                max_length=20,
            ),
        ),
    ]
