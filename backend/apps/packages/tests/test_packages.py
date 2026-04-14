import base64
import json
from unittest.mock import patch

import requests
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import IntegrityError, transaction
from django.db.utils import ProgrammingError
from django.test import override_settings
from django.utils import timezone
from django_tenants.test.cases import TenantTestCase
from django_tenants.test.client import TenantClient

from apps.bedrooms.models import Bedroom
from apps.common.services import build_access_token
from apps.membership.models import Membership, Role
from apps.packages.models import Package
from apps.packages.services import _resolve_name_candidates
from apps.residences.models import Residence, ResidenceDomain

PNG_1X1_BYTES = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+tmr8AAAAASUVORK5CYII="
)

TEST_PASSWORD = "demo1234"  # NOSONAR


class DummyFireworksResponse:
    def __init__(self, payload):
        self._payload = payload

    def raise_for_status(self):
        return None

    def json(self):
        return self._payload


class DummyInvalidJsonFireworksResponse:
    def raise_for_status(self):
        return None

    def json(self):
        raise ValueError("invalid json")


@override_settings(
    FIREWORKS_API_KEY="test-fireworks-key",
    FIREWORKS_LABEL_MODEL="accounts/test/models/kimi",
    PACKAGE_QR_TOKEN_MAX_AGE_SECONDS=300,
)
class PackageApiTests(TenantTestCase):
    @classmethod
    def get_test_schema_name(cls):
        return "test_packages_api"

    @classmethod
    def get_test_tenant_domain(cls):
        return "packages.test.local"

    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Tenant Packages"
        tenant.slug = "tenant-packages"
        tenant.is_active = True
        tenant.on_trial = True

    @classmethod
    def setup_domain(cls, domain):
        domain.domain = cls.get_test_tenant_domain()
        domain.is_primary = True

    @classmethod
    def tearDownClass(cls):
        try:
            super().tearDownClass()
        except ProgrammingError as exc:
            if "announcements_announcement" not in str(exc):
                raise

    def setUp(self):
        super().setUp()
        user_model = get_user_model()

        self.admin_user = user_model.objects.create_user(
            username="admin",
            email="admin@example.com",
            password=TEST_PASSWORD,
            first_name="Admin",
            last_name="User",
        )
        self.resident_user = user_model.objects.create_user(
            username="resident",
            email="resident@example.com",
            password=TEST_PASSWORD,
            first_name="Maria",
            last_name="Lopez",
        )
        self.shared_user_a = user_model.objects.create_user(
            username="shared-a",
            email="shared-a@example.com",
            password=TEST_PASSWORD,
            first_name="Laura",
            last_name="Diaz",
        )
        self.shared_user_b = user_model.objects.create_user(
            username="shared-b",
            email="shared-b@example.com",
            password=TEST_PASSWORD,
            first_name="Lucia",
            last_name="Diaz",
        )
        self.inactive_user = user_model.objects.create_user(
            username="inactive",
            email="inactive@example.com",
            password=TEST_PASSWORD,
            first_name="Inactive",
            last_name="Resident",
        )
        self.no_room_user = user_model.objects.create_user(
            username="noroom",
            email="noroom@example.com",
            password=TEST_PASSWORD,
            first_name="No",
            last_name="Room",
        )
        self.other_residence_user = user_model.objects.create_user(
            username="other-residence",
            email="other-residence@example.com",
            password=TEST_PASSWORD,
            first_name="Other",
            last_name="Residence",
        )

        self.residence = Residence.objects.create(
            name="Residencia A",
            slug="residencia-a",
            code="RA-001",
            timezone="Europe/Madrid",
            is_active=True,
        )
        ResidenceDomain.objects.create(
            residence=self.residence,
            domain=self.get_test_tenant_domain(),
            is_primary=True,
            is_active=True,
        )
        self.other_residence = Residence.objects.create(
            name="Residencia B",
            slug="residencia-b",
            code="RB-001",
            timezone="Europe/Madrid",
            is_active=True,
        )

        self.student_role = Role.objects.create(
            name="Student",
            description="Residente",
            is_system_default=True,
            residence=None,
        )
        self.admin_role = Role.objects.create(
            name="Admin",
            description="Administrador",
            is_system_default=False,
            residence=self.residence,
        )

        self.primary_bedroom = Bedroom.objects.create(
            numero="101",
            edificio="A",
            capacidad_maxima=1,
            tipo=Bedroom.Tipo.INDIVIDUAL,
            residence=self.residence,
            is_active=True,
        )
        self.shared_bedroom = Bedroom.objects.create(
            numero="301",
            edificio="B",
            capacidad_maxima=2,
            tipo=Bedroom.Tipo.DOBLE,
            residence=self.residence,
            is_active=True,
        )
        self.inactive_bedroom = Bedroom.objects.create(
            numero="401",
            edificio="C",
            capacidad_maxima=1,
            tipo=Bedroom.Tipo.INDIVIDUAL,
            residence=self.residence,
            is_active=False,
        )
        self.other_bedroom = Bedroom.objects.create(
            numero="201",
            edificio="Z",
            capacidad_maxima=1,
            tipo=Bedroom.Tipo.INDIVIDUAL,
            residence=self.other_residence,
            is_active=True,
        )

        self.admin_membership = Membership.objects.create(
            user=self.admin_user,
            role=self.admin_role,
            residence=self.residence,
            is_active=True,
        )
        self.resident_membership = Membership.objects.create(
            user=self.resident_user,
            role=self.student_role,
            residence=self.residence,
            is_active=True,
            bedroom=self.primary_bedroom,
        )
        self.shared_membership_a = Membership.objects.create(
            user=self.shared_user_a,
            role=self.student_role,
            residence=self.residence,
            is_active=True,
            bedroom=self.shared_bedroom,
        )
        self.shared_membership_b = Membership.objects.create(
            user=self.shared_user_b,
            role=self.student_role,
            residence=self.residence,
            is_active=True,
            bedroom=self.shared_bedroom,
        )
        self.inactive_membership = Membership.objects.create(
            user=self.inactive_user,
            role=self.student_role,
            residence=self.residence,
            is_active=False,
            bedroom=self.primary_bedroom,
        )
        self.no_room_membership = Membership.objects.create(
            user=self.no_room_user,
            role=self.student_role,
            residence=self.residence,
            is_active=True,
            bedroom=None,
        )
        self.inactive_room_membership = Membership.objects.create(
            user=get_user_model().objects.create_user(
                username="inactive-room",
                email="inactive-room@example.com",
                password=TEST_PASSWORD,
                first_name="Inactive",
                last_name="Room",
            ),
            role=self.student_role,
            residence=self.residence,
            is_active=True,
            bedroom=self.inactive_bedroom,
        )
        self.other_residence_membership = Membership.objects.create(
            user=self.other_residence_user,
            role=self.student_role,
            residence=self.other_residence,
            is_active=True,
            bedroom=self.other_bedroom,
        )
        self.same_user_other_residence_membership = Membership.objects.create(
            user=self.resident_user,
            role=self.student_role,
            residence=self.other_residence,
            is_active=True,
            bedroom=self.other_bedroom,
        )

        self.admin_client = TenantClient(self.tenant)
        self.resident_client = TenantClient(self.tenant)
        self.student_client = TenantClient(self.tenant)
        self._authenticate_client(self.admin_client, self.admin_user, self.residence)
        self._authenticate_client(
            self.resident_client,
            self.resident_user,
            self.residence,
        )
        self._authenticate_client(
            self.student_client,
            self.shared_user_a,
            self.residence,
        )

    def _authenticate_client(self, client: TenantClient, user, residence) -> None:
        token, _ = build_access_token(user, self.tenant, residence)
        client.defaults["HTTP_AUTHORIZATION"] = f"Bearer {token}"

    def _create_package(
        self,
        *,
        resident,
        residence=None,
        status=Package.Status.RECEIVED,
        resident_viewed_at=None,
        resident_notified_at=None,
        delivered_at=None,
        tracking_number="TRACK-001",
        carrier="Correos",
        notes="Etiqueta test",
    ):
        residence = residence or resident.residence
        bedroom = resident.bedroom
        return Package.objects.create(
            residence=residence,
            resident=resident,
            resident_name_snapshot=self._membership_name(resident),
            room_snapshot=bedroom.numero if bedroom else "",
            building_snapshot=bedroom.edificio if bedroom else "",
            carrier=carrier,
            tracking_number=tracking_number,
            notes=notes,
            status=status,
            received_at=timezone.now(),
            delivered_at=delivered_at,
            resident_notified_at=resident_notified_at,
            resident_viewed_at=resident_viewed_at,
            created_by=self.admin_user,
        )

    def _membership_name(self, membership: Membership) -> str:
        return (
            f"{membership.user.first_name} {membership.user.last_name}".strip()
            or membership.user.username
        )

    def _label_image(self):
        return SimpleUploadedFile(
            "label.png",
            PNG_1X1_BYTES,
            content_type="image/png",
        )

    def _non_image_label(self):
        return SimpleUploadedFile(
            "label.txt",
            b"not-an-image",
            content_type="text/plain",
        )

    def _error_text(self, payload, field_name: str) -> str:
        value = payload[field_name]
        if isinstance(value, list):
            return " ".join(str(item) for item in value).lower()
        return str(value).lower()

    def test_admin_can_create_package_and_snapshots(self):
        response = self.admin_client.post(
            "/api/packages/",
            data=json.dumps(
                {
                    "resident_id": self.resident_membership.id,
                    "carrier": "SEUR",
                    "tracking_number": "PKG-123",
                    "notes": "Recepción principal",
                    "status": "RECEIVED",
                }
            ),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        payload = response.json()
        self.assertEqual(payload["resident_id"], self.resident_membership.id)
        self.assertEqual(payload["resident_name"], "Maria Lopez")
        self.assertEqual(payload["room"], "101")
        self.assertEqual(payload["building"], "A")
        self.assertTrue(payload["is_unread"])

        package = Package.objects.get(pk=payload["id"])
        self.assertIsNotNone(package.resident_notified_at)
        self.assertIsNone(package.delivered_at)

    def test_admin_list_and_retrieve_are_scoped_to_current_residence(self):
        package = self._create_package(
            resident=self.resident_membership, tracking_number="CUR-1"
        )
        external_package = self._create_package(
            resident=self.other_residence_membership,
            residence=self.other_residence,
            tracking_number="EXT-1",
        )

        response = self.admin_client.get("/api/packages/?search=CUR-1&status=RECEIVED")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(len(payload), 1)
        self.assertEqual(payload[0]["id"], package.id)

        external_response = self.admin_client.get(
            f"/api/packages/{external_package.id}/"
        )
        self.assertEqual(external_response.status_code, 404)

    def test_student_cannot_access_admin_package_crud(self):
        response = self.student_client.get("/api/packages/")
        self.assertEqual(response.status_code, 403)

        create_response = self.student_client.post(
            "/api/packages/",
            data=json.dumps({"resident_id": self.shared_membership_a.id}),
            content_type="application/json",
        )
        self.assertEqual(create_response.status_code, 403)

    def test_create_rejects_invalid_resident_states(self):
        invalid_cases = [
            (999999, "no existe"),
            (self.other_residence_membership.id, "no existe"),
            (self.inactive_membership.id, "debe estar activo"),
            (self.no_room_membership.id, "debe tener una habitación"),
            (self.inactive_room_membership.id, "desactivada"),
        ]

        for resident_id, expected_error in invalid_cases:
            with self.subTest(resident_id=resident_id):
                response = self.admin_client.post(
                    "/api/packages/",
                    data=json.dumps({"resident_id": resident_id}),
                    content_type="application/json",
                )
                self.assertEqual(response.status_code, 400)
                payload = response.json()
                self.assertIn(expected_error, self._error_text(payload, "resident_id"))

    def test_update_status_to_delivered_and_back_to_received(self):
        package = self._create_package(
            resident=self.resident_membership,
            resident_notified_at=timezone.now(),
        )

        deliver_response = self.admin_client.patch(
            f"/api/packages/{package.id}/",
            data=json.dumps({"status": "DELIVERED"}),
            content_type="application/json",
        )
        self.assertEqual(deliver_response.status_code, 200)
        package.refresh_from_db()
        self.assertEqual(package.status, Package.Status.DELIVERED)
        self.assertIsNotNone(package.delivered_at)

        reopen_response = self.admin_client.patch(
            f"/api/packages/{package.id}/",
            data=json.dumps({"status": "RECEIVED"}),
            content_type="application/json",
        )
        self.assertEqual(reopen_response.status_code, 200)
        package.refresh_from_db()
        self.assertEqual(package.status, Package.Status.RECEIVED)
        self.assertIsNone(package.delivered_at)
        self.assertIsNone(package.resident_viewed_at)
        self.assertIsNotNone(package.resident_notified_at)

    def test_cannot_reassign_delivered_package(self):
        package = self._create_package(
            resident=self.resident_membership,
            status=Package.Status.DELIVERED,
            delivered_at=timezone.now(),
        )

        response = self.admin_client.patch(
            f"/api/packages/{package.id}/",
            data=json.dumps({"resident_id": self.shared_membership_a.id}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn(
            "reassign delivered package",
            self._error_text(response.json(), "resident_id"),
        )
        package.refresh_from_db()
        self.assertEqual(package.resident_id, self.resident_membership.id)
        self.assertIsNotNone(package.delivered_at)

    def test_model_clean_rejects_invalid_delivered_state(self):
        package = Package(
            residence=self.residence,
            resident=self.resident_membership,
            resident_name_snapshot="Maria Lopez",
            room_snapshot="101",
            building_snapshot="A",
            status=Package.Status.DELIVERED,
            delivered_at=None,
        )

        with self.assertRaises(ValidationError):
            package.clean()

    def test_db_constraint_rejects_status_and_delivered_at_mismatch(self):
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                Package.objects.create(
                    residence=self.residence,
                    resident=self.resident_membership,
                    resident_name_snapshot="Maria Lopez",
                    room_snapshot="101",
                    building_snapshot="A",
                    status=Package.Status.DELIVERED,
                    delivered_at=None,
                    created_by=self.admin_user,
                )

    def test_name_token_match_uses_whole_tokens_only(self):
        diana_user = get_user_model().objects.create_user(
            username="diana",
            email="diana@example.com",
            password=TEST_PASSWORD,
            first_name="Diana",
            last_name="Lopez",
        )
        diana_membership = Membership.objects.create(
            user=diana_user,
            role=self.student_role,
            residence=self.residence,
            is_active=True,
            bedroom=self.primary_bedroom,
        )

        matches, reason, score = _resolve_name_candidates([diana_membership], "ana")

        self.assertEqual(matches, [])
        self.assertEqual(reason, "")
        self.assertEqual(score, 0.0)

    def test_delete_package_removes_record(self):
        package = self._create_package(resident=self.resident_membership)

        response = self.admin_client.delete(f"/api/packages/{package.id}/")

        self.assertEqual(response.status_code, 204)
        self.assertFalse(Package.objects.filter(id=package.id).exists())

    def test_resident_me_only_returns_packages_for_current_residence_membership(self):
        own_package = self._create_package(
            resident=self.resident_membership, tracking_number="OWN-1"
        )
        self._create_package(
            resident=self.shared_membership_a, tracking_number="OTHER-1"
        )
        self._create_package(
            resident=self.same_user_other_residence_membership,
            residence=self.other_residence,
            tracking_number="OTHER-RES-1",
        )

        response = self.resident_client.get("/api/packages/me/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(len(payload), 1)
        self.assertEqual(payload[0]["id"], own_package.id)
        self.assertEqual(payload[0]["tracking_number"], "OWN-1")

    def test_unread_count_and_mark_as_viewed(self):
        self._create_package(
            resident=self.resident_membership,
            tracking_number="U-1",
            resident_notified_at=timezone.now(),
        )
        self._create_package(
            resident=self.resident_membership,
            tracking_number="U-2",
            resident_notified_at=timezone.now(),
        )
        self._create_package(
            resident=self.resident_membership,
            tracking_number="VIEWED-1",
            resident_notified_at=timezone.now(),
            resident_viewed_at=timezone.now(),
        )
        self._create_package(
            resident=self.resident_membership,
            status=Package.Status.DELIVERED,
            tracking_number="DEL-1",
            delivered_at=timezone.now(),
        )

        count_response = self.resident_client.get("/api/packages/me/unread_count/")
        self.assertEqual(count_response.status_code, 200)
        self.assertEqual(count_response.json()["count"], 2)

        mark_response = self.resident_client.post("/api/packages/me/mark_as_viewed/")
        self.assertEqual(mark_response.status_code, 200)
        self.assertEqual(mark_response.json()["marked_count"], 2)

        count_after = self.resident_client.get("/api/packages/me/unread_count/")
        self.assertEqual(count_after.status_code, 200)
        self.assertEqual(count_after.json()["count"], 0)

    def test_resident_can_get_delivery_qr_token(self):
        response = self.resident_client.get("/api/packages/me/delivery_qr/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["resident_id"], self.resident_membership.id)
        self.assertEqual(payload["resident_name"], "Maria Lopez")
        self.assertTrue(payload["qr_token"])
        self.assertIn("expires_at", payload)

    def test_admin_can_mark_package_delivered_with_matching_qr(self):
        package = self._create_package(
            resident=self.resident_membership,
            resident_notified_at=timezone.now(),
        )
        qr_payload = self.resident_client.get("/api/packages/me/delivery_qr/").json()

        response = self.admin_client.post(
            f"/api/packages/{package.id}/deliver-by-qr/",
            data=json.dumps({"qr_token": qr_payload["qr_token"]}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        package.refresh_from_db()
        self.assertEqual(package.status, Package.Status.DELIVERED)
        self.assertIsNotNone(package.delivered_at)

    def test_admin_rejects_delivery_when_qr_belongs_to_other_resident(self):
        package = self._create_package(
            resident=self.shared_membership_a,
            resident_notified_at=timezone.now(),
        )
        qr_payload = self.resident_client.get("/api/packages/me/delivery_qr/").json()

        response = self.admin_client.post(
            f"/api/packages/{package.id}/deliver-by-qr/",
            data=json.dumps({"qr_token": qr_payload["qr_token"]}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("no corresponde", self._error_text(response.json(), "qr_token"))

    @override_settings(
        FIREWORKS_API_KEY="test-fireworks-key",
        FIREWORKS_LABEL_MODEL="accounts/test/models/kimi",
    )
    @patch("apps.packages.services.requests.post")
    def test_label_preview_returns_exact_name_match(self, mocked_post):
        mocked_post.return_value = DummyFireworksResponse(
            {
                "choices": [
                    {
                        "message": {
                            "content": json.dumps(
                                {
                                    "recipient_name": "Maria Lopez",
                                    "room": "",
                                    "building": "",
                                    "carrier": "DHL",
                                    "tracking_number": "DLH-1",
                                    "notes": "Urgente",
                                    "confidence": 0.94,
                                }
                            )
                        }
                    }
                ]
            }
        )

        response = self.admin_client.post(
            "/api/packages/label-preview/",
            data={"label_image": self._label_image()},
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(
            payload["resident_match"]["resident_id"], self.resident_membership.id
        )
        self.assertEqual(payload["resident_match"]["reason"], "exact_name_match")
        self.assertEqual(payload["suggested_fields"]["recipient_name"], "Maria Lopez")
        self.assertEqual(payload["suggested_fields"]["room"], "101")
        self.assertEqual(payload["suggested_fields"]["building"], "A")
        self.assertEqual(payload["suggested_fields"]["tracking_number"], "DLH-1")
        self.assertEqual(payload["candidate_residents"], [])
        request_payload = mocked_post.call_args.kwargs["json"]
        self.assertEqual(request_payload["response_format"]["type"], "json_schema")

    @override_settings(
        FIREWORKS_API_KEY="test-fireworks-key",
        FIREWORKS_LABEL_MODEL="accounts/test/models/kimi",
    )
    @patch("apps.packages.services.requests.post")
    def test_label_preview_matches_resident_when_ocr_name_has_extra_surname(
        self, mocked_post
    ):
        user_model = get_user_model()
        pablo_user = user_model.objects.create_user(
            username="pablo-perez",
            email="pablo.perez@example.com",
            password=TEST_PASSWORD,
            first_name="Pablo",
            last_name="P\u00e9rez",
        )
        pablo_bedroom = Bedroom.objects.create(
            numero="109",
            edificio="A",
            capacidad_maxima=1,
            tipo=Bedroom.Tipo.INDIVIDUAL,
            residence=self.residence,
            is_active=True,
        )
        pablo_membership = Membership.objects.create(
            user=pablo_user,
            role=self.student_role,
            residence=self.residence,
            is_active=True,
            bedroom=pablo_bedroom,
        )

        mocked_post.return_value = DummyFireworksResponse(
            {
                "choices": [
                    {
                        "message": {
                            "content": json.dumps(
                                {
                                    "recipient_name": "Pablo Perez Gaspar",
                                    "room": "",
                                    "building": "",
                                    "carrier": "",
                                    "tracking_number": "ES2388219344",
                                    "notes": "",
                                    "confidence": 0.85,
                                }
                            )
                        }
                    }
                ]
            }
        )

        response = self.admin_client.post(
            "/api/packages/label-preview/",
            data={"label_image": self._label_image()},
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(
            payload["resident_match"]["resident_id"], pablo_membership.id
        )
        self.assertEqual(
            payload["resident_match"]["reason"], "resident_name_subset_match"
        )
        self.assertEqual(payload["suggested_fields"]["recipient_name"], "Pablo P\u00e9rez")
        self.assertEqual(payload["suggested_fields"]["room"], "109")
        self.assertEqual(payload["suggested_fields"]["building"], "A")
        self.assertEqual(payload["candidate_residents"], [])

    @patch("apps.packages.services.requests.post")
    def test_label_preview_rejects_non_image_uploads(self, mocked_post):
        response = self.admin_client.post(
            "/api/packages/label-preview/",
            data={"label_image": self._non_image_label()},
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("imagen", self._error_text(response.json(), "label_image"))
        mocked_post.assert_not_called()

    @override_settings(
        FIREWORKS_API_KEY="test-fireworks-key",
        FIREWORKS_LABEL_MODEL="accounts/test/models/kimi",
    )
    @patch("apps.packages.services.requests.post")
    def test_label_preview_returns_ambiguous_room_candidates(self, mocked_post):
        mocked_post.return_value = DummyFireworksResponse(
            {
                "choices": [
                    {
                        "message": {
                            "content": json.dumps(
                                {
                                    "recipient_name": "",
                                    "room": "301",
                                    "building": "B",
                                    "carrier": "GLS",
                                    "tracking_number": "GLS-1",
                                    "notes": "",
                                    "confidence": 0.91,
                                }
                            )
                        }
                    }
                ]
            }
        )

        response = self.admin_client.post(
            "/api/packages/label-preview/",
            data={"label_image": self._label_image()},
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertIsNone(payload["resident_match"]["resident_id"])
        self.assertEqual(payload["resident_match"]["reason"], "ambiguous_room_match")
        self.assertEqual(len(payload["candidate_residents"]), 2)

    @override_settings(
        FIREWORKS_API_KEY="test-fireworks-key",
        FIREWORKS_LABEL_MODEL="accounts/test/models/kimi",
    )
    @patch("apps.packages.services.requests.post")
    def test_label_preview_returns_bad_gateway_on_fireworks_error(self, mocked_post):
        mocked_post.side_effect = requests.RequestException("boom")

        response = self.admin_client.post(
            "/api/packages/label-preview/",
            data={"label_image": self._label_image()},
        )

        self.assertEqual(response.status_code, 502)
        self.assertIn("Fireworks", response.json()["detail"])

    @override_settings(
        FIREWORKS_API_KEY="test-fireworks-key",
        FIREWORKS_LABEL_MODEL="accounts/test/models/kimi",
    )
    @patch("apps.packages.services.requests.post")
    def test_label_preview_returns_bad_gateway_on_invalid_json_body(self, mocked_post):
        mocked_post.return_value = DummyInvalidJsonFireworksResponse()

        response = self.admin_client.post(
            "/api/packages/label-preview/",
            data={"label_image": self._label_image()},
        )

        self.assertEqual(response.status_code, 502)
        self.assertIn("json", response.json()["detail"].lower())
