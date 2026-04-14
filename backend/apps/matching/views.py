from __future__ import annotations

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.chats.models import PrivateConversation
from apps.membership.models import Membership
from apps.onboarding.models import ResidentPreference

from .models import MatchLike, ResidenceCompatibility


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
        selected_rows = list(rows.order_by("-score")[:limit])
        target_ids = [row.target_membership_id for row in selected_rows]
        my_likes = set(
            MatchLike.objects.filter(
                source=membership, target_id__in=target_ids
            ).values_list("target_id", flat=True)
        )
        likes_to_me = set(
            MatchLike.objects.filter(
                target=membership, source_id__in=target_ids
            ).values_list("source_id", flat=True)
        )
        matches = [
            self._format_match(row, my_likes, likes_to_me) for row in selected_rows
        ]

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

    def _format_match(self, row, my_likes=None, likes_to_me=None):
        user = row.target_membership.user
        prefs = getattr(row.target_membership, "resident_preferences", None)
        my_likes = my_likes or set()
        likes_to_me = likes_to_me or set()
        liked = row.target_membership_id in my_likes
        mutual = liked and row.target_membership_id in likes_to_me
        return {
            "membership_id": row.target_membership_id,
            "display_name": _masked_display_name(
                user.first_name, user.last_name, user.email
            ),
            "score": row.score,
            "updated_at": row.updated_at,
            "liked_by_me": liked,
            "is_mutual": mutual,
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


def _get_active_student_membership(request):
    residence = getattr(request, "residence", None)
    qs = Membership.objects.filter(
        user=request.user,
        role__name__iexact="Student",
        is_active=True,
    ).select_related("residence")
    if residence:
        qs = qs.filter(residence_id=residence.id)
    return qs.order_by("id").first()


class MatchLikeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        me = _get_active_student_membership(request)
        if me is None:
            return Response(
                {"detail": "No active membership."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        target_id = request.data.get("membership_id")
        if not target_id:
            return Response(
                {"detail": "membership_id required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            target_id = int(target_id)
        except (TypeError, ValueError):
            return Response(
                {"detail": "Invalid membership_id."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if target_id == me.id:
            return Response(
                {"detail": "Cannot like yourself."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        target = Membership.objects.filter(
            id=target_id, residence=me.residence, is_active=True
        ).first()
        if target is None:
            return Response(
                {"detail": "Target not found."}, status=status.HTTP_404_NOT_FOUND
            )
        MatchLike.objects.get_or_create(
            residence=me.residence, source=me, target=target
        )
        is_mutual = MatchLike.objects.filter(source=target, target=me).exists()
        return Response({"is_mutual": is_mutual}, status=status.HTTP_201_CREATED)


class MatchLikeDeleteView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, membership_id: int):
        me = _get_active_student_membership(request)
        if me is None:
            return Response(status=status.HTTP_204_NO_CONTENT)
        MatchLike.objects.filter(source=me, target_id=membership_id).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class StartMatchChatView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        me = _get_active_student_membership(request)
        if me is None:
            return Response(
                {"detail": "No active membership."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        target_id = request.data.get("membership_id")
        if not target_id:
            return Response(
                {"detail": "membership_id required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            target_id = int(target_id)
        except (TypeError, ValueError):
            return Response(
                {"detail": "Invalid membership_id."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        target = Membership.objects.filter(
            id=target_id, residence=me.residence, is_active=True
        ).first()
        if target is None:
            return Response(
                {"detail": "Target not found."}, status=status.HTTP_404_NOT_FOUND
            )

        i_liked = MatchLike.objects.filter(source=me, target=target).exists()
        they_liked = MatchLike.objects.filter(source=target, target=me).exists()
        if not (i_liked and they_liked):
            return Response(
                {"detail": "Mutual like required to start chat."},
                status=status.HTTP_403_FORBIDDEN,
            )

        conv, _ = PrivateConversation.get_or_create_conversation(
            residence=me.residence, member_a=me, member_b=target
        )
        return Response({"conversation_id": conv.id}, status=status.HTTP_200_OK)
