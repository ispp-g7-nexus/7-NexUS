import datetime
from datetime import timezone
from django.db import models


class Resident(models.Model):
    class ResidentState(models.TextChoices):
        ACTIVE = "active", "Active"
        INACTIVE = "inactive", "Inactive"
        PENDING = "pending", "Pending"
        
    fullname = models.CharField(max_length=100)
    age = models.IntegerField()
    email = models.EmailField(unique=True)
    state = models.CharField(max_length=20, choices=ResidentState.choices, default=ResidentState.PENDING)
    room = models.CharField(max_length=10)
    building = models.CharField(max_length=100, )
    # No se si se va a hacer con la del momento o qeu se pueda introducir
    check_in_date = models.DateField(default=datetime.datetime.now(tz=timezone.utc).date())

    def __str__(self):
        return self.fullname
