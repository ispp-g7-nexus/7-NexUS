from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('onboarding', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='residentpreference',
            name='sex',
            field=models.CharField(blank=True, max_length=20),
        ),
        migrations.AddField(
            model_name='residentpreference',
            name='age',
            field=models.PositiveSmallIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='residentpreference',
            name='schedule',
            field=models.CharField(blank=True, max_length=20),
        ),
        migrations.AddField(
            model_name='residentpreference',
            name='study_location',
            field=models.CharField(blank=True, max_length=100),
        ),
        migrations.AddField(
            model_name='residentpreference',
            name='social_level',
            field=models.PositiveSmallIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='residentpreference',
            name='weekend_return',
            field=models.CharField(blank=True, max_length=50),
        ),
        migrations.AddField(
            model_name='residentpreference',
            name='outside_plans_importance',
            field=models.CharField(blank=True, max_length=50),
        ),
        migrations.AddField(
            model_name='residentpreference',
            name='desired_activity',
            field=models.CharField(blank=True, max_length=50),
        ),
        migrations.AddField(
            model_name='residentpreference',
            name='order_importance',
            field=models.PositiveSmallIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='residentpreference',
            name='noise_tolerance',
            field=models.PositiveSmallIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='residentpreference',
            name='smoking_vaping',
            field=models.CharField(blank=True, max_length=50),
        ),
        migrations.AddField(
            model_name='residentpreference',
            name='visitors_preference',
            field=models.CharField(blank=True, max_length=100),
        ),
        migrations.AddField(
            model_name='residentpreference',
            name='basic_items_preference',
            field=models.CharField(blank=True, max_length=100),
        ),
        migrations.AddField(
            model_name='residentpreference',
            name='temperature_preference',
            field=models.CharField(blank=True, max_length=50),
        ),
    ]
