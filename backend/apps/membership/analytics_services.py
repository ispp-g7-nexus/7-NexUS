from django.db.models import Count, F, ExpressionWrapper, fields, Avg
from django.db.models.functions import TruncMonth
from .models import Membership, Role
from datetime import datetime


def _duration_to_days(value):
    """Safely convert a timedelta (or None) to an integer number of days."""
    if value is None:
        return 0
    try:
        total_seconds = value.total_seconds()
        return int(total_seconds // 86400)
    except Exception:
        return 0


def get_active_members_by_role(residence=None):
    """
    Counts active members for each role.
    """
    queryset = Membership.objects.filter(is_active=True)
    if residence is not None:
        queryset = queryset.filter(residence=residence)
    return queryset.values('role__name').annotate(count=Count('id')).order_by('-count')


def get_active_vs_inactive_members(residence=None):
    """
    Counts active vs inactive members.
    """
    queryset = Membership.objects.all()
    if residence is not None:
        queryset = queryset.filter(residence=residence)
    return queryset.values('is_active').annotate(count=Count('id'))


def get_membership_evolution(residence=None):
    """
    Counts new memberships over time (monthly).
    """
    # We'll compute two series: residents (Student role) and staff (memberships where user has Staff profile)
    base_qs = Membership.objects.all()
    if residence is not None:
        base_qs = base_qs.filter(residence=residence)

    resident_role = Role.objects.filter(is_system_default=True, name__iexact='Student').first()

    # Resident series
    if resident_role is not None:
        residents_qs = base_qs.filter(role=resident_role)
    else:
        residents_qs = base_qs.none()
    residents_agg = (
        residents_qs.annotate(month=TruncMonth('created_at'))
        .values('month')
        .annotate(count=Count('id'))
        .order_by('month')
    )

    # Staff series: require that the user has a Staff profile so we count real staff
    staff_qs = base_qs.filter(role__isnull=False, user__staff_profile__isnull=False).filter(role__is_system_default=False)
    staff_agg = (
        staff_qs.annotate(month=TruncMonth('created_at'))
        .values('month')
        .annotate(count=Count('id'))
        .order_by('month')
    )

    # Merge the two querysets into a single time-series list
    data_map = {}
    for item in residents_agg:
        month_val = item.get('month')
        try:
            month_str = month_val.date().isoformat() if isinstance(month_val, datetime) else month_val.isoformat()
        except Exception:
            month_str = str(month_val)
        data_map.setdefault(month_str, {})['residents'] = item.get('count', 0)

    for item in staff_agg:
        month_val = item.get('month')
        try:
            month_str = month_val.date().isoformat() if isinstance(month_val, datetime) else month_val.isoformat()
        except Exception:
            month_str = str(month_val)
        data_map.setdefault(month_str, {})['staff'] = item.get('count', 0)

    # Create a sorted result list
    result = []
    for month in sorted(data_map.keys()):
        entry = data_map.get(month, {})
        result.append({
            'month': month,
            'residents': entry.get('residents', 0),
            'staff': entry.get('staff', 0),
        })

    return result


def get_average_stay(residence=None):
    """
    Calculates the average stay for residents and staff.
    """
    duration_expression = ExpressionWrapper(F('updated_at') - F('created_at'), output_field=fields.DurationField())

    base_queryset = Membership.objects.all()
    if residence is not None:
        base_queryset = base_queryset.filter(residence=residence)

    resident_role = Role.objects.filter(is_system_default=True, name__iexact='Student').first()
    if resident_role is not None:
        avg_stay_residents = base_queryset.filter(role=resident_role).aggregate(avg_duration=Avg(duration_expression))
    else:
        avg_stay_residents = base_queryset.none().aggregate(avg_duration=Avg(duration_expression))

    # Only consider staff members that have a Staff profile to avoid counting non-staff users
    avg_stay_staff = base_queryset.filter(role__is_system_default=False, user__staff_profile__isnull=False).aggregate(avg_duration=Avg(duration_expression))

    residents_duration = avg_stay_residents.get('avg_duration') if avg_stay_residents else None
    staff_duration = avg_stay_staff.get('avg_duration') if avg_stay_staff else None

    return {
        "residents": _duration_to_days(residents_duration),
        "staff": _duration_to_days(staff_duration),
    }


def get_staff_capacity(residence=None):
    """
    Counts active staff members with access to each key screen.
    """
    # Build capacity counts by iterating memberships and checking role.permissions in Python.
    # Require that the membership's user has an associated Staff profile so we only count real staff.
    permissions = Role.ScreenPermissions.choices

    # Start with an empty counter for each human-friendly permission name
    capacity = {perm_name: 0 for perm_key, perm_name in permissions}

    # Consider only active memberships where the user has a Staff profile.
    base_queryset = Membership.objects.filter(is_active=True, user__staff_profile__isnull=False)
    if residence is not None:
        base_queryset = base_queryset.filter(residence=residence)

    # Fetch role relationships to avoid extra queries
    base_queryset = base_queryset.select_related("role")

    admin_names = {"admin", "residence_admin", "portfolio_admin"}

    for membership in base_queryset:
        role = membership.role
        if not role:
            continue

        role_name = (role.name or "").lower()
        # Exclude explicit admin-named roles or system-default roles from staff capacity counts
        if role_name in admin_names or getattr(role, 'is_system_default', False):
            continue

        role_permissions = role.permissions or []

        for perm_key, perm_name in permissions:
            if perm_key in role_permissions or "full_access" in role_permissions:
                capacity[perm_name] = capacity.get(perm_name, 0) + 1

    return capacity


def get_staff_vacation(residence=None):
    """
    Returns counts of staff members on vacation vs not on vacation.
    Uses the `Staff` profile `status` (value 'holidays') where present.
    Does not filter by created_at since this is a current-state metric.
    """
    # Consider only active memberships whose users have a Staff profile and are not system roles.
    base_queryset = Membership.objects.filter(role__isnull=False, is_active=True, user__staff_profile__isnull=False)
    if residence is not None:
        base_queryset = base_queryset.filter(residence=residence)

    base_queryset = base_queryset.filter(role__is_system_default=False)

    on_vacation = base_queryset.filter(user__staff_profile__status="holidays").count()
    total = base_queryset.count()
    not_on_vacation = max(total - on_vacation, 0)

    return {"on_vacation": on_vacation, "not_on_vacation": not_on_vacation}


def get_residents_without_room(residence=None):
    """
    Counts active residents without an assigned room.
    """
    resident_role = Role.objects.filter(is_system_default=True, name__iexact='Student').first()
    if resident_role is not None:
        queryset = Membership.objects.filter(is_active=True, role=resident_role, bedroom__isnull=True)
    else:
        queryset = Membership.objects.none()
    if residence is not None:
        queryset = queryset.filter(residence=residence)

    return queryset.count()
