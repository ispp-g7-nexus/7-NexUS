from django.db.models import Prefetch
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.response import Response

from .models import ChatGroup, ChatGroupMember
from .permissions import IsResidenceAdmin
from .serializers import (
	AddChatMemberSerializer,
	ChatGroupCreateUpdateSerializer,
	ChatGroupSerializer,
	UpdateChatMemberSerializer,
)


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
		member, created = ChatGroupMember.objects.get_or_create(
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
