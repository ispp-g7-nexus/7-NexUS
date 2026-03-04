from __future__ import annotations

import logging

from django.db import transaction
from django_tenants.utils import schema_context

from apps.common.utils.celery_helpers import shared_retry_task
from apps.onboarding.models import ResidentPreference
from apps.membership.models import Membership
from apps.residences.models import Residence

from .models import ResidenceCompatibility

logger = logging.getLogger(__name__)


@shared_retry_task(name="matching.recalculate_residence_compatibility")
def recalculate_residence_compatibility_task(
    self,  # noqa: ARG001 - kept for celery bind=True
    *,
    schema_name: str,
    residence_id: int,
    trigger_membership_id: int | None = None,
) -> dict[str, int | str]:
    with schema_context(schema_name):
        if not Residence.objects.filter(id=residence_id, is_active=True).exists():
            logger.warning(
                "Skipping compatibility calculation because residence does not exist or is inactive. "
                "schema=%s residence_id=%s trigger_membership_id=%s",
                schema_name,
                residence_id,
                trigger_membership_id,
            )
            return {"schema_name": schema_name, "residence_id": residence_id, "rows_created": 0}

        preferences = list(
            ResidentPreference.objects.select_related("membership")
            .filter(
                is_completed=True,
                membership__residence_id=residence_id,
                membership__is_active=True,
                membership__role=Membership.Role.RESIDENT,
            )
            .order_by("membership_id")
        )

        # Lazy import to keep web request path fast when dispatching the task.
        from .services import compute_residence_compatibility

        predictions = compute_residence_compatibility(preferences)
        rows = [
            ResidenceCompatibility(
                residence_id=residence_id,
                source_membership_id=prediction.source_membership_id,
                target_membership_id=prediction.target_membership_id,
                score=prediction.score,
            )
            for prediction in predictions
        ]

        with transaction.atomic():
            ResidenceCompatibility.objects.filter(residence_id=residence_id).delete()
            if rows:
                ResidenceCompatibility.objects.bulk_create(rows, batch_size=1000)

        logger.info(
            "Compatibility recalculated. schema=%s residence_id=%s residents=%s rows=%s trigger_membership_id=%s",
            schema_name,
            residence_id,
            len(preferences),
            len(rows),
            trigger_membership_id,
        )

    return {
        "schema_name": schema_name,
        "residence_id": residence_id,
        "rows_created": len(rows),
    }
