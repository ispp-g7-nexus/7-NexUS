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


class ChatGroupLabel(models.Model):
	"""Etiquetas personalizadas creadas por el admin."""

	residence = models.ForeignKey(
		Residence,
		on_delete=models.CASCADE,
		related_name="custom_chat_labels",
	)
	name = models.CharField(max_length=50)
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		ordering = ["name"]
		constraints = [
			models.UniqueConstraint(
				fields=["residence", "name"],
				name="uniq_chat_label_per_residence",
			)
		]

	def __str__(self) -> str:
		return self.name


class PrivateConversation(models.Model):
	"""Conversación privada 1-a-1 entre dos residentes."""

	residence = models.ForeignKey(
		Residence,
		on_delete=models.CASCADE,
		related_name="private_conversations",
	)
	member_one = models.ForeignKey(
		"membership.Membership",
		on_delete=models.CASCADE,
		related_name="conversations_as_one",
	)
	member_two = models.ForeignKey(
		"membership.Membership",
		on_delete=models.CASCADE,
		related_name="conversations_as_two",
	)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		ordering = ["-updated_at"]
		constraints = [
			models.UniqueConstraint(
				fields=["residence", "member_one", "member_two"],
				name="uniq_private_conversation",
			)
		]

	def __str__(self) -> str:
		return f"Conversación {self.id}: {self.member_one_id} ↔ {self.member_two_id}"


class PrivateMessage(models.Model):
	"""Mensaje dentro de una conversación privada."""

	conversation = models.ForeignKey(
		PrivateConversation,
		on_delete=models.CASCADE,
		related_name="messages",
	)
	sender = models.ForeignKey(
		"membership.Membership",
		on_delete=models.CASCADE,
		related_name="private_messages_sent",
	)
	content = models.TextField()
	is_read = models.BooleanField(default=False)
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		ordering = ["created_at"]

	def __str__(self) -> str:
		return f"Msg {self.id} en conv {self.conversation_id}"

