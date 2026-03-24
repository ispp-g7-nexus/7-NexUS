import json
from django.db.models import Prefetch
from django.db import IntegrityError
from django.http import JsonResponse
from django.views import View
from django.utils.decorators import method_decorator
from django.shortcuts import get_object_or_404
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth import get_user_model
from apps.common.utils.jwt_auth import resolve_user_from_request
from apps.membership.models import Membership
from .models import Bedroom
from .serializers import BedroomSerializer, ResidentSerializer
from .services import delete_bedroom, list_available_bedrooms

NO_RESIDENCE_CONTEXT_DETAIL = "No residence context."


@method_decorator(csrf_exempt, name="dispatch")
class AdminRequiredView(View):
	def dispatch(self, request, *args, **kwargs):
		if not getattr(request, "user", None) or not request.user.is_authenticated:
			user_data = resolve_user_from_request(request)
			if user_data:
				user_model = get_user_model()
				try:
					request.user = user_model.objects.get(id=user_data["id"])
				except user_model.DoesNotExist:
					return JsonResponse({"detail": "User not found."}, status=401)
			else:
				return JsonResponse({"detail": "Authentication credentials were not provided."}, status=401)

		if not getattr(request.user, "is_staff", False):
			return JsonResponse({"detail": "Admin privileges required."}, status=403)

		return super().dispatch(request, *args, **kwargs)


class BedroomListView(AdminRequiredView):
	@staticmethod
	def _with_active_student_residents(queryset):
		active_student_residents = Prefetch(
			"residents",
			queryset=Membership.objects.filter(is_active=True, role__name="Student")
			.select_related("user")
			.order_by("user__first_name", "user__last_name", "user__username"),
			to_attr="active_student_residents",
		)
		return queryset.prefetch_related(active_student_residents)

	def get(self, request, *args, **kwargs):
		if not hasattr(request, "residence") or not request.residence:
			return JsonResponse({"detail": NO_RESIDENCE_CONTEXT_DETAIL}, status=400)

		filters = {}
		tipo = request.GET.get("tipo")
		capacidad_maxima = request.GET.get("capacidad_maxima")

		if tipo:
			filters["tipo"] = tipo
		if capacidad_maxima:
			filters["capacidad_maxima__gte"] = capacidad_maxima

		queryset = Bedroom.objects.filter(**filters)
		serializer = BedroomSerializer(queryset, many=True)
		return JsonResponse(serializer.data, safe=False)


class BedroomCreateView(AdminRequiredView):
	def post(self, request):
		if not hasattr(request, "residence") or not request.residence:
			return JsonResponse({"detail": NO_RESIDENCE_CONTEXT_DETAIL}, status=400)

		if not getattr(request.user, "is_staff", False):
			return JsonResponse({"detail": "Unauthorized"}, status=403)

		try:
			body = json.loads(request.body)
			serializer = BedroomSerializer(data=body)
			if not serializer.is_valid():
				return JsonResponse({"detail": serializer.errors}, status=400)
			bedroom = serializer.save(residence=request.residence)
			return JsonResponse({"id": bedroom.id, "detail": "Bedroom created successfully"}, status=201)
		except IntegrityError:
			return JsonResponse(
				{"detail": "Ya existe una habitación con ese número y edificio en esta residencia."},
				status=409,
			)
		except Exception as e:
			return JsonResponse({"detail": str(e)}, status=400)


class BedroomRetrieveView(AdminRequiredView):
	def get(self, request, bedroom_id):
		if not hasattr(request, "residence") or not request.residence:
			return JsonResponse({"detail": NO_RESIDENCE_CONTEXT_DETAIL}, status=400)

		queryset = BedroomListView._with_active_student_residents(
			Bedroom.objects.filter(residence=request.residence)
		)
		bedroom = get_object_or_404(queryset, id=bedroom_id)
		serializer = BedroomSerializer(bedroom)
		return JsonResponse(serializer.data)


class BedroomUpdateView(AdminRequiredView):
	def put(self, request, bedroom_id):
		if not hasattr(request, "residence") or not request.residence:
			return JsonResponse({"detail": NO_RESIDENCE_CONTEXT_DETAIL}, status=400)

		bedroom = get_object_or_404(Bedroom, id=bedroom_id, residence=request.residence)
		if not getattr(request.user, "is_staff", False):
			return JsonResponse({"detail": "Unauthorized"}, status=403)

		try:
			body = json.loads(request.body)
			serializer = BedroomSerializer(bedroom, data=body, partial=True)
			if not serializer.is_valid():
				return JsonResponse({"detail": serializer.errors}, status=400)
			bedroom = serializer.save()
			return JsonResponse({"id": bedroom.id, "detail": "Bedroom updated successfully"}, status=200)
		except IntegrityError:
			return JsonResponse(
				{"detail": "Ya existe una habitación con ese número y edificio en esta residencia."},
				status=409,
			)
		except Exception as e:
			return JsonResponse({"detail": str(e)}, status=400)


class BedroomDeleteView(AdminRequiredView):
	def delete(self, request, bedroom_id):
		"""Elimina una habitación. Devuelve 409 si tiene residentes activos."""
		try:
			deleted = delete_bedroom(bedroom_id, request.residence)
		except ValueError as exc:
			return JsonResponse({"detail": str(exc)}, status=409)

		if not deleted:
			return JsonResponse({"detail": "Bedroom not found."}, status=404)

		return JsonResponse({"detail": "Bedroom deleted"}, status=200)


class AvailableBedroomsView(AdminRequiredView):
	def get(self, request):
		"""GET /bedrooms/available/?exclude_resident_id=<id>
		Devuelve habitaciones activas con hueco. Si se pasa exclude_resident_id,
		ese residente no cuenta como ocupante (útil al editar).
		"""
		if not hasattr(request, "residence") or not request.residence:
			return JsonResponse({"detail": NO_RESIDENCE_CONTEXT_DETAIL}, status=400)
		exclude_param = request.GET.get("exclude_resident_id")
		exclude_id = int(exclude_param) if exclude_param and exclude_param.isdigit() else None
		data = list_available_bedrooms(request.residence, exclude_membership_id=exclude_id)
		return JsonResponse(data, safe=False)


class BedroomResidentsDetailView(AdminRequiredView):
	def get(self, request, bedroom_id):
		if not hasattr(request, "residence") or not request.residence:
			return JsonResponse({"detail": NO_RESIDENCE_CONTEXT_DETAIL}, status=400)

		bedroom = get_object_or_404(Bedroom, id=bedroom_id, residence=request.residence)
		qs = bedroom.residents.filter(is_active=True, role__name="Student").select_related('user')
		data = [ResidentSerializer.from_membership(m) for m in qs]
		return JsonResponse(data, safe=False)


class BedroomResidentsView(AdminRequiredView):
	def get(self, request):		
		if not hasattr(request, 'residence') or not request.residence:
			return JsonResponse({"detail": NO_RESIDENCE_CONTEXT_DETAIL}, status=400)
		qs = Membership.objects.filter(
			role__name__iexact="Student",
			is_active=True,
			residence=request.residence,
		).select_related('user')
		data = []
		for m in qs:
			user = m.user
			full_name_getter = getattr(user, "get_full_name", None)
			full_name = full_name_getter() if callable(full_name_getter) else str(user)
			data.append({
				'id': m.id,
				'user_id': user.id,
				'full_name': full_name,
				'email': getattr(user, 'email', None),
				'residence_id': m.residence_id,
			})
		return JsonResponse(data, safe=False)


class BuildingListView(AdminRequiredView):
    def get(self, request, *args, **kwargs):
        if not hasattr(request, "residence") or not request.residence:
            return JsonResponse({"detail": NO_RESIDENCE_CONTEXT_DETAIL}, status=400)
        
        buildings = Bedroom.objects.filter(residence=request.residence).values_list("edificio", flat=True).distinct()
        return JsonResponse(list(buildings), safe=False)
