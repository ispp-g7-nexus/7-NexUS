from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('objects', '0003_object_stock_total'),
        ('residences', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='ObjectLabel',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=30)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('residence', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='object_labels', to='residences.residence')),
            ],
            options={
                'ordering': ['name'],
            },
        ),
        migrations.AddConstraint(
            model_name='objectlabel',
            constraint=models.UniqueConstraint(fields=('residence', 'name'), name='uniq_object_label_per_residence'),
        ),
        migrations.AddField(
            model_name='object',
            name='labels',
            field=models.ManyToManyField(blank=True, related_name='objects', to='objects.objectlabel'),
        ),
    ]
