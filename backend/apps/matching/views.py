from __future__ import annotations

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.membership.models import Membership
from apps.onboarding.models import ResidentPreference

from .models import ResidenceCompatibility


def _masked_display_name(first_name: str, last_name: str, email: str) -> str:
    safe_first_name = (first_name or "").strip()
    safe_last_name = (last_name or "").strip()
    safe_email = (email or "").strip()

    if safe_first_name and safe_last_name:
        return f"{safe_first_name} {safe_last_name[0].upper()}..."
    if safe_first_name:
        return safe_first_name
    if safe_email:
        local_part = safe_email.split("@", 1)[0]
        return local_part[:1].upper() + local_part[1:] if local_part else "Residente"
    return "Residente"


class MyMatchesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        membership = self._get_membership(request)
        if not membership:
            return Response(
                {"detail": "No resident membership found for current context."},
                status=status.HTTP_404_NOT_FOUND,
            )

        response = self._validate_readiness(membership)
        if response:
            return response

        rows = ResidenceCompatibility.objects.filter(
            residence_id=membership.residence_id,
            source_membership_id=membership.id,
        ).select_related(
            "target_membership__user", "target_membership__resident_preferences"
        )

        if not rows.exists():
            return Response(
                {
                    "status": "processing",
                    "message": "Estamos buscando entre todos los residentes quienes son tus mejores matches.",
                    "matches": [],
                }
            )

        limit = self._get_limit(request)
        matches = [self._format_match(row) for row in rows.order_by("-score")[:limit]]

        return Response(
            {
                "status": "ready",
                "message": "Matches disponibles.",
                "matches": matches,
            }
        )

    def _get_membership(self, request):
        residence = getattr(request, "residence", None)
        memberships = Membership.objects.filter(
            user=request.user,
            role__name__iexact="Student",
            is_active=True,
        ).select_related("residence")

        if residence:
            memberships = memberships.filter(residence_id=residence.id)

        return memberships.order_by("id").first()

    def _validate_readiness(self, membership):
        preference = ResidentPreference.objects.filter(membership=membership).first()
        if not preference or not preference.is_completed:
            return Response(
                {
                    "status": "onboarding_pending",
                    "message": "Completa tus preferencias para generar matches.",
                    "matches": [],
                }
            )

        completed_count = ResidentPreference.objects.filter(
            is_completed=True,
            membership__residence_id=membership.residence_id,
            membership__is_active=True,
            membership__role__name__iexact="Student",
        ).count()

        if completed_count < 2:
            return Response(
                {
                    "status": "insufficient_residents",
                    "message": "Aun no hay suficientes residentes con onboarding completado.",
                    "matches": [],
                }
            )
        return None

    def _get_limit(self, request):
        raw_limit = request.query_params.get("limit", "10")
        try:
            limit = int(raw_limit)
        except ValueError:
            limit = 10
        return max(1, min(limit, 50))

    def _format_match(self, row):
        user = row.target_membership.user
        prefs = getattr(row.target_membership, "resident_preferences", None)
        return {
            "membership_id": row.target_membership_id,
            "display_name": _masked_display_name(
                user.first_name, user.last_name, user.email
            ),
            "score": row.score,
            "updated_at": row.updated_at,
            "horario_ritmo": getattr(prefs, "schedule", None),
            "nivel_sociabilidad": getattr(prefs, "social_level", None),
            "habito_fumar_vapear": getattr(prefs, "smoking_vaping", None),
            "sex": getattr(prefs, "sex", None),
            "age": getattr(prefs, "age", None),
            "study_location": getattr(prefs, "study_location", None),
            "weekend_return": getattr(prefs, "weekend_return", None),
            "outside_plans_importance": getattr(
                prefs, "outside_plans_importance", None
            ),
            "desired_activity": getattr(prefs, "desired_activity", None),
            "order_importance": getattr(prefs, "order_importance", None),
            "noise_tolerance": getattr(prefs, "noise_tolerance", None),
            "visitors_preference": getattr(prefs, "visitors_preference", None),
            "basic_items_preference": getattr(prefs, "basic_items_preference", None),
            "temperature_preference": getattr(prefs, "temperature_preference", None),
        }
