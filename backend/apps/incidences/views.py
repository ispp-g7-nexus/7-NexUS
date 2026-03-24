from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Incidence, IncidenceUpdate
from .serializers import IncidenceSerializer, AdminIncidenceSerializer
from .permissions import IsAdminOrReadOnly
from apps.common.authentication import CookieJWTAuthentication
from django.db.models import Q

class IncidenceViewSet(viewsets.ModelViewSet):
    LOCATION_LABELS = dict(Incidence.LOCATION_CHOICES)
    NOTIFICATION_LIMIT = 8
    STATUS_LABELS = dict(Incidence.STATUS_CHOICES)

    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAuthenticated, IsAdminOrReadOnly]
    serializer_class = IncidenceSerializer

    def get_serializer_class(self):
        user = self.request.user
        
        user_role_names = [r.lower() for r in user.memberships.filter(is_active=True).values_list('role__name', flat=True)]

        if "admin" in user_role_names or "student" not in user_role_names:
            return AdminIncidenceSerializer
        
        return IncidenceSerializer
    
    def get_queryset(self):
        user = self.request.user
        queryset = Incidence.objects.filter(is_active=True).select_related('student', 'assigned_staff__user')

        if user.is_staff: return queryset
        
        roles = [r.lower() for r in user.memberships.filter(is_active=True).values_list('role__name', flat=True)]
        if "admin" in roles: return queryset
        
        return queryset.filter(
            Q(student=user) | ~Q(location_type='habitacion')
        ).distinct()
    

    def get_location_label(self, incidence):
        return self.LOCATION_LABELS.get(incidence.location_type, incidence.location_type)

    def get_status_label(self, status_value):
        return self.STATUS_LABELS.get(status_value, status_value)

    def build_incidence_created_notification(self, incidence):
        student = incidence.student
        actor_name = student.get_full_name() or student.username or 'Residente'
        return {
            'id': f'incidence-{incidence.id}',
            'kind': 'incidence_created',
            'incidence_id': incidence.id,
            'title': 'Nueva incidencia registrada',
            'message': f'{actor_name} ha creado la incidencia "{incidence.title}".',
            'actor_name': actor_name,
            'location_label': self.get_location_label(incidence),
            'status': incidence.status,
            'created_at': incidence.created_at.isoformat(),
        }

    def build_update_notification(self, update):
        actor_name = update.author_name or 'Staff'
        return {
            'id': f'update-{update.id}',
            'kind': 'admin_update',
            'incidence_id': update.incidence_id,
            'title': 'Cambio de estado',
            'message': update.text,
            'actor_name': actor_name,
            'location_label': self.get_location_label(update.incidence),
            'status': update.incidence.status,
            'created_at': update.created_at.isoformat(),
        }

    def get_staff_items(self, user):
        recent_incidences = (
            Incidence.objects
            .select_related('student')
            .filter(is_active=True)
            .exclude(student=user)
            .order_by('-created_at')[:self.NOTIFICATION_LIMIT]
        )

        return [
            (
                incidence.created_at,
                self.build_incidence_created_notification(incidence),
            )
            for incidence in recent_incidences
        ]

    def get_resident_items(self, user):
        recent_incidences = (
            Incidence.objects
            .select_related('student')
            .filter(is_active=True)
            .exclude(student=user)
            .exclude(location_type='habitacion')
            .order_by('-created_at')[:self.NOTIFICATION_LIMIT]
        )
        recent_updates = (
            IncidenceUpdate.objects
            .filter(incidence__student=user)
            .select_related('incidence')
            .filter(incidence__student=user)
            .order_by('-created_at')[:self.NOTIFICATION_LIMIT]
        )

        incidence_items = [
            (
                incidence.created_at,
                self.build_incidence_created_notification(incidence),
            )
            for incidence in recent_incidences
        ]
        update_items = [
            (
                update.created_at,
                self.build_update_notification(update),
            )
            for update in recent_updates
        ]

        return [*incidence_items, *update_items]

    @action(detail=False, methods=['get'], url_path='notifications')
    def notifications(self, request):
        user = request.user
        notification_items = (
            self.get_staff_items(user)
            if user.is_staff
            else self.get_resident_items(user)
        )

        ordered_notifications = [
            payload
            for _, payload in sorted(notification_items, key=lambda item: item[0], reverse=True)[:self.NOTIFICATION_LIMIT]
        ]

        return Response({
            'count': len(ordered_notifications),
            'results': ordered_notifications,
        })


    def perform_create(self, serializer):
        user = self.request.user
        residence = getattr(self.request, "residence", None)
        location_type = self.request.data.get('location_type')
        assigned_room = None

    # Logic for students: Auto-detect room
        if not user.is_staff and location_type == 'habitacion':
            membership = user.memberships.filter(
                residence=residence, 
                is_active=True,
                role__name__iexact="Student"
            ).first()
        
            if membership and membership.bedroom:
                assigned_room = membership.bedroom
            else:
                logger.warning(f"Student {user.id} tried to report a room issue but has no assigned room.")

        # Single save point to prevent double creation
        serializer.save(student=user, room_number=assigned_room)

    def perform_update(self, serializer):
        instance = self.get_object()
        old_status = instance.status
        
        updated_incidence = serializer.save()

        def get_current_assignee(obj):
            if obj.assigned_staff:
                return obj.assigned_staff.user.get_full_name() or obj.assigned_staff.user.username
            return obj.assigned_external_name or ""

        old_assignee = get_current_assignee(instance)
        new_assignee = get_current_assignee(updated_incidence)
        new_status = updated_incidence.status
        quick_comment = self.request.data.get('quick_comment')

        log_parts = []
        if old_status != new_status:
            log_parts.append(f"Estado cambiado a {self.get_status_label(new_status)}.")

        if old_assignee != new_assignee:
            if new_assignee: log_parts.append(f"Asignada a: {new_assignee}.")
            else: log_parts.append("Se ha retirado la asignación.")

        if quick_comment:
            log_parts.append(f"Nota: {quick_comment}")

        if log_parts:
            full_log_text = " ".join(log_parts)
            IncidenceUpdate.objects.create(
                incidence=updated_incidence,
                author_name=self.request.user.get_full_name() or self.request.user.username,
                text=full_log_text
            )

        
    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save()
        
        IncidenceUpdate.objects.create(
            incidence=instance,
            author_name=self.request.user.get_full_name() or self.request.user.username,
            text="Incidencia marcada como eliminada/cancelada."
        )
