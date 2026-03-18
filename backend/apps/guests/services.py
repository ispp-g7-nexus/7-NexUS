from django.utils import timezone

from apps.membership.models import Membership

from .models import GuestPass


def get_resident_membership_for_user(user, residence) -> Membership | None:
    return (
        Membership.objects.filter(
            user=user,
            residence=residence,
            role__name__iexact="Student",
            is_active=True,
        )
        .select_related("user", "role", "residence")
        .first()
    )


def get_active_guest_passes_queryset(membership: Membership, residence):
    now = timezone.now()
    return (
        GuestPass.objects.filter(
            residence=residence,
            resident=membership,
            status=GuestPass.Status.ACTIVE,
            valid_from__lte=now,
            valid_until__gte=now,
            cancelled_at__isnull=True,
            revoked_at__isnull=True,
        )
        .select_related("resident__user", "resident__bedroom")
        .order_by("valid_until", "-created_at")
    )
