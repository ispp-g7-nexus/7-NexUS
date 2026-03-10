import json
from django.http import JsonResponse
from django.views import View
from django.utils.decorators import method_decorator
from django.shortcuts import get_object_or_404
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth import get_user_model
from apps.common.utils.jwt_auth import resolve_user_from_request
from apps.membership.models import Membership
from .models import Bedroom
from .serializers import BedroomSerializer
from .services import delete_bedroom, list_available_bedrooms


@method_decorator(csrf_exempt, name="dispatch")
class AdminRequiredView(View):
	def dispatch(self, request, *args, **kwargs):
		if not getattr(request, "user", None) or not request.user.is_authenticated:
			user_data = resolve_user_from_request(request)
			if user_data:
				User = get_user_model()
				try:
					request.user = User.objects.get(id=user_data["id"])
				except User.DoesNotExist:
					return JsonResponse({"detail": "User not found."}, status=401)
			else:
				return JsonResponse({"detail": "Authentication credentials were not provided."}, status=401)

		if not getattr(request.user, "is_staff", False):
			return JsonResponse({"detail": "Admin privileges required."}, status=403)

		return super().dispatch(request, *args, **kwargs)


class BedroomListView(AdminRequiredView):
	def get(self, request):
		if not hasattr(request, "residence") or not request.residence:
			return JsonResponse({"detail": "No residence context."}, status=400)

		bedrooms = Bedroom.objects.filter(residence=request.residence)
		data = []
		for b in bedrooms:
			data.append({
				"id": b.id,
				"numero": b.numero,
				"edificio": b.edificio,
				"planta": b.planta,
				"capacidad_maxima": b.capacidad_maxima,
				"tipo": b.tipo,
				"is_active": b.is_active,
				"created_at": b.created_at.isoformat(),
				"updated_at": b.updated_at.isoformat(),
			})
		return JsonResponse(data, safe=False)


class BedroomCreateView(AdminRequiredView):
	def post(self, request):
		if not hasattr(request, "residence") or not request.residence:
			return JsonResponse({"detail": "No residence context."}, status=400)

		if not getattr(request.user, "is_staff", False):
			return JsonResponse({"detail": "Unauthorized"}, status=403)

		try:
			body = json.loads(request.body)
			serializer = BedroomSerializer(data=body)
			if not serializer.is_valid():
				return JsonResponse({"detail": serializer.errors}, status=400)
			bedroom = serializer.save(residence=request.residence)
			return JsonResponse({"id": bedroom.id, "detail": "Bedroom created successfully"}, status=201)
		except Exception as e:
			return JsonResponse({"detail": str(e)}, status=400)


class BedroomRetrieveView(AdminRequiredView):
	def get(self, request, bedroom_id):
		bedroom = get_object_or_404(Bedroom, id=bedroom_id, residence=request.residence)
		return JsonResponse({
			"id": bedroom.id,
			"numero": bedroom.numero,
			"planta": bedroom.planta,
			"capacidad_maxima": bedroom.capacidad_maxima,
			"tipo": bedroom.tipo,
			"is_active": bedroom.is_active,
			"created_at": bedroom.created_at.isoformat(),
			"updated_at": bedroom.updated_at.isoformat(),
		})


class BedroomUpdateView(AdminRequiredView):
	def put(self, request, bedroom_id):
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
			return JsonResponse({"detail": "No residence context."}, status=400)
		exclude_param = request.GET.get("exclude_resident_id")
		exclude_id = int(exclude_param) if exclude_param and exclude_param.isdigit() else None
		data = list_available_bedrooms(request.residence, exclude_membership_id=exclude_id)
		return JsonResponse(data, safe=False)


class BedroomResidentsView(AdminRequiredView):
	def get(self, request):		
		if not hasattr(request, 'residence') or not request.residence:
			return JsonResponse({"detail": "No residence context."}, status=400)
		qs = Membership.objects.filter(
			role__name__iexact="Student",
			is_active=True,
			residence=request.residence,
		).select_related('user')
		data = []
		for m in qs:
			user = m.user
			data.append({
				'id': m.id,
				'user_id': user.id,
				'full_name': getattr(user, 'get_full_name', lambda: str(user))(),
				'email': getattr(user, 'email', None),
				'residence_id': m.residence_id,
			})
		return JsonResponse(data, safe=False)
