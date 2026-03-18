from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db.utils import ProgrammingError
from django.utils import timezone
from django_tenants.test.cases import TenantTestCase
from django_tenants.test.client import TenantClient

from apps.common.services import build_access_token
from apps.guests.models import GuestPass
from apps.membership.models import Membership, Role
from apps.residences.models import Residence, ResidenceDomain


class GuestPassesApiTests(TenantTestCase):
    @classmethod
    def get_test_tenant_domain(cls):
        return "guests.test.local"

    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Tenant Guests"
        tenant.slug = "tenant-guests"
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
            pass_code=pass_code,
            access_type="TEMPORAL",
            valid_from=valid_from,
            valid_until=valid_until,
            status=status,
            cancelled_at=cancelled_at,
            revoked_at=revoked_at,
        )

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
