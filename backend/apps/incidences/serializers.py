from rest_framework import serializers
from .models import Incidence, IncidenceUpdate

class IncidenceUpdateSerializer(serializers.ModelSerializer):
    author_name = serializers.ReadOnlyField(source='author.get_full_name')

    class Meta:
        model = IncidenceUpdate
        fields = ['id', 'text', 'author_name', 'created_at']


class IncidenceSerializer(serializers.ModelSerializer):
    updates = IncidenceUpdateSerializer(many=True, read_only=True)
    student_name = serializers.SerializerMethodField()
    is_mine = serializers.SerializerMethodField()
    assigned_staff_name = serializers.CharField(source='assigned_staff.user.get_full_name', read_only=True, default=None)
    assigned_staff_job = serializers.CharField(source='assigned_staff.job_title', read_only=True, default=None)

    class Meta:
        model = Incidence
        fields = [
            'id', 'title', 'description', 'location_type', 'room_number', 
            'status', 'priority', 'updates', 'admin_notes', 'img', 'created_at', 'is_mine', 'student_name', 'assigned_staff',
            'assigned_staff_name', 'assigned_staff_job', 'assigned_external_name'
        ]
        read_only_fields = ['id', 'created_at', 'is_mine']

    def get_is_mine(self, obj):
        request = self.context.get('request')
        return obj.student_id == request.user.id if request else False
    
    def get_student_name(self, obj):
        if obj.student:
            full_name = obj.student.get_full_name()
            if full_name:
                return full_name
            return obj.student.username
        return "Sistema"

    def validate(self, data):
        request = self.context.get('request')
        user = request.user
        
        if self.instance:
            user_roles = [r.lower() for r in user.memberships.filter(is_active=True).values_list('role__name', flat=True)]
            is_admin = "admin" in user_roles or "residence_admin" in user_roles or (getattr(user, 'is_staff', False) is True)
            is_owner = self.instance.student_id == user.id

            if not is_admin:
                if not is_owner:
                    for f in ['title', 'description', 'location_type', 'img', 'room_number']:
                        if f in data and data[f] != getattr(self.instance, f):
                            raise serializers.ValidationError({f: "Solo el creador puede modificar esto."})

                for f in ['status', 'assigned_staff', 'assigned_external_name']:
                    if f in data:
                        val_actual = self.instance.assigned_staff_id if f == 'assigned_staff' else getattr(self.instance, f)
                        if data[f] != val_actual:
                            raise serializers.ValidationError({f: "Solo un administrador puede modificar el estado o asignación."})

                if 'priority' in data and data['priority'] != self.instance.priority:
                    if not is_owner:
                        raise serializers.ValidationError({"priority": "No tienes permiso para cambiar la prioridad de otros."})
                    if self.instance.status != 'pending':
                        raise serializers.ValidationError({"priority": "No puedes cambiar la urgencia de una incidencia que ya está siendo procesada."})

        return data

class AdminIncidenceSerializer(IncidenceSerializer):
    student_name = serializers.SerializerMethodField()
    class Meta(IncidenceSerializer.Meta):
        fields = IncidenceSerializer.Meta.fields + ['student_name', 'student']
        read_only_fields = IncidenceSerializer.Meta.read_only_fields + ['student']
    def get_student_name(self, obj):
        return obj.student.get_full_name() or obj.student.username if obj.student else "Residente"