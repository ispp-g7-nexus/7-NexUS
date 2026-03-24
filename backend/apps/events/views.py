import json
from datetime import datetime
from django.http import JsonResponse
from django.views import View
from django.utils.decorators import method_decorator
from .models import Event, EventParticipation
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.db.utils import IntegrityError
from django.contrib.auth import get_user_model
from django.views.decorators.csrf import csrf_exempt
from django.test import RequestFactory
from apps.common.utils.jwt_auth import resolve_user_from_request
from django.utils.dateparse import parse_datetime
from django.utils import timezone
from apps.spaces.models import CommonSpace, SpaceReservation
from apps.spaces.views import SpaceReservationCreateView


def _normalize_event_type(raw_event_type) -> str | None:
    event_type = str(raw_event_type or "").strip().lower() or Event.Type.EXTERNAL
    if event_type not in (Event.Type.INTERNAL, Event.Type.EXTERNAL):
        return None
    return event_type


def _parse_and_validate_times(start_time_str: str, end_time_str: str, *, validate_future: bool):
    if not start_time_str or not end_time_str:
        return None, None, JsonResponse(
            {"detail": "Se requiere fecha de inicio y fin."},
            status=400,
        )

    start_time = parse_datetime(start_time_str)
    end_time = parse_datetime(end_time_str)

    if not start_time or not end_time:
        return None, None, JsonResponse(
            {"detail": "Formato de fecha/hora inválido."},
            status=400,
        )

    if timezone.is_naive(start_time):
        start_time = timezone.make_aware(start_time, timezone.get_current_timezone())
    if timezone.is_naive(end_time):
        end_time = timezone.make_aware(end_time, timezone.get_current_timezone())

    if validate_future and start_time < timezone.now():
        return None, None, JsonResponse(
            {"detail": "La fecha de inicio no puede ser en el pasado."},
            status=400,
        )

    if end_time <= start_time:
        return None, None, JsonResponse(
            {"detail": "La fecha de fin debe ser posterior a la de inicio."},
            status=400,
        )

    return start_time, end_time, None


def _serialize_event(event: Event, current_user):
    is_joined = event.participations.filter(user=current_user).exists()
    can_edit = event.host == current_user or getattr(current_user, "is_staff", False)
    return {
        "id": event.id,
        "title": event.title,
        "description": event.description,
        "created_at": event.created_at.isoformat(),
        "start_time": event.start_time.isoformat(),
        "end_time": event.end_time.isoformat(),
        "event_type": event.event_type,
        "location": event.location,
        "space": (
            {
                "id": event.space_id,
                "name": event.space.name,
            }
            if event.space_id
            else None
        ),
        "reservation_id": event.reservation_id,
        "image_url": event.image_url,
        "tags": event.tags,
        "max_participants": event.max_participants,
        "participants_count": event.participants_count,
        "can_join": event.can_join(),
        "can_edit": can_edit,
        "is_joined": is_joined,
        "host": {
            "id": event.host.id,
            "first_name": event.host.first_name,
            "last_name": event.host.last_name,
        },
    }


def _create_reservation_through_spaces_module(
    *,
    request,
    residence,
    space_id: int,
    start_time: datetime,
    end_time: datetime,
):
    payload = {
        "start_time": start_time.isoformat(),
        "end_time": end_time.isoformat(),
        "notes": "Reserva generada automáticamente por evento interno.",
    }

    reservation_request = RequestFactory().post(
        f"/api/spaces/{space_id}/reservations/",
        data=json.dumps(payload),
        content_type="application/json",
    )
    reservation_request.user = request.user
    reservation_request.residence = residence

    response = SpaceReservationCreateView().post(reservation_request, space_id=space_id)
    if response.status_code != 201:
        try:
            data = json.loads(response.content.decode("utf-8"))
            detail = data.get("detail") or "No se pudo crear la reserva del evento interno."
        except Exception:
            detail = "No se pudo crear la reserva del evento interno."
        return None, JsonResponse({"detail": detail}, status=response.status_code)

    data = json.loads(response.content.decode("utf-8"))
    reservation_id = data.get("id")
    reservation = SpaceReservation.objects.select_related("space").filter(
        id=reservation_id,
        residence=residence,
    ).first()

    if not reservation:
        return None, JsonResponse(
            {"detail": "No se pudo recuperar la reserva creada para el evento."},
            status=400,
        )
    return reservation, None


def _space_has_active_overlap(*, residence, space_id: int, start_time: datetime, end_time: datetime, exclude_reservation_id: int | None = None) -> bool:
    overlaps = SpaceReservation.objects.filter(
        residence=residence,
        space_id=space_id,
        status=SpaceReservation.Status.ACTIVE,
        start_time__lt=end_time,
        end_time__gt=start_time,
    )
    if exclude_reservation_id:
        overlaps = overlaps.exclude(id=exclude_reservation_id)
    return overlaps.exists()


def _parse_max_participants(raw_value):
    if raw_value in (None, ""):
        return None, None

    try:
        parsed = int(raw_value)
    except (TypeError, ValueError):
        return None, JsonResponse(
            {"detail": "El límite de participantes debe ser un número entero positivo."},
            status=400,
        )

    if parsed <= 0:
        return None, JsonResponse(
            {"detail": "El límite de participantes debe ser mayor que cero."},
            status=400,
        )

    return parsed, None


def _normalize_internal_event_limit(raw_value, space_capacity: int):
    parsed_limit, parse_error = _parse_max_participants(raw_value)
    if parse_error:
        return None, parse_error

    if parsed_limit is None:
        return space_capacity, None

    if parsed_limit > space_capacity:
        return None, JsonResponse(
            {
                "detail": (
                    "El límite de asistentes no puede superar el aforo del espacio "
                    f"({space_capacity})."
                )
            },
            status=400,
        )

    return parsed_limit, None


def _has_participation_overlap(user, start_time: datetime, end_time: datetime, *, exclude_event=None) -> bool:
    qs = EventParticipation.objects.filter(
        user=user,
        event__start_time__lt=end_time,
        event__end_time__gt=start_time
    )
    if exclude_event is not None:
        qs = qs.exclude(event=exclude_event)
    return qs.exists()


def _validate_location_constraints(event_type: str, location: str, space_id):
    if event_type == Event.Type.INTERNAL:
        if not space_id:
            return JsonResponse(
                {"detail": "Debes seleccionar un espacio común para eventos internos."},
                status=400,
            )
        if location:
            return JsonResponse(
                {"detail": "Los eventos internos no deben incluir ubicación externa."},
                status=400,
            )
        return None

    if not location:
        return JsonResponse(
            {"detail": "Debes indicar una ubicación para eventos externos."},
            status=400,
        )
    if space_id:
        return JsonResponse(
            {"detail": "Los eventos externos no pueden asociar un espacio común."},
            status=400,
        )
    return None


def _resolve_event_creation_resources(
    *,
    request,
    body,
    event_type: str,
    start_time: datetime,
    end_time: datetime,
):
    if event_type == Event.Type.INTERNAL:
        space = get_object_or_404(
            CommonSpace,
            id=int(body.get("space_id")),
            residence=request.residence,
            is_active=True,
        )
        normalized_max_participants, limit_error = _normalize_internal_event_limit(
            body.get("max_participants"),
            space.capacity,
        )
        if limit_error:
            return None, None, None, limit_error

        if _space_has_active_overlap(
            residence=request.residence,
            space_id=space.id,
            start_time=start_time,
            end_time=end_time,
        ):
            return None, None, None, JsonResponse(
                {"detail": "El espacio común ya está reservado en esa franja horaria."},
                status=400,
            )

        reservation, reservation_error = _create_reservation_through_spaces_module(
            request=request,
            residence=request.residence,
            space_id=space.id,
            start_time=start_time,
            end_time=end_time,
        )
        if reservation_error:
            transaction.set_rollback(True)
            return None, None, None, reservation_error
        return reservation.space, reservation, normalized_max_participants, None

    normalized_max_participants, limit_error = _parse_max_participants(
        body.get("max_participants")
    )
    if limit_error:
        return None, None, None, limit_error
    return None, None, normalized_max_participants, None


def _resolve_internal_update_state(
    *,
    request,
    event: Event,
    body,
    start_time: datetime,
    end_time: datetime,
    location: str,
    requested_space_id,
):
    target_space_id = requested_space_id if requested_space_id is not None else event.space_id
    if not target_space_id:
        return None, JsonResponse(
            {"detail": "Debes seleccionar un espacio común para eventos internos."},
            status=400,
        )
    if location:
        return None, JsonResponse(
            {"detail": "Los eventos internos no deben incluir ubicación externa."},
            status=400,
        )

    target_space = get_object_or_404(
        CommonSpace,
        id=int(target_space_id),
        residence=request.residence,
        is_active=True,
    )
    normalized_max_participants, limit_error = _normalize_internal_event_limit(
        body.get("max_participants", event.max_participants),
        target_space.capacity,
    )
    if limit_error:
        return None, limit_error

    needs_new_reservation = (
        event.event_type != Event.Type.INTERNAL
        or not event.reservation_id
        or int(target_space_id) != (event.space_id or 0)
        or start_time != event.start_time
        or end_time != event.end_time
    )

    if needs_new_reservation and event.reservation_id:
        event.reservation.status = SpaceReservation.Status.CANCELLED
        event.reservation.save(update_fields=["status", "updated_at"])

    new_reservation = event.reservation
    new_space = event.space
    if needs_new_reservation:
        if _space_has_active_overlap(
            residence=request.residence,
            space_id=target_space.id,
            start_time=start_time,
            end_time=end_time,
            exclude_reservation_id=event.reservation_id,
        ):
            transaction.set_rollback(True)
            return None, JsonResponse(
                {"detail": "El espacio común ya está reservado en esa franja horaria."},
                status=400,
            )

        new_reservation, reservation_error = _create_reservation_through_spaces_module(
            request=request,
            residence=request.residence,
            space_id=target_space.id,
            start_time=start_time,
            end_time=end_time,
        )
        if reservation_error:
            transaction.set_rollback(True)
            return None, reservation_error
        new_space = new_reservation.space
    elif not event.reservation_id:
        return None, JsonResponse(
            {"detail": "El evento interno debe tener una reserva asociada."},
            status=400,
        )

    return {
        "new_space": new_space,
        "new_reservation": new_reservation,
        "new_location": "",
        "normalized_max_participants": normalized_max_participants,
    }, None


def _resolve_external_update_state(
    *,
    body,
    event: Event,
    location: str,
    requested_space_id,
):
    if not location:
        return None, JsonResponse(
            {"detail": "Debes indicar una ubicación para eventos externos."},
            status=400,
        )
    if requested_space_id:
        return None, JsonResponse(
            {"detail": "Los eventos externos no pueden asociar un espacio común."},
            status=400,
        )

    normalized_max_participants, limit_error = _parse_max_participants(
        body.get("max_participants", event.max_participants)
    )
    if limit_error:
        return None, limit_error

    return {
        "new_space": None,
        "new_reservation": None,
        "new_location": location,
        "normalized_max_participants": normalized_max_participants,
    }, None


def _validate_participants_limit_for_update(
    *,
    max_participants_provided: bool,
    normalized_max_participants,
    current_participants_count: int,
):
    if (
        max_participants_provided
        and normalized_max_participants is not None
        and normalized_max_participants < current_participants_count
    ):
        return JsonResponse(
            {
                "detail": (
                    "El límite de participantes no puede ser inferior al número "
                    f"actual de asistentes ({current_participants_count})."
                )
            },
            status=400,
        )
    return None


def _apply_event_updates(event: Event, body, *, start_time: datetime, end_time: datetime, event_type: str, update_state: dict):
    event.title = body.get("title", event.title)
    event.description = body.get("description", event.description)
    event.start_time = start_time
    event.end_time = end_time
    event.event_type = event_type
    event.location = update_state["new_location"]
    event.space = update_state["new_space"]
    event.reservation = update_state["new_reservation"]
    event.image_url = body.get("image_url", event.image_url)
    event.tags = body.get("tags", event.tags)
    event.max_participants = update_state["normalized_max_participants"]
    event.save()

@method_decorator(csrf_exempt, name='dispatch')
class AuthenticatedView(View):
    def dispatch(self, request, *args, **kwargs):
        if not request.user.is_authenticated:
            user_data = resolve_user_from_request(request)
            if user_data:
                user_model = get_user_model()
                try:
                    request.user = user_model.objects.get(id=user_data['id'])
                except user_model.DoesNotExist:
                    return JsonResponse({"detail": "User not found."}, status=401)
            else:
                return JsonResponse({"detail": "Authentication credentials were not provided."}, status=401)
        return super().dispatch(request, *args, **kwargs)

class EventListView(AuthenticatedView):
    def get(self, request):
        if not hasattr(request, 'residence') or not request.residence:
            return JsonResponse({"detail": "No residence context."}, status=400)
            
        events = Event.objects.filter(residence=request.residence).select_related('host', 'space')
        data = [_serialize_event(event, request.user) for event in events]
        return JsonResponse(data, safe=False)

    def post(self, request):
        if not hasattr(request, 'residence') or not request.residence:
            return JsonResponse({"detail": "No residence context."}, status=400)

        try:
            body = json.loads(request.body)
        except Exception as e:
            return JsonResponse({"detail": str(e)}, status=400)

        event_type = _normalize_event_type(body.get('event_type'))
        if not event_type:
            return JsonResponse({"detail": "Tipo de evento inválido."}, status=400)

        start_time, end_time, time_error = _parse_and_validate_times(
            body.get('start_time'),
            body.get('end_time'),
            validate_future=True,
        )
        if time_error:
            return time_error

        if _has_participation_overlap(request.user, start_time, end_time):
            return JsonResponse({"detail": "Ya asistes a otro evento en ese horario."}, status=400)

        location = str(body.get('location') or '').strip()
        location_error = _validate_location_constraints(
            event_type=event_type,
            location=location,
            space_id=body.get("space_id"),
        )
        if location_error:
            return location_error

        with transaction.atomic():
            space, reservation, normalized_max_participants, resources_error = (
                _resolve_event_creation_resources(
                    request=request,
                    body=body,
                    event_type=event_type,
                    start_time=start_time,
                    end_time=end_time,
                )
            )
            if resources_error:
                return resources_error

            event = Event.objects.create(
                title=body.get('title'),
                description=body.get('description'),
                start_time=start_time,
                end_time=end_time,
                event_type=event_type,
                location=location if event_type == Event.Type.EXTERNAL else '',
                space=space,
                reservation=reservation,
                image_url=body.get('image_url'),
                tags=body.get('tags'),
                max_participants=normalized_max_participants,
                residence=request.residence,
                host=request.user
            )
            EventParticipation.objects.create(event=event, user=request.user)
        return JsonResponse({'id': event.id, 'detail': 'Event created successfully'}, status=201)

class EventDetailView(AuthenticatedView):
    def get(self, request, event_id):
        event = get_object_or_404(
            Event.objects.select_related('host', 'space'),
            id=event_id,
            residence=request.residence,
        )
        return JsonResponse(_serialize_event(event, request.user))
        
    def put(self, request, event_id):
        event = get_object_or_404(Event, id=event_id, residence=request.residence)
        can_edit = event.host == request.user or getattr(request.user, 'is_staff', False)
        if not can_edit:
            return JsonResponse({"detail": "Unauthorized"}, status=403)

        try:
            body = json.loads(request.body)
        except Exception as e:
            return JsonResponse({"detail": str(e)}, status=400)

        event_type = _normalize_event_type(body.get('event_type', event.event_type))
        if not event_type:
            return JsonResponse({"detail": "Tipo de evento inválido."}, status=400)

        start_time, end_time, time_error = _parse_and_validate_times(
            body.get('start_time'),
            body.get('end_time'),
            validate_future=False,
        )
        if time_error:
            return time_error

        if (
            (start_time != event.start_time or end_time != event.end_time)
            and _has_participation_overlap(
                request.user,
                start_time,
                end_time,
                exclude_event=event,
            )
        ):
            return JsonResponse({"detail": "Ya asistes a otro evento en ese horario."}, status=400)

        location = str(body.get('location', event.location) or '').strip()
        requested_space_id = body.get('space_id')
        max_participants_provided = 'max_participants' in body

        with transaction.atomic():
            previous_reservation = event.reservation
            if event_type == Event.Type.INTERNAL:
                update_state, update_error = _resolve_internal_update_state(
                    request=request,
                    event=event,
                    body=body,
                    start_time=start_time,
                    end_time=end_time,
                    location=location,
                    requested_space_id=requested_space_id,
                )
            else:
                update_state, update_error = _resolve_external_update_state(
                    body=body,
                    event=event,
                    location=location,
                    requested_space_id=requested_space_id,
                )
            if update_error:
                return update_error

            limit_error = _validate_participants_limit_for_update(
                max_participants_provided=max_participants_provided,
                normalized_max_participants=update_state["normalized_max_participants"],
                current_participants_count=event.participants_count,
            )
            if limit_error:
                return limit_error

            _apply_event_updates(
                event,
                body,
                start_time=start_time,
                end_time=end_time,
                event_type=event_type,
                update_state=update_state,
            )

            if previous_reservation and previous_reservation.id != event.reservation_id:
                previous_reservation.delete()

        return JsonResponse({'id': event.id, 'detail': 'Event updated successfully'}, status=200)

    def delete(self, request, event_id):
        event = get_object_or_404(Event, id=event_id, residence=request.residence)
        # Check permissions
        can_edit = event.host == request.user or getattr(request.user, 'is_staff', False)
        if not can_edit:
            return JsonResponse({"detail": "Unauthorized"}, status=403)

        reservation = event.reservation
        with transaction.atomic():
            event.delete()
            if reservation:
                reservation.delete()

        return JsonResponse({"detail": "Event deleted"}, status=200)

class EventJoinView(AuthenticatedView):
    def post(self, request, event_id):
        if getattr(request.user, 'is_staff', False):
            return JsonResponse({"detail": "Los administradores no pueden inscribirse en eventos."}, status=403)
            
        event = get_object_or_404(Event, id=event_id, residence=request.residence)
        
        if not event.can_join():
            return JsonResponse({"detail": "El evento ha alcanzado el límite de participantes."}, status=400)

        # Validar superposición
        overlapping_participating = EventParticipation.objects.exclude(event=event).filter(
            user=request.user,
            event__start_time__lt=event.end_time,
            event__end_time__gt=event.start_time
        ).exists()

        if overlapping_participating:
            return JsonResponse({"detail": "Este evento coincide en horario con otro al que ya asistes."}, status=400)

        try:
            EventParticipation.objects.create(event=event, user=request.user)
            return JsonResponse({"detail": "Te has inscrito correctamente en el evento."}, status=201)
        except IntegrityError:
            return JsonResponse({"detail": "Ya estás inscrito en este evento."}, status=400)

class EventLeaveView(AuthenticatedView):
    def post(self, request, event_id):
        event = get_object_or_404(Event, id=event_id, residence=request.residence)
        deleted, _ = EventParticipation.objects.filter(event=event, user=request.user).delete()
        
        if deleted:
            return JsonResponse({"detail": "Has abandonado el evento."}, status=200)
        return JsonResponse({"detail": "No estás inscrito en este evento."}, status=400)

class EventParticipantsView(AuthenticatedView):
    def get(self, request, event_id):
        event = get_object_or_404(Event, id=event_id, residence=request.residence)
        participations = event.participations.select_related('user').all()
        data = []
        for p in participations:
            data.append({
                'joined_at': p.joined_at.isoformat(),
                'user': {
                    'id': p.user.id,
                    'first_name': p.user.first_name,
                    'last_name': p.user.last_name,
                }
            })
        return JsonResponse(data, safe=False)
