from rest_framework import serializers
from .models import ResidentPreference


class ResidentPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = ResidentPreference
        fields = [
            "id",
            "sex",
            "age",
            "schedule",
            "study_location",
            "social_level",
            "weekend_return",
            "outside_plans_importance",
            "desired_activity",
            "order_importance",
            "noise_tolerance",
            "smoking_vaping",
            "visitors_preference",
            "basic_items_preference",
            "temperature_preference",
            "is_completed",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class ResidentPreferenceWithMembershipSerializer(serializers.ModelSerializer):
    user_id = serializers.CharField(source="membership.user_id", read_only=True)
    residence_id = serializers.IntegerField(source="membership.residence_id", read_only=True)
    
    class Meta:
        model = ResidentPreference
        fields = [
            "id",
            "user_id",
            "residence_id",
            "sex",
            "age",
            "schedule",
            "study_location",
            "social_level",
            "weekend_return",
            "outside_plans_importance",
            "desired_activity",
            "order_importance",
            "noise_tolerance",
            "smoking_vaping",
            "visitors_preference",
            "basic_items_preference",
            "temperature_preference",
            "is_completed",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "user_id", "residence_id", "created_at", "updated_at"]
