import secrets
import string
from collections.abc import Iterable
from datetime import timedelta

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import NotFound, ValidationError

from apps.membership.models import Membership

from .models import GuestPass, GuestPassPolicy

DEFAULT_MAX_CONCURRENT_GUESTS = 3
DEFAULT_MAX_GUEST_PASS_DURATION_HOURS = 24
PASS_CODE_ALPHABET = string.ascii_uppercase + string.digits
PASS_CODE_RANDOM_SIZE = 8
MAX_GUEST_PASS_CODE_ATTEMPTS = 10


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
