from rest_framework import serializers
from .models import Incidence, IncidenceUpdate

class IncidenceUpdateSerializer(serializers.ModelSerializer):
    author_name = serializers.ReadOnlyField(source='author.get_full_name')

    class Meta:
        model = IncidenceUpdate
        fields = ['id', 'text', 'author_name', 'created_at']

class IncidenceSerializer(serializers.ModelSerializer):
    updates = IncidenceUpdateSerializer(many=True, read_only=True)
    is_mine = serializers.SerializerMethodField()
    
    assigned_staff_name = serializers.CharField(
        source='assigned_staff.user.get_full_name', 
        read_only=True,
        allow_null=True,
        default=None
    )
    assigned_staff_job = serializers.CharField(
        source='assigned_staff.job_title', 
        read_only=True,
        allow_null=True,
        default=None
    )
    assigned_external_name = serializers.CharField(
        required =False,
        allow_null=True,
        allow_blank=True
    )

    class Meta:
        model = Incidence
        fields = [
            'id', 'title', 'description', 'location_type', 'room_number', 
            'status', 'priority', 'updates', 'admin_notes', 'created_at', 'is_mine',
            'assigned_staff_name', 
            'assigned_staff_job',
            'assigned_external_name'
        ]
        read_only_fields = ['id', 'created_at', 'is_mine']

    def get_is_mine(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.student == request.user
        return False

class AdminIncidenceSerializer(serializers.ModelSerializer):
    updates = IncidenceUpdateSerializer(many=True, read_only=True)
    student_name = serializers.SerializerMethodField()
    assigned_staff_name = serializers.CharField(
        source='assigned_staff.user.get_full_name', 
        read_only=True,
        allow_null=True
    )
    assigned_staff_job = serializers.CharField(
        source='assigned_staff.job_title', 
        read_only=True,
        allow_null=True
    )

    assigned_external_name = serializers.CharField(
        max_length=100,
        required=False, 
        allow_null=True, 
        allow_blank=True
    )

    class Meta:
        model = Incidence
        fields = '__all__'
        read_only_fields = ['student']
    
    def get_student_name(self, obj):
        if obj.student:
            name = obj.student.get_full_name()
            return name.strip() if name and name.strip() else obj.student.username
        return "Residente no registrado"