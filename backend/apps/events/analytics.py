from __future__ import annotations

from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo

from django.db.models import Count
from django.utils import timezone
from django.utils.dateparse import parse_date, parse_datetime

from apps.membership.models import Membership

from .models import Event, EventParticipation

EVENT_ANALYTICS_DEFAULT_WINDOW_DAYS = 30
EVENT_ANALYTICS_SUPPORTED_COMPARE = {"none", "previous_period"}
EVENT_ANALYTICS_SUPPORTED_EVENT_SCOPE = {"all", "official", "resident"}


class EventsAnalyticsValidationError(Exception):
    def __init__(self, detail: dict):
        super().__init__("events_analytics_validation_error")
        self.detail = detail


def _resolve_residence_timezone(residence) -> ZoneInfo:
    timezone_name = getattr(residence, "timezone", "") or "Europe/Madrid"
    try:
        return ZoneInfo(timezone_name)
    except Exception:
        return ZoneInfo("Europe/Madrid")


def _parse_boundary(raw_value, *, field_name: str, is_end: bool, residence_tz):
    if raw_value in (None, ""):
        return None

    value = str(raw_value).strip()
    parsed_dt = parse_datetime(value)
    if parsed_dt is not None:
        if timezone.is_naive(parsed_dt):
            return timezone.make_aware(parsed_dt, residence_tz)
        return parsed_dt.astimezone(residence_tz)

    parsed_day = parse_date(value)
    if parsed_day is not None:
        boundary = time.max if is_end else time.min
        return timezone.make_aware(datetime.combine(parsed_day, boundary), residence_tz)

    raise EventsAnalyticsValidationError(
        {field_name: "Formato inválido. Usa ISO datetime o YYYY-MM-DD."}
    )


def _parse_positive_int(raw_value, *, field_name: str) -> int | None:
    if raw_value in (None, ""):
        return None

    try:
        parsed = int(str(raw_value).strip())
    except (TypeError, ValueError):
        raise EventsAnalyticsValidationError(
            {field_name: f"{field_name} debe ser un entero positivo."}
        ) from None

    if parsed <= 0:
        raise EventsAnalyticsValidationError(
            {field_name: f"{field_name} debe ser un entero positivo."}
        )

    return parsed


def _normalize_filters(
    *,
    from_value,
    to_value,
    compare_value,
    event_type_value,
    creator_id_value,
    residence,
):
    residence_tz = _resolve_residence_timezone(residence)

    period_end = _parse_boundary(
        to_value,
        field_name="to",
        is_end=True,
        residence_tz=residence_tz,
    )
    period_start = _parse_boundary(
        from_value,
        field_name="from",
        is_end=False,
        residence_tz=residence_tz,
    )

    now = timezone.now().astimezone(residence_tz)
    if period_end is None:
        period_end = now
    if period_start is None:
        period_start = period_end - timedelta(days=EVENT_ANALYTICS_DEFAULT_WINDOW_DAYS)

    if period_start > period_end:
        raise EventsAnalyticsValidationError(
            {"detail": "El parámetro 'from' debe ser anterior o igual a 'to'."}
        )

    compare = str(compare_value or "none").strip().lower()
    if compare not in EVENT_ANALYTICS_SUPPORTED_COMPARE:
        raise EventsAnalyticsValidationError(
            {"compare": "Comparación no soportada. Usa 'none' o 'previous_period'."}
        )

    event_scope = str(event_type_value or "all").strip().lower()
    if event_scope not in EVENT_ANALYTICS_SUPPORTED_EVENT_SCOPE:
        raise EventsAnalyticsValidationError(
            {
                "event_type": (
                    "Filtro no soportado. Usa 'all', 'official' o 'resident'."
                )
            }
        )

    creator_id = _parse_positive_int(creator_id_value, field_name="creator_id")

    compare_period = None
    if compare == "previous_period":
        period_duration = period_end - period_start
        if period_duration <= timedelta(0):
            period_duration = timedelta(microseconds=1)
        compare_end = period_start - timedelta(microseconds=1)
        compare_period = {
            "start": compare_end - period_duration,
            "end": compare_end,
        }

    return {
        "period_start": period_start,
        "period_end": period_end,
        "compare": compare,
        "compare_period": compare_period,
        "event_scope": event_scope,
        "creator_id": creator_id,
        "residence_tz": residence_tz,
    }


def _calculate_delta_pct(*, current_value: float, previous_value: float) -> float | None:
    if previous_value == 0:
        return None
    return round(((current_value - previous_value) / previous_value) * 100, 2)


def _calculate_rate(*, numerator: int, denominator: int) -> float:
    if denominator <= 0:
        return 0.0
    return round((numerator / denominator) * 100, 2)


def _build_user_name(*, user_id: int, first_name, last_name, email) -> str:
    first_name_value = (first_name or "").strip()
    last_name_value = (last_name or "").strip()
    full_name = f"{first_name_value} {last_name_value}".strip()
    if full_name:
        return full_name

    email_value = (email or "").strip()
    if email_value:
        return email_value

    return f"Usuario #{user_id}"


def _apply_scope_and_creator_filter(
    *,
    queryset,
    event_scope: str,
    creator_id: int | None,
    resident_host_user_ids,
    host_id_field: str,
):
    if creator_id is not None:
        queryset = queryset.filter(**{host_id_field: creator_id})

    if event_scope == "resident":
        queryset = queryset.filter(**{f"{host_id_field}__in": resident_host_user_ids})
    elif event_scope == "official":
        queryset = queryset.exclude(**{f"{host_id_field}__in": resident_host_user_ids})

    return queryset


def _get_resident_host_user_ids(*, residence):
    return Membership.objects.filter(
        residence=residence,
        is_active=True,
        role__name__iexact="student",
    ).values("user_id")


def _build_attendance_overview(
    *,
    total_events: int,
    events_with_participation: int,
    previous_attendance_rate: float | None,
    compare: str,
):
    attendance_rate = _calculate_rate(
        numerator=events_with_participation,
        denominator=total_events,
    )

    compare_value = previous_attendance_rate if compare == "previous_period" else None
    delta = (
        round(attendance_rate - previous_attendance_rate, 2)
        if compare == "previous_period" and previous_attendance_rate is not None
        else None
    )
    delta_pct = (
        _calculate_delta_pct(
            current_value=attendance_rate,
            previous_value=previous_attendance_rate,
        )
        if compare == "previous_period" and previous_attendance_rate is not None
        else None
    )

    return {
        # En modo proxy sin check-in real, total_registered representa eventos del periodo
        # y total_attended representa eventos con al menos una inscripción.
        "total_registered": total_events,
        "total_attended": events_with_participation,
        "attendance_rate": attendance_rate,
        "measurement_type": "registrations_proxy",
        "compare_value": compare_value,
        "delta": delta,
        "delta_pct": delta_pct,
    }


def _build_event_creation_by_resident(
    *,
    current_queryset,
    previous_queryset,
    compare: str,
):
    current_rows = list(
        current_queryset.values(
            "host_id",
            "host__first_name",
            "host__last_name",
            "host__email",
        )
        .annotate(events_created_count=Count("id"))
        .order_by()
    )

    previous_rows = []
    if previous_queryset is not None:
        previous_rows = list(
            previous_queryset.values(
                "host_id",
                "host__first_name",
                "host__last_name",
                "host__email",
            )
            .annotate(events_created_count=Count("id"))
            .order_by()
        )

    total_created_events = current_queryset.count()

    current_counts = {
        int(row["host_id"]): int(row["events_created_count"]) for row in current_rows
    }
    previous_counts = {
        int(row["host_id"]): int(row["events_created_count"]) for row in previous_rows
    }

    resident_names: dict[int, str] = {}
    for row in current_rows + previous_rows:
        resident_id = int(row["host_id"])
        resident_names[resident_id] = _build_user_name(
            user_id=resident_id,
            first_name=row.get("host__first_name"),
            last_name=row.get("host__last_name"),
            email=row.get("host__email"),
        )

    all_resident_ids = set(current_counts.keys())
    if compare == "previous_period":
        all_resident_ids.update(previous_counts.keys())

    rows = []
    for resident_id in sorted(
        all_resident_ids,
        key=lambda item: (
            -int(current_counts.get(item, 0)),
            resident_names.get(item, f"Usuario #{item}").lower(),
            item,
        ),
    ):
        current_value = int(current_counts.get(resident_id, 0))
        compare_value = (
            int(previous_counts.get(resident_id, 0))
            if compare == "previous_period"
            else None
        )
        delta = current_value - compare_value if compare_value is not None else None
        delta_pct = (
            _calculate_delta_pct(
                current_value=current_value,
                previous_value=compare_value,
            )
            if compare_value is not None
            else None
        )

        rows.append(
            {
                "resident_id": resident_id,
                "resident_name": resident_names.get(resident_id, f"Usuario #{resident_id}"),
                "events_created_count": current_value,
                "pct_of_total": round((current_value / total_created_events) * 100, 2)
                if total_created_events > 0
                else 0.0,
                "compare_value": compare_value,
                "delta": delta,
                "delta_pct": delta_pct,
            }
        )

    return rows


def _build_top_residents_by_attendance(
    *,
    current_queryset,
    previous_queryset,
    compare: str,
    total_events: int,
):
    current_rows = list(
        current_queryset.values(
            "user_id",
            "user__first_name",
            "user__last_name",
            "user__email",
        )
        .annotate(
            attended_events_count=Count("event_id", distinct=True),
            registered_events_count=Count("id"),
        )
        .order_by()
    )

    previous_rows = []
    if previous_queryset is not None:
        previous_rows = list(
            previous_queryset.values(
                "user_id",
                "user__first_name",
                "user__last_name",
                "user__email",
            )
            .annotate(
                attended_events_count=Count("event_id", distinct=True),
                registered_events_count=Count("id"),
            )
            .order_by()
        )

    current_attended = {
        int(row["user_id"]): int(row["attended_events_count"]) for row in current_rows
    }
    current_registered = {
        int(row["user_id"]): int(row["registered_events_count"]) for row in current_rows
    }
    previous_attended = {
        int(row["user_id"]): int(row["attended_events_count"]) for row in previous_rows
    }

    resident_names: dict[int, str] = {}
    for row in current_rows + previous_rows:
        resident_id = int(row["user_id"])
        resident_names[resident_id] = _build_user_name(
            user_id=resident_id,
            first_name=row.get("user__first_name"),
            last_name=row.get("user__last_name"),
            email=row.get("user__email"),
        )

    all_resident_ids = set(current_attended.keys())
    if compare == "previous_period":
        all_resident_ids.update(previous_attended.keys())

    rows = []
    for resident_id in sorted(
        all_resident_ids,
        key=lambda item: (
            -int(current_attended.get(item, 0)),
            resident_names.get(item, f"Usuario #{item}").lower(),
            item,
        ),
    ):
        current_value = int(current_attended.get(resident_id, 0))
        compare_value = (
            int(previous_attended.get(resident_id, 0))
            if compare == "previous_period"
            else None
        )
        delta = current_value - compare_value if compare_value is not None else None
        delta_pct = (
            _calculate_delta_pct(
                current_value=current_value,
                previous_value=compare_value,
            )
            if compare_value is not None
            else None
        )

        rows.append(
            {
                "resident_id": resident_id,
                "resident_name": resident_names.get(resident_id, f"Usuario #{resident_id}"),
                "attended_events_count": current_value,
                "registered_events_count": int(
                    current_registered.get(resident_id, current_value)
                ),
                "attendance_rate": _calculate_rate(
                    numerator=current_value,
                    denominator=total_events,
                ),
                "compare_value": compare_value,
                "delta": delta,
                "delta_pct": delta_pct,
            }
        )

    return rows


def get_admin_events_analytics(
    *,
    residence,
    from_value=None,
    to_value=None,
    compare_value=None,
    event_type_value=None,
    creator_id_value=None,
):
    filters = _normalize_filters(
        from_value=from_value,
        to_value=to_value,
        compare_value=compare_value,
        event_type_value=event_type_value,
        creator_id_value=creator_id_value,
        residence=residence,
    )

    resident_host_user_ids = _get_resident_host_user_ids(residence=residence)

    current_events_for_attendance = Event.objects.filter(
        residence=residence,
        start_time__gte=filters["period_start"],
        start_time__lte=filters["period_end"],
    )
    current_events_for_attendance = _apply_scope_and_creator_filter(
        queryset=current_events_for_attendance,
        event_scope=filters["event_scope"],
        creator_id=filters["creator_id"],
        resident_host_user_ids=resident_host_user_ids,
        host_id_field="host_id",
    )

    current_events_for_creation = Event.objects.filter(
        residence=residence,
        created_at__gte=filters["period_start"],
        created_at__lte=filters["period_end"],
    )
    current_events_for_creation = _apply_scope_and_creator_filter(
        queryset=current_events_for_creation,
        event_scope=filters["event_scope"],
        creator_id=filters["creator_id"],
        resident_host_user_ids=resident_host_user_ids,
        host_id_field="host_id",
    )

    current_participations = EventParticipation.objects.filter(
        event__residence=residence,
        event__start_time__gte=filters["period_start"],
        event__start_time__lte=filters["period_end"],
    )
    current_participations = _apply_scope_and_creator_filter(
        queryset=current_participations,
        event_scope=filters["event_scope"],
        creator_id=filters["creator_id"],
        resident_host_user_ids=resident_host_user_ids,
        host_id_field="event__host_id",
    )

    previous_events_for_attendance = None
    previous_events_for_creation = None
    previous_participations = None

    if filters["compare"] == "previous_period":
        compare_period = filters["compare_period"] or {}

        previous_events_for_attendance = Event.objects.filter(
            residence=residence,
            start_time__gte=compare_period.get("start"),
            start_time__lte=compare_period.get("end"),
        )
        previous_events_for_attendance = _apply_scope_and_creator_filter(
            queryset=previous_events_for_attendance,
            event_scope=filters["event_scope"],
            creator_id=filters["creator_id"],
            resident_host_user_ids=resident_host_user_ids,
            host_id_field="host_id",
        )

        previous_events_for_creation = Event.objects.filter(
            residence=residence,
            created_at__gte=compare_period.get("start"),
            created_at__lte=compare_period.get("end"),
        )
        previous_events_for_creation = _apply_scope_and_creator_filter(
            queryset=previous_events_for_creation,
            event_scope=filters["event_scope"],
            creator_id=filters["creator_id"],
            resident_host_user_ids=resident_host_user_ids,
            host_id_field="host_id",
        )

        previous_participations = EventParticipation.objects.filter(
            event__residence=residence,
            event__start_time__gte=compare_period.get("start"),
            event__start_time__lte=compare_period.get("end"),
        )
        previous_participations = _apply_scope_and_creator_filter(
            queryset=previous_participations,
            event_scope=filters["event_scope"],
            creator_id=filters["creator_id"],
            resident_host_user_ids=resident_host_user_ids,
            host_id_field="event__host_id",
        )

    total_events = current_events_for_attendance.count()
    total_events_with_participation = current_events_for_attendance.annotate(
        participation_count=Count("participations")
    ).filter(participation_count__gt=0).count()
    total_participants_or_attendees = current_participations.count()
    total_event_creators = current_events_for_creation.values("host_id").distinct().count()

    attendance_rate = _calculate_rate(
        numerator=total_events_with_participation,
        denominator=total_events,
    )

    previous_total_events = None
    previous_total_event_creators = None
    previous_total_participants_or_attendees = None
    previous_attendance_rate = None

    if filters["compare"] == "previous_period" and previous_events_for_attendance is not None:
        previous_total_events = previous_events_for_attendance.count()
        previous_events_with_participation = previous_events_for_attendance.annotate(
            participation_count=Count("participations")
        ).filter(participation_count__gt=0).count()
        previous_attendance_rate = _calculate_rate(
            numerator=previous_events_with_participation,
            denominator=previous_total_events,
        )
        previous_total_event_creators = (
            previous_events_for_creation.values("host_id").distinct().count()
            if previous_events_for_creation is not None
            else 0
        )
        previous_total_participants_or_attendees = (
            previous_participations.count() if previous_participations is not None else 0
        )

    summary = {
        "total_events": total_events,
        "total_event_creators": total_event_creators,
        "total_participants_or_attendees": total_participants_or_attendees,
        "attendance_rate": attendance_rate,
        "compare_value_total_events": previous_total_events,
        "compare_value_total_event_creators": previous_total_event_creators,
        "compare_value_total_participants_or_attendees": previous_total_participants_or_attendees,
        "compare_value_attendance_rate": previous_attendance_rate,
        "delta_total_events": (
            total_events - previous_total_events
            if previous_total_events is not None
            else None
        ),
        "delta_total_event_creators": (
            total_event_creators - previous_total_event_creators
            if previous_total_event_creators is not None
            else None
        ),
        "delta_total_participants_or_attendees": (
            total_participants_or_attendees - previous_total_participants_or_attendees
            if previous_total_participants_or_attendees is not None
            else None
        ),
        "delta_attendance_rate": (
            round(attendance_rate - previous_attendance_rate, 2)
            if previous_attendance_rate is not None
            else None
        ),
        "delta_pct_total_events": (
            _calculate_delta_pct(
                current_value=total_events,
                previous_value=previous_total_events,
            )
            if previous_total_events is not None
            else None
        ),
        "delta_pct_total_event_creators": (
            _calculate_delta_pct(
                current_value=total_event_creators,
                previous_value=previous_total_event_creators,
            )
            if previous_total_event_creators is not None
            else None
        ),
        "delta_pct_total_participants_or_attendees": (
            _calculate_delta_pct(
                current_value=total_participants_or_attendees,
                previous_value=previous_total_participants_or_attendees,
            )
            if previous_total_participants_or_attendees is not None
            else None
        ),
        "delta_pct_attendance_rate": (
            _calculate_delta_pct(
                current_value=attendance_rate,
                previous_value=previous_attendance_rate,
            )
            if previous_attendance_rate is not None
            else None
        ),
    }

    attendance_overview = _build_attendance_overview(
        total_events=total_events,
        events_with_participation=total_events_with_participation,
        previous_attendance_rate=previous_attendance_rate,
        compare=filters["compare"],
    )

    event_creation_by_resident = _build_event_creation_by_resident(
        current_queryset=current_events_for_creation,
        previous_queryset=previous_events_for_creation,
        compare=filters["compare"],
    )

    top_residents_by_attendance = _build_top_residents_by_attendance(
        current_queryset=current_participations,
        previous_queryset=previous_participations,
        compare=filters["compare"],
        total_events=total_events,
    )

    return {
        "summary": summary,
        "attendance_overview": attendance_overview,
        "event_creation_by_resident": event_creation_by_resident,
        "top_residents_by_attendance": top_residents_by_attendance,
        "meta": {
            "from_value": filters["period_start"].isoformat(),
            "to_value": filters["period_end"].isoformat(),
            "compare": filters["compare"],
            "event_type": filters["event_scope"],
            "creator_id": filters["creator_id"],
            "measurement_type": "registrations_proxy",
            "compare_from": (
                filters["compare_period"]["start"].isoformat()
                if filters["compare_period"] is not None
                else None
            ),
            "compare_to": (
                filters["compare_period"]["end"].isoformat()
                if filters["compare_period"] is not None
                else None
            ),
        },
    }
