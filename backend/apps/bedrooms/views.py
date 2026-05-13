import json

from django.contrib.auth import get_user_model
from django.db import IntegrityError
from django.db.models import Prefetch
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.utils.decorators import method_decorator
from django.views import View
from django.views.decorators.csrf import csrf_exempt

from apps.common.utils.jwt_auth import resolve_user_from_request
from apps.membership.models import Membership
from apps.membership.permissions import (
    has_screen_permission,
)

from .models import Bedroom, BedroomAuditLog
from .serializers import (
    BedroomAuditLogSerializer,
    BedroomSerializer,
    ResidentSerializer,
)
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
                return JsonResponse(
                    {"detail": "Authentication credentials were not provided."},
                    status=401,
                )

        residence = getattr(request, "residence", None)

        if request.method in ["GET", "OPTIONS", "HEAD"]:
            is_admin = (
                Membership.objects.filter(
                    user=request.user, residence=residence, is_active=True
                )
                .exclude(role__name__iexact="student")
                .exists()
            )
            has_perm = is_admin or has_screen_permission(
                request.user, residence, "rooms"
            )
        else:
            # Para crear, editar o borrar, exigimos el permiso explícito de habitaciones ("rooms")
            has_perm = has_screen_permission(request.user, residence, "rooms")

        if not has_perm:
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
            return JsonResponse({"detail": "No residence context."}, status=400)

        filters = {}
        tipo = request.GET.get("tipo")
        capacidad_maxima = request.GET.get("capacidad_maxima")

        if tipo:
            filters["tipo"] = tipo
        if capacidad_maxima:
            filters["capacidad_maxima__gte"] = capacidad_maxima

        queryset = self._with_active_student_residents(
            Bedroom.objects.filter(residence=request.residence, **filters)
        )
        serializer = BedroomSerializer(queryset, many=True)
        return JsonResponse(serializer.data, safe=False)


class BedroomCreateView(AdminRequiredView):
    def post(self, request):
        if not hasattr(request, "residence") or not request.residence:
            return JsonResponse({"detail": "No residence context."}, status=400)

        try:
            body = json.loads(request.body)
            serializer = BedroomSerializer(data=body)
            if not serializer.is_valid():
                return JsonResponse({"detail": serializer.errors}, status=400)
            bedroom = serializer.save(residence=request.residence)
            BedroomAuditLog.objects.create(
                bedroom=bedroom,
                user=request.user,
                action=BedroomAuditLog.Action.CREATED,
            )
            return JsonResponse(
                {"id": bedroom.id, "detail": "Bedroom created successfully"}, status=201
            )
        except IntegrityError:
            return JsonResponse(
                {
                    "detail": "Ya existe una habitación con ese número y edificio en esta residencia."
                },
                status=409,
            )
        except Exception as e:
            return JsonResponse({"detail": str(e)}, status=400)


class BedroomRetrieveView(AdminRequiredView):
    def get(self, request, bedroom_id):
        if not hasattr(request, "residence") or not request.residence:
            return JsonResponse({"detail": "No residence context."}, status=400)

        queryset = BedroomListView._with_active_student_residents(
            Bedroom.objects.filter(residence=request.residence)
        )
        bedroom = get_object_or_404(queryset, id=bedroom_id)
        serializer = BedroomSerializer(bedroom)
        return JsonResponse(serializer.data)


class BedroomUpdateView(AdminRequiredView):
    def put(self, request, bedroom_id):
        if not hasattr(request, "residence") or not request.residence:
            return JsonResponse({"detail": "No residence context."}, status=400)

        bedroom = get_object_or_404(Bedroom, id=bedroom_id, residence=request.residence)

        try:
            body = json.loads(request.body)
            serializer = BedroomSerializer(bedroom, data=body, partial=True)
            if not serializer.is_valid():
                return JsonResponse({"detail": serializer.errors}, status=400)
            changes = {
                k: {"before": getattr(bedroom, k, None), "after": v}
                for k, v in serializer.validated_data.items()
                if getattr(bedroom, k, None) != v
            }
            bedroom = serializer.save()
            BedroomAuditLog.objects.create(
                bedroom=bedroom,
                user=request.user,
                action=BedroomAuditLog.Action.UPDATED,
                changes=changes,
            )
            return JsonResponse(
                {"id": bedroom.id, "detail": "Bedroom updated successfully"}, status=200
            )
        except IntegrityError:
            return JsonResponse(
                {
                    "detail": "Ya existe una habitación con ese número y edificio en esta residencia."
                },
                status=409,
            )
        except Exception as e:
            return JsonResponse({"detail": str(e)}, status=400)


class BedroomDeleteView(AdminRequiredView):
    def delete(self, request, bedroom_id):
        """Elimina una habitación. Devuelve 409 si tiene residentes activos."""
        if not hasattr(request, "residence") or not request.residence:
            return JsonResponse({"detail": "No residence context."}, status=400)
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
        exclude_id = (
            int(exclude_param) if exclude_param and exclude_param.isdigit() else None
        )
        data = list_available_bedrooms(
            request.residence, exclude_membership_id=exclude_id
        )
        return JsonResponse(data, safe=False)


class BedroomResidentsDetailView(AdminRequiredView):
    def get(self, request, bedroom_id):
        if not hasattr(request, "residence") or not request.residence:
            return JsonResponse({"detail": "No residence context."}, status=400)

        bedroom = get_object_or_404(Bedroom, id=bedroom_id, residence=request.residence)
        qs = bedroom.residents.filter(
            is_active=True, role__name="Student"
        ).select_related("user")
        data = [ResidentSerializer.from_membership(m) for m in qs]
        return JsonResponse(data, safe=False)


class BedroomResidentsView(AdminRequiredView):
    def get(self, request):
        if not hasattr(request, "residence") or not request.residence:
            return JsonResponse({"detail": "No residence context."}, status=400)
        qs = Membership.objects.filter(
            role__name__iexact="Student",
            is_active=True,
            residence=request.residence,
        ).select_related("user")
        data = []
        for m in qs:
            user = m.user
            data.append(
                {
                    "id": m.id,
                    "user_id": user.id,
                    "full_name": getattr(user, "get_full_name", lambda: str(user))(),
                    "email": getattr(user, "email", None),
                    "residence_id": m.residence_id,
                }
            )
        return JsonResponse(data, safe=False)


class BuildingListView(AdminRequiredView):
    def get(self, request, *args, **kwargs):
        if not hasattr(request, "residence") or not request.residence:
            return JsonResponse({"detail": "No residence context."}, status=400)

        buildings = (
            Bedroom.objects.filter(residence=request.residence)
            .values_list("edificio", flat=True)
            .distinct()
        )
        return JsonResponse(list(buildings), safe=False)


class BedroomAuditLogView(AdminRequiredView):
    def get(self, request, bedroom_id):
        if not hasattr(request, "residence") or not request.residence:
            return JsonResponse({"detail": "No residence context."}, status=400)
        bedroom = get_object_or_404(Bedroom, id=bedroom_id, residence=request.residence)
        logs = bedroom.audit_logs.select_related("user").all()
        serializer = BedroomAuditLogSerializer(logs, many=True)
        return JsonResponse(serializer.data, safe=False)


class BedroomAnalyticsView(AdminRequiredView):
    required_permission = "analytics"
    strict_permission = True

    def get(self, request):
        from django.db.models import Count
        from django.db.models.functions import ExtractYear

        from apps.membership.models import Membership

        if not hasattr(request, "residence") or not request.residence:
            return JsonResponse({"detail": "No residence context."}, status=400)

        residence = request.residence

        # Active student memberships with bedroom assigned
        active_students = Membership.objects.filter(
            residence=residence,
            role__name__iexact="Student",
            is_active=True,
            bedroom__isnull=False,
        )

        # Map bedroom_id -> occupant count
        bedroom_occupant_map = {
            item["bedroom_id"]: item["occupants"]
            for item in active_students.values("bedroom_id").annotate(
                occupants=Count("id")
            )
        }

        # All bedrooms for this residence
        all_bedrooms = list(
            Bedroom.objects.filter(residence=residence).values(
                "id", "edificio", "tipo", "capacidad_maxima"
            )
        )

        # --- Occupation by building ---
        buildings: dict = {}
        for b in all_bedrooms:
            key = b["edificio"] or "Sin edificio"
            if key not in buildings:
                buildings[key] = {
                    "total_rooms": 0,
                    "total_capacity": 0,
                    "occupied_rooms": 0,
                    "occupants": 0,
                }
            buildings[key]["total_rooms"] += 1
            buildings[key]["total_capacity"] += b["capacidad_maxima"]
            occ = bedroom_occupant_map.get(b["id"], 0)
            buildings[key]["occupants"] += occ
            if occ > 0:
                buildings[key]["occupied_rooms"] += 1

        occupation_by_building = sorted(
            [
                {
                    "edificio": key,
                    "total_rooms": data["total_rooms"],
                    "total_capacity": data["total_capacity"],
                    "occupied_rooms": data["occupied_rooms"],
                    "occupants": data["occupants"],
                    "occupation_rate": round(
                        data["occupants"] / data["total_capacity"] * 100, 1
                    )
                    if data["total_capacity"] > 0
                    else 0.0,
                }
                for key, data in buildings.items()
            ],
            key=lambda x: x["edificio"],
        )

        # --- Occupation by room type ---
        tipos: dict = {}
        for b in all_bedrooms:
            key = b["tipo"]
            if key not in tipos:
                tipos[key] = {"total_rooms": 0, "total_capacity": 0, "occupants": 0}
            tipos[key]["total_rooms"] += 1
            tipos[key]["total_capacity"] += b["capacidad_maxima"]
            tipos[key]["occupants"] += bedroom_occupant_map.get(b["id"], 0)

        occupation_by_type = [
            {
                "tipo": key,
                "total_rooms": data["total_rooms"],
                "total_capacity": data["total_capacity"],
                "occupants": data["occupants"],
                "occupation_rate": round(
                    data["occupants"] / data["total_capacity"] * 100, 1
                )
                if data["total_capacity"] > 0
                else 0.0,
            }
            for key, data in tipos.items()
        ]

        # --- Occupation index by year (student assignments per year) ---
        yearly_qs = (
            Membership.objects.filter(
                residence=residence,
                role__name__iexact="Student",
                bedroom__isnull=False,
            )
            .annotate(year=ExtractYear("created_at"))
            .values("year")
            .annotate(assignments=Count("id"))
            .order_by("year")
        )

        occupation_by_year = [
            {"year": item["year"], "assignments": item["assignments"]}
            for item in yearly_qs
            if item["year"] is not None
        ]

        # --- Summary ---
        total_rooms = len(all_bedrooms)
        total_capacity = sum(b["capacidad_maxima"] for b in all_bedrooms)
        total_occupants = active_students.count()

        return JsonResponse(
            {
                "summary": {
                    "total_rooms": total_rooms,
                    "total_capacity": total_capacity,
                    "total_occupants": total_occupants,
                    "overall_occupation_rate": round(
                        total_occupants / total_capacity * 100, 1
                    )
                    if total_capacity > 0
                    else 0.0,
                },
                "occupation_by_building": occupation_by_building,
                "occupation_by_type": occupation_by_type,
                "occupation_by_year": occupation_by_year,
            }
        )
