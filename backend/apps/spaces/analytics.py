from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo

from django.db.models import Count, Q
from django.db.models.functions import ExtractHour
from django.utils import timezone
from django.utils.dateparse import parse_date, parse_datetime

from apps.objects.models import ObjectRental

from .models import SpaceReservation

RESERVATIONS_ANALYTICS_DEFAULT_WINDOW_DAYS = 30
RESERVATIONS_ANALYTICS_SUPPORTED_COMPARE = {"none", "previous_period"}
RESERVATIONS_ANALYTICS_SUPPORTED_RESOURCE_TYPES = {"all", "spaces", "objects"}


class ReservationsAnalyticsValidationError(Exception):
    def __init__(self, detail: dict):
        super().__init__("reservations_analytics_validation_error")
        self.detail = detail


@dataclass
class AggregatedMetrics:
    total_reservations: int = 0
    total_cancelled: int = 0
    zone_totals: dict[str, int] = field(default_factory=dict)
    zone_cancelled: dict[str, int] = field(default_factory=dict)
    zone_names: dict[str, str] = field(default_factory=dict)
    zone_resource_types: dict[str, str] = field(default_factory=dict)
    peak_counts: dict[tuple[str, int], int] = field(default_factory=dict)
    user_totals: dict[int, int] = field(default_factory=dict)
    user_cancelled: dict[int, int] = field(default_factory=dict)
    user_names: dict[int, str] = field(default_factory=dict)


def _build_zone_key(resource_type: str, zone_id: int) -> str:
    return f"{resource_type}:{zone_id}"


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

    raise ReservationsAnalyticsValidationError(
        {field_name: "Formato inválido. Usa ISO datetime o YYYY-MM-DD."}
    )


def _parse_zone_filter(*, zone_id_value, resource_type: str):
    if zone_id_value in (None, ""):
        return None, None, None

    raw = str(zone_id_value).strip().lower()
    if not raw:
        return None, None, None

    def _parse_numeric_id(raw_id: str) -> int:
        try:
            parsed_id = int(raw_id)
        except (TypeError, ValueError):
            raise ReservationsAnalyticsValidationError(
                {"zone_id": "zone_id debe ser numérico o con prefijo spaces:<id>/objects:<id>."}
            ) from None
        if parsed_id <= 0:
            raise ReservationsAnalyticsValidationError(
                {"zone_id": "zone_id debe ser un identificador positivo."}
            )
        return parsed_id

    if ":" not in raw:
        parsed_id = _parse_numeric_id(raw)
        if resource_type == "spaces":
            return parsed_id, None, f"spaces:{parsed_id}"
        if resource_type == "objects":
            return None, parsed_id, f"objects:{parsed_id}"
        raise ReservationsAnalyticsValidationError(
            {
                "zone_id": (
                    "Cuando resource_type=all, usa zone_id con prefijo: "
                    "spaces:<id> u objects:<id>."
                )
            }
        )

    prefix, raw_id = raw.split(":", 1)
    parsed_id = _parse_numeric_id(raw_id)

    if prefix in {"space", "spaces"}:
        if resource_type == "objects":
            raise ReservationsAnalyticsValidationError(
                {"zone_id": "zone_id corresponde a espacios, pero resource_type=objects."}
            )
        return parsed_id, None, f"spaces:{parsed_id}"

    if prefix in {"object", "objects"}:
        if resource_type == "spaces":
            raise ReservationsAnalyticsValidationError(
                {"zone_id": "zone_id corresponde a objetos, pero resource_type=spaces."}
            )
        return None, parsed_id, f"objects:{parsed_id}"

    raise ReservationsAnalyticsValidationError(
        {"zone_id": "Prefijo no válido. Usa spaces:<id> u objects:<id>."}
    )


def _normalize_filters(
    *,
    from_value,
    to_value,
    compare_value,
    resource_type_value,
    zone_id_value,
    residence,
):
    residence_tz = _resolve_residence_timezone(residence)

    period_end = _parse_boundary(
        to_value, field_name="to", is_end=True, residence_tz=residence_tz
    )
    period_start = _parse_boundary(
        from_value, field_name="from", is_end=False, residence_tz=residence_tz
    )

    now = timezone.now().astimezone(residence_tz)
    if period_end is None:
        period_end = now
    if period_start is None:
        period_start = period_end - timedelta(days=RESERVATIONS_ANALYTICS_DEFAULT_WINDOW_DAYS)

    if period_start > period_end:
        raise ReservationsAnalyticsValidationError(
            {"detail": "El parámetro 'from' debe ser anterior o igual a 'to'."}
        )

    compare = str(compare_value or "none").strip().lower()
    if compare not in RESERVATIONS_ANALYTICS_SUPPORTED_COMPARE:
        raise ReservationsAnalyticsValidationError(
            {"compare": "Comparación no soportada. Usa 'none' o 'previous_period'."}
        )

    resource_type = str(resource_type_value or "all").strip().lower()
    if resource_type not in RESERVATIONS_ANALYTICS_SUPPORTED_RESOURCE_TYPES:
        raise ReservationsAnalyticsValidationError(
            {"resource_type": "Tipo de recurso no soportado. Usa 'all', 'spaces' u 'objects'."}
        )

    space_zone_id, object_zone_id, normalized_zone_id = _parse_zone_filter(
        zone_id_value=zone_id_value,
        resource_type=resource_type,
    )

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
        "resource_type": resource_type,
        "space_zone_id": space_zone_id,
        "object_zone_id": object_zone_id,
        "zone_id": normalized_zone_id,
        "residence_tz": residence_tz,
    }


def _format_user_name(first_name, last_name, email, user_id: int) -> str:
    first_name_value = (first_name or "").strip()
    last_name_value = (last_name or "").strip()
    full_name = f"{first_name_value} {last_name_value}".strip()
    if full_name:
        return full_name
    if email:
        return str(email).strip()
    return f"Usuario #{user_id}"


def _accumulate_space_metrics(*, metrics: AggregatedMetrics, queryset, residence_tz):
    totals_rows = (
        queryset.values("space_id", "space__name")
        .annotate(
            total_reservations=Count("id"),
            # No existe cancelled_at en este modelo; cancelación se infiere por status.
            cancelled_reservations=Count(
                "id", filter=Q(status=SpaceReservation.Status.CANCELLED)
            ),
        )
        .order_by()
    )
    for row in totals_rows:
        zone_id = int(row["space_id"])
        zone_key = _build_zone_key("spaces", zone_id)
        total_reservations = int(row["total_reservations"])
        cancelled_reservations = int(row["cancelled_reservations"])

        metrics.zone_totals[zone_key] = total_reservations
        metrics.zone_cancelled[zone_key] = cancelled_reservations
        metrics.zone_names[zone_key] = (row.get("space__name") or "").strip() or f"Espacio #{zone_id}"
        metrics.zone_resource_types[zone_key] = "spaces"
        metrics.total_reservations += total_reservations
        metrics.total_cancelled += cancelled_reservations

    peak_rows = (
        queryset.annotate(local_hour=ExtractHour("start_time", tzinfo=residence_tz))
        .values("space_id", "local_hour")
        .annotate(reservations_count=Count("id"))
        .order_by()
    )
    for row in peak_rows:
        local_hour = row.get("local_hour")
        if local_hour is None:
            continue
        zone_key = _build_zone_key("spaces", int(row["space_id"]))
        metrics.peak_counts[(zone_key, int(local_hour))] = int(row["reservations_count"])

    user_rows = (
        queryset.values("user_id", "user__first_name", "user__last_name", "user__email")
        .annotate(
            total_reservations=Count("id"),
            cancelled_reservations=Count(
                "id", filter=Q(status=SpaceReservation.Status.CANCELLED)
            ),
        )
        .order_by()
    )
    for row in user_rows:
        user_id = int(row["user_id"])
        metrics.user_totals[user_id] = metrics.user_totals.get(user_id, 0) + int(
            row["total_reservations"]
        )
        metrics.user_cancelled[user_id] = metrics.user_cancelled.get(user_id, 0) + int(
            row["cancelled_reservations"]
        )
        metrics.user_names[user_id] = _format_user_name(
            row.get("user__first_name"),
            row.get("user__last_name"),
            row.get("user__email"),
            user_id,
        )


def _accumulate_object_metrics(*, metrics: AggregatedMetrics, queryset, residence_tz):
    totals_rows = (
        queryset.values("object_id", "object__name")
        .annotate(
            total_reservations=Count("id"),
            # No existe cancelled_at en este modelo; cancelación se infiere por status.
            cancelled_reservations=Count("id", filter=Q(status="CANCELLED")),
        )
        .order_by()
    )
    for row in totals_rows:
        zone_id = int(row["object_id"])
        zone_key = _build_zone_key("objects", zone_id)
        total_reservations = int(row["total_reservations"])
        cancelled_reservations = int(row["cancelled_reservations"])

        metrics.zone_totals[zone_key] = total_reservations
        metrics.zone_cancelled[zone_key] = cancelled_reservations
        metrics.zone_names[zone_key] = (row.get("object__name") or "").strip() or f"Objeto #{zone_id}"
        metrics.zone_resource_types[zone_key] = "objects"
        metrics.total_reservations += total_reservations
        metrics.total_cancelled += cancelled_reservations

    peak_rows = (
        queryset.annotate(local_hour=ExtractHour("start_date", tzinfo=residence_tz))
        .values("object_id", "local_hour")
        .annotate(reservations_count=Count("id"))
        .order_by()
    )
    for row in peak_rows:
        local_hour = row.get("local_hour")
        if local_hour is None:
            continue
        zone_key = _build_zone_key("objects", int(row["object_id"]))
        metrics.peak_counts[(zone_key, int(local_hour))] = int(row["reservations_count"])

    user_rows = (
        queryset.values("user_id", "user__first_name", "user__last_name", "user__email")
        .annotate(
            total_reservations=Count("id"),
            cancelled_reservations=Count("id", filter=Q(status="CANCELLED")),
        )
        .order_by()
    )
    for row in user_rows:
        user_id = int(row["user_id"])
        metrics.user_totals[user_id] = metrics.user_totals.get(user_id, 0) + int(
            row["total_reservations"]
        )
        metrics.user_cancelled[user_id] = metrics.user_cancelled.get(user_id, 0) + int(
            row["cancelled_reservations"]
        )
        metrics.user_names[user_id] = _format_user_name(
            row.get("user__first_name"),
            row.get("user__last_name"),
            row.get("user__email"),
            user_id,
        )


def _collect_period_metrics(
    *,
    residence,
    period_start,
    period_end,
    resource_type: str,
    space_zone_id: int | None,
    object_zone_id: int | None,
    residence_tz,
) -> AggregatedMetrics:
    metrics = AggregatedMetrics()

    include_spaces = resource_type in {"all", "spaces"}
    include_objects = resource_type in {"all", "objects"}

    if include_spaces:
        # Espacios: medimos uso real por la hora efectiva reservada (start_time),
        # no por created_at.
        spaces_queryset = SpaceReservation.objects.filter(
            residence=residence,
            start_time__gte=period_start,
            start_time__lte=period_end,
        )
        if space_zone_id is not None:
            spaces_queryset = spaces_queryset.filter(space_id=space_zone_id)
        _accumulate_space_metrics(
            metrics=metrics, queryset=spaces_queryset, residence_tz=residence_tz
        )

    if include_objects:
        # Objetos: usamos start_date como hora efectiva de la reserva.
        objects_queryset = ObjectRental.objects.filter(
            object__residence=residence,
            start_date__gte=period_start,
            start_date__lte=period_end,
        )
        if object_zone_id is not None:
            objects_queryset = objects_queryset.filter(object_id=object_zone_id)
        _accumulate_object_metrics(
            metrics=metrics, queryset=objects_queryset, residence_tz=residence_tz
        )

    return metrics


def _calculate_delta_pct(*, current_value: float, previous_value: float) -> float | None:
    if previous_value == 0:
        return None
    return round(((current_value - previous_value) / previous_value) * 100, 2)


def _calculate_rate(*, numerator: int, denominator: int) -> float:
    if denominator <= 0:
        return 0.0
    return round((numerator / denominator) * 100, 2)


def _zone_sort_key(zone_key: str, current_metrics: AggregatedMetrics, previous_metrics: AggregatedMetrics):
    current_total = current_metrics.zone_totals.get(zone_key, 0)
    zone_name = current_metrics.zone_names.get(zone_key) or previous_metrics.zone_names.get(zone_key) or zone_key
    return (-current_total, zone_name.lower(), zone_key)


def _build_most_reserved_zones(
    *,
    current_metrics: AggregatedMetrics,
    previous_metrics: AggregatedMetrics | None,
    compare: str,
):
    total_reservations = current_metrics.total_reservations
    previous_zone_totals = previous_metrics.zone_totals if previous_metrics else {}

    all_zone_keys = set(current_metrics.zone_totals.keys())
    if previous_metrics is not None:
        all_zone_keys.update(previous_metrics.zone_totals.keys())

    rows = []
    for zone_key in sorted(
        all_zone_keys,
        key=lambda key: _zone_sort_key(key, current_metrics, previous_metrics or AggregatedMetrics()),
    ):
        current_value = int(current_metrics.zone_totals.get(zone_key, 0))
        compare_value = (
            int(previous_zone_totals.get(zone_key, 0))
            if compare == "previous_period"
            else None
        )
        delta = current_value - compare_value if compare_value is not None else None
        delta_pct = (
            _calculate_delta_pct(current_value=current_value, previous_value=compare_value)
            if compare_value is not None
            else None
        )

        rows.append(
            {
                "zone_id": zone_key,
                "zone_name": current_metrics.zone_names.get(zone_key)
                or (previous_metrics.zone_names.get(zone_key) if previous_metrics else zone_key),
                "resource_type": current_metrics.zone_resource_types.get(zone_key)
                or (previous_metrics.zone_resource_types.get(zone_key) if previous_metrics else "unknown"),
                "reservations_count": current_value,
                "pct_of_total": round((current_value / total_reservations) * 100, 2)
                if total_reservations > 0
                else 0.0,
                "compare_value": compare_value,
                "delta": delta,
                "delta_pct": delta_pct,
            }
        )

    return rows


def _build_peak_time_by_zone(
    *,
    current_metrics: AggregatedMetrics,
    previous_metrics: AggregatedMetrics | None,
    compare: str,
):
    previous_peak_counts = previous_metrics.peak_counts if previous_metrics else {}

    all_zone_keys = set(current_metrics.zone_totals.keys())
    if previous_metrics is not None:
        all_zone_keys.update(previous_metrics.zone_totals.keys())

    rows = []
    for zone_key in sorted(
        all_zone_keys,
        key=lambda key: _zone_sort_key(key, current_metrics, previous_metrics or AggregatedMetrics()),
    ):
        zone_name = current_metrics.zone_names.get(zone_key) or (
            previous_metrics.zone_names.get(zone_key) if previous_metrics else zone_key
        )
        resource_type = current_metrics.zone_resource_types.get(zone_key) or (
            previous_metrics.zone_resource_types.get(zone_key) if previous_metrics else "unknown"
        )

        for hour in range(24):
            current_value = int(current_metrics.peak_counts.get((zone_key, hour), 0))
            compare_value = (
                int(previous_peak_counts.get((zone_key, hour), 0))
                if compare == "previous_period"
                else None
            )
            delta = current_value - compare_value if compare_value is not None else None
            delta_pct = (
                _calculate_delta_pct(current_value=current_value, previous_value=compare_value)
                if compare_value is not None
                else None
            )
            rows.append(
                {
                    "zone_id": zone_key,
                    "zone_name": zone_name,
                    "resource_type": resource_type,
                    "hour": hour,
                    "label": f"{hour:02d}:00",
                    "reservations_count": current_value,
                    "compare_value": compare_value,
                    "delta": delta,
                    "delta_pct": delta_pct,
                }
            )

    return rows


def _build_cancellation_rate_by_zone(
    *,
    current_metrics: AggregatedMetrics,
    previous_metrics: AggregatedMetrics | None,
    compare: str,
):
    previous_zone_totals = previous_metrics.zone_totals if previous_metrics else {}
    previous_zone_cancelled = previous_metrics.zone_cancelled if previous_metrics else {}

    all_zone_keys = set(current_metrics.zone_totals.keys())
    if previous_metrics is not None:
        all_zone_keys.update(previous_metrics.zone_totals.keys())

    rows = []
    for zone_key in all_zone_keys:
        total_reservations = int(current_metrics.zone_totals.get(zone_key, 0))
        cancelled_reservations = int(current_metrics.zone_cancelled.get(zone_key, 0))
        cancellation_rate = _calculate_rate(
            numerator=cancelled_reservations, denominator=total_reservations
        )

        compare_value = None
        delta = None
        delta_pct = None
        if compare == "previous_period":
            previous_total = int(previous_zone_totals.get(zone_key, 0))
            previous_cancelled = int(previous_zone_cancelled.get(zone_key, 0))
            previous_rate = _calculate_rate(
                numerator=previous_cancelled, denominator=previous_total
            )
            compare_value = previous_rate
            delta = round(cancellation_rate - previous_rate, 2)
            delta_pct = _calculate_delta_pct(
                current_value=cancellation_rate, previous_value=previous_rate
            )

        rows.append(
            {
                "zone_id": zone_key,
                "zone_name": current_metrics.zone_names.get(zone_key)
                or (previous_metrics.zone_names.get(zone_key) if previous_metrics else zone_key),
                "resource_type": current_metrics.zone_resource_types.get(zone_key)
                or (previous_metrics.zone_resource_types.get(zone_key) if previous_metrics else "unknown"),
                "total_reservations": total_reservations,
                "cancelled_reservations": cancelled_reservations,
                "cancellation_rate": cancellation_rate,
                "compare_value": compare_value,
                "delta": delta,
                "delta_pct": delta_pct,
            }
        )

    rows.sort(
        key=lambda row: (
            -row["cancellation_rate"],
            -row["cancelled_reservations"],
            -row["total_reservations"],
            row["zone_name"].lower(),
        )
    )
    return rows


def _build_cancellation_rate_by_user(
    *,
    current_metrics: AggregatedMetrics,
    previous_metrics: AggregatedMetrics | None,
    compare: str,
):
    previous_user_totals = previous_metrics.user_totals if previous_metrics else {}
    previous_user_cancelled = previous_metrics.user_cancelled if previous_metrics else {}

    all_user_ids = set(current_metrics.user_totals.keys())
    if previous_metrics is not None:
        all_user_ids.update(previous_metrics.user_totals.keys())

    rows = []
    for user_id in all_user_ids:
        total_reservations = int(current_metrics.user_totals.get(user_id, 0))
        cancelled_reservations = int(current_metrics.user_cancelled.get(user_id, 0))
        cancellation_rate = _calculate_rate(
            numerator=cancelled_reservations, denominator=total_reservations
        )

        compare_value = None
        delta = None
        delta_pct = None
        if compare == "previous_period":
            previous_total = int(previous_user_totals.get(user_id, 0))
            previous_cancelled = int(previous_user_cancelled.get(user_id, 0))
            previous_rate = _calculate_rate(
                numerator=previous_cancelled, denominator=previous_total
            )
            compare_value = previous_rate
            delta = round(cancellation_rate - previous_rate, 2)
            delta_pct = _calculate_delta_pct(
                current_value=cancellation_rate, previous_value=previous_rate
            )

        rows.append(
            {
                "user_id": user_id,
                "user_name": current_metrics.user_names.get(user_id)
                or (previous_metrics.user_names.get(user_id) if previous_metrics else f"Usuario #{user_id}"),
                "total_reservations": total_reservations,
                "cancelled_reservations": cancelled_reservations,
                "cancellation_rate": cancellation_rate,
                "compare_value": compare_value,
                "delta": delta,
                "delta_pct": delta_pct,
            }
        )

    rows.sort(
        key=lambda row: (
            -row["cancellation_rate"],
            -row["cancelled_reservations"],
            -row["total_reservations"],
            row["user_name"].lower(),
        )
    )
    return rows


def _build_summary(
    *,
    current_metrics: AggregatedMetrics,
    previous_metrics: AggregatedMetrics | None,
    compare: str,
):
    total_reservations = int(current_metrics.total_reservations)
    total_cancelled = int(current_metrics.total_cancelled)
    cancellation_rate = _calculate_rate(
        numerator=total_cancelled, denominator=total_reservations
    )
    active_zones = len(current_metrics.zone_totals)

    previous_total_reservations = None
    previous_total_cancelled = None
    previous_cancellation_rate = None
    previous_active_zones = None
    if previous_metrics is not None:
        previous_total_reservations = int(previous_metrics.total_reservations)
        previous_total_cancelled = int(previous_metrics.total_cancelled)
        previous_cancellation_rate = _calculate_rate(
            numerator=previous_total_cancelled, denominator=previous_total_reservations
        )
        previous_active_zones = len(previous_metrics.zone_totals)

    return {
        "total_reservations": total_reservations,
        "total_cancelled": total_cancelled,
        "cancellation_rate": cancellation_rate,
        "active_zones": active_zones,
        "compare_value_total_reservations": previous_total_reservations,
        "compare_value_total_cancelled": previous_total_cancelled,
        "compare_value_cancellation_rate": previous_cancellation_rate,
        "compare_value_active_zones": previous_active_zones,
        "delta_total_reservations": (
            total_reservations - previous_total_reservations
            if compare == "previous_period" and previous_total_reservations is not None
            else None
        ),
        "delta_total_cancelled": (
            total_cancelled - previous_total_cancelled
            if compare == "previous_period" and previous_total_cancelled is not None
            else None
        ),
        "delta_cancellation_rate": (
            round(cancellation_rate - previous_cancellation_rate, 2)
            if compare == "previous_period" and previous_cancellation_rate is not None
            else None
        ),
        "delta_active_zones": (
            active_zones - previous_active_zones
            if compare == "previous_period" and previous_active_zones is not None
            else None
        ),
        "delta_pct_total_reservations": (
            _calculate_delta_pct(
                current_value=total_reservations,
                previous_value=previous_total_reservations,
            )
            if compare == "previous_period" and previous_total_reservations is not None
            else None
        ),
        "delta_pct_total_cancelled": (
            _calculate_delta_pct(
                current_value=total_cancelled,
                previous_value=previous_total_cancelled,
            )
            if compare == "previous_period" and previous_total_cancelled is not None
            else None
        ),
        "delta_pct_cancellation_rate": (
            _calculate_delta_pct(
                current_value=cancellation_rate,
                previous_value=previous_cancellation_rate,
            )
            if compare == "previous_period" and previous_cancellation_rate is not None
            else None
        ),
        "delta_pct_active_zones": (
            _calculate_delta_pct(
                current_value=active_zones,
                previous_value=previous_active_zones,
            )
            if compare == "previous_period" and previous_active_zones is not None
            else None
        ),
    }


def get_admin_reservations_analytics(
    *,
    residence,
    from_value=None,
    to_value=None,
    compare_value=None,
    resource_type_value=None,
    zone_id_value=None,
):
    filters = _normalize_filters(
        from_value=from_value,
        to_value=to_value,
        compare_value=compare_value,
        resource_type_value=resource_type_value,
        zone_id_value=zone_id_value,
        residence=residence,
    )

    current_metrics = _collect_period_metrics(
        residence=residence,
        period_start=filters["period_start"],
        period_end=filters["period_end"],
        resource_type=filters["resource_type"],
        space_zone_id=filters["space_zone_id"],
        object_zone_id=filters["object_zone_id"],
        residence_tz=filters["residence_tz"],
    )

    previous_metrics = None
    if filters["compare"] == "previous_period":
        compare_period = filters["compare_period"] or {}
        previous_metrics = _collect_period_metrics(
            residence=residence,
            period_start=compare_period.get("start"),
            period_end=compare_period.get("end"),
            resource_type=filters["resource_type"],
            space_zone_id=filters["space_zone_id"],
            object_zone_id=filters["object_zone_id"],
            residence_tz=filters["residence_tz"],
        )

    return {
        "summary": _build_summary(
            current_metrics=current_metrics,
            previous_metrics=previous_metrics,
            compare=filters["compare"],
        ),
        "most_reserved_zones": _build_most_reserved_zones(
            current_metrics=current_metrics,
            previous_metrics=previous_metrics,
            compare=filters["compare"],
        ),
        "peak_time_by_zone": _build_peak_time_by_zone(
            current_metrics=current_metrics,
            previous_metrics=previous_metrics,
            compare=filters["compare"],
        ),
        "cancellation_rate_by_zone": _build_cancellation_rate_by_zone(
            current_metrics=current_metrics,
            previous_metrics=previous_metrics,
            compare=filters["compare"],
        ),
        "cancellation_rate_by_user": _build_cancellation_rate_by_user(
            current_metrics=current_metrics,
            previous_metrics=previous_metrics,
            compare=filters["compare"],
        ),
        "meta": {
            "from_value": filters["period_start"].isoformat(),
            "to_value": filters["period_end"].isoformat(),
            "compare": filters["compare"],
            "resource_type": filters["resource_type"],
            "zone_id": filters["zone_id"],
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
