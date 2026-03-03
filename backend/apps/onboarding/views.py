from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from apps.membership.models import Membership

from .models import ResidentPreference
from .serializers import ResidentPreferenceSerializer, ResidentPreferenceWithMembershipSerializer


class ResidentPreferenceViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing resident preferences and onboarding.
    
    list: Get all preferences (admin only)
    retrieve: Get a specific preference
    create: Create a new preference for the current user
    update: Update a preference
    partial_update: Partially update a preference
    my_preferences: Get the current user's preferences
    """
    
    serializer_class = ResidentPreferenceWithMembershipSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Only return preferences for the current user or admin users"""
        user = self.request.user
        
        # Check if user is admin
        if user.memberships.exclude(role__name__iexact="Student").exists():
            return ResidentPreference.objects.all()
        
        # Otherwise only return their own preferences
        return ResidentPreference.objects.filter(membership__user=user)
    
    @action(detail=False, methods=["get", "post"], url_path="my-preferences")
    def my_preferences(self, request):
        """Get or create the current user's preferences"""
        user = request.user
        
        # Find the resident membership for this user
        resident_membership = get_object_or_404(
            Membership,
            user=user,
            role__name__iexact="Student",
            is_active=True
        )
        
        if request.method == "GET":
            # Try to get existing preferences
            preference, created = ResidentPreference.objects.get_or_create(
                membership=resident_membership
            )
            serializer = ResidentPreferenceSerializer(preference)
            return Response(serializer.data)
        
        elif request.method == "POST":
            # Create or update preferences
            preference, created = ResidentPreference.objects.get_or_create(
                membership=resident_membership
            )
            serializer = ResidentPreferenceSerializer(
                preference,
                data=request.data,
                partial=False
            )
            if serializer.is_valid():
                if request.data.get("sex"):
                    serializer.save(is_completed=True)
                else:
                    serializer.save()
                return Response(serializer.data, status=status.HTTP_200_OK)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=["get"], url_path="check-completion")
    def check_completion(self, request):
        """Check if current user has completed their preference form"""
        user = request.user
        try:
            resident_membership = Membership.objects.get(
                user=user,
                role__name__iexact="Student",
                is_active=True
            )
            preference = ResidentPreference.objects.get(membership=resident_membership)
            return Response({
                "is_completed": preference.is_completed
            })
        except (Membership.DoesNotExist, ResidentPreference.DoesNotExist):
            return Response({
                "is_completed": False
            })
