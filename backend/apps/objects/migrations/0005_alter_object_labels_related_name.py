from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('objects', '0004_objectlabel_and_object_labels'),
    ]

    operations = [
        migrations.AlterField(
            model_name='object',
            name='labels',
            field=models.ManyToManyField(blank=True, related_name='tagged_objects', to='objects.objectlabel'),
        ),
    ]
