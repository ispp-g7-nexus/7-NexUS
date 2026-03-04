from rest_framework import serializers

from .models import Membership, Role


class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = ["id", "name", "description", "is_system_default", "residence"]
        read_only_fields = ["is_system_default", "residence"]


class MembershipSerializer(serializers.ModelSerializer):
    role_name = serializers.CharField(source="role.name", read_only=True)

    class Meta:
        model = Membership
        fields = [
            "id",
            "user",
            "role",
            "role_name",
            "residence",
            "is_active",
            "created_at",
        ]
