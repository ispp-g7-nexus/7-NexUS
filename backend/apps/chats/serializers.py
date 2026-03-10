from django.contrib.auth import get_user_model
from rest_framework import serializers

from apps.membership.models import Membership

from .models import ChatGroup, ChatGroupMember

User = get_user_model()


class ChatMemberSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    email = serializers.SerializerMethodField()

    class Meta:
        model = ChatGroupMember
        fields = [
            "id",
            "membership_id",
            "full_name",
            "email",
            "is_admin",
            "joined_at",
        ]

    def get_full_name(self, obj):
        user = obj.membership.user
        return user.get_full_name().strip() or user.get_username()

    def get_email(self, obj):
        return obj.membership.user.email


class ChatGroupSerializer(serializers.ModelSerializer):
    members = serializers.SerializerMethodField()
    members_list = ChatMemberSerializer(source="memberships", many=True, read_only=True)

    class Meta:
        model = ChatGroup
        fields = [
            "id",
            "name",
            "description",
            "label",
            "can_members_leave",
            "members",
            "members_list",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "members", "members_list", "created_at", "updated_at"]

    def get_members(self, obj):
        return obj.memberships.count()


class ChatGroupCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatGroup
        fields = ["name", "description", "label", "can_members_leave"]


class AddChatMemberSerializer(serializers.Serializer):
    email = serializers.EmailField()
    is_admin = serializers.BooleanField(default=False)

    def validate_email(self, value):
        request = self.context["request"]
        residence = getattr(request, "residence", None)
        user = User.objects.filter(email__iexact=value).first()
        if not user:
            raise serializers.ValidationError("No existe un usuario con ese email.")

        membership = Membership.objects.filter(
            user=user,
            residence=residence,
            is_active=True,
        ).first()
        if not membership:
            raise serializers.ValidationError(
                "Ese usuario no pertenece a la residencia actual."
            )

        self.context["target_membership"] = membership
        return value


class UpdateChatMemberSerializer(serializers.Serializer):
    is_admin = serializers.BooleanField()
