import json
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db.utils import ProgrammingError
from django.utils import timezone
from django_tenants.test.cases import TenantTestCase
from django_tenants.test.client import TenantClient

from apps.common.services import build_access_token
from apps.guests.models import GuestPass, GuestPassPolicy
from apps.membership.models import Membership, Role
from apps.residences.models import Residence, ResidenceDomain


class GuestPassesApiTests(TenantTestCase):
    @classmethod
    def get_test_tenant_domain(cls):
        return f"{cls.__name__.lower()}.test.local"

    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Tenant Guests"
        tenant.slug = "tenant-guests"
        tenant.is_active = True
        tenant.on_trial = True
        tenant.schema_name = f"test_schema_{cls.__name__.lower()}"

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

        self.resident_user = user_model.objects.create_user(
            username="resident",
            email="resident@example.com",
            password="demo1234",  # NOSONAR
            first_name="Resident",
            last_name="A",
        )
        self.other_resident_user = user_model.objects.create_user(
            username="resident-b",
            email="resident-b@example.com",
            password="demo1234",  # NOSONAR
            first_name="Resident",
            last_name="B",
        )
        self.admin_user = user_model.objects.create_user(
            username="admin",
            email="admin@example.com",
            password="demo1234",  # NOSONAR
            first_name="Admin",
            last_name="User",
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

        self.resident_membership = Membership.objects.create(
            user=self.resident_user,
            role=self.student_role,
            residence=self.residence,
            is_active=True,
        )
        self.other_resident_membership = Membership.objects.create(
            user=self.other_resident_user,
            role=self.student_role,
            residence=self.residence,
            is_active=True,
        )
        self.admin_membership = Membership.objects.create(
            user=self.admin_user,
            role=self.admin_role,
            residence=self.residence,
            is_active=True,
        )
        self.resident_membership_other_residence = Membership.objects.create(
            user=self.resident_user,
            role=self.student_role,
            residence=self.other_residence,
            is_active=True,
        )

        self.resident_client = self._auth_client(self.resident_user, self.residence)
        self.admin_client = self._auth_client(self.admin_user, self.residence)
        self.create_url = "/api/guest-passes/me/"
        self.resident_policy_url = "/api/guest-passes/me/policy/"
        self.admin_policy_url = "/api/admin/guest-passes/policy/"

    def _auth_client(self, user, residence):
        client = TenantClient(self.tenant)
        token, _ = build_access_token(user, self.tenant, residence)
        client.defaults["HTTP_AUTHORIZATION"] = f"Bearer {token}"
        return client

    def _create_pass(
        self,
        *,
        resident: Membership,
        pass_code: str,
        status: str,
        valid_from,
        valid_until,
        residence=None,
        cancelled_at=None,
        revoked_at=None,
    ) -> GuestPass:
        return GuestPass.objects.create(
            residence=residence or self.residence,
            resident=resident,
            full_name="Invitado Demo",
            id_document="ID-123",
            comment="",
            pass_code=pass_code,
            access_type="TEMPORAL",
            valid_from=valid_from,
            valid_until=valid_until,
            status=status,
            cancelled_at=cancelled_at,
            revoked_at=revoked_at,
        )

    def _build_create_payload(
        self,
        *,
        valid_from,
        valid_until,
        guest_first_name="Juan",
        guest_last_name="Pérez",
        comment="Visita puntual",
    ):
        return {
            "guest_first_name": guest_first_name,
            "guest_last_name": guest_last_name,
            "valid_from": valid_from.isoformat(),
            "valid_until": valid_until.isoformat(),
            "comment": comment,
        }

    def test_resident_lists_only_own_active_passes(self):
        now = timezone.now()

        active = self._create_pass(
            resident=self.resident_membership,
            pass_code="PASS-ACTIVE-1",
            status=GuestPass.Status.ACTIVE,
            valid_from=now - timedelta(hours=1),
            valid_until=now + timedelta(hours=3),
        )
        self._create_pass(
            resident=self.resident_membership,
            pass_code="PASS-EXPIRED-1",
            status=GuestPass.Status.ACTIVE,
            valid_from=now - timedelta(days=1),
            valid_until=now - timedelta(minutes=1),
        )
        self._create_pass(
            resident=self.resident_membership,
            pass_code="PASS-FUTURE-1",
            status=GuestPass.Status.ACTIVE,
            valid_from=now + timedelta(hours=1),
            valid_until=now + timedelta(hours=5),
        )
        self._create_pass(
            resident=self.resident_membership,
            pass_code="PASS-CANCELLED-1",
            status=GuestPass.Status.CANCELLED,
            valid_from=now - timedelta(hours=1),
            valid_until=now + timedelta(hours=3),
            cancelled_at=now - timedelta(minutes=10),
        )
        self._create_pass(
            resident=self.resident_membership,
            pass_code="PASS-REVOKED-1",
            status=GuestPass.Status.ACTIVE,
            valid_from=now - timedelta(hours=1),
            valid_until=now + timedelta(hours=3),
            revoked_at=now - timedelta(minutes=10),
        )
        self._create_pass(
            resident=self.resident_membership,
            pass_code="PASS-USED-1",
            status=GuestPass.Status.USED,
            valid_from=now - timedelta(hours=1),
            valid_until=now + timedelta(hours=3),
        )
        self._create_pass(
            resident=self.other_resident_membership,
            pass_code="PASS-OTHER-RESIDENT-1",
            status=GuestPass.Status.ACTIVE,
            valid_from=now - timedelta(hours=1),
            valid_until=now + timedelta(hours=3),
        )
        self._create_pass(
            resident=self.resident_membership_other_residence,
            pass_code="PASS-OTHER-RESIDENCE-1",
            status=GuestPass.Status.ACTIVE,
            valid_from=now - timedelta(hours=1),
            valid_until=now + timedelta(hours=3),
            residence=self.other_residence,
        )

        response = self.resident_client.get("/api/guest-passes/me/active/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(len(payload), 1)
        self.assertEqual(payload[0]["id"], active.id)
        self.assertEqual(payload[0]["pass_code"], "PASS-ACTIVE-1")
        self.assertEqual(payload[0]["full_name"], "Invitado Demo")
        self.assertIn("valid_from", payload[0])
        self.assertIn("valid_until", payload[0])

    def test_non_resident_user_is_forbidden(self):
        response = self.admin_client.get("/api/guest-passes/me/active/")
        self.assertEqual(response.status_code, 403)

    def test_resident_lists_only_own_upcoming_passes(self):
        now = timezone.now()

        upcoming = self._create_pass(
            resident=self.resident_membership,
            pass_code="PASS-UPCOMING-1",
            status=GuestPass.Status.ACTIVE,
            valid_from=now + timedelta(hours=2),
            valid_until=now + timedelta(hours=6),
        )
        self._create_pass(
            resident=self.resident_membership,
            pass_code="PASS-ACTIVE-NOW-1",
            status=GuestPass.Status.ACTIVE,
            valid_from=now - timedelta(hours=1),
            valid_until=now + timedelta(hours=3),
        )
        self._create_pass(
            resident=self.resident_membership,
            pass_code="PASS-UPCOMING-CANCELLED-1",
            status=GuestPass.Status.CANCELLED,
            valid_from=now + timedelta(hours=2),
            valid_until=now + timedelta(hours=4),
            cancelled_at=now,
        )
        self._create_pass(
            resident=self.other_resident_membership,
            pass_code="PASS-UPCOMING-OTHER-1",
            status=GuestPass.Status.ACTIVE,
            valid_from=now + timedelta(hours=2),
            valid_until=now + timedelta(hours=4),
        )

        response = self.resident_client.get("/api/guest-passes/me/upcoming/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(len(payload), 1)
        self.assertEqual(payload[0]["id"], upcoming.id)
        self.assertEqual(payload[0]["pass_code"], "PASS-UPCOMING-1")

    def test_non_resident_user_is_forbidden_for_upcoming_list(self):
        response = self.admin_client.get("/api/guest-passes/me/upcoming/")
        self.assertEqual(response.status_code, 403)

    def test_resident_history_includes_expired_active_passes_as_inactive(self):
        now = timezone.now()

        expired_active = self._create_pass(
            resident=self.resident_membership,
            pass_code="PASS-HISTORY-EXPIRED-1",
            status=GuestPass.Status.ACTIVE,
            valid_from=now - timedelta(days=2),
            valid_until=now - timedelta(hours=1),
        )
        self._create_pass(
            resident=self.resident_membership,
            pass_code="PASS-HISTORY-ACTIVE-NOW-1",
            status=GuestPass.Status.ACTIVE,
            valid_from=now - timedelta(hours=1),
            valid_until=now + timedelta(hours=2),
        )
        self._create_pass(
            resident=self.resident_membership,
            pass_code="PASS-HISTORY-UPCOMING-1",
            status=GuestPass.Status.ACTIVE,
            valid_from=now + timedelta(hours=1),
            valid_until=now + timedelta(hours=3),
        )
        revoked = self._create_pass(
            resident=self.resident_membership,
            pass_code="PASS-HISTORY-REVOKED-1",
            status=GuestPass.Status.ACTIVE,
            valid_from=now - timedelta(days=1),
            valid_until=now + timedelta(hours=3),
            revoked_at=now - timedelta(minutes=5),
        )
        used = self._create_pass(
            resident=self.resident_membership,
            pass_code="PASS-HISTORY-USED-1",
            status=GuestPass.Status.USED,
            valid_from=now - timedelta(days=1),
            valid_until=now - timedelta(hours=20),
        )

        response = self.resident_client.get("/api/guest-passes/me/history/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        ids = {item["id"] for item in payload}
        self.assertIn(expired_active.id, ids)
        self.assertIn(used.id, ids)

        by_code = {item["pass_code"]: item for item in payload}
        self.assertEqual(
            by_code["PASS-HISTORY-EXPIRED-1"]["status"], GuestPass.Status.INACTIVE
        )
        self.assertEqual(
            by_code["PASS-HISTORY-REVOKED-1"]["status"], GuestPass.Status.REVOKED
        )
        self.assertEqual(
            by_code["PASS-HISTORY-USED-1"]["status"], GuestPass.Status.USED
        )
        self.assertIn(revoked.id, ids)
        self.assertNotIn("PASS-HISTORY-ACTIVE-NOW-1", by_code)
        self.assertNotIn("PASS-HISTORY-UPCOMING-1", by_code)

    def test_resident_creates_guest_pass_with_valid_data(self):
        now = timezone.now()
        valid_from = now + timedelta(hours=1)
        valid_until = valid_from + timedelta(hours=2)
        payload = self._build_create_payload(
            valid_from=valid_from,
            valid_until=valid_until,
            guest_first_name="Laura",
            guest_last_name="Mendoza",
            comment="Cumpleanos",
        )

        response = self.resident_client.post(
            self.create_url,
            data=json.dumps(payload),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        created = GuestPass.objects.get(id=response.json()["id"])
        self.assertEqual(created.resident_id, self.resident_membership.id)
        self.assertEqual(created.residence_id, self.residence.id)
        self.assertEqual(created.full_name, "Laura Mendoza")
        self.assertEqual(created.comment, "Cumpleanos")
        self.assertEqual(created.status, GuestPass.Status.ACTIVE)

    def test_create_rejects_duration_over_24_hours(self):
        now = timezone.now()
        valid_from = now + timedelta(hours=1)
        valid_until = valid_from + timedelta(hours=24, minutes=1)
        payload = self._build_create_payload(
            valid_from=valid_from, valid_until=valid_until
        )

        response = self.resident_client.post(
            self.create_url,
            data=json.dumps(payload),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("valid_until", response.json())

    def test_create_rejects_invalid_temporal_interval(self):
        now = timezone.now()
        valid_from = now + timedelta(hours=4)
        valid_until = valid_from
        payload = self._build_create_payload(
            valid_from=valid_from, valid_until=valid_until
        )

        response = self.resident_client.post(
            self.create_url,
            data=json.dumps(payload),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("valid_until", response.json())

    def test_create_rejects_when_start_datetime_is_in_the_past(self):
        now = timezone.now()
        payload = self._build_create_payload(
            valid_from=now - timedelta(minutes=10),
            valid_until=now + timedelta(hours=1),
        )

        response = self.resident_client.post(
            self.create_url,
            data=json.dumps(payload),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("valid_from", response.json())

    def test_create_rejects_when_end_datetime_is_in_the_past(self):
        now = timezone.now()
        payload = self._build_create_payload(
            valid_from=now + timedelta(hours=1),
            valid_until=now - timedelta(minutes=5),
        )

        response = self.resident_client.post(
            self.create_url,
            data=json.dumps(payload),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("valid_until", response.json())

    def test_create_rejects_when_new_pass_exceeds_concurrency_limit(self):
        now = timezone.now().replace(minute=0, second=0, microsecond=0)
        new_start = now + timedelta(hours=2)
        new_end = now + timedelta(hours=6)

        self._create_pass(
            resident=self.resident_membership,
            pass_code="PASS-C1",
            status=GuestPass.Status.ACTIVE,
            valid_from=now + timedelta(hours=1),
            valid_until=now + timedelta(hours=5),
        )
        self._create_pass(
            resident=self.resident_membership,
            pass_code="PASS-C2",
            status=GuestPass.Status.ACTIVE,
            valid_from=now + timedelta(hours=2),
            valid_until=now + timedelta(hours=6),
        )
        self._create_pass(
            resident=self.resident_membership,
            pass_code="PASS-C3",
            status=GuestPass.Status.ACTIVE,
            valid_from=now + timedelta(hours=3),
            valid_until=now + timedelta(hours=7),
        )

        payload = self._build_create_payload(valid_from=new_start, valid_until=new_end)
        response = self.resident_client.post(
            self.create_url,
            data=json.dumps(payload),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("detail", response.json())
        self.assertEqual(
            GuestPass.objects.filter(
                resident=self.resident_membership,
                residence=self.residence,
            ).count(),
            3,
        )

    def test_create_allows_when_overlap_does_not_exceed_limit(self):
        now = timezone.now().replace(minute=0, second=0, microsecond=0)
        new_start = now + timedelta(hours=2)
        new_end = now + timedelta(hours=4, minutes=30)

        self._create_pass(
            resident=self.resident_membership,
            pass_code="PASS-OK-1",
            status=GuestPass.Status.ACTIVE,
            valid_from=now + timedelta(hours=0),
            valid_until=now + timedelta(hours=1, minutes=30),
        )
        self._create_pass(
            resident=self.resident_membership,
            pass_code="PASS-OK-2",
            status=GuestPass.Status.ACTIVE,
            valid_from=now + timedelta(hours=1),
            valid_until=now + timedelta(hours=5),
        )
        self._create_pass(
            resident=self.resident_membership,
            pass_code="PASS-OK-3",
            status=GuestPass.Status.ACTIVE,
            valid_from=now + timedelta(hours=3),
            valid_until=now + timedelta(hours=6),
        )

        payload = self._build_create_payload(valid_from=new_start, valid_until=new_end)
        response = self.resident_client.post(
            self.create_url,
            data=json.dumps(payload),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(
            GuestPass.objects.filter(
                resident=self.resident_membership,
                residence=self.residence,
            ).count(),
            4,
        )

    def test_non_resident_cannot_create_guest_pass(self):
        now = timezone.now()
        payload = self._build_create_payload(
            valid_from=now + timedelta(hours=1),
            valid_until=now + timedelta(hours=2),
        )
        response = self.admin_client.post(
            self.create_url,
            data=json.dumps(payload),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 403)

    def test_create_requires_guest_name_and_last_name(self):
        now = timezone.now()
        payload = self._build_create_payload(
            valid_from=now + timedelta(hours=1),
            valid_until=now + timedelta(hours=2),
            guest_first_name="",
            guest_last_name="",
        )
        response = self.resident_client.post(
            self.create_url,
            data=json.dumps(payload),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        errors = response.json()
        self.assertIn("guest_first_name", errors)
        self.assertIn("guest_last_name", errors)

    def test_create_allows_optional_comment(self):
        now = timezone.now()
        payload = self._build_create_payload(
            valid_from=now + timedelta(hours=1),
            valid_until=now + timedelta(hours=2),
            comment="",
        )
        response = self.resident_client.post(
            self.create_url,
            data=json.dumps(payload),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        created = GuestPass.objects.get(id=response.json()["id"])
        self.assertEqual(created.comment, "")

    def test_resident_can_read_effective_guest_pass_policy(self):
        response = self.resident_client.get(self.resident_policy_url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["max_duration_hours"], 24)
        self.assertEqual(response.json()["max_concurrent_passes"], 3)
        self.assertTrue(
            GuestPassPolicy.objects.filter(residence=self.residence).exists()
        )

    def test_admin_can_read_and_update_guest_pass_policy(self):
        get_response = self.admin_client.get(self.admin_policy_url)
        self.assertEqual(get_response.status_code, 200)
        self.assertEqual(get_response.json()["max_duration_hours"], 24)
        self.assertEqual(get_response.json()["max_concurrent_passes"], 3)

        patch_response = self.admin_client.patch(
            self.admin_policy_url,
            data=json.dumps({"max_duration_hours": 12, "max_concurrent_passes": 5}),
            content_type="application/json",
        )
        self.assertEqual(patch_response.status_code, 200)
        self.assertEqual(patch_response.json()["max_duration_hours"], 12)
        self.assertEqual(patch_response.json()["max_concurrent_passes"], 5)

        policy = GuestPassPolicy.objects.get(residence=self.residence)
        self.assertEqual(policy.max_duration_hours, 12)
        self.assertEqual(policy.max_concurrent_passes, 5)

    def test_resident_cannot_update_admin_policy(self):
        response = self.resident_client.patch(
            self.admin_policy_url,
            data=json.dumps({"max_duration_hours": 10}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 403)

    def test_create_uses_custom_max_duration_policy(self):
        GuestPassPolicy.objects.create(
            residence=self.residence,
            max_duration_hours=2,
            max_concurrent_passes=3,
        )

        now = timezone.now()
        payload = self._build_create_payload(
            valid_from=now + timedelta(hours=1),
            valid_until=now + timedelta(hours=4),
        )

        response = self.resident_client.post(
            self.create_url,
            data=json.dumps(payload),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("valid_until", response.json())

    def test_create_uses_custom_concurrency_policy(self):
        GuestPassPolicy.objects.create(
            residence=self.residence,
            max_duration_hours=24,
            max_concurrent_passes=2,
        )

        now = timezone.now().replace(minute=0, second=0, microsecond=0)
        new_start = now + timedelta(hours=2)
        new_end = now + timedelta(hours=5)

        self._create_pass(
            resident=self.resident_membership,
            pass_code="PASS-POL-1",
            status=GuestPass.Status.ACTIVE,
            valid_from=now + timedelta(hours=1),
            valid_until=now + timedelta(hours=6),
        )
        self._create_pass(
            resident=self.resident_membership,
            pass_code="PASS-POL-2",
            status=GuestPass.Status.ACTIVE,
            valid_from=now + timedelta(hours=2),
            valid_until=now + timedelta(hours=5),
        )

        payload = self._build_create_payload(valid_from=new_start, valid_until=new_end)
        response = self.resident_client.post(
            self.create_url,
            data=json.dumps(payload),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("detail", response.json())
