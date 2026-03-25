from django.db import migrations, models
from django.utils import timezone


def set_disabled_at_for_non_interactive_members(apps, schema_editor):
    ChatGroupMember = apps.get_model("chats", "ChatGroupMember")
    now = timezone.now()
    ChatGroupMember.objects.filter(
        can_interact=False,
        interaction_disabled_at__isnull=True,
    ).update(interaction_disabled_at=now)


class Migration(migrations.Migration):

    dependencies = [
        ("chats", "0005_chatgroupmember_can_interact"),
    ]

    operations = [
        migrations.AddField(
            model_name="chatgroupmember",
            name="interaction_disabled_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.RunPython(
            set_disabled_at_for_non_interactive_members,
            migrations.RunPython.noop,
        ),
    ]
