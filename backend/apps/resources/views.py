import json
from django.http import JsonResponse
from django.views import View
from django.utils.decorators import method_decorator
from django.shortcuts import get_object_or_404
from django.db.utils import IntegrityError
from django.contrib.auth import get_user_model
from django.views.decorators.csrf import csrf_exempt
from django.utils.dateparse import parse_datetime
from django.utils import timezone

from apps.common.utils.jwt_auth import resolve_user_from_request
from .models import Recurso, Reserva




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


# ──────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────

def _recurso_data(recurso):
    return {
        'id': recurso.id,
        'nombre': recurso.nombre,
        'tipo': recurso.tipo,
        'aforo_maximo': recurso.aforo_maximo,
        'descripcion': recurso.descripcion,
    }


def _reserva_data(reserva):
    return {
        'id': reserva.id,
        'fecha_inicio': reserva.fecha_inicio.isoformat(),
        'fecha_fin': reserva.fecha_fin.isoformat(),
        'estado': reserva.estado,
        'recurso': _recurso_data(reserva.id_recurso),
        'usuario': {
            'id': reserva.id_usuario.id,
            'first_name': reserva.id_usuario.first_name,
            'last_name': reserva.id_usuario.last_name,
        },
    }


def _validate_fechas(start_time, end_time, check_past=True):
    """Returns (start_dt, end_dt, error_response) — error_response is None if OK."""
    if not start_time or not end_time:
        return None, None, JsonResponse({"detail": "Se requiere fecha de inicio y fin."}, status=400)

    start_dt = parse_datetime(start_time)
    end_dt = parse_datetime(end_time)

    if not start_dt or not end_dt:
        return None, None, JsonResponse({"detail": "Formato de fecha inválido."}, status=400)

    if check_past and start_dt < timezone.now():
        return None, None, JsonResponse({"detail": "La fecha de inicio no puede ser en el pasado."}, status=400)

    if end_dt <= start_dt:
        return None, None, JsonResponse({"detail": "La fecha de fin debe ser posterior a la de inicio."}, status=400)

    return start_dt, end_dt, None


def _check_overlap(recurso, start_dt, end_dt, exclude_reserva_id=None):
    """Returns True if there is an overlapping confirmed/pending reservation for this resource."""
    qs = Reserva.objects.filter(
        id_recurso=recurso,
        estado__in=['pendiente', 'confirmada'],
        fecha_inicio__lt=end_dt,
        fecha_fin__gt=start_dt,
    )
    if exclude_reserva_id:
        qs = qs.exclude(id=exclude_reserva_id)
    return qs.exists()


# ──────────────────────────────────────────────
# Recurso views
# ──────────────────────────────────────────────

class RecursoListView(AuthenticatedView):
    """GET /recursos/  — list resources of the residence
       POST /recursos/ — create a new resource (staff only)
    """

    def get(self, request):
        if not hasattr(request, 'residence') or not request.residence:
            return JsonResponse({"detail": "No residence context."}, status=400)

        recursos = Recurso.objects.filter(id_residencia=request.residence)
        return JsonResponse([_recurso_data(r) for r in recursos], safe=False)

    def post(self, request):
        if not hasattr(request, 'residence') or not request.residence:
            return JsonResponse({"detail": "No residence context."}, status=400)

        if not getattr(request.user, 'is_staff', False):
            return JsonResponse({"detail": "Solo el staff puede crear recursos."}, status=403)

        try:
            body = json.loads(request.body)
            recurso = Recurso.objects.create(
                nombre=body.get('nombre'),
                tipo=body.get('tipo'),
                aforo_maximo=body.get('aforo_maximo'),
                descripcion=body.get('descripcion', ''),
                id_residencia=request.residence,
            )
            return JsonResponse({'id': recurso.id, 'detail': 'Recurso creado correctamente.'}, status=201)
        except Exception as e:
            return JsonResponse({"detail": str(e)}, status=400)


class RecursoDetailView(AuthenticatedView):
    """GET /recursos/<id>/    — detail
       PUT /recursos/<id>/    — update (staff only)
       DELETE /recursos/<id>/ — delete (staff only)
    """

    def get(self, request, recurso_id):
        recurso = get_object_or_404(Recurso, id=recurso_id, id_residencia=request.residence)
        return JsonResponse(_recurso_data(recurso))

    def put(self, request, recurso_id):
        recurso = get_object_or_404(Recurso, id=recurso_id, id_residencia=request.residence)

        if not getattr(request.user, 'is_staff', False):
            return JsonResponse({"detail": "Solo el staff puede editar recursos."}, status=403)

        try:
            body = json.loads(request.body)
            recurso.nombre = body.get('nombre', recurso.nombre)
            recurso.tipo = body.get('tipo', recurso.tipo)
            recurso.aforo_maximo = body.get('aforo_maximo', recurso.aforo_maximo)
            recurso.descripcion = body.get('descripcion', recurso.descripcion)
            recurso.save()
            return JsonResponse({'id': recurso.id, 'detail': 'Recurso actualizado correctamente.'})
        except Exception as e:
            return JsonResponse({"detail": str(e)}, status=400)

    def delete(self, request, recurso_id):
        recurso = get_object_or_404(Recurso, id=recurso_id, id_residencia=request.residence)

        if not getattr(request.user, 'is_staff', False):
            return JsonResponse({"detail": "Solo el staff puede eliminar recursos."}, status=403)

        recurso.delete()
        return JsonResponse({"detail": "Recurso eliminado."}, status=200)


# ──────────────────────────────────────────────
# Reserva views
# ──────────────────────────────────────────────

class ReservaListView(AuthenticatedView):
    """GET /reservas/  — list own reservations (or all if staff)
       POST /reservas/ — create a reservation
    """

    def get(self, request):
        if not hasattr(request, 'residence') or not request.residence:
            return JsonResponse({"detail": "No residence context."}, status=400)

        if getattr(request.user, 'is_staff', False):
            reservas = Reserva.objects.filter(
                id_recurso__id_residencia=request.residence
            ).select_related('id_recurso', 'id_usuario')
        else:
            reservas = Reserva.objects.filter(
                id_usuario=request.user,
                id_recurso__id_residencia=request.residence
            ).select_related('id_recurso', 'id_usuario')

        return JsonResponse([_reserva_data(r) for r in reservas], safe=False)

    def post(self, request):
        if not hasattr(request, 'residence') or not request.residence:
            return JsonResponse({"detail": "No residence context."}, status=400)

        try:
            body = json.loads(request.body)

            start_dt, end_dt, err = _validate_fechas(body.get('fecha_inicio'), body.get('fecha_fin'))
            if err:
                return err

            recurso_id = body.get('id_recurso')
            if not recurso_id:
                return JsonResponse({"detail": "Se requiere id_recurso."}, status=400)

            recurso = get_object_or_404(Recurso, id=recurso_id, id_residencia=request.residence)

            if _check_overlap(recurso, start_dt, end_dt):
                return JsonResponse({"detail": "El recurso ya está reservado en ese horario."}, status=400)

            reserva = Reserva.objects.create(
                id_usuario=request.user,
                id_recurso=recurso,
                fecha_inicio=start_dt,
                fecha_fin=end_dt,
                estado='pendiente',
            )
            return JsonResponse({'id': reserva.id, 'detail': 'Reserva creada correctamente.'}, status=201)
        except Exception as e:
            return JsonResponse({"detail": str(e)}, status=400)


class ReservaDetailView(AuthenticatedView):
    """GET /reservas/<id>/    — detail
       PUT /reservas/<id>/    — update dates/estado (owner or staff)
       DELETE /reservas/<id>/ — cancel (owner or staff)
    """

    def _get_reserva_or_403(self, request, reserva_id):
        reserva = get_object_or_404(
            Reserva,
            id=reserva_id,
            id_recurso__id_residencia=request.residence
        )
        can_manage = reserva.id_usuario == request.user or getattr(request.user, 'is_staff', False)
        if not can_manage:
            return None, JsonResponse({"detail": "No tienes permiso para esta reserva."}, status=403)
        return reserva, None

    def get(self, request, reserva_id):
        reserva, err = self._get_reserva_or_403(request, reserva_id)
        if err:
            return err
        return JsonResponse(_reserva_data(reserva))

    def put(self, request, reserva_id):
        reserva, err = self._get_reserva_or_403(request, reserva_id)
        if err:
            return err

        if reserva.estado == 'cancelada':
            return JsonResponse({"detail": "No se puede editar una reserva cancelada."}, status=400)

        try:
            body = json.loads(request.body)

            # Allow partial date updates
            fecha_inicio_str = body.get('fecha_inicio', reserva.fecha_inicio.isoformat())
            fecha_fin_str = body.get('fecha_fin', reserva.fecha_fin.isoformat())

            start_dt, end_dt, err = _validate_fechas(fecha_inicio_str, fecha_fin_str, check_past=False)
            if err:
                return err

            if _check_overlap(reserva.id_recurso, start_dt, end_dt, exclude_reserva_id=reserva.id):
                return JsonResponse({"detail": "El recurso ya está reservado en ese horario."}, status=400)

            reserva.fecha_inicio = start_dt
            reserva.fecha_fin = end_dt

            # Staff can also change estado
            if getattr(request.user, 'is_staff', False) and 'estado' in body:
                new_estado = body['estado']
                valid_estados = [choice[0] for choice in Reserva.ESTADO_CHOICES]
                if new_estado not in valid_estados:
                    return JsonResponse({"detail": f"Estado inválido. Opciones: {valid_estados}"}, status=400)
                reserva.estado = new_estado

            reserva.save()
            return JsonResponse({'id': reserva.id, 'detail': 'Reserva actualizada correctamente.'})
        except Exception as e:
            return JsonResponse({"detail": str(e)}, status=400)

    def delete(self, request, reserva_id):
        reserva, err = self._get_reserva_or_403(request, reserva_id)
        if err:
            return err

        if reserva.estado == 'cancelada':
            return JsonResponse({"detail": "La reserva ya está cancelada."}, status=400)

        reserva.estado = 'cancelada'
        reserva.save()
        return JsonResponse({"detail": "Reserva cancelada correctamente."}, status=200)


class ReservasByRecursoView(AuthenticatedView):
    """GET /recursos/<id>/reservas/ — list reservations for a specific resource"""

    def get(self, request, recurso_id):
        recurso = get_object_or_404(Recurso, id=recurso_id, id_residencia=request.residence)
        reservas = recurso.reservas.select_related('id_usuario').filter(
            estado__in=['pendiente', 'confirmada']
        )
        return JsonResponse([_reserva_data(r) for r in reservas], safe=False)
