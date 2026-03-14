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
        residence = getattr(request, "residence", None)
        memberships = Membership.objects.filter(
            user=request.user,
            role__name__iexact="Student",
            is_active=True,
        ).select_related("residence")

        if residence is not None:
            memberships = memberships.filter(residence_id=residence.id)

        membership = memberships.order_by("id").first()
        if membership is None or membership.residence_id is None:
            return Response(
                {"detail": "No resident membership found for current context."},
                status=status.HTTP_404_NOT_FOUND,
            )

        preference = ResidentPreference.objects.filter(membership=membership).first()
        if preference is None or not preference.is_completed:
            return Response(
                {
                    "status": "onboarding_pending",
                    "message": "Completa tus preferencias para generar matches.",
                    "matches": [],
                }
            )

        completed_residents = ResidentPreference.objects.filter(
            is_completed=True,
            membership__residence_id=membership.residence_id,
            membership__is_active=True,
            membership__role__name__iexact="Student",
        ).count()

        if completed_residents < 2:
            return Response(
                {
                    "status": "insufficient_residents",
                    "message": "Aun no hay suficientes residentes con onboarding completado.",
                    "matches": [],
                }
            )

        rows = ResidenceCompatibility.objects.filter(
            residence_id=membership.residence_id,
            source_membership_id=membership.id,
        ).select_related("target_membership__user", "target_membership__resident_preferences")

        if not rows.exists():
            return Response(
                {
                    "status": "processing",
                    "message": (
                        "Estamos buscando entre todos los residentes quienes son tus mejores matches."
                    ),
                    "matches": [],
                }
            )

        raw_limit = request.query_params.get("limit", "10")
        try:
            limit = int(raw_limit)
        except ValueError:
            limit = 10
        limit = max(1, min(limit, 50))

        matches: list[dict] = []
        for row in rows.order_by("-score")[:limit]:
            user = row.target_membership.user
            prefs = getattr(row.target_membership, "resident_preferences", None)
            
            matches.append(
                {
                    "membership_id": row.target_membership_id,
                    "display_name": _masked_display_name(user.first_name, user.last_name, user.email),
                    "score": row.score,
                    "updated_at": row.updated_at,
                    "horario_ritmo": prefs.schedule if prefs else None,
                    "nivel_sociabilidad": prefs.social_level if prefs else None,
                    "habito_fumar_vapear": prefs.smoking_vaping if prefs else None,
                    "sex": prefs.sex if prefs else None,
                    "age": prefs.age if prefs else None,
                    "study_location": prefs.study_location if prefs else None,
                    "weekend_return": prefs.weekend_return if prefs else None,
                    "outside_plans_importance": prefs.outside_plans_importance if prefs else None,
                    "desired_activity": prefs.desired_activity if prefs else None,
                    "order_importance": prefs.order_importance if prefs else None,
                    "noise_tolerance": prefs.noise_tolerance if prefs else None,
                    "visitors_preference": prefs.visitors_preference if prefs else None,
                    "basic_items_preference": prefs.basic_items_preference if prefs else None,
                    "temperature_preference": prefs.temperature_preference if prefs else None,
                }
            )

        return Response(
            {
                "status": "ready",
                "message": "Matches disponibles.",
                "matches": matches,
            }
        )
