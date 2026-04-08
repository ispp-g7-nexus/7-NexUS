from django.conf import settings
from django.db import models
from apps.residences.models import Residence


class BedroomAuditLog(models.Model):
    class Action(models.TextChoices):
        CREATED = "CREATED", "Creada"
        UPDATED = "UPDATED", "Actualizada"
        RESIDENT_ASSIGNED = "RESIDENT_ASSIGNED", "Residente asignado"
        RESIDENT_REMOVED = "RESIDENT_REMOVED", "Residente eliminado"

    bedroom = models.ForeignKey("Bedroom", on_delete=models.CASCADE, related_name="audit_logs")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    action = models.CharField(max_length=20, choices=Action.choices)
    changes = models.JSONField(default=dict, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-timestamp"]
        indexes = [models.Index(fields=["bedroom", "-timestamp"], name="bedroomauditlog_bedroom_ts_idx")]


class Bedroom(models.Model):
	class Tipo(models.TextChoices):
		INDIVIDUAL = "Individual", "Individual"
		DOBLE = "Doble", "Doble"
		TRIPLE = "Triple", "Triple"

	numero = models.CharField(max_length=50)
	planta = models.IntegerField(null=True, blank=True)
	capacidad_maxima = models.IntegerField(default=1)
	tipo = models.CharField(max_length=10, choices=Tipo.choices, default=Tipo.INDIVIDUAL)
	residence = models.ForeignKey(
		Residence,
		on_delete=models.CASCADE,
		related_name="bedrooms",
	)
	is_active = models.BooleanField(default=True)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)
	edificio = models.CharField(max_length=100, null=True, blank=True)

	class Meta:
		ordering = ["residence_id", "numero"]
		constraints = [
			models.UniqueConstraint(
				fields=["residence", "numero", "edificio"],
				name="unique_room_per_residence"
			)
		]
    

	def __str__(self) -> str:
		return f"{self.numero} - {self.residence}"
