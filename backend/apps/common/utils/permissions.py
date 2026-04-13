def _is_admin_for_residence(user, residence) -> bool:
    if residence is None:
        return False
    if getattr(user, "is_staff", False):
        return True
    from apps.membership.models import Membership
    return Membership.objects.filter(
        user=user,
        residence=residence,
        role__name__iexact="Admin",
        is_active=True,
    ).exists()
