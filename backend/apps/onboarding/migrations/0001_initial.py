# Generated migration for onboarding app

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('residences', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='ResidentPreference',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('interests', models.JSONField(blank=True, default=list, help_text="JSON array of interest IDs (e.g., ['sports', 'music', 'reading'])")),
                ('dietary_restrictions', models.JSONField(blank=True, default=list, help_text='JSON array of dietary restrictions')),
                ('hobbies', models.TextField(blank=True)),
                ('additional_info', models.TextField(blank=True)),
                ('is_completed', models.BooleanField(default=False, help_text='Whether the resident has completed their preference form')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('membership', models.OneToOneField(limit_choices_to={'role': 'resident'}, on_delete=django.db.models.deletion.CASCADE, related_name='resident_preferences', to='membership.Membership')),
            ],
            options={
                'verbose_name': 'Resident Preference',
                'verbose_name_plural': 'Resident Preferences',
                'ordering': ['-created_at'],
            },
        ),
    ]
