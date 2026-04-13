import json
import re
from datetime import datetime, time, timedelta
from typing import Any, Iterable
from django.http import HttpResponse, JsonResponse
from django.views import View
from django.utils.decorators import method_decorator
from .models import Object, ObjectLabel, ObjectRental
from django.db.utils import IntegrityError
from django.db import OperationalError, ProgrammingError
from django.db import transaction

from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Q
from django.db.models import Count
from django.db.utils import IntegrityError
from django.http import JsonResponse
from django.utils import timezone
from django.utils.dateparse import parse_date, parse_datetime
from django.utils.decorators import method_decorator
from django.views import View
from django.views.decorators.csrf import csrf_exempt

from apps.common.utils.jwt_auth import resolve_user_from_request

from .models import Object, ObjectRental
from .permissions import is_reservations_admin
from apps.chats.realtime import publish_chat_event

OBJECT_NAME_PATTERN = re.compile(r"^[\w\-\.\(\), ]+$")
OBJECT_RESERVATION_DURATION_MINUTES = 55
OBJECT_RESERVATION_GAP_MINUTES = 5
OBJECT_RESERVATION_INTERVAL_MINUTES = 60
ACTIVE_RENTAL_STATUSES = ["ACTIVE", "IN_PROGRESS"]
ADMIN_CANCELLATION_REASON_MAX_LENGTH = 200
RESERVATION_REMINDER_WINDOW = timedelta(hours=1)


def _parse_datetime_or_none(value):
    dt = parse_datetime(str(value).strip()) if value is not None else None
    if dt is not None and timezone.is_naive(dt):
        dt = timezone.make_aware(dt, timezone.get_current_timezone())
    return dt


def _validate_object_name(raw_name) -> tuple[str, str | None]:
    name = str(raw_name or "").strip()
    if not name:
        return "", "El nombre del objeto es obligatorio."
    if not OBJECT_NAME_PATTERN.fullmatch(name):
        return (
            "",
            "El nombre contiene caracteres no válidos. Usa letras, números, espacios, guiones, paréntesis, comas o puntos.",
        )
    return name, None


def _sync_started_rentals_for_residence(residence) -> None:
    now = timezone.now()
    ObjectRental.objects.filter(
        object__residence=residence,
        status="ACTIVE",
        start_date__lte=now,
    ).update(status="IN_PROGRESS")


def _serialize_object(obj):
    now = timezone.now()
    return_buffer = timedelta(minutes=OBJECT_RESERVATION_GAP_MINUTES)
    current_reserved_stock = obj.rentals.filter(
        Q(status='IN_PROGRESS')
        | Q(status='ACTIVE', start_date__lt=now, end_date__gt=now - return_buffer),
    ).count()
    current_available_stock = max(obj.stock_total - current_reserved_stock, 0)
    is_available_now = obj.available and current_available_stock > 0
    rentals_count = getattr(obj, "rentals_count", obj.rentals.count())
    try:
        labels_payload = [
            {
                'id': label.id,
                'name': label.name,
            }
            for label in obj.labels.all()
        ]
    except (OperationalError, ProgrammingError):
        labels_payload = []

    return {
        'id': obj.id,
        'name': obj.name,
        'description': obj.description,
        'location': obj.location,
        'availability': is_available_now,
        'lending_enabled': obj.available,
        'is_enabled': obj.available,
        'stock_total': obj.stock_total,
        'current_reserved_stock': current_reserved_stock,
        'current_available_stock': current_available_stock,
        'image_url': obj.image_url,
        'tags': obj.tags,
        'labels': labels_payload,
        'rentals_count': rentals_count,
        'can_rent': is_available_now,
    }


def _serialize_object_label(label: ObjectLabel) -> dict[str, Any]:
    return {
        'id': label.id,
        'name': label.name,
        'created_at': label.created_at.isoformat(),
    }


def _serialize_object_reservation(rental: ObjectRental) -> dict[str, Any]:
    return {
        "id": rental.id,
        "start_date": rental.start_date.isoformat(),
        "end_date": rental.end_date.isoformat(),
        "user": {
            "id": rental.user_id,
            "first_name": rental.user.first_name,
            "last_name": rental.user.last_name,
            "email": rental.user.email,
        },
    }


def _serialize_admin_rental(rental: ObjectRental) -> dict[str, Any]:
    now = timezone.now()
    rental_duration_seconds = max(int((rental.end_date - rental.start_date).total_seconds()), 0)
    payload: dict[str, Any] = {
        "id": rental.id,
        "start_date": rental.start_date.isoformat(),
        "end_date": rental.end_date.isoformat(),
        "status": rental.status,
        "created_at": rental.created_at.isoformat(),
        "updated_at": rental.updated_at.isoformat(),
        "user": {
            "id": rental.user.id,
            "first_name": getattr(rental.user, "first_name", ""),
            "last_name": getattr(rental.user, "last_name", ""),
            "email": getattr(rental.user, "email", ""),
        },
        "planned_duration_minutes": rental_duration_seconds // 60,
    }

    if rental.status == "CANCELLED" and rental.admin_cancelled_by:
        payload["admin_cancelled_by"] = {
            "id": rental.admin_cancelled_by.id,
            "first_name": getattr(rental.admin_cancelled_by, "first_name", ""),
            "last_name": getattr(rental.admin_cancelled_by, "last_name", ""),
        }
        if rental.admin_cancelled_reason:
            payload["admin_cancelled_reason"] = rental.admin_cancelled_reason
        if rental.admin_cancelled_at:
            payload["admin_cancelled_at"] = rental.admin_cancelled_at.isoformat()

    if rental.status == "IN_PROGRESS":
        elapsed_seconds = max(int((now - rental.start_date).total_seconds()), 0)
        payload["elapsed_minutes"] = elapsed_seconds // 60
        payload["elapsed_human"] = _format_duration_human(elapsed_seconds)
        remaining_seconds = int((rental.end_date - now).total_seconds())
        payload["remaining_minutes"] = max(remaining_seconds // 60, 0)
        payload["remaining_human"] = _format_duration_human(max(remaining_seconds, 0))
        payload["is_in_period"] = now < rental.end_date

        if now > rental.end_date:
            overdue_seconds = int((now - rental.end_date).total_seconds())
            payload["is_overdue"] = True
            payload["overdue_minutes"] = overdue_seconds // 60
            payload["overdue_human"] = _format_duration_human(overdue_seconds)

    if rental.status == "COMPLETED":
        completion_reference = rental.updated_at if rental.updated_at else now
        elapsed_seconds = max(
            int((completion_reference - rental.start_date).total_seconds()), 0
        )
        payload["elapsed_minutes"] = elapsed_seconds // 60
        payload["elapsed_human"] = _format_duration_human(elapsed_seconds)

        if completion_reference > rental.end_date:
            overdue_seconds = int((completion_reference - rental.end_date).total_seconds())
            payload["is_overdue"] = True
            payload["overdue_minutes"] = overdue_seconds // 60
            payload["overdue_human"] = _format_duration_human(overdue_seconds)
        else:
            payload["is_overdue"] = False

    return payload


def _format_duration_human(total_seconds: int) -> str:
    seconds = max(total_seconds, 0)
    total_minutes = seconds // 60
    days, rem_minutes = divmod(total_minutes, 60 * 24)
    hours, minutes = divmod(rem_minutes, 60)

    chunks: list[str] = []
    if days:
        chunks.append(f"{days}d")
    if hours:
        chunks.append(f"{hours}h")
    if minutes or not chunks:
        chunks.append(f"{minutes}m")
    return " ".join(chunks)


def _sync_rental_progress_status(rental: ObjectRental, now: datetime | None = None) -> ObjectRental:
    if rental.status != "ACTIVE":
        return rental

    reference = now or timezone.now()
    if rental.start_date <= reference:
        rental.status = "IN_PROGRESS"
        rental.save(update_fields=["status", "updated_at"])
    return rental


def _serialize_object_reservation_reminder(rental: ObjectRental) -> dict[str, Any]:
    start_date = timezone.localtime(rental.start_date)
    return {
        "id": f"object-rentals-{rental.id}",
        "title": f"Tu reserva de {rental.object.name} empieza pronto",
        "message": f"Tu reserva comienza a las {start_date.strftime('%H:%M')}.",
        "created_at": rental.start_date.isoformat(),
        "start_time": rental.start_date.isoformat(),
        "end_time": rental.end_date.isoformat(),
    }


def _build_object_reservation_reminders(rentals: Iterable[ObjectRental]) -> list[dict[str, Any]]:
    return [_serialize_object_reservation_reminder(rental) for rental in rentals]


def _count_active_rentals_in_interval(*, obj: Object, interval_start: datetime, interval_end: datetime) -> int:
    return_buffer = timedelta(minutes=OBJECT_RESERVATION_GAP_MINUTES)
    return obj.rentals.filter(
        Q(status="IN_PROGRESS")
        | Q(
            status="ACTIVE",
            start_date__lt=interval_end,
            end_date__gt=interval_start - return_buffer,
        )
    ).count()


def _compute_object_available_slots(
    *,
    target_date,
    obj: Object,
    reservations: list[ObjectRental],
) -> list[dict[str, Any]]:
    tz = timezone.get_current_timezone()
    day_start = timezone.make_aware(datetime.combine(target_date, time.min), tz)
    day_end = day_start + timedelta(days=1)

    reservation_duration = timedelta(minutes=OBJECT_RESERVATION_DURATION_MINUTES)
    interval_step = timedelta(minutes=OBJECT_RESERVATION_INTERVAL_MINUTES)
    return_buffer = timedelta(minutes=OBJECT_RESERVATION_GAP_MINUTES)
    now = timezone.now()
    slots: list[dict[str, Any]] = []

    current = day_start
    while current + reservation_duration <= day_end:
        slot_end = current + reservation_duration
        is_past = current < now
        
        # Count rentals in this slot considering the return buffer
        rentals_in_slot = sum(
            1 for r in reservations
            if r.start_date < slot_end and r.end_date > (current - return_buffer)
        )
        
        available_stock = max(obj.stock_total - rentals_in_slot, 0)
        status = "past" if is_past else ("occupied" if available_stock == 0 else "available")
        
        slots.append(
            {
                "start_time": current.isoformat(),
                "end_time": slot_end.isoformat(),
                "status": status,
                "available_stock": available_stock,
            }
        )
        current = current + interval_step

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


class ObjectListView(AuthenticatedView):
    def get(self, request):
        if not hasattr(request, "residence") or not request.residence:
            return JsonResponse({"detail": "No residence context."}, status=400)

        _sync_started_rentals_for_residence(request.residence)

        objs = Object.objects.filter(residence=request.residence).prefetch_related('labels').annotate(
            rentals_count=Count("rentals")
        )
        data = [_serialize_object(obj) for obj in objs]
        return JsonResponse(data, safe=False)

    def post(self, request):
        if not hasattr(request, "residence") or not request.residence:
            return JsonResponse({"detail": "No residence context."}, status=400)

        if not is_reservations_admin(request.user, request.residence):
            return JsonResponse(
                {"detail": "No tienes permisos para crear objetos."}, status=403
            )

        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({"detail": "JSON inválido."}, status=400)

        name, name_error = _validate_object_name(body.get("name"))
        if name_error:
            return JsonResponse({"detail": name_error}, status=400)

        try:
            raw_stock_total = body.get('stock_total', 1)
            stock_total = int(1 if raw_stock_total is None else raw_stock_total)
            if stock_total < 1:
                raise ValueError("stock_total debe ser positivo")
            label_ids_raw = body.get('label_ids', [])
            if label_ids_raw is None:
                label_ids_raw = []
            if not isinstance(label_ids_raw, list):
                raise ValueError("label_ids debe ser una lista")
            label_ids = [int(item) for item in label_ids_raw]
            labels = list(
                ObjectLabel.objects.filter(
                    residence=request.residence,
                    id__in=label_ids,
                )
            )
            if len(labels) != len(set(label_ids)):
                return JsonResponse({"detail": "Alguna etiqueta no existe o no pertenece a la residencia."}, status=400)
            computed_tags = ", ".join(sorted({label.name for label in labels}))
            obj = Object.objects.create(
                name=name,
                description=body.get('description', ''),
                location=body.get('location', ''),
                stock_total=stock_total,
                image_url=body.get('image_url', None),
                tags=computed_tags,
                residence=request.residence,
            )
            if labels:
                obj.labels.set(labels)
            return JsonResponse({'id': obj.id, 'detail': 'Object created successfully'}, status=201)
        except ValueError:
            return JsonResponse({"detail": "stock_total debe ser un entero positivo y label_ids debe ser una lista de enteros."}, status=400)
        except Exception as e:
            return JsonResponse({"detail": str(e)}, status=400)


class ObjectLabelListCreateView(AuthenticatedView):
    def get(self, request):
        if not hasattr(request, 'residence') or not request.residence:
            return JsonResponse({"detail": "No residence context."}, status=400)

        try:
            labels = ObjectLabel.objects.filter(residence=request.residence)
            return JsonResponse([_serialize_object_label(label) for label in labels], safe=False)
        except (OperationalError, ProgrammingError):
            return JsonResponse(
                {"detail": "Las etiquetas de objetos no estan disponibles aun. Ejecuta las migraciones pendientes."},
                status=503,
            )

    def post(self, request):
        if not hasattr(request, 'residence') or not request.residence:
            return JsonResponse({"detail": "No residence context."}, status=400)
        if not is_reservations_admin(request.user, request.residence):
            return JsonResponse({"detail": "No tienes permisos para gestionar etiquetas."}, status=403)

        try:
            body = json.loads(request.body or "{}")
        except json.JSONDecodeError:
            return JsonResponse({"detail": "JSON inválido."}, status=400)

        name = str(body.get('name', '')).strip()
        if not name:
            return JsonResponse({"detail": "El nombre de la etiqueta es obligatorio."}, status=400)

        if len(name) > 30:
            return JsonResponse({"detail": "La etiqueta no puede superar 30 caracteres."}, status=400)

        label, created = ObjectLabel.objects.get_or_create(
            residence=request.residence,
            name=name,
        )
        if not created:
            return JsonResponse({"detail": "Esa etiqueta ya existe."}, status=400)

        return JsonResponse(_serialize_object_label(label), status=201)


class ObjectLabelDetailView(AuthenticatedView):
    def delete(self, request, label_id: int):
        if not hasattr(request, 'residence') or not request.residence:
            return JsonResponse({"detail": "No residence context."}, status=400)
        if not is_reservations_admin(request.user, request.residence):
            return JsonResponse({"detail": "No tienes permisos para gestionar etiquetas."}, status=403)

        try:
            label = ObjectLabel.objects.get(id=label_id, residence=request.residence)
        except ObjectLabel.DoesNotExist:
            return JsonResponse({"detail": "Etiqueta no encontrada."}, status=404)
        except (OperationalError, ProgrammingError):
            return JsonResponse(
                {"detail": "Las etiquetas de objetos no estan disponibles aun. Ejecuta las migraciones pendientes."},
                status=503,
            )

        label.delete()
        return HttpResponse(status=204)


def get_residence_object(request, object_id):
    if not hasattr(request, "residence") or not request.residence:
        return None, JsonResponse({"detail": "No residence context."}, status=400)
    try:
        return Object.objects.get(id=object_id, residence=request.residence), None
    except Object.DoesNotExist:
        return None, JsonResponse({"detail": "Objeto no encontrado."}, status=404)


class ObjectDetailView(AuthenticatedView):
    def get(self, request, object_id):
        if not hasattr(request, "residence") or not request.residence:
            return JsonResponse({"detail": "No residence context."}, status=400)
        _sync_started_rentals_for_residence(request.residence)
        obj, error_response = get_residence_object(request, object_id)
        if error_response:
            return error_response
        return JsonResponse(_serialize_object(obj))

    def delete(self, request, object_id):
        if not hasattr(request, "residence") or not request.residence:
            return JsonResponse({"detail": "No residence context."}, status=400)
        obj, error_response = get_residence_object(request, object_id)
        if error_response:
            return error_response

        if not is_reservations_admin(request.user, request.residence):
            return JsonResponse({"detail": "Unauthorized"}, status=403)

        try:
            obj.delete()
            return JsonResponse({"detail": "Object deleted"}, status=200)
        except IntegrityError:
            return JsonResponse(
                {"detail": "No se puede eliminar el objeto por dependencias activas."},
                status=400,
            )
        except Exception as e:
            return JsonResponse({"detail": str(e)}, status=500)


class ObjectAvailabilityView(AuthenticatedView):
    def get(self, request, object_id):
        if not hasattr(request, "residence") or not request.residence:
            return JsonResponse({"detail": "No residence context."}, status=400)

        _sync_started_rentals_for_residence(request.residence)

        date_str = str(request.GET.get("date", "")).strip()
        if not date_str:
            return JsonResponse(
                {"detail": "Debes enviar la fecha en formato YYYY-MM-DD."}, status=400
            )

        target_date = parse_date(date_str)
        if not target_date:
            return JsonResponse({"detail": "Formato de fecha inválido."}, status=400)

        obj, error_response = get_residence_object(request, object_id)
        if error_response:
            return error_response

        tz = timezone.get_current_timezone()
        day_start = timezone.make_aware(datetime.combine(target_date, time.min), tz)
        day_end = day_start + timedelta(days=1)

        reservations = list(
            ObjectRental.objects.filter(
                object=obj,
                status__in=ACTIVE_RENTAL_STATUSES,
                start_date__lt=day_end,
                end_date__gt=day_start,
            )
            .select_related("user")
            .order_by("start_date")
        )

        return JsonResponse(
            {
                "date": target_date.isoformat(),
                "reservation_interval_minutes": OBJECT_RESERVATION_INTERVAL_MINUTES,
                "reservation_gap_minutes": OBJECT_RESERVATION_GAP_MINUTES,
                "object": _serialize_object(obj),
                "reservations": [_serialize_object_reservation(item) for item in reservations],
                "available_slots": _compute_object_available_slots(target_date=target_date, obj=obj, reservations=reservations),
            }
        )


class ObjectReserveView(AuthenticatedView):
    def post(self, request, object_id):
        if not hasattr(request, "residence") or not request.residence:
            return JsonResponse({"detail": "No residence context."}, status=400)

        _sync_started_rentals_for_residence(request.residence)

        try:
            body = json.loads(request.body or "{}")
        except json.JSONDecodeError:
            return JsonResponse(
                {"detail": "El cuerpo de la petición no es JSON válido."}, status=400
            )

        start = _parse_datetime_or_none(body.get("start_date"))
        end = _parse_datetime_or_none(body.get("end_date"))
        if not start or not end:
            return JsonResponse(
                {"detail": "start_date y end_date son requeridos."}, status=400
            )
        if start >= end:
            return JsonResponse(
                {"detail": "La fecha de fin debe ser posterior a la de inicio."},
                status=400,
            )
        if start < timezone.now():
            return JsonResponse(
                {"detail": "No se pueden crear reservas en el pasado."}, status=400
            )
        if any([start.second, start.microsecond, end.second, end.microsecond]):
            return JsonResponse(
                {"detail": "Las reservas deben comenzar y terminar en minutos exactos (sin segundos)."},
                status=400,
            )
        if start.minute != 0 or end.minute != OBJECT_RESERVATION_DURATION_MINUTES:
            return JsonResponse(
                {
                    "detail": f"Las reservas deben comenzar en punto (HH:00) y terminar en HH:{OBJECT_RESERVATION_DURATION_MINUTES:02d}."
                },
                status=400,
            )
        if (end - start) != timedelta(minutes=OBJECT_RESERVATION_DURATION_MINUTES):
            return JsonResponse(
                {
                    "detail": f"Las reservas de objetos deben ser de exactamente {OBJECT_RESERVATION_DURATION_MINUTES} minutos."
                },
                status=400,
            )

        try:
            with transaction.atomic():
                obj, error_response = get_residence_object(request, object_id)
                if error_response:
                    return error_response

                if not obj.available:
                    return JsonResponse(
                        {"detail": "Este objeto no está disponible para préstamo."},
                        status=400,
                    )

                already_reserved_by_user = ObjectRental.objects.filter(
                    object=obj,
                    status__in=ACTIVE_RENTAL_STATUSES,
                    user=request.user,
                    start_date=start,
                    end_date=end,
                ).exists()
                if already_reserved_by_user:
                    return JsonResponse(
                        {
                            "detail": "Ya tienes una reserva para este objeto en ese tramo horario."
                        },
                        status=400,
                    )

                blocked_by_admin_cancellation = ObjectRental.objects.filter(
                    object=obj,
                    user=request.user,
                    status="CANCELLED",
                    admin_cancelled_at__isnull=False,
                    start_date=start,
                    end_date=end,
                ).exists()
                if blocked_by_admin_cancellation:
                    return JsonResponse(
                        {
                            "detail": "Esta franja fue cancelada por administración y no puede volver a reservarse."
                        },
                        status=400,
                    )

                return_buffer = timedelta(minutes=OBJECT_RESERVATION_GAP_MINUTES)
                active_rentals_in_slot = ObjectRental.objects.filter(
                    Q(
                        object=obj,
                        status="IN_PROGRESS",
                        start_date__lt=end,
                        end_date__gt=start - return_buffer,
                    )
                    | Q(
                        object=obj,
                        status="ACTIVE",
                        start_date__lt=end,
                        end_date__gt=start - return_buffer,
                    )
                ).count()
                if active_rentals_in_slot >= obj.stock_total:
                    return JsonResponse(
                        {"detail": "No hay stock disponible para ese horario."},
                        status=400,
                    )

                rental = ObjectRental.objects.create(
                    object=obj,
                    user=request.user,
                    start_date=start,
                    end_date=end,
                )
            # Publish real-time event for admin notifications
            residence_id = getattr(obj, 'residence_id', None)
            if residence_id:
                publish_chat_event(
                    residence_id,
                    "object_reservation_created",
                    {
                        "rental_id": rental.id,
                        "object_id": obj.id,
                        "object_name": obj.name,
                        "user_id": request.user.id,
                        "user_email": getattr(request.user, 'email', ''),
                        "user_name": getattr(request.user, 'first_name', '') or getattr(request.user, 'email', ''),
                        "start_date": start.isoformat(),
                        "end_date": end.isoformat(),
                    },
                )
            return JsonResponse(
                {"id": rental.id, "detail": "Reserva creada."}, status=201
            )
        except IntegrityError:
            return JsonResponse(
                {"detail": "Ya tienes una reserva conflictiva."}, status=400
            )
        except Exception as e:
            return JsonResponse({"detail": str(e)}, status=400)


class ObjectCancelView(AuthenticatedView):
    def post(self, request, object_id):
        if not hasattr(request, "residence") or not request.residence:
            return JsonResponse({"detail": "No residence context."}, status=400)

        _sync_started_rentals_for_residence(request.residence)

        obj, error_response = get_residence_object(request, object_id)
        if error_response:
            return error_response
        try:
            body = json.loads(request.body) if request.body else {}
            rental_id = body.get("rental_id")
            if rental_id:
                updated = ObjectRental.objects.filter(
                    id=rental_id, object=obj, user=request.user, status="ACTIVE"
                ).update(status="CANCELLED")
            else:
                updated = ObjectRental.objects.filter(
                    object=obj,
                    user=request.user,
                    status="ACTIVE",
                    end_date__gt=timezone.now(),
                ).update(status="CANCELLED")

            if updated:
                residence_id = getattr(obj, 'residence_id', None)
                if residence_id:
                    publish_chat_event(
                        residence_id,
                        "object_reservation_cancelled",
                        {
                            "object_id": obj.id,
                            "object_name": obj.name,
                            "user_id": request.user.id,
                        },
                    )
                return JsonResponse({"detail": "Reserva cancelada."}, status=200)
            return JsonResponse(
                {"detail": "No existe reserva activa para este usuario y objeto."},
                status=400,
            )
        except Exception as e:
            return JsonResponse({"detail": str(e)}, status=400)


class ObjectRentalsView(AuthenticatedView):
    def get(self, request, object_id):
        if not hasattr(request, "residence") or not request.residence:
            return JsonResponse({"detail": "No residence context."}, status=400)

        _sync_started_rentals_for_residence(request.residence)

        if not is_reservations_admin(request.user, request.residence):
            return JsonResponse(
                {"detail": "No tienes permisos para ver las reservas."}, status=403
            )

        obj, error_response = get_residence_object(request, object_id)
        if error_response:
            return error_response

        now = timezone.now()
        rentals = obj.rentals.select_related("user").all()

        active = []
        in_progress = []
        cancelled = []
        completed = []

        for r in rentals:
            r = _sync_rental_progress_status(r, now=now)
            rental_data = _serialize_admin_rental(r)

            if r.status == "CANCELLED":
                cancelled.append(rental_data)
            elif r.status == "COMPLETED":
                completed.append(rental_data)
            elif r.status == "IN_PROGRESS":
                if now > r.end_date:
                    completed.append(rental_data)
                else:
                    in_progress.append(rental_data)
            else:  # ACTIVE
                active.append(rental_data)

        active.sort(key=lambda x: x["start_date"], reverse=True)
        in_progress.sort(key=lambda x: x["end_date"])
        cancelled.sort(key=lambda x: x["updated_at"], reverse=True)
        completed.sort(key=lambda x: x["end_date"], reverse=True)

        return JsonResponse(
            {
                "active": active,
                "in_progress": in_progress,
                "cancelled": cancelled,
                "completed": completed,
            }
        )


class ObjectCompleteRentalView(AuthenticatedView):
    def post(self, request, object_id, rental_id):
        if not hasattr(request, "residence") or not request.residence:
            return JsonResponse({"detail": "No residence context."}, status=400)

        _sync_started_rentals_for_residence(request.residence)

        if not is_reservations_admin(request.user, request.residence):
            return JsonResponse(
                {"detail": "No tienes permisos para gestionar préstamos."}, status=403
            )

        obj, error_response = get_residence_object(request, object_id)
        if error_response:
            return error_response

        try:
            rental = ObjectRental.objects.select_related("user").get(
                id=rental_id,
                object=obj,
            )
        except ObjectRental.DoesNotExist:
            return JsonResponse({"detail": "Préstamo no encontrado."}, status=404)

        if rental.status == "CANCELLED":
            return JsonResponse(
                {"detail": "No se puede marcar como devuelto un préstamo cancelado."},
                status=400,
            )

        rental = _sync_rental_progress_status(rental)

        if rental.status != "IN_PROGRESS":
            return JsonResponse(
                {
                    "detail": "Solo se pueden marcar como devueltos los préstamos en curso.",
                },
                status=400,
            )

        rental.status = "COMPLETED"
        rental.save(update_fields=["status", "updated_at"])

        return JsonResponse(
            {
                "detail": "Préstamo marcado como devuelto.",
                "rental": _serialize_admin_rental(rental),
            },
            status=200,
        )


class ObjectAdminCancelRentalView(AuthenticatedView):
    def post(self, request, object_id, rental_id):
        if not hasattr(request, "residence") or not request.residence:
            return JsonResponse({"detail": "No residence context."}, status=400)

        _sync_started_rentals_for_residence(request.residence)

        if not is_reservations_admin(request.user, request.residence):
            return JsonResponse(
                {"detail": "No tienes permisos para gestionar préstamos."}, status=403
            )

        obj, error_response = get_residence_object(request, object_id)
        if error_response:
            return error_response

        try:
            rental = ObjectRental.objects.select_related("user").get(
                id=rental_id,
                object=obj,
            )
        except ObjectRental.DoesNotExist:
            return JsonResponse({"detail": "Préstamo no encontrado."}, status=404)

        if rental.status == "COMPLETED":
            return JsonResponse(
                {
                    "detail": "No se puede cancelar un préstamo que ya ha sido devuelto."
                },
                status=400,
            )

        if rental.status == "IN_PROGRESS":
            return JsonResponse(
                {
                    "detail": "No se puede cancelar un préstamo en curso. Debe esperar a que sea devuelto o haya vencido."
                },
                status=400,
            )

        if rental.status == "CANCELLED":
            return JsonResponse(
                {"detail": "Este préstamo ya ha sido cancelado."}, status=400
            )

        # Only ACTIVE reservations can be cancelled by admin
        if rental.status != "ACTIVE":
            return JsonResponse(
                {
                    "detail": f"Solo se pueden cancelar préstamos activos. Este tiene estado: {rental.status}"
                },
                status=400,
            )

        try:
            body = json.loads(request.body) if request.body else {}
        except json.JSONDecodeError:
            return JsonResponse(
                {"detail": "Invalid JSON in request body."}, status=400
            )

        reason = body.get("reason", "").strip()
        if not reason:
            return JsonResponse(
                {"detail": "El motivo de cancelación es requerido."}, status=400
            )

        if len(reason) > ADMIN_CANCELLATION_REASON_MAX_LENGTH:
            return JsonResponse(
                {
                    "detail": f"El motivo no puede exceder {ADMIN_CANCELLATION_REASON_MAX_LENGTH} caracteres."
                },
                status=400,
            )

        rental.status = "CANCELLED"
        rental.admin_cancelled_by = request.user
        rental.admin_cancelled_reason = reason
        rental.admin_cancelled_at = timezone.now()
        rental.save(
            update_fields=[
                "status",
                "admin_cancelled_by",
                "admin_cancelled_reason",
                "admin_cancelled_at",
                "updated_at",
            ]
        )

        return JsonResponse(
            {
                "detail": "Préstamo cancelado correctamente.",
                "rental": _serialize_admin_rental(rental),
            },
            status=200,
        )


class UserReservationsView(AuthenticatedView):
    def get(self, request):
        if not hasattr(request, "residence") or not request.residence:
            return JsonResponse({"detail": "No residence context."}, status=400)

        _sync_started_rentals_for_residence(request.residence)

        now = timezone.now()

        rentals = (
            ObjectRental.objects.filter(
                user=request.user,
                object__residence=request.residence,
            )
            .filter(
                Q(status="ACTIVE", end_date__gt=now)
                | Q(status="IN_PROGRESS")
                | Q(status="CANCELLED")
            )
            .filter(Q(status__in=["ACTIVE", "IN_PROGRESS"]) | Q(user_dismissed_at__isnull=True))
            .select_related("object", "user", "admin_cancelled_by")
            .order_by("-start_date")
        )

        data = []
        for rental in rentals:
            data.append(
                {
                    "rental": {
                        "id": rental.id,
                        "start_date": rental.start_date.isoformat(),
                        "end_date": rental.end_date.isoformat(),
                        "status": rental.status,
                        "user_dismissed_at": (
                            rental.user_dismissed_at.isoformat()
                            if rental.user_dismissed_at
                            else None
                        ),
                        "admin_cancelled_reason": rental.admin_cancelled_reason,
                        "admin_cancelled_at": (
                            rental.admin_cancelled_at.isoformat()
                            if rental.admin_cancelled_at
                            else None
                        ),
                        "admin_cancelled_by": (
                            {
                                "id": rental.admin_cancelled_by.id,
                                "first_name": rental.admin_cancelled_by.first_name,
                                "last_name": rental.admin_cancelled_by.last_name,
                            }
                            if rental.admin_cancelled_by
                            else None
                        ),
                        "user": {
                            "id": rental.user.id,
                            "first_name": rental.user.first_name,
                            "last_name": rental.user.last_name,
                        },
                    },
                    "object": _serialize_object(rental.object),
                }
            )
        return JsonResponse(data, safe=False)


class UserObjectNotificationsView(AuthenticatedView):
    NOTIFICATION_LIMIT = 5

    def get(self, request):
        residence = getattr(request, "residence", None)
        if not residence:
            return JsonResponse({"detail": "No residence context."}, status=400)

        _sync_started_rentals_for_residence(residence)

        now = timezone.now()
        user_reservations = (
            ObjectRental.objects.filter(
                object__residence=residence,
                user=request.user,
                status__in=ACTIVE_RENTAL_STATUSES,
                end_date__gt=now,
            )
            .select_related("object")
            .order_by("start_date")[: self.NOTIFICATION_LIMIT]
        )

        grouped_notifications: dict[int, dict[str, Any]] = {}

        # Notify the user when their reserved slot is blocked because all stock is
        # still in overdue IN_PROGRESS rentals from other users after the 5-minute gap.
        for reservation in user_reservations:
            slot_grace_deadline = reservation.start_date - timedelta(
                minutes=OBJECT_RESERVATION_GAP_MINUTES
            )
            if now < slot_grace_deadline:
                continue

            blocking_overdue_count = ObjectRental.objects.filter(
                object=reservation.object,
                status="IN_PROGRESS",
                end_date__lte=slot_grace_deadline,
            ).exclude(user=request.user).count()

            if blocking_overdue_count >= reservation.object.stock_total:
                start_local = reservation.start_date.astimezone(
                    timezone.get_current_timezone()
                )
                object_id = reservation.object_id
                if object_id not in grouped_notifications:
                    grouped_notifications[object_id] = {
                        "id": f"object-stock-blocked-{object_id}",
                        "rental_ids": [reservation.id],
                        "title": f"Posible retraso en {reservation.object.name}",
                        "message": (
                            f"Tu reserva de {reservation.object.name} puede verse afectada porque "
                            "el stock sigue pendiente de devolución."
                        ),
                        "created_at": now.isoformat(),
                        "source": "objects",
                        "object": {
                            "id": reservation.object.id,
                            "name": reservation.object.name,
                        },
                        "affected_slots": 1,
                        "next_slot": start_local.strftime("%H:%M"),
                    }
                else:
                    grouped_notifications[object_id]["rental_ids"].append(reservation.id)
                    grouped_notifications[object_id]["affected_slots"] += 1
                    current_next_slot = grouped_notifications[object_id]["next_slot"]
                    if start_local.strftime("%H:%M") < current_next_slot:
                        grouped_notifications[object_id]["next_slot"] = start_local.strftime("%H:%M")

        data = list(grouped_notifications.values())
        for item in data:
            affected_slots = item.get("affected_slots", 1)
            next_slot = item.get("next_slot", "")
            if affected_slots > 1:
                item["title"] = f"Posible retraso en {item['object']['name']} ({affected_slots} tramos)"
                item["message"] = (
                    f"Tu reserva de {item['object']['name']} puede verse afectada en {affected_slots} tramos. "
                    f"El primero es a las {next_slot}."
                )
            else:
                item["message"] = (
                    f"Tu reserva de {item['object']['name']} puede verse afectada. "
                    f"El tramo empieza a las {next_slot}."
                )

            item.pop("object", None)
            item.pop("affected_slots", None)
            item.pop("next_slot", None)
            item.pop("rental_ids", None)

        data.sort(key=lambda item: item["created_at"], reverse=True)
        data = data[: self.NOTIFICATION_LIMIT]
        return JsonResponse(data, safe=False)


class UserDismissReservationView(AuthenticatedView):
    def post(self, request, rental_id):
        if not hasattr(request, "residence") or not request.residence:
            return JsonResponse({"detail": "No residence context."}, status=400)

        try:
            rental = ObjectRental.objects.select_related("object").get(
                id=rental_id,
                user=request.user,
                object__residence=request.residence,
            )
        except ObjectRental.DoesNotExist:
            return JsonResponse({"detail": "Reserva no encontrada."}, status=404)

        if rental.status != "CANCELLED":
            return JsonResponse(
                {"detail": "Solo se pueden descartar reservas canceladas."},
                status=400,
            )

        rental.user_dismissed_at = timezone.now()
        rental.save(update_fields=["user_dismissed_at", "updated_at"])

        return JsonResponse({"detail": "Reserva descartada."}, status=200)


class AdminAllObjectRentalsView(AuthenticatedView):
    NOTIFICATION_LIMIT = 300

    def get(self, request):
        residence = getattr(request, "residence", None)
        if not residence:
            return JsonResponse({"detail": "No residence context."}, status=400)

        if not is_reservations_admin(request.user, residence):
            return JsonResponse(
                {"detail": "No tienes permisos de administrador."}, status=403
            )

        _sync_started_rentals_for_residence(residence)

        rentals = (
            ObjectRental.objects.filter(object__residence=residence)
            .select_related("object", "user", "admin_cancelled_by")
            .order_by("-start_date")[: self.NOTIFICATION_LIMIT]
        )

        data = []
        for rental in rentals:
            rental_payload = _serialize_admin_rental(rental)
            rental_payload["object"] = {
                "id": rental.object.id,
                "name": rental.object.name,
                "location": rental.object.location,
                "stock_total": rental.object.stock_total,
            }
            data.append(rental_payload)

        return JsonResponse(data, safe=False)


class UserReservationRemindersView(AuthenticatedView):
    def get(self, request):
        if not hasattr(request, "residence") or not request.residence:
            return JsonResponse({"detail": "No residence context."}, status=400)

        now = timezone.now()
        reminder_deadline = now + RESERVATION_REMINDER_WINDOW

        rentals = (
            ObjectRental.objects.filter(
                user=request.user,
                object__residence=request.residence,
                status="ACTIVE",
                start_date__gt=now,
                start_date__lte=reminder_deadline,
                end_date__gt=now,
            )
            .select_related("object")
            .order_by("start_date")
        )

        return JsonResponse(_build_object_reservation_reminders(rentals), safe=False)


class AdminObjectNotificationsView(AuthenticatedView):
    NOTIFICATION_LIMIT = 8

    def get(self, request):
        residence = getattr(request, "residence", None)
        if not residence:
            return JsonResponse({"detail": "No residence context."}, status=400)

        if not is_reservations_admin(request.user, residence):
            return JsonResponse(
                {"detail": "No tienes permisos de administrador."}, status=403
            )

        _sync_started_rentals_for_residence(residence)

        now = timezone.now()
        rentals = (
            ObjectRental.objects.filter(
                object__residence=residence,
                status__in=ACTIVE_RENTAL_STATUSES,
                end_date__gt=now,
            )
            .exclude(user=request.user)
            .select_related("object", "user")
            .order_by("-created_at")[: self.NOTIFICATION_LIMIT]
        )

        data = [
            {
                "id": rental.id,
                "title": f"Nueva reserva de {rental.object.name}",
                "message": f"{rental.user.first_name or rental.user.email} ha realizado una reserva.",
                "created_at": rental.created_at.isoformat(),
                "end_time": rental.end_date.isoformat(),
            }
            for rental in rentals
        ]

        return JsonResponse(data, safe=False)


class UserPendingRemindersCountView(AuthenticatedView):
    def get(self, request):
        if not hasattr(request, "residence") or not request.residence:
            return JsonResponse({"detail": "No residence context."}, status=400)

        now = timezone.now()
        window_end = now + timedelta(minutes=15)

        count = ObjectRental.objects.filter(
            user=request.user,
            object__residence=request.residence,
            status__in=ACTIVE_RENTAL_STATUSES,
            end_date__lte=window_end,
            end_date__gt=now,
            reminder_viewed_at__isnull=True,
        ).count()

        return JsonResponse({"count": count})


class UserMarkRemindersAsViewedView(AuthenticatedView):
    def post(self, request):
        if not hasattr(request, "residence") or not request.residence:
            return JsonResponse({"detail": "No residence context."}, status=400)

        now = timezone.now()
        window_end = now + timedelta(minutes=15)

        count = ObjectRental.objects.filter(
            user=request.user,
            object__residence=request.residence,
            status__in=ACTIVE_RENTAL_STATUSES,
            end_date__lte=window_end,
            end_date__gt=now,
            reminder_viewed_at__isnull=True,
        ).update(reminder_viewed_at=now)

        return JsonResponse({
            "message": "Recordatorios marcados como vistos.",
            "marked_count": count
        })
