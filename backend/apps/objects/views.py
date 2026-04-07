import json
import re
from datetime import datetime, time, timedelta
from typing import Any
from django.http import HttpResponse, JsonResponse
from django.views import View
from django.utils.decorators import method_decorator
from .models import Object, ObjectLabel, ObjectRental
from django.db.utils import IntegrityError
from django.db import OperationalError, ProgrammingError
from django.db import transaction

from django.contrib.auth import get_user_model
from django.db import transaction
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

OBJECT_NAME_PATTERN = re.compile(r"^[\w\-\.\(\), ]+$")
OBJECT_RESERVATION_INTERVAL_MINUTES = 60


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


def _serialize_object(obj):
    now = timezone.now()
    current_reserved_stock = obj.rentals.filter(
        status='ACTIVE',
        start_date__lt=now,
        end_date__gt=now,
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


def _count_active_rentals_in_interval(*, obj: Object, interval_start: datetime, interval_end: datetime) -> int:
    return obj.rentals.filter(
        status="ACTIVE",
        start_date__lt=interval_end,
        end_date__gt=interval_start,
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

    interval = timedelta(minutes=OBJECT_RESERVATION_INTERVAL_MINUTES)
    now = timezone.now()
    slots: list[dict[str, str]] = []

    current = day_start
    while current + interval <= day_end:
        slot_end = current + interval
        is_past = current < now
        active_rentals = _count_active_rentals_in_interval(
            obj=obj,
            interval_start=current,
            interval_end=slot_end,
        )
        available_stock = max(obj.stock_total - active_rentals, 0)

        slots.append(
            {
                "start_time": current.isoformat(),
                "end_time": slot_end.isoformat(),
                "available_stock": available_stock,
                "status": "past" if is_past else ("available" if available_stock > 0 else "occupied"),
            }
        )
        current = slot_end

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
            stock_total = int(raw_stock_total or 1)
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
                status="ACTIVE",
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
                "object": _serialize_object(obj),
                "reservations": [_serialize_object_reservation(item) for item in reservations],
                "available_slots": _compute_object_available_slots(target_date=target_date, obj=obj, reservations=reservations),
            }
        )


class ObjectReserveView(AuthenticatedView):
    def post(self, request, object_id):
        if not hasattr(request, "residence") or not request.residence:
            return JsonResponse({"detail": "No residence context."}, status=400)

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
        if any(
            [
                start.minute,
                start.second,
                start.microsecond,
                end.minute,
                end.second,
                end.microsecond,
            ]
        ):
            return JsonResponse(
                {"detail": "Las reservas deben comenzar y terminar en punto (HH:00)."},
                status=400,
            )
        if (end - start) != timedelta(hours=1):
            return JsonResponse(
                {"detail": "Las reservas de objetos deben ser de exactamente 1 hora."},
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
                    status='ACTIVE',
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

                active_rentals_in_slot = ObjectRental.objects.filter(
                    object=obj,
                    status='ACTIVE',
                    start_date__lt=end,
                    end_date__gt=start,
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

        obj, error_response = get_residence_object(request, object_id)
        if error_response:
            return error_response
        try:
            body = json.loads(request.body) if request.body else {}
            rental_id = body.get("rental_id")
            if rental_id:
                updated = ObjectRental.objects.filter(
                    id=rental_id, object=obj, user=request.user, status__in=["ACTIVE"]
                ).update(status="CANCELLED")
            else:
                updated = ObjectRental.objects.filter(
                    object=obj,
                    user=request.user,
                    status="ACTIVE",
                    end_date__gt=timezone.now(),
                ).update(status="CANCELLED")

            if updated:
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
        cancelled = []
        completed = []

        for r in rentals:
            rental_data = {
                "id": r.id,
                "start_date": r.start_date.isoformat(),
                "end_date": r.end_date.isoformat(),
                "status": r.status,
                "created_at": r.created_at.isoformat(),
                "updated_at": r.updated_at.isoformat(),
                "user": {
                    "id": r.user.id,
                    "first_name": getattr(r.user, "first_name", ""),
                    "last_name": getattr(r.user, "last_name", ""),
                },
            }

            if r.status == "CANCELLED":
                cancelled.append(rental_data)
            elif r.status == "COMPLETED" or r.end_date <= now:
                completed.append(rental_data)
            else:  # ACTIVE
                active.append(rental_data)

        active.sort(key=lambda x: x["start_date"], reverse=True)
        cancelled.sort(key=lambda x: x["updated_at"], reverse=True)
        completed.sort(key=lambda x: x["end_date"], reverse=True)

        return JsonResponse(
            {
                "active": active,
                "cancelled": cancelled,
                "completed": completed,
            }
        )


class UserReservationsView(AuthenticatedView):
    def get(self, request):
        if not hasattr(request, "residence") or not request.residence:
            return JsonResponse({"detail": "No residence context."}, status=400)

        now = timezone.now()

        rentals = (
            ObjectRental.objects.filter(
                user=request.user,
                object__residence=request.residence,
                status="ACTIVE",
                end_date__gt=now,
            )
            .select_related("object")
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

        now = timezone.now()
        rentals = (
            ObjectRental.objects.filter(
                object__residence=residence,
                status="ACTIVE",
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
            status="ACTIVE",
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
            status="ACTIVE",
            end_date__lte=window_end,
            end_date__gt=now,
            reminder_viewed_at__isnull=True,
        ).update(reminder_viewed_at=now)

        return JsonResponse({
            "message": "Recordatorios marcados como vistos.",
            "marked_count": count
        })
