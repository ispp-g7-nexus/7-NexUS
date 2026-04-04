def _is_admin_for_residence(user, residence) -> bool:
    if residence is None:
        return False
    if getattr(user, "is_staff", False):
        return True
    from django.db.models import Q
    from apps.membership.models import Membership
    return (
        Membership.objects.filter(user=user, is_active=True)
        .filter(
            Q(role__name__iexact="residence_admin", residence=residence)
            | Q(role__name__iexact="portfolio_admin")
        )
        .exists()
    )
