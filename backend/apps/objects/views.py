import json
import re
from django.http import JsonResponse
from django.views import View
from django.utils.decorators import method_decorator
from .models import Object, ObjectRental
from django.db.utils import IntegrityError
from django.db import transaction
from django.contrib.auth import get_user_model
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from apps.common.utils.jwt_auth import resolve_user_from_request
from django.db.models import Count, Q
from apps.membership.models import Membership


OBJECT_NAME_PATTERN = re.compile(r"^[\w\-\.\(\), ]+$")


def _is_admin_for_residence(user, residence) -> bool:
    if getattr(user, "is_staff", False):
        return True

    return Membership.objects.filter(
        user=user,
        is_active=True,
    ).filter(
        Q(role__name__iexact="residence_admin", residence=residence)
        | Q(role__name__iexact="portfolio_admin")
    ).exists()


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
    is_available_now = obj.can_rent()
    rentals_count = getattr(obj, "rentals_count", obj.rentals.count())
    return {
        'id': obj.id,
        'name': obj.name,
        'description': obj.description,
        'location': obj.location,
        'availability': is_available_now,
        'lending_enabled': obj.available,
        'is_enabled': obj.available,
        'image_url': obj.image_url,
        'tags': obj.tags,
        'rentals_count': rentals_count,
        'can_rent': is_available_now,
    }


@method_decorator(csrf_exempt, name='dispatch')
class AuthenticatedView(View):
    def dispatch(self, request, *args, **kwargs):
        if not request.user.is_authenticated:
            user_data = resolve_user_from_request(request)
            if user_data:
                User = get_user_model()
                try:
                    request.user = User.objects.get(id=user_data['id'])
                except User.DoesNotExist:
                    return JsonResponse({"detail": "User not found."}, status=401)
            else:
                return JsonResponse({"detail": "Authentication credentials were not provided."}, status=401)
        return super().dispatch(request, *args, **kwargs)


class ObjectListView(AuthenticatedView):
    def get(self, request):
        if not hasattr(request, 'residence') or not request.residence:
            return JsonResponse({"detail": "No residence context."}, status=400)

        objs = Object.objects.filter(residence=request.residence).annotate(
            rentals_count=Count("rentals")
        )
        data = [_serialize_object(obj) for obj in objs]
        return JsonResponse(data, safe=False)

    def post(self, request):
        if not hasattr(request, 'residence') or not request.residence:
            return JsonResponse({"detail": "No residence context."}, status=400)
        if not request.user.is_staff:
            return JsonResponse({"detail": "No tienes permisos para crear objetos."}, status=403)
        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({"detail": "JSON inválido."}, status=400)

        name, name_error = _validate_object_name(body.get("name"))
        if name_error:
            return JsonResponse({"detail": name_error}, status=400)

        try:
            obj = Object.objects.create(
                name=name,
                description=body.get('description', ''),
                location=body.get('location', ''),
                image_url=body.get('image_url', None),
                tags=body.get('tags', ''),
                residence=request.residence,
            )
            return JsonResponse({'id': obj.id, 'detail': 'Object created successfully'}, status=201)
        except Exception as e:
            return JsonResponse({"detail": str(e)}, status=400)


def get_residence_object(request, object_id):
    if not hasattr(request, 'residence') or not request.residence:
        return None, JsonResponse({"detail": "No residence context."}, status=400)
    try:
        return Object.objects.get(id=object_id, residence=request.residence), None
    except Object.DoesNotExist:
        return None, JsonResponse({"detail": "Objeto no encontrado."}, status=404)


class ObjectDetailView(AuthenticatedView):
    def get(self, request, object_id):
        if not hasattr(request, 'residence') or not request.residence:
            return JsonResponse({"detail": "No residence context."}, status=400)
        obj, error_response = get_residence_object(request, object_id)
        if error_response:
            return error_response
        return JsonResponse(_serialize_object(obj))

    def delete(self, request, object_id):
        if not hasattr(request, 'residence') or not request.residence:
            return JsonResponse({"detail": "No residence context."}, status=400)
        obj, error_response = get_residence_object(request, object_id)
        if error_response:
            return error_response
        if not request.user.is_staff:
            return JsonResponse({"detail": "Unauthorized"}, status=403)
        try:
            obj.delete()
            return JsonResponse({"detail": "Object deleted"}, status=200)
        except IntegrityError:
            return JsonResponse({"detail": "No se puede eliminar el objeto por dependencias activas."}, status=400)
        except Exception as e:
            return JsonResponse({"detail": str(e)}, status=500)


class ObjectReserveView(AuthenticatedView):
    def post(self, request, object_id):
        if not hasattr(request, 'residence') or not request.residence:
            return JsonResponse({"detail": "No residence context."}, status=400)

        try:
            body = json.loads(request.body or "{}")
        except json.JSONDecodeError:
            return JsonResponse({"detail": "El cuerpo de la petición no es JSON válido."}, status=400)

        start = _parse_datetime_or_none(body.get('start_date'))
        end = _parse_datetime_or_none(body.get('end_date'))
        if not start or not end:
            return JsonResponse({"detail": "start_date y end_date son requeridos."}, status=400)
        if start >= end:
            return JsonResponse({"detail": "La fecha de fin debe ser posterior a la de inicio."}, status=400)
        if start < timezone.now():
            return JsonResponse({"detail": "No se pueden crear reservas en el pasado."}, status=400)

        try:
            with transaction.atomic():
                obj, error_response = get_residence_object(request, object_id)
                if error_response:
                    return error_response

                if not obj.available:
                    return JsonResponse({"detail": "Este objeto no está disponible para préstamo."}, status=400)

                overlapping = ObjectRental.objects.select_for_update().filter(
                    object=obj,
                    start_date__lt=end,
                    end_date__gt=start,
                ).exists()

                if overlapping:
                    return JsonResponse({"detail": "No hay disponibilidad para ese horario."}, status=400)

                rental = ObjectRental.objects.create(
                    object=obj,
                    user=request.user,
                    start_date=start,
                    end_date=end,
                )
            return JsonResponse({"id": rental.id, "detail": "Reserva creada."}, status=201)
        except IntegrityError:
            return JsonResponse({"detail": "Ya tienes una reserva conflictiva."}, status=400)
        except Exception as e:
            return JsonResponse({"detail": str(e)}, status=400)


class ObjectCancelView(AuthenticatedView):
    def post(self, request, object_id):
        if not hasattr(request, 'residence') or not request.residence:
            return JsonResponse({"detail": "No residence context."}, status=400)

        obj, error_response = get_residence_object(request, object_id)
        if error_response:
            return error_response
        try:
            try:
                body = json.loads(request.body) if request.body else {}
            except json.JSONDecodeError:
                body = {}
            rental_id = body.get('rental_id')
            if rental_id:
                deleted, _ = ObjectRental.objects.filter(id=rental_id, object=obj, user=request.user).delete()
            else:
                deleted, _ = ObjectRental.objects.filter(
                    object=obj,
                    user=request.user,
                    end_date__gt=timezone.now(),
                ).delete()

            if deleted:
                return JsonResponse({"detail": "Reserva cancelada."}, status=200)
            return JsonResponse({"detail": "No existe reserva para este usuario y objeto."}, status=400)
        except Exception as e:
            return JsonResponse({"detail": str(e)}, status=400)


class ObjectRentalsView(AuthenticatedView):
    def get(self, request, object_id):
        if not hasattr(request, 'residence') or not request.residence:
            return JsonResponse({"detail": "No residence context."}, status=400)
        obj, error_response = get_residence_object(request, object_id)
        if error_response:
            return error_response
        rentals = obj.rentals.select_related('user').all()
        data = []
        for r in rentals:
            data.append({
                'id': r.id,
                'start_date': r.start_date.isoformat(),
                'end_date': r.end_date.isoformat(),
                'user': {
                    'id': r.user.id,
                    'first_name': getattr(r.user, 'first_name', ''),
                    'last_name': getattr(r.user, 'last_name', ''),
                }
            })
        return JsonResponse(data, safe=False)


class UserReservationsView(AuthenticatedView):
    def get(self, request):
        if not hasattr(request, 'residence') or not request.residence:
            return JsonResponse({"detail": "No residence context."}, status=400)

        rentals = ObjectRental.objects.filter(
            user=request.user,
            object__residence=request.residence
        ).select_related('object').order_by('-start_date')

        data = []
        for rental in rentals:
            data.append({
                'rental': {
                    'id': rental.id,
                    'start_date': rental.start_date.isoformat(),
                    'end_date': rental.end_date.isoformat(),
                    'user': {
                        'id': rental.user.id,
                        'first_name': rental.user.first_name,
                        'last_name': rental.user.last_name,
                    }
                },
                'object': _serialize_object(rental.object),
            })
        return JsonResponse(data, safe=False)


class AdminObjectNotificationsView(AuthenticatedView):
    NOTIFICATION_LIMIT = 8

    def get(self, request):
        residence = getattr(request, "residence", None)
        if not residence:
            return JsonResponse({"detail": "No residence context."}, status=400)

        if not _is_admin_for_residence(request.user, residence):
            return JsonResponse({"detail": "No tienes permisos de administrador."}, status=403)

        now = timezone.now()
        rentals = (
            ObjectRental.objects.filter(
                object__residence=residence,
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