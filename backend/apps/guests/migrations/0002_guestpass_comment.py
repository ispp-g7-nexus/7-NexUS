from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("guests", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="guestpass",
            name="comment",
            field=models.TextField(blank=True, default=""),
            preserve_default=False,
        ),
    ]
