from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('onboarding', '0002_add_new_preferences_fields'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='residentpreference',
            name='interests',
        ),
        migrations.RemoveField(
            model_name='residentpreference',
            name='dietary_restrictions',
        ),
        migrations.RemoveField(
            model_name='residentpreference',
            name='hobbies',
        ),
        migrations.RemoveField(
            model_name='residentpreference',
            name='additional_info',
        ),
    ]
