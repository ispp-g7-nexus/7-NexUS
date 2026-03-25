from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("chats", "0004_fix_label_length_consistency"),
    ]

    operations = [
        migrations.AddField(
            model_name="chatgroupmember",
            name="can_interact",
            field=models.BooleanField(default=True),
        ),
    ]
