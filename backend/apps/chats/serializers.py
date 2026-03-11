from django.contrib.auth import get_user_model
from rest_framework import serializers

from apps.membership.models import Membership

from .models import ChatGroup, ChatGroupMember, ChatGroupLabel

User = get_user_model()


class ChatGroupLabelSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatGroupLabel
        fields = ["id", "name", "created_at"]
        read_only_fields = ["id", "created_at"]


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
    created_by_email = serializers.SerializerMethodField()

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
            "created_by_email",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "members", "members_list", "created_by_email", "created_at", "updated_at"]

    def get_members(self, obj):
        return obj.memberships.count()
        
    def get_created_by_email(self, obj):
        return obj.created_by.email if obj.created_by else None


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


# ── Serializers para mensajes de grupo ───────────────────────


class GroupMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField()
    sender_email = serializers.SerializerMethodField()
    sender_membership_id = serializers.IntegerField(source="sender_id", read_only=True)

    class Meta:
        from .models import GroupMessage

        model = GroupMessage
        fields = [
            "id",
            "sender_membership_id",
            "sender_name",
            "sender_email",
            "content",
            "created_at",
        ]

    def get_sender_name(self, obj):
        user = obj.sender.user
        return user.get_full_name().strip() or user.get_username()

    def get_sender_email(self, obj):
        return obj.sender.user.email


# ── Serializers para chats privados ──────────────────────────


class PrivateMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField()
    sender_membership_id = serializers.IntegerField(source="sender_id", read_only=True)

    class Meta:
        from .models import PrivateMessage

        model = PrivateMessage
        fields = [
            "id",
            "sender_membership_id",
            "sender_name",
            "content",
            "is_read",
            "created_at",
        ]

    def get_sender_name(self, obj):
        user = obj.sender.user
        return user.get_full_name().strip() or user.get_username()


class PrivateConversationSerializer(serializers.ModelSerializer):
    other_user = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()

    class Meta:
        from .models import PrivateConversation

        model = PrivateConversation
        fields = [
            "id",
            "other_user",
            "last_message",
            "unread_count",
            "created_at",
            "updated_at",
        ]

    def _get_my_membership(self):
        return self.context.get("my_membership")

    def _get_other_membership(self, obj):
        my = self._get_my_membership()
        if my and obj.member_one_id == my.id:
            return obj.member_two
        return obj.member_one

    def get_other_user(self, obj):
        other = self._get_other_membership(obj)
        user = other.user
        return {
            "membership_id": other.id,
            "full_name": user.get_full_name().strip() or user.get_username(),
            "email": user.email,
        }

    def get_last_message(self, obj):
        msg = obj.messages.order_by("-created_at").first()
        if not msg:
            return None
        return {
            "content": msg.content[:80],
            "created_at": msg.created_at.isoformat(),
            "is_mine": msg.sender_id == (self._get_my_membership().id if self._get_my_membership() else None),
        }

    def get_unread_count(self, obj):
        my = self._get_my_membership()
        if not my:
            return 0
        return obj.messages.filter(is_read=False).exclude(sender=my).count()


class SendMessageSerializer(serializers.Serializer):
    content = serializers.CharField(max_length=5000)

    def validate_content(self, value):
        if not value.strip():
            raise serializers.ValidationError("El mensaje no puede estar vacío.")
        return value.strip()


class StartConversationSerializer(serializers.Serializer):
    membership_id = serializers.IntegerField()

    def validate_membership_id(self, value):
        request = self.context["request"]
        residence = getattr(request, "residence", None)

        target = Membership.objects.filter(
            id=value,
            residence=residence,
            is_active=True,
            role__name__iexact="Student",
        ).first()
        if not target:
            raise serializers.ValidationError("No se encontró ese residente.")

        # No se puede chatear consigo mismo
        my_membership = self.context.get("my_membership")
        if my_membership and target.id == my_membership.id:
            raise serializers.ValidationError("No puedes chatear contigo mismo.")

        self.context["target_membership"] = target
        return value


class ChatResidentSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    email = serializers.SerializerMethodField()

    class Meta:
        model = Membership
        fields = ["id", "full_name", "email"]

    def get_full_name(self, obj):
        return obj.user.get_full_name().strip() or obj.user.get_username()

    def get_email(self, obj):
        return obj.user.email

