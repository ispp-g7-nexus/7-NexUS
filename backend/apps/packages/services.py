from __future__ import annotations

import base64
import difflib
import json
import re
from typing import Any

import requests
from django.conf import settings
from django.core import signing
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.membership.models import Membership

from .models import Package

FIREWORKS_TIMEOUT_SECONDS = 30
RESIDENT_MATCH_CONFIDENCE_THRESHOLD = 0.7
PACKAGE_QR_TOKEN_SALT = "packages.delivery.qr"


class LabelAIError(Exception):
    """Raised when the Fireworks label extraction flow cannot complete."""


LABEL_EXTRACTION_RESPONSE_SCHEMA = {
    "name": "package_label_extraction",
    "schema": {
        "type": "object",
        "properties": {
            "recipient_name": {"type": "string"},
            "room": {"type": "string"},
            "building": {"type": "string"},
            "carrier": {"type": "string"},
            "tracking_number": {"type": "string"},
            "notes": {"type": "string"},
            "confidence": {"type": "number"},
        },
        "required": [
            "recipient_name",
            "room",
            "building",
            "carrier",
            "tracking_number",
            "notes",
            "confidence",
        ],
    },
}


def _resident_full_name(membership: Membership) -> str:
    user = membership.user
    full_name = f"{user.first_name} {user.last_name}".strip()
    return full_name or user.get_username() or user.email or f"Residente {membership.pk}"


def _normalise_text(value: str) -> str:
    value = (value or "").strip().lower()
    return re.sub(r"\s+", " ", value)


def _serialize_candidate(membership: Membership) -> dict[str, Any]:
    bedroom = membership.bedroom
    return {
        "resident_id": membership.id,
        "full_name": _resident_full_name(membership),
        "room": bedroom.numero if bedroom else "",
        "building": bedroom.edificio if bedroom else "",
    }


def _resolve_name_candidates(
    memberships: list[Membership],
    recipient_name: str,
) -> tuple[list[Membership], str, float]:
    normalized_name = _normalise_text(recipient_name)
    if not normalized_name:
        return [], "", 0.0

    exact_matches = [
        membership
        for membership in memberships
        if _normalise_text(_resident_full_name(membership)) == normalized_name
    ]
    if exact_matches:
        return exact_matches, "exact_name_match", 1.0

    query_tokens = [token for token in normalized_name.split(" ") if token]
    token_matches = [
        membership
        for membership in memberships
        if query_tokens
        and all(token in _normalise_text(_resident_full_name(membership)) for token in query_tokens)
    ]
    if token_matches:
        return token_matches, "name_db_search_match", 0.92

    scored_matches = sorted(
        (
            (
                difflib.SequenceMatcher(
                    None,
                    normalized_name,
                    _normalise_text(_resident_full_name(membership)),
                ).ratio(),
                membership,
            )
            for membership in memberships
        ),
        key=lambda item: item[0],
        reverse=True,
    )
    if not scored_matches or scored_matches[0][0] < 0.75:
        return [], "", 0.0

    top_score = scored_matches[0][0]
    close_matches = [
        membership
        for score, membership in scored_matches
        if score >= max(0.75, top_score - 0.05)
    ]
    return close_matches, "fuzzy_name_match", top_score


def _student_membership_queryset(residence, *, active_only: bool = True):
    queryset = Membership.objects.filter(
        residence=residence,
        role__name__iexact="Student",
    ).select_related("user", "bedroom").order_by("id")
    if active_only:
        queryset = queryset.filter(is_active=True)
    return queryset


def validate_resident_membership(resident_id: int, residence) -> Membership:
    try:
        membership = _student_membership_queryset(residence, active_only=False).get(
            id=resident_id
        )
    except Membership.DoesNotExist as exc:
        raise ValidationError(
            {"resident_id": "El residente no existe en esta residencia."}
        ) from exc

    if not membership.is_active:
        raise ValidationError({"resident_id": "El residente debe estar activo."})

    bedroom = membership.bedroom
    if bedroom is None:
        raise ValidationError(
            {"resident_id": "El residente debe tener una habitación asignada."}
        )
    if not bedroom.is_active:
        raise ValidationError(
            {"resident_id": "La habitación asignada del residente está desactivada."}
        )

    return membership


def sync_package_snapshots(package: Package, resident: Membership) -> None:
    bedroom = resident.bedroom
    package.resident_name_snapshot = _resident_full_name(resident)
    package.room_snapshot = bedroom.numero if bedroom else ""
    package.building_snapshot = bedroom.edificio if bedroom else ""


def create_package(data: dict[str, Any], residence, created_by) -> Package:
    resident = validate_resident_membership(data["resident_id"], residence)
    now = timezone.now()

    package = Package(
        residence=residence,
        resident=resident,
        carrier=(data.get("carrier") or "").strip(),
        tracking_number=(data.get("tracking_number") or "").strip(),
        notes=(data.get("notes") or "").strip(),
        status=data.get("status") or Package.Status.RECEIVED,
        received_at=data.get("received_at") or now,
        created_by=created_by,
    )
    sync_package_snapshots(package, resident)

    if package.status == Package.Status.DELIVERED:
        package.delivered_at = now
    else:
        package.delivered_at = None
        package.resident_notified_at = now

    package.save()
    return package


def update_package(package: Package, data: dict[str, Any], residence) -> Package:
    previous_status = package.status
    previous_resident_id = package.resident_id
    now = timezone.now()

    if "resident_id" in data:
        package.resident = validate_resident_membership(data["resident_id"], residence)
        sync_package_snapshots(package, package.resident)

    for field in ("carrier", "tracking_number", "notes"):
        if field in data:
            setattr(package, field, (data.get(field) or "").strip())

    if "received_at" in data:
        package.received_at = data["received_at"]

    if "status" in data:
        package.status = data["status"]

    resident_changed = package.resident_id != previous_resident_id
    transitioned_to_received = (
        package.status == Package.Status.RECEIVED
        and previous_status != Package.Status.RECEIVED
    )

    if package.status == Package.Status.DELIVERED:
        package.delivered_at = package.delivered_at or now
    else:
        package.delivered_at = None
        if resident_changed or transitioned_to_received:
            package.resident_viewed_at = None
            package.resident_notified_at = now

    if resident_changed and package.status == Package.Status.RECEIVED:
        package.resident_viewed_at = None
        package.resident_notified_at = now

    package.save()
    return package


def get_resident_membership_for_user(user, residence) -> Membership | None:
    return _student_membership_queryset(residence).filter(user=user).first()


def get_resident_packages_queryset(membership: Membership, residence):
    return (
        Package.objects.filter(
            residence=residence,
            resident=membership,
        )
        .select_related("resident__user", "resident__bedroom", "created_by")
        .order_by("-received_at", "-created_at")
    )


def unread_packages_count(membership: Membership, residence) -> int:
    return get_resident_packages_queryset(membership, residence).filter(
        status=Package.Status.RECEIVED,
        resident_viewed_at__isnull=True,
    ).count()


def mark_packages_as_viewed(membership: Membership, residence) -> int:
    now = timezone.now()
    return get_resident_packages_queryset(membership, residence).filter(
        status=Package.Status.RECEIVED,
        resident_viewed_at__isnull=True,
    ).update(resident_viewed_at=now)


def build_delivery_qr_token(membership: Membership, residence) -> dict[str, Any]:
    max_age = int(getattr(settings, "PACKAGE_QR_TOKEN_MAX_AGE_SECONDS", 300))
    issued_at = timezone.now()
    token = signing.dumps(
        {
            "purpose": "package_delivery",
            "resident_id": membership.id,
            "residence_id": residence.id,
        },
        salt=PACKAGE_QR_TOKEN_SALT,
        compress=True,
    )
    return {
        "qr_token": token,
        "resident_id": membership.id,
        "resident_name": _resident_full_name(membership),
        "expires_at": issued_at + timezone.timedelta(seconds=max_age),
    }


def deliver_package_by_qr(package: Package, qr_token: str, residence) -> Package:
    if package.status == Package.Status.DELIVERED:
        raise ValidationError({"detail": "El paquete ya está marcado como entregado."})

    payload = _decode_delivery_qr_token(qr_token)
    if payload["residence_id"] != residence.id:
        raise ValidationError({"qr_token": "El QR no pertenece a esta residencia."})
    if payload["resident_id"] != package.resident_id:
        raise ValidationError(
            {"qr_token": "El QR escaneado no corresponde al residente de este paquete."}
        )

    return update_package(
        package,
        {"status": Package.Status.DELIVERED},
        residence=residence,
    )


def extract_package_label_preview(image, residence) -> dict[str, Any]:
    image_bytes = image.read()
    if not image_bytes:
        raise LabelAIError("La imagen está vacía.")

    extracted = _call_fireworks_label_reader(
        image_bytes=image_bytes,
        content_type=getattr(image, "content_type", None) or "application/octet-stream",
    )
    suggested_fields = {
        "recipient_name": str(extracted.get("recipient_name") or "").strip(),
        "room": str(extracted.get("room") or "").strip(),
        "building": str(extracted.get("building") or "").strip(),
        "carrier": str(extracted.get("carrier") or "").strip(),
        "tracking_number": str(extracted.get("tracking_number") or "").strip(),
        "notes": str(extracted.get("notes") or "").strip(),
    }

    confidence = _coerce_confidence(extracted.get("confidence"))
    resident_match, candidate_residents = _resolve_resident_match(
        suggested_fields=suggested_fields,
        residence=residence,
        confidence=confidence,
    )

    if resident_match["resident_id"] is not None:
        matched_resident = validate_resident_membership(
            resident_match["resident_id"],
            residence,
        )
        suggested_fields["recipient_name"] = _resident_full_name(matched_resident)
        suggested_fields["room"] = matched_resident.bedroom.numero
        suggested_fields["building"] = matched_resident.bedroom.edificio or ""

    return {
        "suggested_fields": suggested_fields,
        "resident_match": resident_match,
        "candidate_residents": candidate_residents,
    }


def _coerce_confidence(value: Any) -> float:
    try:
        confidence = float(value)
    except (TypeError, ValueError):
        return 0.0
    return max(0.0, min(confidence, 1.0))


def _resolve_resident_match(
    *,
    suggested_fields: dict[str, str],
    residence,
    confidence: float,
) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    memberships = list(_student_membership_queryset(residence).filter(bedroom__isnull=False))
    room = (suggested_fields.get("room") or "").strip()
    building = (suggested_fields.get("building") or "").strip()

    def filter_by_room(candidates: list[Membership]) -> list[Membership]:
        filtered = candidates
        if room:
            filtered = [
                membership
                for membership in filtered
                if membership.bedroom and membership.bedroom.numero.lower() == room.lower()
            ]
        if building and filtered:
            building_filtered = [
                membership
                for membership in filtered
                if (membership.bedroom.edificio or "").lower() == building.lower()
            ]
            if building_filtered:
                filtered = building_filtered
        return filtered

    def build_response(
        *,
        resident_id: int | None,
        reason: str,
        candidates: list[Membership],
        confidence_value: float | None = None,
    ) -> tuple[dict[str, Any], list[dict[str, Any]]]:
        return (
            {
                "resident_id": resident_id,
                "confidence": confidence if confidence_value is None else confidence_value,
                "reason": reason,
            },
            [_serialize_candidate(candidate) for candidate in candidates],
        )

    name_matches, name_reason, name_score = _resolve_name_candidates(
        memberships,
        suggested_fields.get("recipient_name", ""),
    )
    if name_matches:
        if len(name_matches) == 1:
            return build_response(
                resident_id=name_matches[0].id,
                reason=name_reason,
                candidates=[],
                confidence_value=name_score,
            )

        narrowed_name_matches = filter_by_room(name_matches)
        if len(narrowed_name_matches) == 1:
            return build_response(
                resident_id=narrowed_name_matches[0].id,
                reason="name_room_disambiguated_match",
                candidates=[],
                confidence_value=max(name_score, confidence),
            )
        return (
            {
                "resident_id": None,
                "confidence": name_score,
                "reason": "ambiguous_name_match",
            },
            [_serialize_candidate(candidate) for candidate in name_matches],
        )

    if room:
        room_matches = filter_by_room(memberships)

        if len(room_matches) == 1:
            if confidence >= RESIDENT_MATCH_CONFIDENCE_THRESHOLD:
                return build_response(
                    resident_id=room_matches[0].id,
                    reason="unique_room_match",
                    candidates=[],
                )
            return build_response(
                resident_id=None,
                reason="low_confidence",
                candidates=room_matches,
            )
        if len(room_matches) > 1:
            return build_response(
                resident_id=None,
                reason="ambiguous_room_match",
                candidates=room_matches,
            )

    return build_response(resident_id=None, reason="no_match", candidates=[])


def _call_fireworks_label_reader(*, image_bytes: bytes, content_type: str) -> dict[str, Any]:
    api_key = getattr(settings, "FIREWORKS_API_KEY", "")
    model = getattr(settings, "FIREWORKS_LABEL_MODEL", "")
    base_url = getattr(
        settings,
        "FIREWORKS_BASE_URL",
        "https://api.fireworks.ai/inference/v1",
    ).rstrip("/")

    if not api_key or not model:
        raise LabelAIError("Fireworks AI no está configurado.")

    schema_text = json.dumps(LABEL_EXTRACTION_RESPONSE_SCHEMA["schema"], ensure_ascii=False)

    payload = {
        "model": model,
        "temperature": 0,
        "max_tokens": 500,
        "response_format": {
            "type": "json_schema",
            "json_schema": LABEL_EXTRACTION_RESPONSE_SCHEMA,
        },
        "messages": [
            {
                "role": "system",
                "content": (
                    "Extrae del label del paquete la información del destinatario y del envío. "
                    "Prioriza recipient_name, carrier, tracking_number y notes. Si room o building "
                    "no están visibles, devuélvelos vacíos. Devuelve únicamente JSON válido "
                    "siguiendo el esquema solicitado. confidence debe ser un número entre 0 y 1."
                ),
            },
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": (
                            "Lee la etiqueta del paquete. Obtén la información del usuario "
                            "(recipient_name) directamente del label. Si un campo no está presente, "
                            "devuélvelo como cadena vacía. Responde exclusivamente con JSON que cumpla este "
                            f"esquema: {schema_text}"
                        ),
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": (
                                f"data:{content_type};base64,"
                                f"{base64.b64encode(image_bytes).decode('ascii')}"
                            )
                        },
                    },
                ],
            },
        ],
    }

    try:
        response = requests.post(
            f"{base_url}/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=FIREWORKS_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
    except requests.RequestException as exc:
        raise LabelAIError("No se pudo procesar la etiqueta con Fireworks AI.") from exc

    body = response.json()
    try:
        content = body["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as exc:
        raise LabelAIError("La respuesta de Fireworks AI no tiene el formato esperado.") from exc

    if isinstance(content, list):
        content = "".join(
            item.get("text", "")
            for item in content
            if isinstance(item, dict)
        )

    parsed = _extract_json_payload(str(content))
    if not isinstance(parsed, dict):
        raise LabelAIError("La respuesta de Fireworks AI no contiene un JSON válido.")

    return parsed


def _extract_json_payload(content: str) -> dict[str, Any]:
    text = content.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?", "", text).strip()
        text = re.sub(r"```$", "", text).strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        start = text.find("{")
        end = text.rfind("}")
        if start == -1 or end == -1 or end <= start:
            raise LabelAIError("No se encontró un bloque JSON en la respuesta.")
        try:
            return json.loads(text[start : end + 1])
        except json.JSONDecodeError as exc:
            raise LabelAIError("No se pudo interpretar el JSON devuelto por Fireworks AI.") from exc


def _decode_delivery_qr_token(qr_token: str) -> dict[str, Any]:
    try:
        payload = signing.loads(
            qr_token,
            salt=PACKAGE_QR_TOKEN_SALT,
            max_age=int(getattr(settings, "PACKAGE_QR_TOKEN_MAX_AGE_SECONDS", 300)),
        )
    except signing.SignatureExpired as exc:
        raise ValidationError({"qr_token": "El QR es inválido o ha expirado."}) from exc
    except signing.BadSignature as exc:
        raise ValidationError({"qr_token": "El QR es inválido o ha expirado."}) from exc

    if not isinstance(payload, dict) or payload.get("purpose") != "package_delivery":
        raise ValidationError({"qr_token": "El QR es inválido."})

    try:
        resident_id = int(payload["resident_id"])
        residence_id = int(payload["residence_id"])
    except (KeyError, TypeError, ValueError) as exc:
        raise ValidationError({"qr_token": "El QR es inválido."}) from exc

    return {
        "resident_id": resident_id,
        "residence_id": residence_id,
    }
