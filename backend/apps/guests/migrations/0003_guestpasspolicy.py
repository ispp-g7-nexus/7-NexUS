import django.core.validators
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("guests", "0002_guestpass_comment"),
        ("residences", "0004_studentprofile"),
    ]

    operations = [
        migrations.CreateModel(
            name="GuestPassPolicy",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "max_duration_hours",
                    models.PositiveSmallIntegerField(
                        default=24,
                        validators=[
                            django.core.validators.MinValueValidator(1),
                            django.core.validators.MaxValueValidator(168),
                        ],
                    ),
                ),
                (
                    "max_concurrent_passes",
                    models.PositiveSmallIntegerField(
                        default=3,
                        validators=[
                            django.core.validators.MinValueValidator(1),
                            django.core.validators.MaxValueValidator(20),
                        ],
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "residence",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="guest_pass_policy",
                        to="residences.residence",
                    ),
                ),
            ],
            options={
                "verbose_name": "Guest pass policy",
                "verbose_name_plural": "Guest pass policies",
            },
        ),
    ]
