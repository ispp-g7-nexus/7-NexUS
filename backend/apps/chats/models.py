from django.conf import settings
from django.db import models

from apps.residences.models import Residence


class ChatGroup(models.Model):
	class LabelChoices(models.TextChoices):
		GENERAL = "general", "General"
		FLOOR = "floor", "Planta"
		ACTIVITY = "activity", "Actividad"
		PRIVATE = "private", "Privado"

	residence = models.ForeignKey(
		Residence,
		on_delete=models.CASCADE,
		related_name="chat_groups",
	)
	name = models.CharField(max_length=120)
	description = models.TextField(blank=True)
	label = models.CharField(
		max_length=20,
		choices=LabelChoices.choices,
		default=LabelChoices.GENERAL,
	)
	can_members_leave = models.BooleanField(default=True)
	created_by = models.ForeignKey(
		settings.AUTH_USER_MODEL,
		on_delete=models.SET_NULL,
		null=True,
		related_name="chat_groups_created",
	)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		ordering = ["name"]
		constraints = [
			models.UniqueConstraint(
				fields=["residence", "name"],
				name="uniq_chat_group_name_per_residence",
			)
		]

	def __str__(self) -> str:
		return self.name


class ChatGroupMember(models.Model):
	group = models.ForeignKey(
		ChatGroup,
		on_delete=models.CASCADE,
		related_name="memberships",
	)
	membership = models.ForeignKey(
		"membership.Membership",
		on_delete=models.CASCADE,
		related_name="chat_group_memberships",
	)
	is_admin = models.BooleanField(default=False)
	joined_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		ordering = ["joined_at"]
		constraints = [
			models.UniqueConstraint(
				fields=["group", "membership"],
				name="uniq_chat_group_member",
			)
		]

	def __str__(self) -> str:
		return f"{self.group_id}:{self.membership_id}"
