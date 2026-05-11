import json
from datetime import datetime

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.core.validators import URLValidator
from django.db import transaction
from django.db.utils import IntegrityError
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.test import RequestFactory
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views import View
from django.views.decorators.csrf import csrf_exempt

from apps.chats.models import ChatGroup, ChatGroupMember
from apps.chats.realtime import publish_chat_event
from apps.chats.serializers import ChatGroupSerializer
from apps.common.utils.jwt_auth import resolve_user_from_request
from apps.membership.models import Membership
from apps.membership.permissions import has_screen_permission
from apps.spaces.models import CommonSpace, SpaceReservation
from apps.spaces.views import SpaceReservationCreateView

from .analytics import (
    EventsAnalyticsValidationError,
    get_admin_events_analytics,
)
from .models import Event, EventParticipation
from .permissions import is_events_admin

EVENT_TITLE_MAX_LENGTH = 20
EVENT_DESCRIPTION_MAX_LENGTH = 255
EVENT_LOCATION_MAX_LENGTH = 100
EVENT_IMAGE_URL_MAX_LENGTH = 300
EVENT_TAG_MAX_LENGTH = 10
EVENT_TAGS_MAX_LENGTH = 50
HTTP_URL_VALIDATOR = URLValidator(schemes=["http", "https"])


def _normalize_event_type(raw_event_type) -> str | None:
    event_type = str(raw_event_type or "").strip().lower() or Event.Type.EXTERNAL
    if event_type not in (Event.Type.INTERNAL, Event.Type.EXTERNAL):
        return None
    return event_type


def _parse_and_validate_times(start_time_str, end_time_str, validate_future=False):
    """
    Parse and validate event times.
    Returns (start_time, end_time, error_response) or (start_time, end_time, None) if valid.
    """
    try:
        start_time = datetime.fromisoformat(str(start_time_str).replace("Z", "+00:00"))
        end_time = datetime.fromisoformat(str(end_time_str).replace("Z", "+00:00"))
    except (ValueError, TypeError):
        return (
            None,
            None,
            JsonResponse({"detail": "Formato de fecha inválido."}, status=400),
        )

    if timezone.is_naive(start_time):
        start_time = timezone.make_aware(start_time, timezone.get_current_timezone())
    if timezone.is_naive(end_time):
        end_time = timezone.make_aware(end_time, timezone.get_current_timezone())

    if start_time >= end_time:
        return (
            None,
            None,
            JsonResponse(
                {"detail": "La hora de inicio debe ser anterior a la de fin."},
                status=400,
            ),
        )

    if validate_future and start_time <= timezone.now():
        return (
            None,
            None,
            JsonResponse({"detail": "El evento debe ser en el futuro."}, status=400),
        )

    return start_time, end_time, None


def _create_event_chat_group(
    event: Event, host_user
) -> tuple[ChatGroup | None, str | None]:
    """
    Create a chat group for an event and add the host as admin.
    Returns (chat_group, error_message)
    """
    try:
        chat_name = f"Evento: {event.title} ({event.start_time.strftime('%d/%m/%Y')})"
        # Keep chat names aligned with chat module limits.
        chat_name = chat_name[:45]

        chat_group = ChatGroup.objects.create(
            residence=event.residence,
            name=chat_name,
            description=f"Chat del evento {event.title}",
            label=ChatGroup.LabelChoices.GENERAL,
            created_by=host_user,
        )

        host_membership = Membership.objects.filter(
            user=host_user,
            residence=event.residence,
            is_active=True,
        ).first()

        if host_membership:
            ChatGroupMember.objects.create(
                group=chat_group,
                membership=host_membership,
                is_admin=True,
            )

        return chat_group, None
    except IntegrityError:
        return (
            None,
            "Este evento ya tiene un chat asociado o el nombre del chat está duplicado.",
        )
    except Exception:
        return None, "No se pudo crear el grupo de chat para este evento."


def _normalize_text_field(
    raw_value, *, field_name: str, max_length: int, required: bool
) -> tuple[str, str | None]:
    value = str(raw_value or "").strip()
    if required and not value:
        return "", f"El campo '{field_name}' es obligatorio."
    if len(value) > max_length:
        return "", f"El campo '{field_name}' no puede superar {max_length} caracteres."
    return value, None


def _normalize_optional_url_field(
    raw_value, *, field_name: str, max_length: int
) -> tuple[str, str | None]:
    value, error = _normalize_text_field(
        raw_value,
        field_name=field_name,
        max_length=max_length,
        required=False,
    )
    if error:
        return "", error

    if value:
        try:
            HTTP_URL_VALIDATOR(value)
        except ValidationError:
            return "", f"El campo '{field_name}' debe ser una URL válida."

    return value, None


def _normalize_event_tags(raw_tags, *, required: bool) -> tuple[str, str | None]:
    tags_value = str(raw_tags or "").strip()
    if not tags_value:
        if required:
            return "", "Debes indicar al menos una etiqueta válida para el evento."
        return "", None

    tags = [tag.strip() for tag in tags_value.split(",") if tag.strip()]
    if required and not tags:
        return "", "Debes indicar al menos una etiqueta válida para el evento."

    for tag in tags:
        if len(tag) > EVENT_TAG_MAX_LENGTH:
            return "", (
                "Cada etiqueta del evento no puede superar "
                f"{EVENT_TAG_MAX_LENGTH} caracteres."
            )

    normalized = ",".join(tags)
    if len(normalized) > EVENT_TAGS_MAX_LENGTH:
        return "", (
            "El listado de etiquetas no puede superar "
            f"{EVENT_TAGS_MAX_LENGTH} caracteres en total."
        )
    return normalized, None


def _publish_group_created_for_event(request, chat_group: ChatGroup) -> None:
    residence = getattr(request, "residence", None)
    if not residence:
        return

    payload = {
        "group": ChatGroupSerializer(chat_group, context={"request": request}).data,
    }
    publish_chat_event(residence.id, "group_created", payload)


def _get_user_interests(user) -> set:
    if not hasattr(user, "student_profile"):
        return set()
    profile = user.student_profile
    interests = profile.interests or []
    custom_interests = profile.custom_interests or []

    user_tastes = set()
    for taste in list(interests) + list(custom_interests):
        if taste and isinstance(taste, str):
            user_tastes.add(taste.strip().lower())
    return user_tastes


def _calculate_recommendation_score(event_tags: str, user_interests: set) -> int:
    if not event_tags or not user_interests:
        return 0

    tags = [tag.strip().lower() for tag in event_tags.split(",") if tag.strip()]
    score = sum(1 for tag in tags if tag in user_interests)
    return score


def _serialize_event(
    event: Event, current_user, residence, recommendation_score=0, is_recommended=False
):
    is_joined = event.participations.filter(user=current_user).exists()
    can_edit = event.host == current_user or is_events_admin(current_user, residence)

    is_chat_member = False
    if event.chat_group_id and current_user.is_authenticated:
        user_membership = Membership.objects.filter(
            user=current_user,
            residence=event.residence,
            is_active=True,
        ).first()
        if user_membership:
            is_chat_member = ChatGroupMember.objects.filter(
                group=event.chat_group,
                membership=user_membership,
                can_interact=True,
            ).exists()

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
        "chat_group": {
            "id": event.chat_group.id,
            "name": event.chat_group.name,
        }
        if event.chat_group
        else None,
        "is_chat_member": is_chat_member,
        "recommendation_score": recommendation_score,
        "is_recommended": is_recommended,
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
            detail = (
                data.get("detail") or "No se pudo crear la reserva del evento interno."
            )
        except Exception:
            detail = "No se pudo crear la reserva del evento interno."
        return None, JsonResponse({"detail": detail}, status=response.status_code)

    data = json.loads(response.content.decode("utf-8"))
    reservation_id = data.get("id")
    reservation = (
        SpaceReservation.objects.select_related("space")
        .filter(
            id=reservation_id,
            residence=residence,
        )
        .first()
    )

    if not reservation:
        return None, JsonResponse(
            {"detail": "No se pudo recuperar la reserva creada para el evento."},
            status=400,
        )
    return reservation, None


def _space_has_active_overlap(
    *,
    residence,
    space_id: int,
    start_time: datetime,
    end_time: datetime,
    exclude_reservation_id: int | None = None,
) -> bool:
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
            {
                "detail": "El límite de participantes debe ser un número entero positivo."
            },
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


class EventListView(AuthenticatedView):
    def get(self, request):
        if not hasattr(request, "residence") or not request.residence:
            return JsonResponse({"detail": "No residence context."}, status=400)

        events = list(
            Event.objects.filter(residence=request.residence).select_related(
                "host", "space"
            )
        )

        user_interests = _get_user_interests(request.user)
        only_recommended = request.GET.get("recommended", "false").lower() == "true"

        event_tuples = []
        for event in events:
            score = _calculate_recommendation_score(event.tags, user_interests)
            is_recommended = score > 0
            if only_recommended and not is_recommended:
                continue
            event_tuples.append((score, event.start_time, event, is_recommended))

        # Order by recommendation score descending, then start_time descending
        event_tuples.sort(key=lambda x: (x[0], x[1]), reverse=True)

        data = [
            _serialize_event(
                event=tup[2],
                current_user=request.user,
                residence=request.residence,
                recommendation_score=tup[0],
                is_recommended=tup[3],
            )
            for tup in event_tuples
        ]
        return JsonResponse(data, safe=False)

    def post(self, request):
        if not hasattr(request, "residence") or not request.residence:
            return JsonResponse({"detail": "No residence context."}, status=400)

        try:
            body = json.loads(request.body)

            event_type = _normalize_event_type(body.get("event_type"))
            if not event_type:
                return JsonResponse({"detail": "Tipo de evento inválido."}, status=400)

            start_time, end_time, time_error = _parse_and_validate_times(
                body.get("start_time"),
                body.get("end_time"),
                validate_future=True,
            )
            if time_error:
                return time_error

            overlapping_participating = EventParticipation.objects.filter(
                user=request.user,
                event__start_time__lt=end_time,
                event__end_time__gt=start_time,
            ).exists()

            if overlapping_participating:
                return JsonResponse(
                    {"detail": "Ya asistes a otro evento en ese horario."}, status=400
                )

            event_title, title_error = _normalize_text_field(
                body.get("title"),
                field_name="title",
                max_length=EVENT_TITLE_MAX_LENGTH,
                required=True,
            )
            if title_error:
                return JsonResponse({"detail": title_error}, status=400)

            description, description_error = _normalize_text_field(
                body.get("description"),
                field_name="description",
                max_length=EVENT_DESCRIPTION_MAX_LENGTH,
                required=True,
            )
            if description_error:
                return JsonResponse({"detail": description_error}, status=400)

            image_url, image_url_error = _normalize_optional_url_field(
                body.get("image_url"),
                field_name="image_url",
                max_length=EVENT_IMAGE_URL_MAX_LENGTH,
            )
            if image_url_error:
                return JsonResponse({"detail": image_url_error}, status=400)

            tags, tags_error = _normalize_event_tags(body.get("tags"), required=True)
            if tags_error:
                return JsonResponse({"detail": tags_error}, status=400)

            # Validar que no haya otro evento con el mismo título para la misma fecha
            event_date = start_time.date()
            if Event.objects.filter(
                residence=request.residence,
                title__iexact=event_title,
                start_time__date=event_date,
            ).exists():
                return JsonResponse(
                    {
                        "detail": f"Ya existe un evento con el título '{event_title}' para la fecha seleccionada."
                    },
                    status=400,
                )

            location, location_error = _normalize_text_field(
                body.get("location"),
                field_name="location",
                max_length=EVENT_LOCATION_MAX_LENGTH,
                required=False,
            )
            if location_error:
                return JsonResponse({"detail": location_error}, status=400)
            space_id = body.get("space_id")

            target_space = None
            normalized_max_participants = None

            if event_type == Event.Type.INTERNAL:
                if not space_id:
                    return JsonResponse(
                        {
                            "detail": "Debes seleccionar un espacio común para eventos internos."
                        },
                        status=400,
                    )
                if location:
                    return JsonResponse(
                        {
                            "detail": "Los eventos internos no deben incluir ubicación externa."
                        },
                        status=400,
                    )
                target_space = get_object_or_404(
                    CommonSpace,
                    id=int(space_id),
                    residence=request.residence,
                    is_active=True,
                )
                normalized_max_participants, limit_error = (
                    _normalize_internal_event_limit(
                        body.get("max_participants"), target_space.capacity
                    )
                )
                if limit_error:
                    return limit_error

                if _space_has_active_overlap(
                    residence=request.residence,
                    space_id=target_space.id,
                    start_time=start_time,
                    end_time=end_time,
                ):
                    return JsonResponse(
                        {
                            "detail": "El espacio común ya está reservado en esa franja horaria."
                        },
                        status=400,
                    )
            else:
                if not location:
                    return JsonResponse(
                        {
                            "detail": "Debes indicar una ubicación para eventos externos."
                        },
                        status=400,
                    )
                if space_id:
                    return JsonResponse(
                        {
                            "detail": "Los eventos externos no pueden asociar un espacio común."
                        },
                        status=400,
                    )
                normalized_max_participants, limit_error = _parse_max_participants(
                    body.get("max_participants")
                )
                if limit_error:
                    return limit_error

            with transaction.atomic():
                reservation = None

                if event_type == Event.Type.INTERNAL:
                    reservation, reservation_error = (
                        _create_reservation_through_spaces_module(
                            request=request,
                            residence=request.residence,
                            space_id=target_space.id,
                            start_time=start_time,
                            end_time=end_time,
                        )
                    )
                    if reservation_error:
                        transaction.set_rollback(True)
                        return reservation_error

                event = Event.objects.create(
                    title=event_title,
                    description=description,
                    start_time=start_time,
                    end_time=end_time,
                    event_type=event_type,
                    location=location if event_type == Event.Type.EXTERNAL else "",
                    space=target_space,
                    reservation=reservation,
                    image_url=image_url or None,
                    tags=tags or None,
                    max_participants=normalized_max_participants,
                    residence=request.residence,
                    host=request.user,
                )

                chat_group, chat_error = _create_event_chat_group(event, request.user)
                if chat_error:
                    transaction.set_rollback(True)
                    return JsonResponse(
                        {
                            "detail": f"Evento creado pero no se pudo crear el chat: {chat_error}"
                        },
                        status=400,
                    )

                if chat_group:
                    event.chat_group = chat_group
                    event.save(update_fields=["chat_group"])
                    _publish_group_created_for_event(request, chat_group)

                if not is_events_admin(request.user, request.residence):
                    EventParticipation.objects.create(event=event, user=request.user)

            return JsonResponse(
                {"id": event.id, "detail": "Event created successfully"}, status=201
            )
        except Exception as e:
            return JsonResponse({"detail": str(e)}, status=400)


class EventDetailView(AuthenticatedView):
    def get(self, request, event_id):
        event = get_object_or_404(
            Event.objects.select_related("host", "space"),
            id=event_id,
            residence=request.residence,
        )
        user_interests = _get_user_interests(request.user)
        score = _calculate_recommendation_score(event.tags, user_interests)
        return JsonResponse(
            _serialize_event(
                event,
                request.user,
                request.residence,
                recommendation_score=score,
                is_recommended=score > 0,
            )
        )

    def put(self, request, event_id):
        event = get_object_or_404(Event, id=event_id, residence=request.residence)
        can_edit = event.host == request.user or is_events_admin(
            request.user, request.residence
        )
        if not can_edit:
            return JsonResponse({"detail": "Unauthorized"}, status=403)

        try:
            body = json.loads(request.body)

            if event.end_time < timezone.now():
                return JsonResponse(
                    {"detail": "No se puede editar un evento que ya ha finalizado."},
                    status=400,
                )

            event_type = _normalize_event_type(body.get("event_type", event.event_type))
            if not event_type:
                return JsonResponse({"detail": "Tipo de evento inválido."}, status=400)

            start_time, end_time, time_error = _parse_and_validate_times(
                body.get("start_time"),
                body.get("end_time"),
                validate_future=False,
            )
            if time_error:
                return time_error

            if start_time != event.start_time or end_time != event.end_time:
                overlapping_participating = (
                    EventParticipation.objects.exclude(event=event)
                    .filter(
                        user=request.user,
                        event__start_time__lt=end_time,
                        event__end_time__gt=start_time,
                    )
                    .exists()
                )

                if overlapping_participating:
                    return JsonResponse(
                        {"detail": "Ya asistes a otro evento en ese horario."},
                        status=400,
                    )

            raw_title = body.get("title", event.title)
            event_title, title_error = _normalize_text_field(
                raw_title,
                field_name="title",
                max_length=EVENT_TITLE_MAX_LENGTH,
                required=True,
            )
            if title_error:
                return JsonResponse({"detail": title_error}, status=400)

            description, description_error = _normalize_text_field(
                body.get("description", event.description),
                field_name="description",
                max_length=EVENT_DESCRIPTION_MAX_LENGTH,
                required=True,
            )
            if description_error:
                return JsonResponse({"detail": description_error}, status=400)

            image_url, image_url_error = _normalize_optional_url_field(
                body.get("image_url", event.image_url),
                field_name="image_url",
                max_length=EVENT_IMAGE_URL_MAX_LENGTH,
            )
            if image_url_error:
                return JsonResponse({"detail": image_url_error}, status=400)

            tags, tags_error = _normalize_event_tags(
                body.get("tags", event.tags),
                required=True,
            )
            if tags_error:
                return JsonResponse({"detail": tags_error}, status=400)

            # Validar que no haya otro evento con el mismo título para la misma fecha
            event_date = start_time.date()
            if (
                Event.objects.filter(
                    residence=request.residence,
                    title__iexact=event_title,
                    start_time__date=event_date,
                )
                .exclude(id=event_id)
                .exists()
            ):
                return JsonResponse(
                    {
                        "detail": f"Ya existe otro evento con el título '{event_title}' para la fecha seleccionada."
                    },
                    status=400,
                )

            location, location_error = _normalize_text_field(
                body.get("location", event.location),
                field_name="location",
                max_length=EVENT_LOCATION_MAX_LENGTH,
                required=False,
            )
            if location_error:
                return JsonResponse({"detail": location_error}, status=400)
            requested_space_id = body.get("space_id")
            max_participants_provided = "max_participants" in body

            target_space = None

            if event_type == Event.Type.INTERNAL:
                if requested_space_id is None:
                    requested_space_id = event.space_id
                if not requested_space_id:
                    return JsonResponse(
                        {
                            "detail": "Debes seleccionar un espacio común para eventos internos."
                        },
                        status=400,
                    )
                if location:
                    return JsonResponse(
                        {
                            "detail": "Los eventos internos no deben incluir ubicación externa."
                        },
                        status=400,
                    )

                target_space = get_object_or_404(
                    CommonSpace,
                    id=int(requested_space_id),
                    residence=request.residence,
                    is_active=True,
                )
                normalized_max_participants, limit_error = (
                    _normalize_internal_event_limit(
                        body.get("max_participants", event.max_participants),
                        target_space.capacity,
                    )
                )
                if limit_error:
                    return limit_error
            else:
                if not location:
                    return JsonResponse(
                        {
                            "detail": "Debes indicar una ubicación para eventos externos."
                        },
                        status=400,
                    )
                if requested_space_id:
                    return JsonResponse(
                        {
                            "detail": "Los eventos externos no pueden asociar un espacio común."
                        },
                        status=400,
                    )
                normalized_max_participants, limit_error = _parse_max_participants(
                    body.get("max_participants", event.max_participants)
                )
                if limit_error:
                    return limit_error

            if (
                max_participants_provided
                and normalized_max_participants is not None
                and normalized_max_participants < event.participants_count
            ):
                return JsonResponse(
                    {
                        "detail": (
                            "El límite de participantes no puede ser inferior al número "
                            f"actual de asistentes ({event.participants_count})."
                        )
                    },
                    status=400,
                )

            needs_new_reservation = False
            if event_type == Event.Type.INTERNAL:
                needs_new_reservation = (
                    event.event_type != Event.Type.INTERNAL
                    or not event.reservation_id
                    or int(requested_space_id) != (event.space_id or 0)
                    or start_time != event.start_time
                    or end_time != event.end_time
                )
                if needs_new_reservation:
                    if _space_has_active_overlap(
                        residence=request.residence,
                        space_id=target_space.id,
                        start_time=start_time,
                        end_time=end_time,
                        exclude_reservation_id=event.reservation_id,
                    ):
                        return JsonResponse(
                            {
                                "detail": "El espacio común ya está reservado en esa franja horaria."
                            },
                            status=400,
                        )

            with transaction.atomic():
                previous_reservation = event.reservation
                new_reservation = event.reservation
                new_space = event.space
                new_location = event.location

                if event_type == Event.Type.INTERNAL:
                    if needs_new_reservation and event.reservation_id:
                        event.reservation.status = SpaceReservation.Status.CANCELLED
                        event.reservation.save(update_fields=["status", "updated_at"])

                    if needs_new_reservation:
                        new_reservation, reservation_error = (
                            _create_reservation_through_spaces_module(
                                request=request,
                                residence=request.residence,
                                space_id=target_space.id,
                                start_time=start_time,
                                end_time=end_time,
                            )
                        )
                        if reservation_error:
                            transaction.set_rollback(True)
                            return reservation_error
                        new_space = new_reservation.space

                    new_location = ""
                else:
                    new_space = None
                    new_reservation = None
                    new_location = location

                event.title = event_title
                event.description = description
                event.start_time = start_time
                event.end_time = end_time
                event.event_type = event_type
                event.location = new_location
                event.space = new_space
                event.reservation = new_reservation
                event.image_url = image_url or None
                event.tags = tags or None
                event.max_participants = normalized_max_participants
                event.save()

                should_remove_old_reservation = (
                    previous_reservation
                    and previous_reservation.id != event.reservation_id
                )
                if should_remove_old_reservation:
                    previous_reservation.delete()

            return JsonResponse(
                {"id": event.id, "detail": "Event updated successfully"}, status=200
            )
        except Exception as e:
            return JsonResponse({"detail": str(e)}, status=400)

    def delete(self, request, event_id):
        event = get_object_or_404(Event, id=event_id, residence=request.residence)

        can_edit = event.host == request.user or is_events_admin(
            request.user, request.residence
        )
        if not can_edit:
            return JsonResponse({"detail": "Unauthorized"}, status=403)

        reservation = event.reservation
        chat_group = event.chat_group
        residence = getattr(request, "residence", None)
        with transaction.atomic():
            if chat_group:
                group_id = chat_group.id
                ChatGroupMember.objects.filter(group=chat_group).delete()
                chat_group.delete()
                if residence:
                    publish_chat_event(
                        residence.id,
                        "group_deleted",
                        {"group_id": group_id},
                    )
            event.delete()
            if reservation:
                reservation.delete()

        return JsonResponse({"detail": "Event deleted"}, status=200)


class EventJoinView(AuthenticatedView):
    def post(self, request, event_id):
        if is_events_admin(request.user, request.residence):
            return JsonResponse(
                {"detail": "Los administradores no pueden inscribirse en eventos."},
                status=403,
            )

        event = get_object_or_404(Event, id=event_id, residence=request.residence)

        if event.end_time < timezone.now():
            return JsonResponse(
                {"detail": "No puedes inscribirte en un evento que ya ha finalizado."},
                status=400,
            )

        if not event.can_join():
            return JsonResponse(
                {"detail": "El evento ha alcanzado el límite de participantes."},
                status=400,
            )

        # Validar superposición
        overlapping_participating = (
            EventParticipation.objects.exclude(event=event)
            .filter(
                user=request.user,
                event__start_time__lt=event.end_time,
                event__end_time__gt=event.start_time,
            )
            .exists()
        )

        if overlapping_participating:
            return JsonResponse(
                {
                    "detail": "Este evento coincide en horario con otro al que ya asistes."
                },
                status=400,
            )

        try:
            with transaction.atomic():
                EventParticipation.objects.create(event=event, user=request.user)

            return JsonResponse(
                {"detail": "Te has inscrito correctamente en el evento."}, status=201
            )
        except IntegrityError:
            return JsonResponse(
                {"detail": "Ya estás inscrito en este evento."}, status=400
            )


class EventJoinChatView(AuthenticatedView):
    def post(self, request, event_id):
        event = get_object_or_404(Event, id=event_id, residence=request.residence)

        if not event.chat_group_id:
            return JsonResponse(
                {"detail": "Este evento no tiene chat asociado."}, status=400
            )

        is_participant = EventParticipation.objects.filter(
            event=event, user=request.user
        ).exists()
        is_admin = is_events_admin(request.user, request.residence)
        if not is_participant and not is_admin:
            return JsonResponse(
                {"detail": "Debes estar apuntado al evento para unirte al chat."},
                status=403,
            )

        user_membership = Membership.objects.filter(
            user=request.user,
            residence=event.residence,
            is_active=True,
        ).first()
        if not user_membership:
            return JsonResponse(
                {"detail": "No tienes membresía activa en la residencia."}, status=403
            )

        member, created = ChatGroupMember.objects.get_or_create(
            group=event.chat_group,
            membership=user_membership,
            defaults={"is_admin": False, "can_interact": True},
        )

        if not created and member.can_interact:
            return JsonResponse(
                {"detail": "Ya perteneces al chat del evento."}, status=200
            )

        if not created and not member.can_interact:
            member.can_interact = True
            member.interaction_disabled_at = None
            member.save(update_fields=["can_interact", "interaction_disabled_at"])

        return JsonResponse({"detail": "Te has unido al chat del evento."}, status=201)


class EventLeaveView(AuthenticatedView):
    def post(self, request, event_id):
        event = get_object_or_404(Event, id=event_id, residence=request.residence)

        if event.end_time < timezone.now():
            return JsonResponse(
                {"detail": "No puedes abandonar un evento que ya ha finalizado."},
                status=400,
            )

        try:
            with transaction.atomic():
                deleted, _ = EventParticipation.objects.filter(
                    event=event, user=request.user
                ).delete()

                if deleted and event.chat_group_id:
                    user_membership = Membership.objects.filter(
                        user=request.user,
                        residence=event.residence,
                        is_active=True,
                    ).first()

                    if user_membership:
                        ChatGroupMember.objects.filter(
                            group=event.chat_group,
                            membership=user_membership,
                        ).delete()

                if deleted:
                    return JsonResponse(
                        {"detail": "Has abandonado el evento."}, status=200
                    )
                return JsonResponse(
                    {"detail": "No estás inscrito en este evento."}, status=400
                )
        except Exception as e:
            return JsonResponse({"detail": str(e)}, status=400)


class EventParticipantsView(AuthenticatedView):
    def get(self, request, event_id):
        event = get_object_or_404(Event, id=event_id, residence=request.residence)
        participations = event.participations.select_related("user").all()
        data = []
        for p in participations:
            data.append(
                {
                    "joined_at": p.joined_at.isoformat(),
                    "user": {
                        "id": p.user.id,
                        "first_name": p.user.first_name,
                        "last_name": p.user.last_name,
                    },
                }
            )
        return JsonResponse(data, safe=False)


class AdminEventsAnalyticsView(AuthenticatedView):
    def get(self, request):
        residence = getattr(request, "residence", None)
        if not residence:
            return JsonResponse({"detail": "No residence context."}, status=400)

        can_access_by_events = is_events_admin(request.user, residence)
        can_access_by_analytics = has_screen_permission(
            request.user, residence, "analytics"
        )

        if not (can_access_by_events or can_access_by_analytics):
            return JsonResponse(
                {"detail": "No tienes permisos para consultar analíticas de eventos."},
                status=403,
            )

        try:
            payload = get_admin_events_analytics(
                residence=residence,
                from_value=request.GET.get("from"),
                to_value=request.GET.get("to"),
                compare_value=request.GET.get("compare"),
                event_type_value=request.GET.get("event_type"),
                creator_id_value=request.GET.get("creator_id"),
            )
        except EventsAnalyticsValidationError as exc:
            return JsonResponse(exc.detail, status=400)

        return JsonResponse(payload)
