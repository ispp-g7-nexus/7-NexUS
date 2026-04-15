from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("objects", "0009_merge_20260412_2243"),
    ]

    operations = [
        migrations.AlterField(
            model_name="object",
            name="image_url",
            field=models.URLField(blank=True, max_length=300, null=True),
        ),
    ]
