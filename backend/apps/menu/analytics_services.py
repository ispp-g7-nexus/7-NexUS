from apps.residents.models import Resident
from django.db.models import Count, Avg, F, ExpressionWrapper, fields, Q
from django.db.models.functions import ExtractWeekDay
from datetime import date, timedelta


def _duration_to_days(value):
    """Safely convert a timedelta (or None) to an integer number of days."""
    if value is None:
        return None
    try:
        total_seconds = value.total_seconds()
        return round(total_seconds / 86400, 2)
    except Exception:
        return None


def get_menu_analytics(residence=None, start_date=None, end_date=None, weeks_window=8):
    """Return a rich set of analytics for the menu module.

    The function is defensive: if models cannot be imported it returns a
    minimal, safe payload. It accepts an optional `residence` to scope
    the analytics per tenant (when available).
    """

    # Count active residents (best-effort, Resident model may vary)
    try:
        total_residents = Resident.objects.filter(state=Resident.ResidentState.ACTIVE).count()
    except Exception:
        total_residents = Resident.objects.count()

    # Lazy import of menu models to avoid import-time cycles in some test envs
    try:
        from apps.menu.models import SpecialMenuRequest, MenuWeek, Meal
    except Exception:
        return {
            "top_special_requesters": [],
            "special_requester_percentage": 0.0,
            "total_special_requests": 0,
            "special_requests_by_status": {"pending": 0, "approved": 0, "rejected": 0},
            "special_requests_by_weekday": [],
            "average_requests_per_requester": 0.0,
            "published_menu_lead_days_avg": None,
            "meal_type_distribution": {"breakfast": 0, "lunch": 0, "dinner": 0, "snack": 0},
            "dietary_summary": {"total_meals": 0, "vegetarian_percentage": 0.0, "vegan_percentage": 0.0, "gluten_free_percentage": 0.0},
            "top_meals": [],
            "total_residents": total_residents,
        }

    # Base queryset filters by residence when provided
    req_base = SpecialMenuRequest.objects.all()
    if residence is not None:
        req_base = req_base.filter(residence=residence)

    # Normalize optional date window (accept strings or date objects)
    parsed_start = None
    parsed_end = None
    try:
        if start_date:
            if isinstance(start_date, str):
                parsed_start = date.fromisoformat(start_date)
            else:
                parsed_start = start_date
        if end_date:
            if isinstance(end_date, str):
                parsed_end = date.fromisoformat(end_date)
            else:
                parsed_end = end_date
    except Exception:
        parsed_start = None
        parsed_end = None

    # If both provided and parsed, ensure order
    if parsed_start and parsed_end and parsed_end < parsed_start:
        parsed_start, parsed_end = parsed_end, parsed_start

    # If no explicit window provided, use the weeks_window default ending today
    if not parsed_start and not parsed_end:
        parsed_end = date.today()
        parsed_start = parsed_end - timedelta(weeks=weeks_window)

    # Apply date filters to special requests (filtering by the requested `date` field)
    if parsed_start and parsed_end:
        req_base = req_base.filter(date__gte=parsed_start, date__lte=parsed_end)

    # Top N residents/users by number of special menu requests
    top_special_requesters_qs = (
        req_base.values("user__first_name", "user__last_name", "user__email")
        .annotate(request_count=Count("id"))
        .order_by("-request_count")[:10]
    )

    unique_special_requesters = req_base.values("user").distinct().count()
    total_special_requests = req_base.count()
    special_requester_percentage = (
        (unique_special_requesters / total_residents) * 100 if total_residents > 0 else 0
    )

    # Requests by status
    status_counts = {"pending": 0, "approved": 0, "rejected": 0}
    for item in req_base.values("status").annotate(count=Count("id")):
        status = item.get("status")
        status_counts[status] = item.get("count", 0)

    # Requests by weekday (use ExtractWeekDay: Sunday=1 .. Saturday=7)
    weekday_map = {1: "domingo", 2: "lunes", 3: "martes", 4: "miércoles", 5: "jueves", 6: "viernes", 7: "sábado"}
    weekday_order = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"]
    weekday_counts = {name: 0 for name in weekday_order}
    weekday_qs = req_base.annotate(weekday=ExtractWeekDay("date")).values("weekday").annotate(count=Count("id"))
    for item in weekday_qs:
        wd = item.get("weekday")
        name = weekday_map.get(wd)
        if name:
            weekday_counts[name] = item.get("count", 0)

    special_requests_by_weekday = [{"weekday": name, "count": weekday_counts.get(name, 0)} for name in weekday_order]

    average_requests_per_requester = round((total_special_requests / unique_special_requesters), 2) if unique_special_requesters > 0 else 0.0

    # Published menu lead time (days between created_at and week_start) — try DB avg, fallback to python
    mw_base = MenuWeek.objects.filter(is_published=True)
    if residence is not None:
        mw_base = mw_base.filter(residence=residence)

    # If date window provided, restrict menu weeks considered for lead-time metric
    if parsed_start and parsed_end:
        mw_base = mw_base.filter(week_start__gte=parsed_start, week_start__lte=parsed_end)

    published_menu_lead_days_avg = None
    try:
        duration_expr = ExpressionWrapper(F("week_start") - F("created_at"), output_field=fields.DurationField())
        avg_duration = mw_base.aggregate(avg_lead=Avg(duration_expr)).get("avg_lead")
        published_menu_lead_days_avg = _duration_to_days(avg_duration)
    except Exception:
        # Fallback: compute in Python per object
        total_days = 0
        count = 0
        for mw in mw_base:
            if mw.created_at and mw.week_start:
                try:
                    delta = mw.week_start - mw.created_at.date()
                    total_days += delta.days
                    count += 1
                except Exception:
                    continue
        if count > 0:
            published_menu_lead_days_avg = round(total_days / count, 2)

    # Meals distribution and dietary summary — limit to recent window
    # Meals distribution and dietary summary — filter by menu_day.date within the window
    meal_base = Meal.objects.all()
    if residence is not None:
        meal_base = meal_base.filter(menu_day__menu_week__residence=residence)
    if parsed_start and parsed_end:
        meal_base = meal_base.filter(menu_day__date__gte=parsed_start, menu_day__date__lte=parsed_end)
    else:
        window_start = date.today() - timedelta(weeks=weeks_window)
        meal_base = meal_base.filter(menu_day__menu_week__week_start__gte=window_start)

    meal_type_counts = {"breakfast": 0, "lunch": 0, "dinner": 0, "snack": 0}
    for item in meal_base.values("type").annotate(count=Count("id")):
        meal_type_counts[item.get("type")] = item.get("count", 0)

    total_meals = meal_base.count()
    veg_count = meal_base.filter(is_vegetarian=True).count()
    vegan_count = meal_base.filter(is_vegan=True).count()
    gf_count = meal_base.filter(is_gluten_free=True).count()

    dietary_summary = {
        "total_meals": total_meals,
        "vegetarian_percentage": round((veg_count / total_meals) * 100, 2) if total_meals > 0 else 0.0,
        "vegan_percentage": round((vegan_count / total_meals) * 100, 2) if total_meals > 0 else 0.0,
        "gluten_free_percentage": round((gf_count / total_meals) * 100, 2) if total_meals > 0 else 0.0,
    }

    # Top meals by name in the window
    top_meals_qs = (
        meal_base.values("name").annotate(count=Count("id")).order_by("-count")[:10]
    )

    return {
        "top_special_requesters": list(top_special_requesters_qs),
        "special_requester_percentage": round(special_requester_percentage, 2),
        "total_special_requests": total_special_requests,
        "special_requests_by_status": status_counts,
        "special_requests_by_weekday": special_requests_by_weekday,
        "average_requests_per_requester": average_requests_per_requester,
        "published_menu_lead_days_avg": published_menu_lead_days_avg,
        "meal_type_distribution": meal_type_counts,
        "dietary_summary": dietary_summary,
        "top_meals": list(top_meals_qs),
        "total_residents": total_residents,
    }
