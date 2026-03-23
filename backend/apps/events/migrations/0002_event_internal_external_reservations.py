from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("spaces", "0002_commonspace_reservation_interval_minutes"),
        ("events", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="event",
            name="event_type",
            field=models.CharField(
                choices=[("internal", "Interno"), ("external", "Externo")],
                default="external",
                max_length=16,
            ),
        ),
        migrations.AddField(
            model_name="event",
            name="reservation",
            field=models.OneToOneField(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="event",
                to="spaces.spacereservation",
            ),
        ),
        migrations.AddField(
            model_name="event",
            name="space",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="events",
                to="spaces.commonspace",
            ),
        ),
        migrations.AlterField(
            model_name="event",
            name="location",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
        migrations.AddConstraint(
            model_name="event",
            constraint=models.CheckConstraint(
                condition=models.Q(
                    models.Q(
                        ("event_type", "internal"),
                        ("reservation__isnull", False),
                        ("space__isnull", False),
                    ),
                    ("event_type", "external"),
                    _connector="OR",
                ),
                name="event_internal_requires_space_and_reservation",
            ),
        ),
        migrations.AddConstraint(
            model_name="event",
            constraint=models.CheckConstraint(
                condition=models.Q(
                    models.Q(
                        ("event_type", "external"),
                        ("reservation__isnull", True),
                        ("space__isnull", True),
                    ),
                    ("event_type", "internal"),
                    _connector="OR",
                ),
                name="event_external_forbids_space_and_reservation",
            ),
        ),
    ]
