from rest_framework import serializers
from .models import Incidence, Issue, IssueUpdate

class IncidenceUpdateSerializer(serializers.ModelSerializer):
    author_name = serializers.ReadOnlyField(source='author.get_full_name')

    class Meta:
        model = Incidence
        fields = ['id', 'text', 'author_name', 'created_at']

class IncidenceSerializer(serializers.ModelSerializer):
    updates = IncidenceUpdateSerializer(many=True, read_only=True)
    
    class Meta:
        model = Incidence
        fields = ['id', 'title', 'description', 'location_type', 'specific_location', 'status', 'updates', 'created_at']
        read_only_fields = ['id', 'status', 'created_at']

class AdminIncidenceSerializer(serializers.ModelSerializer):
    updates = IncidenceUpdateSerializer(many=True, read_only=True)
    student_name = serializers.ReadOnlyField(source='student.get_full_name')

    class Meta:
        model = Incidence
        fields = '__all__'