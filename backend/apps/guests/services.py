import secrets
import string
from collections.abc import Iterable
from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo

from django.db.models import Count
from django.db.models.functions import ExtractHour
from django.db import transaction
from django.utils import timezone
from django.utils.dateparse import parse_date, parse_datetime
from rest_framework.exceptions import NotFound, ValidationError

from apps.membership.models import Membership

from .models import GuestPass, GuestPassPolicy

DEFAULT_MAX_CONCURRENT_GUESTS = 3
DEFAULT_MAX_GUEST_PASS_DURATION_HOURS = 24
PASS_CODE_ALPHABET = string.ascii_uppercase + string.digits
PASS_CODE_RANDOM_SIZE = 8
MAX_GUEST_PASS_CODE_ATTEMPTS = 10
VISITOR_ANALYTICS_DEFAULT_WINDOW_DAYS = 30
VISITOR_ANALYTICS_SUPPORTED_GRANULARITIES = {"hour"}
VISITOR_ANALYTICS_SUPPORTED_COMPARE = {"none", "previous_period"}


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


def _build_guest_full_name(*, guest_first_name: str, guest_last_name: str) -> str:
    return f"{guest_first_name.strip()} {guest_last_name.strip()}".strip()


def _build_guest_pass_code(*, residence) -> str:
    for _ in range(MAX_GUEST_PASS_CODE_ATTEMPTS):
        suffix = "".join(
            secrets.choice(PASS_CODE_ALPHABET) for _ in range(PASS_CODE_RANDOM_SIZE)
        )
        candidate = f"GP-{suffix}"
        exists = GuestPass.objects.filter(
            residence=residence,
            pass_code=candidate,
        ).exists()
        if not exists:
            return candidate

    raise ValidationError(
        {
            "detail": "No se pudo generar un código de pase único. Inténtalo de nuevo."
        }
    )


def get_or_create_guest_pass_policy(residence) -> GuestPassPolicy:
    policy, _ = GuestPassPolicy.objects.get_or_create(
        residence=residence,
        defaults={
            "max_duration_hours": DEFAULT_MAX_GUEST_PASS_DURATION_HOURS,
            "max_concurrent_passes": DEFAULT_MAX_CONCURRENT_GUESTS,
        },
    )
    return policy


def _build_sweep_events(
    passes: Iterable[GuestPass],
    *,
    valid_from,
    valid_until,
) -> list[tuple]:
    # Intervalos semiabiertos [inicio, fin): si un pase termina justo cuando otro
    # empieza, no se considera solape.
    events: list[tuple] = [(valid_from, 1), (valid_until, -1)]
    for guest_pass in passes:
        events.append((guest_pass.valid_from, 1))
        events.append((guest_pass.valid_until, -1))

    events.sort(key=lambda item: (item[0], 0 if item[1] < 0 else 1))
    return events


def _would_exceed_concurrency_limit(
    passes: Iterable[GuestPass],
    *,
    valid_from,
    valid_until,
    max_concurrent_guests: int,
) -> bool:
    concurrent_count = 0
    for _, delta in _build_sweep_events(
        passes,
        valid_from=valid_from,
        valid_until=valid_until,
    ):
        concurrent_count += delta
        if concurrent_count > max_concurrent_guests:
            return True
    return False


def get_active_overlapping_guest_passes_queryset(
    *,
    membership: Membership,
    residence,
    valid_from,
    valid_until,
):
    return GuestPass.objects.filter(
        residence=residence,
        resident=membership,
        status=GuestPass.Status.ACTIVE,
        cancelled_at__isnull=True,
        revoked_at__isnull=True,
        valid_from__lt=valid_until,
        valid_until__gt=valid_from,
    )


def create_guest_pass_for_resident(
    *,
    membership: Membership,
    residence,
    guest_first_name: str,
    guest_last_name: str,
    valid_from,
    valid_until,
    comment: str | None = "",
    policy: GuestPassPolicy | None = None,
) -> GuestPass:
    now = timezone.now()

    if valid_from < now:
        raise ValidationError(
            {"valid_from": "La fecha/hora de inicio no puede ser anterior al momento actual."}
        )

    if valid_until < now:
        raise ValidationError(
            {"valid_until": "La fecha/hora de fin no puede ser anterior al momento actual."}
        )

    if valid_until <= valid_from:
        raise ValidationError(
            {"valid_until": "La fecha de fin debe ser posterior a la de inicio."}
        )

    policy = policy or get_or_create_guest_pass_policy(residence)
    max_duration = timedelta(hours=policy.max_duration_hours)
    if valid_until - valid_from > max_duration:
        raise ValidationError(
            {
                "valid_until": (
                    f"La duración máxima del pase es de {policy.max_duration_hours} horas."
                )
            }
        )

    valid_from_time = timezone.localtime(valid_from).time().replace(tzinfo=None)
    valid_until_time = timezone.localtime(valid_until).time().replace(tzinfo=None)

    if policy.visit_start_time is not None:
        if valid_from_time < policy.visit_start_time:
            raise ValidationError(
                {
                    "valid_from": (
                        "La fecha de inicio no puede ser anterior a la hora de "
                        f"inicio de visitas ({policy.visit_start_time.strftime('%H:%M')})."
                    )
                }
            )

        if valid_until_time < policy.visit_start_time:
            raise ValidationError(
                {
                    "valid_until": (
                        "La fecha de fin no puede ser anterior a la hora de "
                        f"inicio de visitas ({policy.visit_start_time.strftime('%H:%M')})."
                    )
                }
            )

    if policy.visit_end_time is not None:
        if valid_from_time >= policy.visit_end_time:
            raise ValidationError(
                {
                    "valid_from": (
                        "La fecha de inicio debe ser anterior a la hora límite de "
                        f"salida ({policy.visit_end_time.strftime('%H:%M')})."
                    )
                }
            )

        if valid_until_time >= policy.visit_end_time:
            raise ValidationError(
                {
                    "valid_until": (
                        "La fecha de fin debe ser anterior a la hora límite de "
                        f"salida ({policy.visit_end_time.strftime('%H:%M')})."
                    )
                }
            )

    with transaction.atomic():
        GuestPassPolicy.objects.select_for_update().filter(id=policy.id).exists()
        Membership.objects.select_for_update().filter(id=membership.id).exists()
        overlapping_passes = list(
            get_active_overlapping_guest_passes_queryset(
                membership=membership,
                residence=residence,
                valid_from=valid_from,
                valid_until=valid_until,
            ).select_for_update()
        )

        if _would_exceed_concurrency_limit(
            overlapping_passes,
            valid_from=valid_from,
            valid_until=valid_until,
            max_concurrent_guests=policy.max_concurrent_passes,
        ):
            raise ValidationError(
                {
                    "detail": (
                        "No puedes tener más de "
                        f"{policy.max_concurrent_passes} invitados concurrentes "
                        "en ese intervalo."
                    )
                }
            )

        guest_pass = GuestPass(
            residence=residence,
            resident=membership,
            full_name=_build_guest_full_name(
                guest_first_name=guest_first_name,
                guest_last_name=guest_last_name,
            ),
            id_document="",
            comment=(comment or "").strip(),
            pass_code=_build_guest_pass_code(residence=residence),
            access_type="TEMPORAL",
            valid_from=valid_from,
            valid_until=valid_until,
            status=GuestPass.Status.ACTIVE,
        )
        guest_pass.full_clean()
        guest_pass.save()

    return guest_pass


def cancel_guest_pass_for_resident(pass_id: int, membership: Membership, residence) -> GuestPass:
    try:
        guest_pass = GuestPass.objects.get(
            id=pass_id, resident=membership, residence=residence
        )
    except GuestPass.DoesNotExist:
        raise NotFound("Pase no encontrado.") from None

    if guest_pass.cancelled_at is not None or guest_pass.status == GuestPass.Status.CANCELLED:
        raise ValidationError({"detail": "El pase ya está cancelado."})

    if guest_pass.revoked_at is not None or guest_pass.status == GuestPass.Status.REVOKED:
        raise ValidationError({"detail": "El pase está revocado y no puede cancelarse."})

    now = timezone.now()
    is_cancellable = (
        guest_pass.status == GuestPass.Status.ACTIVE
        and guest_pass.valid_until >= now
        and guest_pass.cancelled_at is None
        and guest_pass.revoked_at is None
    )
    if not is_cancellable:
        raise ValidationError({"detail": "Solo puedes cancelar pases activos o próximos."})

    guest_pass.status = GuestPass.Status.CANCELLED
    guest_pass.cancelled_at = now
    guest_pass.save(update_fields=["status", "cancelled_at", "updated_at"])
    return guest_pass


def revoke_guest_pass_admin(pass_id: int, residence) -> GuestPass:
    try:
        guest_pass = GuestPass.objects.get(id=pass_id, residence=residence)
    except GuestPass.DoesNotExist:
        raise ValidationError({"detail": "Pase no encontrado."}) from None

    if guest_pass.status != GuestPass.Status.ACTIVE:
        raise ValidationError({"detail": "Solo se pueden revocar pases activos."}) from None

    guest_pass.status = GuestPass.Status.REVOKED
    guest_pass.revoked_at = timezone.now()
    guest_pass.save(update_fields=["status", "revoked_at"])
    return guest_pass


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


def get_upcoming_guest_passes_queryset(membership: Membership, residence):
    now = timezone.now()
    return (
        GuestPass.objects.filter(
            residence=residence,
            resident=membership,
            status=GuestPass.Status.ACTIVE,
            valid_from__gt=now,
            cancelled_at__isnull=True,
            revoked_at__isnull=True,
        )
        .select_related("resident__user", "resident__bedroom")
        .order_by("valid_from", "valid_until", "-created_at")
    )


def get_guest_pass_history_queryset(membership: Membership, residence):
    now = timezone.now()
    return (
        GuestPass.objects.filter(
            residence=residence,
            resident=membership,
        )
        .exclude(
            status=GuestPass.Status.ACTIVE,
            cancelled_at__isnull=True,
            revoked_at__isnull=True,
            valid_until__gte=now,
        )
        .select_related("resident__user", "resident__bedroom")
        .order_by("-valid_until", "-created_at")
    )


def _resolve_residence_timezone(residence) -> ZoneInfo:
    timezone_name = getattr(residence, "timezone", "") or "Europe/Madrid"
    try:
        return ZoneInfo(timezone_name)
    except Exception:
        return ZoneInfo("Europe/Madrid")


def _parse_analytics_boundary(raw_value, *, field_name: str, is_end: bool, residence_tz):
    if raw_value in (None, ""):
        return None

    value = str(raw_value).strip()
    parsed_dt = parse_datetime(value)
    if parsed_dt is not None:
        if timezone.is_naive(parsed_dt):
            return timezone.make_aware(parsed_dt, residence_tz)
        return parsed_dt.astimezone(residence_tz)

    parsed_date = parse_date(value)
    if parsed_date is not None:
        boundary = time.max if is_end else time.min
        return timezone.make_aware(datetime.combine(parsed_date, boundary), residence_tz)

    raise ValidationError({field_name: "Formato inválido. Usa ISO datetime o YYYY-MM-DD."})


def _normalize_analytics_filters(*, from_value, to_value, granularity_value, compare_value, residence):
    residence_tz = _resolve_residence_timezone(residence)

    period_end = _parse_analytics_boundary(
        to_value,
        field_name="to",
        is_end=True,
        residence_tz=residence_tz,
    )
    period_start = _parse_analytics_boundary(
        from_value,
        field_name="from",
        is_end=False,
        residence_tz=residence_tz,
    )

    now = timezone.now().astimezone(residence_tz)
    if period_end is None:
        period_end = now
    if period_start is None:
        period_start = period_end - timedelta(days=VISITOR_ANALYTICS_DEFAULT_WINDOW_DAYS)

    if period_start > period_end:
        raise ValidationError(
            {"detail": "El parámetro 'from' debe ser anterior o igual a 'to'."}
        )

    granularity = str(granularity_value or "hour").strip().lower()
    if granularity not in VISITOR_ANALYTICS_SUPPORTED_GRANULARITIES:
        raise ValidationError(
            {"granularity": "Granularidad no soportada. Usa 'hour'."}
        )

    compare = str(compare_value or "none").strip().lower()
    if compare not in VISITOR_ANALYTICS_SUPPORTED_COMPARE:
        raise ValidationError(
            {"compare": "Comparación no soportada. Usa 'none' o 'previous_period'."}
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
        "granularity": granularity,
        "compare": compare,
        "compare_period": compare_period,
        "residence_tz": residence_tz,
    }


def _calculate_delta_pct(*, current_value: int, previous_value: int) -> float | None:
    if previous_value == 0:
        return None
    return round(((current_value - previous_value) / previous_value) * 100, 2)


def _build_host_name(row: dict) -> str:
    first_name = (row.get("resident__user__first_name") or "").strip()
    last_name = (row.get("resident__user__last_name") or "").strip()
    full_name = f"{first_name} {last_name}".strip()
    if full_name:
        return full_name
    email = (row.get("resident__user__email") or "").strip()
    if email:
        return email
    host_id = row.get("resident_id")
    return f"Residente #{host_id}" if host_id else "Residente"


def _get_visitor_analytics_queryset(*, residence, period_start, period_end):
    # Se usa valid_from como referencia temporal porque representa el inicio real
    # previsto de la visita (mejor indicador de afluencia que created_at).
    invalid_statuses = [
        GuestPass.Status.CANCELLED,
        GuestPass.Status.REVOKED,
        GuestPass.Status.REJECTED,
    ]
    return GuestPass.objects.filter(
        residence=residence,
        valid_from__gte=period_start,
        valid_from__lte=period_end,
    ).exclude(status__in=invalid_statuses)


def _build_hosts_payload(*, queryset, total_visits: int, previous_host_counts: dict[int, int], compare: str):
    host_rows = list(
        queryset.values(
            "resident_id",
            "resident__user__first_name",
            "resident__user__last_name",
            "resident__user__email",
        )
        .annotate(visitors_count=Count("id"))
        .order_by("-visitors_count", "resident_id")
    )

    payload = []
    for row in host_rows:
        host_id = row["resident_id"]
        visitors_count = int(row["visitors_count"])
        compare_value = (
            int(previous_host_counts.get(host_id, 0))
            if compare == "previous_period"
            else None
        )
        delta = (
            visitors_count - compare_value
            if compare_value is not None
            else None
        )
        delta_pct = (
            _calculate_delta_pct(current_value=visitors_count, previous_value=compare_value)
            if compare_value is not None
            else None
        )

        payload.append(
            {
                "host_id": host_id,
                "host_name": _build_host_name(row),
                "visitors_count": visitors_count,
                "pct_of_total": round((visitors_count / total_visits) * 100, 2)
                if total_visits > 0
                else 0.0,
                "compare_value": compare_value,
                "delta": delta,
                "delta_pct": delta_pct,
            }
        )

    return payload


def _build_hour_counts_map(*, queryset, residence_tz) -> dict[int, int]:
    hour_rows = list(
        queryset.annotate(
            local_hour=ExtractHour("valid_from", tzinfo=residence_tz)
        )
        .values("local_hour")
        .annotate(visits_count=Count("id"))
        .order_by("local_hour")
    )
    return {
        int(row["local_hour"]): int(row["visits_count"])
        for row in hour_rows
        if row["local_hour"] is not None
    }


def _build_peak_hours_payload(
    *,
    current_hour_counts: dict[int, int],
    previous_hour_counts: dict[int, int],
    compare: str,
):

    payload = []
    for hour in range(24):
        current_value = int(current_hour_counts.get(hour, 0))
        compare_value = (
            int(previous_hour_counts.get(hour, 0))
            if compare == "previous_period"
            else None
        )
        delta = (
            current_value - compare_value
            if compare_value is not None
            else None
        )
        delta_pct = (
            _calculate_delta_pct(current_value=current_value, previous_value=compare_value)
            if compare_value is not None
            else None
        )
        payload.append(
            {
                "hour": hour,
                "label": f"{hour:02d}:00",
                "visits_count": current_value,
                "compare_value": compare_value,
                "delta": delta,
                "delta_pct": delta_pct,
            }
        )

    return payload


def get_admin_visitors_analytics(
    *,
    residence,
    from_value=None,
    to_value=None,
    granularity_value=None,
    compare_value=None,
):
    filters = _normalize_analytics_filters(
        from_value=from_value,
        to_value=to_value,
        granularity_value=granularity_value,
        compare_value=compare_value,
        residence=residence,
    )

    current_queryset = _get_visitor_analytics_queryset(
        residence=residence,
        period_start=filters["period_start"],
        period_end=filters["period_end"],
    )

    previous_queryset = None
    previous_host_counts: dict[int, int] = {}
    previous_hour_counts: dict[int, int] = {}

    if filters["compare"] == "previous_period":
        compare_period = filters["compare_period"] or {}
        previous_queryset = _get_visitor_analytics_queryset(
            residence=residence,
            period_start=compare_period.get("start"),
            period_end=compare_period.get("end"),
        )
        previous_host_counts = {
            int(row["resident_id"]): int(row["visitors_count"])
            for row in previous_queryset.values("resident_id").annotate(visitors_count=Count("id"))
        }
        previous_hour_counts = _build_hour_counts_map(
            queryset=previous_queryset,
            residence_tz=filters["residence_tz"],
        )

    total_visits = current_queryset.count()
    current_hour_counts = _build_hour_counts_map(
        queryset=current_queryset,
        residence_tz=filters["residence_tz"],
    )
    visitors_by_host = _build_hosts_payload(
        queryset=current_queryset,
        total_visits=total_visits,
        previous_host_counts=previous_host_counts,
        compare=filters["compare"],
    )
    peak_hours = _build_peak_hours_payload(
        current_hour_counts=current_hour_counts,
        previous_hour_counts=previous_hour_counts,
        compare=filters["compare"],
    )

    total_hosts = len(visitors_by_host)
    previous_total_visits = previous_queryset.count() if previous_queryset is not None else None
    previous_total_hosts = len(previous_host_counts) if previous_queryset is not None else None

    summary = {
        "total_visits": total_visits,
        "total_hosts": total_hosts,
        "compare_value_total_visits": previous_total_visits,
        "compare_value_total_hosts": previous_total_hosts,
        "delta_total_visits": (
            total_visits - previous_total_visits if previous_total_visits is not None else None
        ),
        "delta_total_hosts": (
            total_hosts - previous_total_hosts if previous_total_hosts is not None else None
        ),
        "delta_pct_total_visits": (
            _calculate_delta_pct(
                current_value=total_visits,
                previous_value=previous_total_visits,
            )
            if previous_total_visits is not None
            else None
        ),
        "delta_pct_total_hosts": (
            _calculate_delta_pct(
                current_value=total_hosts,
                previous_value=previous_total_hosts,
            )
            if previous_total_hosts is not None
            else None
        ),
    }

    meta = {
        "from_value": filters["period_start"].isoformat(),
        "to_value": filters["period_end"].isoformat(),
        "granularity": filters["granularity"],
        "compare": filters["compare"],
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
    }

    return {
        "summary": summary,
        "visitors_by_host": visitors_by_host,
        "peak_hours": peak_hours,
        "meta": meta,
    }
