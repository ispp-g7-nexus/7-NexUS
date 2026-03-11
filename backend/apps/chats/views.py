from django.db.models import Prefetch, Q
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.generics import ListAPIView
from rest_framework.response import Response

from apps.membership.models import Membership

from .models import ChatGroup, ChatGroupMember, ChatGroupLabel, GroupMessage, PrivateConversation, PrivateMessage
from .permissions import IsAuthenticatedResident, IsResidenceAdmin
from .serializers import (
	AddChatMemberSerializer,
	ChatGroupCreateUpdateSerializer,
	ChatGroupLabelSerializer,
	ChatGroupSerializer,
	ChatResidentSerializer,
	GroupMessageSerializer,
	PrivateConversationSerializer,
	PrivateMessageSerializer,
	SendMessageSerializer,
	StartConversationSerializer,
	UpdateChatMemberSerializer,
)

# Constantes para mensajes duplicados
NO_MEMBERSHIP_MESSAGE = "No tienes membresía activa."
CONVERSATION_NOT_FOUND_MESSAGE = "Conversación no encontrada."


class ChatGroupViewSet(viewsets.ModelViewSet):
	permission_classes = [IsResidenceAdmin]

	def get_queryset(self):
		residence = getattr(self.request, "residence", None)
		if not residence:
			return ChatGroup.objects.none()

		members_qs = ChatGroupMember.objects.select_related("membership__user")
		return (
			ChatGroup.objects.filter(residence=residence)
			.prefetch_related(Prefetch("memberships", queryset=members_qs))
			.order_by("name")
		)

	def get_serializer_class(self):
		if self.action in {"create", "update", "partial_update"}:
			return ChatGroupCreateUpdateSerializer
		return ChatGroupSerializer

	def perform_create(self, serializer):
		residence = getattr(self.request, "residence", None)
		if not residence:
			raise ValidationError({"detail": "No se ha determinado la residencia."})

		group = serializer.save(residence=residence, created_by=self.request.user)
		actor_membership = self.request.user.memberships.filter(
			residence=residence,
			is_active=True,
		).first()
		if actor_membership:
			ChatGroupMember.objects.get_or_create(
				group=group,
				membership=actor_membership,
				defaults={"is_admin": True},
			)

	def create(self, request, *args, **kwargs):
		write_serializer = self.get_serializer(data=request.data)
		write_serializer.is_valid(raise_exception=True)
		self.perform_create(write_serializer)

		group = self.get_queryset().get(id=write_serializer.instance.id)
		read_serializer = ChatGroupSerializer(group)
		return Response(read_serializer.data, status=status.HTTP_201_CREATED)

	def update(self, request, *args, **kwargs):
		partial = kwargs.pop("partial", False)
		instance = self.get_object()
		write_serializer = self.get_serializer(instance, data=request.data, partial=partial)
		write_serializer.is_valid(raise_exception=True)
		self.perform_update(write_serializer)

		refreshed = self.get_queryset().get(id=instance.id)
		read_serializer = ChatGroupSerializer(refreshed)
		return Response(read_serializer.data)

	def partial_update(self, request, *args, **kwargs):
		kwargs["partial"] = True
		return self.update(request, *args, **kwargs)

	@action(detail=True, methods=["post"], url_path="members")
	def add_member(self, request, pk=None):
		group = self.get_object()
		serializer = AddChatMemberSerializer(data=request.data, context={"request": request})
		serializer.is_valid(raise_exception=True)

		membership = serializer.context["target_membership"]
		_, created = ChatGroupMember.objects.get_or_create(
			group=group,
			membership=membership,
			defaults={"is_admin": serializer.validated_data["is_admin"]},
		)
		if not created:
			raise ValidationError({"detail": "Ese usuario ya pertenece al grupo."})

		return Response(
			ChatGroupSerializer(self.get_queryset().get(id=group.id)).data,
			status=status.HTTP_201_CREATED,
		)

	@action(detail=True, methods=["patch"], url_path=r"members/(?P<member_id>[^/.]+)")
	def update_member(self, request, pk=None, member_id=None):
		group = self.get_object()
		serializer = UpdateChatMemberSerializer(data=request.data)
		serializer.is_valid(raise_exception=True)

		member = group.memberships.filter(id=member_id).first()
		if not member:
			raise NotFound("Miembro no encontrado.")

		member.is_admin = serializer.validated_data["is_admin"]
		member.save(update_fields=["is_admin"])

		return Response(ChatGroupSerializer(self.get_queryset().get(id=group.id)).data)

	@update_member.mapping.delete
	def remove_member(self, request, pk=None, member_id=None):
		group = self.get_object()
		member = group.memberships.filter(id=member_id).first()
		if not member:
			raise NotFound("Miembro no encontrado.")

		member.delete()
		return Response(status=status.HTTP_204_NO_CONTENT)


class ChatGroupLabelViewSet(viewsets.ModelViewSet):
	"""CRUD de etiquetas personalizadas para grupos de chat."""

	permission_classes = [IsResidenceAdmin]
	serializer_class = ChatGroupLabelSerializer

	def get_queryset(self):
		residence = getattr(self.request, "residence", None)
		if not residence:
			return ChatGroupLabel.objects.none()
		return ChatGroupLabel.objects.filter(residence=residence)

	def perform_create(self, serializer):
		residence = getattr(self.request, "residence", None)
		if not residence:
			raise ValidationError({"detail": "No se ha determinado la residencia."})
		serializer.save(residence=residence)


class MyGroupsViewSet(viewsets.ReadOnlyModelViewSet):
	"""Endpoint para que un residente vea los grupos a los que pertenece."""

	permission_classes = [IsAuthenticatedResident]
	serializer_class = ChatGroupSerializer

	def get_queryset(self):
		residence = getattr(self.request, "residence", None)
		if not residence:
			return ChatGroup.objects.none()

		# Obtener la membresía activa del usuario en la residencia
		membership = self.request.user.memberships.filter(
			residence=residence,
			is_active=True,
		).first()
		if not membership:
			return ChatGroup.objects.none()

		members_qs = ChatGroupMember.objects.select_related("membership__user")
		return (
			ChatGroup.objects.filter(
				residence=residence,
				memberships__membership=membership,
			)
			.prefetch_related(Prefetch("memberships", queryset=members_qs))
			.order_by("name")
		)

	@action(detail=True, methods=["post"], url_path="leave")
	def leave(self, request, pk=None):
		"""Permite al residente abandonar un grupo si can_members_leave es True."""
		residence = getattr(request, "residence", None)
		membership = request.user.memberships.filter(
			residence=residence,
			is_active=True,
		).first()
		if not membership:
			raise ValidationError({"detail": NO_MEMBERSHIP_MESSAGE})

		group = ChatGroup.objects.filter(
			id=pk,
			residence=residence,
		).first()
		if not group:
			raise NotFound("Grupo no encontrado.")

		if not group.can_members_leave:
			raise ValidationError(
				{"detail": "No puedes abandonar este grupo."}
			)

		chat_member = ChatGroupMember.objects.filter(
			group=group,
			membership=membership,
		).first()
		if not chat_member:
			raise NotFound("No eres miembro de este grupo.")

		chat_member.delete()
		return Response(status=status.HTTP_204_NO_CONTENT)

	@action(detail=True, methods=["get", "post"], url_path="messages")
	def messages(self, request, pk=None):
		"""GET: listar mensajes del grupo. POST: enviar mensaje."""
		residence = getattr(request, "residence", None)
		membership = request.user.memberships.filter(
			residence=residence,
			is_active=True,
		).first()
		if not membership:
			raise ValidationError({"detail": "No tienes membresía activa."})

		group = ChatGroup.objects.filter(
			id=pk,
			residence=residence,
			memberships__membership=membership,
		).first()
		if not group:
			raise NotFound("Grupo no encontrado o no eres miembro.")

		if request.method == "GET":
			msgs = group.messages.select_related("sender__user").order_by("created_at")
			return Response(GroupMessageSerializer(msgs, many=True).data)

		# POST — enviar mensaje
		ser = SendMessageSerializer(data=request.data)
		ser.is_valid(raise_exception=True)

		msg = GroupMessage.objects.create(
			group=group,
			sender=membership,
			content=ser.validated_data["content"],
		)
		return Response(
			GroupMessageSerializer(msg).data,
			status=status.HTTP_201_CREATED,
		)


class PrivateConversationViewSet(viewsets.ViewSet):
	"""Conversaciones privadas 1-a-1 del residente."""

	permission_classes = [IsAuthenticatedResident]

	def _get_membership(self, request):
		residence = getattr(request, "residence", None)
		if not residence:
			return None
		return request.user.memberships.filter(
			residence=residence,
			is_active=True,
		).first()

	def list(self, request):
		"""Listar conversaciones del usuario."""
		my = self._get_membership(request)
		if not my:
			return Response([])

		qs = (
			PrivateConversation.objects.filter(Q(member_one=my) | Q(member_two=my))
			.select_related("member_one__user", "member_two__user")
			.prefetch_related("messages")
			.order_by("-updated_at")
		)
		serializer = PrivateConversationSerializer(
			qs, many=True, context={"my_membership": my}
		)
		return Response(serializer.data)

	def retrieve(self, request, pk=None):
		"""Detalle de una conversación — marca mensajes como leídos."""
		my = self._get_membership(request)
		if not my:
			raise NotFound(CONVERSATION_NOT_FOUND_MESSAGE)

		conv = (
			PrivateConversation.objects.filter(
				Q(member_one=my) | Q(member_two=my), id=pk
			)
			.select_related("member_one__user", "member_two__user")
			.first()
		)
		if not conv:
			raise NotFound(CONVERSATION_NOT_FOUND_MESSAGE)

		# Marcar como leídos los mensajes del otro
		conv.messages.filter(is_read=False).exclude(sender=my).update(is_read=True)

		serializer = PrivateConversationSerializer(
			conv, context={"my_membership": my}
		)
		return Response(serializer.data)

	@action(detail=False, methods=["post"], url_path="start")
	def start(self, request):
		"""Crear o recuperar una conversación con otro residente."""
		my = self._get_membership(request)
		if not my:
			raise ValidationError({"detail": NO_MEMBERSHIP_MESSAGE})

		serializer = StartConversationSerializer(
			data=request.data,
			context={"request": request, "my_membership": my},
		)
		serializer.is_valid(raise_exception=True)
		target = serializer.context["target_membership"]

		residence = getattr(request, "residence", None)
		conv, _created = PrivateConversation.get_or_create_conversation(
			residence=residence,
			member_a=my,
			member_b=target,
		)

		out = PrivateConversationSerializer(conv, context={"my_membership": my})
		return Response(out.data, status=status.HTTP_200_OK)

	@action(detail=True, methods=["get", "post"], url_path="messages")
	def messages(self, request, pk=None):
		"""GET: listar mensajes. POST: enviar mensaje."""
		my = self._get_membership(request)
		if not my:
			raise NotFound(CONVERSATION_NOT_FOUND_MESSAGE)

		conv = PrivateConversation.objects.filter(
			Q(member_one=my) | Q(member_two=my), id=pk
		).first()
		if not conv:
			raise NotFound(CONVERSATION_NOT_FOUND_MESSAGE)

		if request.method == "GET":
			# Marcar como leídos
			conv.messages.filter(is_read=False).exclude(sender=my).update(is_read=True)
			msgs = conv.messages.select_related("sender__user").order_by("created_at")
			return Response(PrivateMessageSerializer(msgs, many=True).data)

		# POST — enviar mensaje
		ser = SendMessageSerializer(data=request.data)
		ser.is_valid(raise_exception=True)

		msg = PrivateMessage.objects.create(
			conversation=conv,
			sender=my,
			content=ser.validated_data["content"],
		)
		# Actualizar timestamp de la conversación
		conv.save(update_fields=["updated_at"])

		return Response(
			PrivateMessageSerializer(msg).data,
			status=status.HTTP_201_CREATED,
		)


class ResidentListForChatView(ListAPIView):
	"""Lista de residentes activos para iniciar una conversación."""

	permission_classes = [IsAuthenticatedResident]
	serializer_class = ChatResidentSerializer

	def get_queryset(self):
		residence = getattr(self.request, "residence", None)
		if not residence:
			return Membership.objects.none()

		return (
			Membership.objects.filter(
				residence=residence,
				is_active=True,
				role__name__iexact="Student",
			)
			.exclude(user=self.request.user)
			.select_related("user")
			.order_by("user__first_name", "user__last_name")
		)
