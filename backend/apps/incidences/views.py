from datetime import date, timedelta

from django.db.models import Avg, Case, DurationField, ExpressionWrapper, F, IntegerField, Q, Value, When
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.authentication import CookieJWTAuthentication
from apps.membership.permissions import RequireScreenAccess

from .models import Incidence, IncidenceUpdate
from .permissions import IsAdminOrReadOnly
from .serializers import AdminIncidenceSerializer, IncidenceSerializer


class IncidenceViewSet(viewsets.ModelViewSet):
    LOCATION_LABELS = dict(Incidence.LOCATION_CHOICES)
    NOTIFICATION_LIMIT = 8
    STATUS_LABELS = dict(Incidence.STATUS_CHOICES)

    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAuthenticated, IsAdminOrReadOnly]
    serializer_class = IncidenceSerializer

    def get_serializer_class(self):
        user = self.request.user

        user_role_names = [
            r.lower()
            for r in user.memberships.filter(is_active=True).values_list(
                "role__name", flat=True
            )
        ]

        if "admin" in user_role_names or "student" not in user_role_names:
            return AdminIncidenceSerializer

        return IncidenceSerializer

    def get_queryset(self):
        user = self.request.user
        # Priorización automática: las incidencias urgentes (high) se listan
        # siempre antes que las de prioridad baja y, dentro de cada grupo,
        # de la más reciente a la más antigua.
        queryset = (
            Incidence.objects.filter(is_active=True)
            .select_related("student", "assigned_staff__user")
            .annotate(
                priority_rank=Case(
                    When(priority="high", then=Value(0)),
                    default=Value(1),
                    output_field=IntegerField(),
                )
            )
            .order_by("priority_rank", "-created_at")
        )

        if user.is_staff:
            return queryset

        roles = [
            r.lower()
            for r in user.memberships.filter(is_active=True).values_list(
                "role__name", flat=True
            )
        ]
        if "admin" in roles:
            return queryset

        return queryset.filter(
            Q(student=user) | ~Q(location_type="habitacion")
        ).distinct()

    def get_location_label(self, incidence):
        return self.LOCATION_LABELS.get(
            incidence.location_type, incidence.location_type
        )

    def get_status_label(self, status_value):
        return self.STATUS_LABELS.get(status_value, status_value)

    def build_incidence_created_notification(self, incidence):
        student = incidence.student
        actor_name = student.get_full_name() or student.username or "Residente"
        return {
            "id": f"incidence-{incidence.id}",
            "kind": "incidence_created",
            "incidence_id": incidence.id,
            "title": "Nueva incidencia registrada",
            "message": f'{actor_name} ha creado la incidencia "{incidence.title}".',
            "actor_name": actor_name,
            "location_label": self.get_location_label(incidence),
            "status": incidence.status,
            "created_at": incidence.created_at.isoformat(),
        }

    def build_update_notification(self, update):
        actor_name = update.author_name or "Staff"
        return {
            "id": f"update-{update.id}",
            "kind": "admin_update",
            "incidence_id": update.incidence_id,
            "title": "Cambio de estado",
            "message": update.text,
            "actor_name": actor_name,
            "location_label": self.get_location_label(update.incidence),
            "status": update.incidence.status,
            "created_at": update.created_at.isoformat(),
        }

    def get_staff_items(self, user):
        recent_incidences = (
            Incidence.objects.select_related("student")
            .filter(is_active=True)
            .exclude(student=user)
            .order_by("-created_at")[: self.NOTIFICATION_LIMIT]
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
            Incidence.objects.select_related("student")
            .filter(is_active=True)
            .exclude(student=user)
            .exclude(location_type="habitacion")
            .order_by("-created_at")[: self.NOTIFICATION_LIMIT]
        )
        recent_updates = (
            IncidenceUpdate.objects.filter(incidence__student=user)
            .select_related("incidence")
            .filter(incidence__student=user)
            .order_by("-created_at")[: self.NOTIFICATION_LIMIT]
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

    @action(detail=False, methods=["get"], url_path="notifications")
    def notifications(self, request):
        user = request.user
        notification_items = (
            self.get_staff_items(user)
            if user.is_staff
            else self.get_resident_items(user)
        )

        ordered_notifications = [
            payload
            for _, payload in sorted(
                notification_items, key=lambda item: item[0], reverse=True
            )[: self.NOTIFICATION_LIMIT]
        ]

        return Response(
            {
                "count": len(ordered_notifications),
                "results": ordered_notifications,
            }
        )

    def perform_create(self, serializer):
        user = self.request.user
        residence = getattr(self.request, "residence", None)
        location_type = self.request.data.get("location_type")
        assigned_room = None

        # Logic for students: Auto-detect room
        if not user.is_staff and location_type == "habitacion":
            membership = user.memberships.filter(
                residence=residence, is_active=True, role__name__iexact="Student"
            ).first()

            if membership and membership.bedroom:
                assigned_room = membership.bedroom
            else:
                raise ValidationError(
                    {
                        "location_type": "No tienes una habitación asignada para reportar incidencias en 'Mi Habitación'."
                    }
                )

        # Single save point to prevent double creation
        serializer.save(student=user, room_number=assigned_room)

    def perform_update(self, serializer):
        request = self.get_serializer_context()["request"]
        if serializer.validated_data.get("location_type") == "habitacion":
            membership = serializer.instance.student.memberships.filter(
                residence=getattr(request, "residence", None),
                is_active=True,
                role__name__iexact="Student",
            ).first()
            if membership and membership.bedroom:
                serializer.validated_data["room_number"] = membership.bedroom
            else:
                raise ValidationError(
                    {
                        "location_type": "No tienes una habitación asignada para reportar incidencias en 'Mi Habitación'."
                    }
                )
            if "assigned_staff" in serializer.validated_data:
                staff_member = serializer.validated_data.get("assigned_staff")
            if staff_member and not staff_member.is_active:
                raise ValidationError(
                    {
                        "assigned_staff": "No se puede asignar la incidencia a un miembro del staff que no esté activo."
                    }
                )
        instance = self.get_object()
        old_status = instance.status
        staff_actual = instance.assigned_staff
        desasignado_automatico = False
        if (
            staff_actual and staff_actual.status != "active"
        ):  # Ajusta a 'active' o is_active según tu modelo Staff
            # Forzamos que se guarde como None (desasignado)
            serializer.validated_data["assigned_staff"] = None
            desasignado_automatico = True
        else:
            # Si intentan asignar a alguien NUEVO que está inactivo, lanzamos error normal
            staff_nuevo = serializer.validated_data.get("assigned_staff")
            if staff_nuevo and staff_nuevo.status != "active":
                raise ValidationError(
                    {
                        "assigned_staff": "No se puede asignar la incidencia a un miembro del staff que no esté activo."
                    }
                )
        updated_incidence = serializer.save()

        def get_current_assignee(obj):
            if obj.assigned_staff:
                return (
                    obj.assigned_staff.user.get_full_name()
                    or obj.assigned_staff.user.username
                )
            return obj.assigned_external_name or ""

        old_assignee = get_current_assignee(instance)
        updated_incidence = serializer.save()
        new_assignee = get_current_assignee(updated_incidence)
        new_status = updated_incidence.status
        quick_comment = self.request.data.get("quick_comment")

        log_parts = []
        if old_status != new_status:
            log_parts.append(f"Estado cambiado a {self.get_status_label(new_status)}.")

        if desasignado_automatico:
            log_parts.append(
                f"El responsable anterior ({old_assignee}) ya no está disponible. Se ha retirado la asignación automáticamente."
            )
        elif old_assignee != new_assignee:
            if new_assignee:
                log_parts.append(f"Asignada a: {new_assignee}.")
            else:
                log_parts.append("Se ha retirado la asignación.")

        if quick_comment:
            log_parts.append(f"Nota: {quick_comment}")

        if log_parts:
            full_log_text = " ".join(log_parts)
            IncidenceUpdate.objects.create(
                incidence=updated_incidence,
                author_name=self.request.user.get_full_name()
                or self.request.user.username,
                text=full_log_text,
            )

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save()

        IncidenceUpdate.objects.create(
            incidence=instance,
            author_name=self.request.user.get_full_name() or self.request.user.username,
            text="Incidencia marcada como eliminada/cancelada.",
        )


class IncidenceAnalyticsView(APIView):
    """
    GET /api/incidences/analytics/?from=YYYY-MM-DD&to=YYYY-MM-DD

    Métricas:
    - Incidencias abiertas por día (acumuladas: suma si no se resuelven).
    - Tiempo medio de resolución en horas (aproximado con updated_at).
    - Incidencias resueltas por staff en el periodo.
    """

    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAdminOrReadOnly, RequireScreenAccess("analytics")]

    _OPEN_STATUSES = {"pending", "reviewing", "in_progress"}

    @staticmethod
    def _resolved_by_staff(resolved_qs):
        staff_counts: dict = {}
        for inc in resolved_qs:
            if inc.assigned_staff:
                name = (
                    inc.assigned_staff.user.get_full_name()
                    or inc.assigned_staff.user.username
                )
            elif inc.assigned_external_name:
                name = inc.assigned_external_name
            else:
                name = "Sin asignar"
            staff_counts[name] = staff_counts.get(name, 0) + 1
        return sorted(
            [{"staff_name": n, "resolved_count": c} for n, c in staff_counts.items()],
            key=lambda x: -x["resolved_count"],
        )

    def get(self, request):
        from_str = (request.query_params.get("from") or "").strip()
        to_str = (request.query_params.get("to") or "").strip()

        try:
            from_date = (
                date.fromisoformat(from_str)
                if from_str
                else date.today() - timedelta(days=29)
            )
            to_date = date.fromisoformat(to_str) if to_str else date.today()
        except ValueError:
            return Response(
                {"detail": "Formato de fecha inválido. Usa YYYY-MM-DD."}, status=400
            )

        if from_date > to_date:
            return Response(
                {"detail": "La fecha inicial debe ser anterior o igual a la final."},
                status=400,
            )

        base_qs = Incidence.objects.filter(is_active=True)

        # ── Summary ──────────────────────────────────────────────────────────
        total_created = base_qs.filter(
            created_at__date__gte=from_date, created_at__date__lte=to_date
        ).count()

        # Resolved in period: approximated by updated_at (last modification date)
        total_resolved = base_qs.filter(
            status="resolved",
            updated_at__date__gte=from_date,
            updated_at__date__lte=to_date,
        ).count()

        currently_open = base_qs.filter(status__in=self._OPEN_STATUSES).count()

        avg_result = (
            base_qs.filter(
                status="resolved",
                updated_at__date__gte=from_date,
                updated_at__date__lte=to_date,
            )
            .annotate(
                duration=ExpressionWrapper(
                    F("updated_at") - F("created_at"), output_field=DurationField()
                )
            )
            .aggregate(avg_duration=Avg("duration"))
        )
        avg_td = avg_result["avg_duration"]
        avg_resolution_hours = (
            round(avg_td.total_seconds() / 3600, 1) if avg_td else None
        )

        # ── Open by day ───────────────────────────────────────────────────────
        # Fetch all incidences created on or before to_date once (avoid N queries)
        all_inc = list(
            base_qs.filter(created_at__date__lte=to_date).values(
                "status", "created_at", "updated_at"
            )
        )

        days = [
            from_date + timedelta(days=i) for i in range((to_date - from_date).days + 1)
        ]
        open_by_day = []
        for day in days:
            count = sum(
                1
                for inc in all_inc
                if inc["created_at"].date() <= day
                and (
                    inc["status"] in self._OPEN_STATUSES
                    or inc["updated_at"].date() > day
                )
            )
            open_by_day.append({"date": day.isoformat(), "open_count": count})

        # ── Resolved by staff (in period) ─────────────────────────────────────
        resolved_in_period = base_qs.filter(
            status="resolved",
            updated_at__date__gte=from_date,
            updated_at__date__lte=to_date,
        ).select_related("assigned_staff__user")

        resolved_by_staff = self._resolved_by_staff(resolved_in_period)

        return Response(
            {
                "summary": {
                    "total_created_in_period": total_created,
                    "total_resolved_in_period": total_resolved,
                    "currently_open": currently_open,
                    "avg_resolution_hours": avg_resolution_hours,
                },
                "open_by_day": open_by_day,
                "resolved_by_staff": resolved_by_staff,
                "meta": {"from": from_date.isoformat(), "to": to_date.isoformat()},
            }
        )
