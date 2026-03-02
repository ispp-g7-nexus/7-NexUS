import json
from datetime import datetime, time, timedelta

from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Q
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.dateparse import parse_date, parse_datetime
from django.utils.decorators import method_decorator
from django.views import View
from django.views.decorators.csrf import csrf_exempt

from apps.common.utils.jwt_auth import resolve_user_from_request
from apps.residences.models import Membership, Residence

from .models import CommonSpace, SpaceReservation


def _serialize_space(space: CommonSpace) -> dict:
    return {
        "id": space.id,
        "name": space.name,
        "description": space.description,
        "capacity": space.capacity,
        "is_active": space.is_active,
        "open_time": space.open_time.strftime("%H:%M:%S"),
        "close_time": space.close_time.strftime("%H:%M:%S"),
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


def _is_admin_for_residence(user, residence: Residence) -> bool:
    if getattr(user, "is_staff", False):
        return True

    return Membership.objects.filter(
        user=user,
        is_active=True,
    ).filter(
        Q(role=Membership.Role.RESIDENCE_ADMIN, residence=residence)
        | Q(role=Membership.Role.PORTFOLIO_ADMIN, residence__isnull=True)
    ).exists()


def _compute_available_slots(
    *,
    target_date,
    space: CommonSpace,
    reservations: list[SpaceReservation],
) -> list[dict[str, str]]:
    tz = timezone.get_current_timezone()
    window_start = timezone.make_aware(datetime.combine(target_date, space.open_time), tz)
    window_end = timezone.make_aware(datetime.combine(target_date, space.close_time), tz)

    slots: list[dict[str, str]] = []
    cursor = window_start

    for reservation in reservations:
        interval_start = max(reservation.start_time, window_start)
        interval_end = min(reservation.end_time, window_end)

        if interval_end <= interval_start:
            continue

        if interval_start > cursor:
            slots.append(
                {
                    "start_time": cursor.isoformat(),
                    "end_time": interval_start.isoformat(),
                }
            )
        if interval_end > cursor:
            cursor = interval_end

    if cursor < window_end:
        slots.append(
            {
                "start_time": cursor.isoformat(),
                "end_time": window_end.isoformat(),
            }
        )

    return slots


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
        return super().dispatch(request, *args, **kwargs)


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
            return JsonResponse({"detail": "Debes enviar la fecha en formato YYYY-MM-DD."}, status=400)

        target_date = parse_date(date_str)
        if not target_date:
            return JsonResponse({"detail": "Formato de fecha inválido."}, status=400)

        space = get_object_or_404(CommonSpace, id=space_id, residence=residence, is_active=True)

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
            return JsonResponse({"detail": "El cuerpo de la petición no es JSON válido."}, status=400)

        start_time_str = str(payload.get("start_time", "")).strip()
        end_time_str = str(payload.get("end_time", "")).strip()
        notes = str(payload.get("notes", "")).strip()

        if not start_time_str or not end_time_str:
            return JsonResponse({"detail": "Debes indicar hora de inicio y fin."}, status=400)

        start_time = _parse_request_datetime(start_time_str)
        end_time = _parse_request_datetime(end_time_str)

        if not start_time or not end_time:
            return JsonResponse({"detail": "Formato de fecha/hora inválido."}, status=400)

        if start_time >= end_time:
            return JsonResponse({"detail": "La hora de fin debe ser posterior a la de inicio."}, status=400)

        now = timezone.now()
        if start_time < now:
            return JsonResponse({"detail": "No se pueden crear reservas en el pasado."}, status=400)

        if start_time.date() != end_time.date():
            return JsonResponse({"detail": "La reserva debe empezar y terminar el mismo día."}, status=400)

        with transaction.atomic():
            space = get_object_or_404(
                CommonSpace.objects.select_for_update(),
                id=space_id,
                residence=residence,
                is_active=True,
            )

            # Serializa reservas concurrentes del mismo usuario para validar solapes entre espacios.
            get_user_model().objects.select_for_update().filter(id=request.user.id).exists()

            tz = timezone.get_current_timezone()
            open_dt = timezone.make_aware(datetime.combine(start_time.date(), space.open_time), tz)
            close_dt = timezone.make_aware(datetime.combine(start_time.date(), space.close_time), tz)

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

            overlaps_in_space = SpaceReservation.objects.select_for_update().filter(
                residence=residence,
                space=space,
                status=SpaceReservation.Status.ACTIVE,
                start_time__lt=end_time,
                end_time__gt=start_time,
            ).exists()
            if overlaps_in_space:
                return JsonResponse(
                    {"detail": "El espacio ya está reservado en esa franja horaria."},
                    status=400,
                )

            overlaps_for_user = SpaceReservation.objects.select_for_update().filter(
                residence=residence,
                user=request.user,
                status=SpaceReservation.Status.ACTIVE,
                start_time__lt=end_time,
                end_time__gt=start_time,
            ).exists()
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

        reservation = SpaceReservation.objects.select_related("space", "user").get(pk=reservation.pk)
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

        can_cancel = reservation.user_id == request.user.id or _is_admin_for_residence(request.user, residence)
        if not can_cancel:
            return JsonResponse({"detail": "No tienes permisos para cancelar esta reserva."}, status=403)

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
