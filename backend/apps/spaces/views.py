import json
from datetime import datetime, time, timedelta
from typing import Any

from django.contrib.auth import get_user_model
from django.db import transaction
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.dateparse import parse_date, parse_datetime
from django.utils.decorators import method_decorator
from django.views import View
from django.views.decorators.csrf import csrf_exempt

from apps.common.utils.jwt_auth import resolve_user_from_request
from apps.membership.permissions import has_screen_permission
from apps.residences.models import Residence

from .analytics import (
    ReservationsAnalyticsValidationError,
    get_admin_reservations_analytics,
)
from .models import CommonSpace, SpaceReservation
from .permissions import is_reservations_admin

RESERVATION_REMINDER_WINDOW = timedelta(hours=1)


def _serialize_space(space: CommonSpace) -> dict:
    return {
        "id": space.id,
        "name": space.name,
        "description": space.description,
        "img": space.img,
        "capacity": space.capacity,
        "is_active": space.is_active,
        "open_time": space.open_time.strftime("%H:%M:%S"),
        "close_time": space.close_time.strftime("%H:%M:%S"),
        "reservation_interval_minutes": space.reservation_interval_minutes,
    }


def _serialize_reservation(reservation: SpaceReservation) -> dict:
    return {
        "id": reservation.id,
        "space": {
            "id": reservation.space_id,
            "name": reservation.space.name,
        },
        "user": {
            "id": reservation.user_id,
            "first_name": reservation.user.first_name,
            "last_name": reservation.user.last_name,
            "email": reservation.user.email,
        },
        "residence_id": reservation.residence_id,
        "start_time": reservation.start_time.isoformat(),
        "end_time": reservation.end_time.isoformat(),
        "status": reservation.status,
        "notes": reservation.notes,
        "created_at": reservation.created_at.isoformat(),
        "updated_at": reservation.updated_at.isoformat(),
    }


def _serialize_reservation_reminder(reservation: SpaceReservation) -> dict[str, Any]:
    start_time = timezone.localtime(reservation.start_time)
    return {
        "id": f"space-reservations-{reservation.id}",
        "title": f"Tu reserva en {reservation.space.name} empieza pronto",
        "message": f"Tu reserva comienza a las {start_time.strftime('%H:%M')}.",
        "created_at": reservation.start_time.isoformat(),
        "start_time": reservation.start_time.isoformat(),
        "end_time": reservation.end_time.isoformat(),
    }


def _build_reservation_reminders(
    reservations: list[SpaceReservation],
) -> list[dict[str, Any]]:
    return sorted(
        [_serialize_reservation_reminder(reservation) for reservation in reservations],
        key=lambda item: item["start_time"],
    )


def _parse_request_datetime(value: str) -> datetime | None:
    parsed = parse_datetime(value)
    if not parsed:
        return None

    if timezone.is_naive(parsed):
        parsed = timezone.make_aware(parsed, timezone.get_current_timezone())
    return parsed


def _validate_residence(request) -> Residence | None:
    residence = getattr(request, "residence", None)
    if not residence:
        return None
    return residence


def _compute_available_slots(
    *,
    target_date,
    space: CommonSpace,
    reservations: list[SpaceReservation],
) -> list[dict[str, Any]]:
    tz = timezone.get_current_timezone()
    window_start = timezone.make_aware(
        datetime.combine(target_date, space.open_time), tz
    )
    window_end = timezone.make_aware(
        datetime.combine(target_date, space.close_time), tz
    )

    interval = timedelta(minutes=space.reservation_interval_minutes)
    slots = []

    current = window_start
    now = timezone.now()

    while current + interval <= window_end:
        slot_end = current + interval
        is_past = current < now
        is_occupied = _is_capacity_reached(
            reservations=reservations,
            interval_start=current,
            interval_end=slot_end,
            capacity=space.capacity,
        )

        slots.append(
            {
                "start_time": current.isoformat(),
                "end_time": slot_end.isoformat(),
                "status": "past"
                if is_past
                else ("occupied" if is_occupied else "available"),
            }
        )

        current = slot_end

    return slots


def _build_occupancy_events(
    *,
    reservations: list[SpaceReservation],
    window_start: datetime,
    window_end: datetime,
) -> list[tuple[datetime, int]]:
    """Función introducida en sprint2 necesaria para calcular solapamientos múltiples."""
    events: list[tuple[datetime, int]] = []

    for reservation in reservations:
        interval_start = max(reservation.start_time, window_start)
        interval_end = min(reservation.end_time, window_end)

        if interval_end <= interval_start:
            continue

        events.append((interval_start, 1))
        events.append((interval_end, -1))

    events.sort(key=lambda item: (item[0], 0 if item[1] == -1 else 1))
    return events


def _is_capacity_reached(
    *,
    reservations: list[SpaceReservation],
    interval_start: datetime,
    interval_end: datetime,
    capacity: int,
) -> bool:
    effective_capacity = max(capacity, 1)
    occupancy = 0

    for _, delta in _build_occupancy_events(
        reservations=reservations,
        window_start=interval_start,
        window_end=interval_end,
    ):
        occupancy += delta
        if occupancy >= effective_capacity:
            return True

    return False


@method_decorator(csrf_exempt, name="dispatch")
class AuthenticatedView(View):
    def dispatch(self, request, *args, **kwargs):
        if not request.user.is_authenticated:
            user_data = resolve_user_from_request(request)
            if user_data:
                User = get_user_model()
                try:
                    request.user = User.objects.get(id=user_data["id"])
                except User.DoesNotExist:
                    return JsonResponse({"detail": "User not found."}, status=401)
            else:
                return JsonResponse(
                    {"detail": "Authentication credentials were not provided."},
                    status=401,
                )
        permission_error = self.check_permissions(request)
        if permission_error:
            return permission_error
        return super().dispatch(request, *args, **kwargs)

    def check_permissions(self, request):
        return None


class SpaceListView(AuthenticatedView):
    def get(self, request):
        residence = _validate_residence(request)
        if not residence:
            return JsonResponse({"detail": "No residence context."}, status=400)

        spaces = CommonSpace.objects.filter(residence=residence, is_active=True)
        data = [_serialize_space(space) for space in spaces]
        return JsonResponse(data, safe=False)


class SpaceAvailabilityView(AuthenticatedView):
    def get(self, request, space_id: int):
        residence = _validate_residence(request)
        if not residence:
            return JsonResponse({"detail": "No residence context."}, status=400)

        date_str = request.GET.get("date", "").strip()
        if not date_str:
            return JsonResponse(
                {"detail": "Debes enviar la fecha en formato YYYY-MM-DD."}, status=400
            )

        target_date = parse_date(date_str)
        if not target_date:
            return JsonResponse({"detail": "Formato de fecha inválido."}, status=400)

        space = get_object_or_404(
            CommonSpace, id=space_id, residence=residence, is_active=True
        )

        tz = timezone.get_current_timezone()
        day_start = timezone.make_aware(datetime.combine(target_date, time.min), tz)
        day_end = day_start + timedelta(days=1)

        reservations = list(
            SpaceReservation.objects.filter(
                residence=residence,
                space=space,
                status=SpaceReservation.Status.ACTIVE,
                start_time__lt=day_end,
                end_time__gt=day_start,
            )
            .select_related("user", "space")
            .order_by("start_time")
        )

        return JsonResponse(
            {
                "date": target_date.isoformat(),
                "space": _serialize_space(space),
                "reservations": [_serialize_reservation(item) for item in reservations],
                "available_slots": _compute_available_slots(
                    target_date=target_date,
                    space=space,
                    reservations=reservations,
                ),
            }
        )


class SpaceReservationCreateView(AuthenticatedView):
    def post(self, request, space_id: int):
        residence = _validate_residence(request)
        if not residence:
            return JsonResponse({"detail": "No residence context."}, status=400)

        try:
            payload = json.loads(request.body or "{}")
        except json.JSONDecodeError:
            return JsonResponse(
                {"detail": "El cuerpo de la petición no es JSON válido."}, status=400
            )

        start_time_str = str(payload.get("start_time", "")).strip()
        end_time_str = str(payload.get("end_time", "")).strip()
        notes = str(payload.get("notes", "")).strip()

        if not start_time_str or not end_time_str:
            return JsonResponse(
                {"detail": "Debes indicar hora de inicio y fin."}, status=400
            )

        start_time = _parse_request_datetime(start_time_str)
        end_time = _parse_request_datetime(end_time_str)

        if not start_time or not end_time:
            return JsonResponse(
                {"detail": "Formato de fecha/hora inválido."}, status=400
            )

        if start_time >= end_time:
            return JsonResponse(
                {"detail": "La hora de fin debe ser posterior a la de inicio."},
                status=400,
            )

        now = timezone.now()
        if start_time < now:
            return JsonResponse(
                {"detail": "No se pueden crear reservas en el pasado."}, status=400
            )

        if start_time.date() != end_time.date():
            return JsonResponse(
                {"detail": "La reserva debe empezar y terminar el mismo día."},
                status=400,
            )

        with transaction.atomic():
            space = get_object_or_404(
                CommonSpace.objects.select_for_update(),
                id=space_id,
                residence=residence,
                is_active=True,
            )

            get_user_model().objects.select_for_update().filter(
                id=request.user.id
            ).exists()

            tz = timezone.get_current_timezone()
            open_dt = timezone.make_aware(
                datetime.combine(start_time.date(), space.open_time), tz
            )
            close_dt = timezone.make_aware(
                datetime.combine(start_time.date(), space.close_time), tz
            )

            if start_time < open_dt or end_time > close_dt:
                return JsonResponse(
                    {
                        "detail": (
                            "La reserva debe estar dentro del horario del espacio "
                            f"({space.open_time.strftime('%H:%M')} - {space.close_time.strftime('%H:%M')})."
                        )
                    },
                    status=400,
                )

            overlaps_in_space = list(
                SpaceReservation.objects.select_for_update()
                .filter(
                    residence=residence,
                    space=space,
                    status=SpaceReservation.Status.ACTIVE,
                    start_time__lt=end_time,
                    end_time__gt=start_time,
                )
                .only("id", "start_time", "end_time")
            )
            if _is_capacity_reached(
                reservations=overlaps_in_space,
                interval_start=start_time,
                interval_end=end_time,
                capacity=space.capacity,
            ):
                return JsonResponse(
                    {
                        "detail": "Se ha alcanzado el aforo máximo del espacio en esa franja horaria."
                    },
                    status=400,
                )

            overlaps_for_user = (
                SpaceReservation.objects.select_for_update()
                .filter(
                    residence=residence,
                    user=request.user,
                    status=SpaceReservation.Status.ACTIVE,
                    start_time__lt=end_time,
                    end_time__gt=start_time,
                )
                .exists()
            )
            if overlaps_for_user:
                return JsonResponse(
                    {"detail": "Ya tienes otra reserva activa en esa franja horaria."},
                    status=400,
                )

            reservation = SpaceReservation.objects.create(
                space=space,
                user=request.user,
                residence=residence,
                start_time=start_time,
                end_time=end_time,
                notes=notes,
                status=SpaceReservation.Status.ACTIVE,
            )

        reservation = SpaceReservation.objects.select_related("space", "user").get(
            pk=reservation.pk
        )
        return JsonResponse(_serialize_reservation(reservation), status=201)


class MyReservationsView(AuthenticatedView):
    def get(self, request):
        residence = _validate_residence(request)
        if not residence:
            return JsonResponse({"detail": "No residence context."}, status=400)

        reservations = (
            SpaceReservation.objects.filter(
                residence=residence,
                user=request.user,
            )
            .select_related("space", "user")
            .order_by("-start_time")
        )

        data = [_serialize_reservation(item) for item in reservations]
        return JsonResponse(data, safe=False)


class MyReservationRemindersView(AuthenticatedView):
    def get(self, request):
        residence = _validate_residence(request)
        if not residence:
            return JsonResponse({"detail": "No residence context."}, status=400)

        now = timezone.now()
        reminder_deadline = now + RESERVATION_REMINDER_WINDOW

        reservations = (
            SpaceReservation.objects.filter(
                residence=residence,
                user=request.user,
                status=SpaceReservation.Status.ACTIVE,
                start_time__gt=now,
                start_time__lte=reminder_deadline,
            )
            .select_related("space", "user")
            .order_by("start_time")
        )

        return JsonResponse(
            _build_reservation_reminders(list(reservations)), safe=False
        )


class SpaceReservationCancelView(AuthenticatedView):
    def post(self, request, reservation_id: int):
        residence = _validate_residence(request)
        if not residence:
            return JsonResponse({"detail": "No residence context."}, status=400)

        reservation = get_object_or_404(
            SpaceReservation.objects.select_related("space", "user"),
            id=reservation_id,
            residence=residence,
        )

        can_cancel = reservation.user_id == request.user.id or is_reservations_admin(
            request.user, residence
        )
        if not can_cancel:
            return JsonResponse(
                {"detail": "No tienes permisos para cancelar esta reserva."}, status=403
            )

        if reservation.status == SpaceReservation.Status.CANCELLED:
            return JsonResponse({"detail": "La reserva ya está cancelada."}, status=400)

        reservation.status = SpaceReservation.Status.CANCELLED
        reservation.save(update_fields=["status", "updated_at"])
        return JsonResponse(
            {
                "detail": "Reserva cancelada correctamente.",
                "reservation": _serialize_reservation(reservation),
            }
        )


class AdminRequiredMixin:
    """Mixin que verifica que el usuario tiene permisos de administrador de espacios."""

    def check_permissions(self, request):
        residence = _validate_residence(request)
        if not residence or not is_reservations_admin(request.user, residence):
            return JsonResponse(
                {"detail": "No tienes permisos de administrador."}, status=403
            )
        return None


class AdminSpaceListCreateView(AdminRequiredMixin, AuthenticatedView):
    def get(self, request):
        """Lista TODOS los espacios (activos e inactivos) para el admin."""
        residence = _validate_residence(request)
        spaces = CommonSpace.objects.filter(residence=residence)
        return JsonResponse([_serialize_space(s) for s in spaces], safe=False)

    def post(self, request):
        """Crea un nuevo espacio."""
        residence = _validate_residence(request)
        try:
            payload = json.loads(request.body or "{}")
        except json.JSONDecodeError:
            return JsonResponse({"detail": "JSON inválido."}, status=400)

        name = str(payload.get("name", "")).strip()
        description = str(payload.get("description", "")).strip()
        img = payload.get("img", "")
        capacity = payload.get("capacity", 1)
        open_time = str(payload.get("open_time", "")).strip()
        close_time = str(payload.get("close_time", "")).strip()
        interval = payload.get("reservation_interval_minutes", 60)
        is_active = payload.get("is_active", True)

        if not name or not open_time or not close_time:
            return JsonResponse(
                {"detail": "name, open_time y close_time son obligatorios."}, status=400
            )

        try:
            capacity = int(capacity)
            if capacity < 1:
                raise ValueError
        except (ValueError, TypeError):
            return JsonResponse(
                {"detail": "capacity debe ser un entero positivo."}, status=400
            )

        from datetime import time as dt_time

        try:
            ot = dt_time.fromisoformat(open_time)
            ct = dt_time.fromisoformat(close_time)
        except ValueError:
            return JsonResponse(
                {"detail": "Formato de hora inválido. Usa HH:MM o HH:MM:SS."},
                status=400,
            )

        try:
            interval = int(interval)
            if interval < 1:
                raise ValueError
        except (ValueError, TypeError):
            return JsonResponse(
                {"detail": "El intervalo de reserva debe ser un entero positivo."},
                status=400,
            )

        if ct <= ot:
            return JsonResponse(
                {"detail": "close_time debe ser posterior a open_time."}, status=400
            )

        if CommonSpace.objects.filter(residence=residence, name=name).exists():
            return JsonResponse(
                {"detail": "Ya existe un espacio con ese nombre en esta residencia."},
                status=400,
            )

        space = CommonSpace.objects.create(
            residence=residence,
            name=name,
            description=description,
            img=img,
            capacity=capacity,
            open_time=ot,
            close_time=ct,
            is_active=is_active,
            reservation_interval_minutes=interval,
        )
        return JsonResponse(_serialize_space(space), status=201)


class AdminSpaceDetailView(AdminRequiredMixin, AuthenticatedView):
    def get(self, request, space_id: int):
        residence = _validate_residence(request)
        if not residence:
            return JsonResponse({"detail": "No residence context."}, status=400)

        space = get_object_or_404(CommonSpace, id=space_id, residence=residence)
        return JsonResponse(_serialize_space(space))

    def patch(self, request, space_id: int):
        """Edita parcialmente un espacio."""
        residence = _validate_residence(request)
        space = get_object_or_404(CommonSpace, id=space_id, residence=residence)

        try:
            payload = json.loads(request.body or "{}")
        except json.JSONDecodeError:
            return JsonResponse({"detail": "JSON inválido."}, status=400)

        from datetime import time as dt_time

        if "name" in payload:
            name = str(payload["name"]).strip()
            if not name:
                return JsonResponse(
                    {"detail": "El nombre no puede estar vacío."}, status=400
                )
            if (
                CommonSpace.objects.filter(residence=residence, name=name)
                .exclude(id=space_id)
                .exists()
            ):
                return JsonResponse(
                    {"detail": "Ya existe un espacio con ese nombre."}, status=400
                )
            space.name = name

        if "description" in payload:
            space.description = str(payload["description"]).strip()

        if "img" in payload:
            space.img = payload["img"]

        if "capacity" in payload:
            try:
                cap = int(payload["capacity"])
                if cap < 1:
                    raise ValueError
                space.capacity = cap
            except (ValueError, TypeError):
                return JsonResponse(
                    {"detail": "capacity debe ser un entero positivo."}, status=400
                )

        if "open_time" in payload:
            try:
                space.open_time = dt_time.fromisoformat(str(payload["open_time"]))
            except ValueError:
                return JsonResponse(
                    {"detail": "Formato de open_time inválido."}, status=400
                )

        if "close_time" in payload:
            try:
                space.close_time = dt_time.fromisoformat(str(payload["close_time"]))
            except ValueError:
                return JsonResponse(
                    {"detail": "Formato de close_time inválido."}, status=400
                )

        if "is_active" in payload:
            space.is_active = bool(payload["is_active"])

        if space.close_time <= space.open_time:
            return JsonResponse(
                {"detail": "close_time debe ser posterior a open_time."}, status=400
            )

        if "reservation_interval_minutes" in payload:
            try:
                interval = int(payload["reservation_interval_minutes"])
                if interval < 1:
                    raise ValueError
                space.reservation_interval_minutes = interval
            except (ValueError, TypeError):
                return JsonResponse(
                    {
                        "detail": "reservation_interval_minutes debe ser un entero positivo."
                    },
                    status=400,
                )

        space.save()
        return JsonResponse(_serialize_space(space))

    def delete(self, request, space_id: int):
        """Desactiva un espacio (soft delete) y cancela sus reservas activas."""
        residence = _validate_residence(request)
        space = get_object_or_404(CommonSpace, id=space_id, residence=residence)

        with transaction.atomic():
            SpaceReservation.objects.filter(
                space=space,
                status=SpaceReservation.Status.ACTIVE,
            ).update(status=SpaceReservation.Status.CANCELLED)
            space.is_active = False
            space.save(update_fields=["is_active", "updated_at"])

        return JsonResponse({"detail": "Espacio desactivado y reservas canceladas."})


class AdminSpaceReservationsView(AdminRequiredMixin, AuthenticatedView):
    def get(self, request, space_id: int):
        """Lista todas las reservas de un espacio (para el admin)."""
        residence = _validate_residence(request)
        space = get_object_or_404(CommonSpace, id=space_id, residence=residence)

        status_filter = request.GET.get("status", "").strip()
        qs = (
            SpaceReservation.objects.filter(
                residence=residence,
                space=space,
            )
            .select_related("user", "space")
            .order_by("-start_time")
        )

        if status_filter in (
            SpaceReservation.Status.ACTIVE,
            SpaceReservation.Status.CANCELLED,
        ):
            qs = qs.filter(status=status_filter)

        return JsonResponse([_serialize_reservation(r) for r in qs], safe=False)


class AdminSpaceNotificationsView(AdminRequiredMixin, AuthenticatedView):
    NOTIFICATION_LIMIT = 8

    def get(self, request):
        residence = _validate_residence(request)
        if not residence:
            return JsonResponse({"detail": "No residence context."}, status=400)

        now = timezone.now()
        reservations = (
            SpaceReservation.objects.filter(
                residence=residence,
                status=SpaceReservation.Status.ACTIVE,
                end_time__gt=now,
            )
            .exclude(user=request.user)
            .select_related("space", "user")
            .order_by("-created_at")[: self.NOTIFICATION_LIMIT]
        )

        data = [
            {
                "id": reservation.id,
                "title": f"Nueva reserva en {reservation.space.name}",
                "message": f"{reservation.user.first_name or reservation.user.email} ha realizado una reserva.",
                "created_at": reservation.created_at.isoformat(),
                "end_time": reservation.end_time.isoformat(),
            }
            for reservation in reservations
        ]

        return JsonResponse(data, safe=False)


class AnalyticsPermissionMixin:
    """Mixin que permite el acceso a analíticas si es admin del módulo O tiene permiso analytics."""

    def check_permissions(self, request):
        residence = _validate_residence(request)
        if not residence:
            return JsonResponse({"detail": "No residence context."}, status=400)

        # Lógica OR: administrador de reservas O permiso general de analytics
        is_mod_admin = is_reservations_admin(request.user, residence)
        has_analytics_perm = has_screen_permission(request.user, residence, "analytics")

        if not (is_mod_admin or has_analytics_perm):
            return JsonResponse(
                {
                    "detail": "No tienes permisos para consultar analíticas de este módulo."
                },
                status=403,
            )
        return None


class AdminReservationsAnalyticsView(AnalyticsPermissionMixin, AuthenticatedView):
    def get(self, request):
        residence = _validate_residence(request)
        if not residence:
            return JsonResponse({"detail": "No residence context."}, status=400)

        try:
            payload = get_admin_reservations_analytics(
                residence=residence,
                from_value=request.GET.get("from"),
                to_value=request.GET.get("to"),
                compare_value=request.GET.get("compare"),
                resource_type_value=request.GET.get("resource_type"),
                zone_id_value=request.GET.get("zone_id"),
            )
        except ReservationsAnalyticsValidationError as exc:
            return JsonResponse(exc.detail, status=400)

        return JsonResponse(payload)
