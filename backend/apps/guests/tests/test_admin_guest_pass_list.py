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

ADMIN_LIST_URL = "/api/admin/guest-passes/"


class AdminGuestPassListTests(TenantTestCase):
    @classmethod
    def get_test_tenant_domain(cls):
        return "admin-guests.test.local"

    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Tenant Admin Guests"
        tenant.slug = "tenant-admin-guests"
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
            message = str(exc)
            expected = 'relation "announcements_announcement" does not exist'
            if expected not in message:
                raise

    def setUp(self):
        super().setUp()
        user_model = get_user_model()

        self.resident_user = user_model.objects.create_user(
            username="resident-admin-list",
            email="resident@adminlist.test",
            password="demo1234",  # NOSONAR
            first_name="Carlos",
            last_name="Ruiz",
        )
        self.admin_user = user_model.objects.create_user(
            username="admin-admin-list",
            email="admin@adminlist.test",
            password="demo1234",  # NOSONAR
            first_name="Admin",
            last_name="Demo",
        )

        self.residence = Residence.objects.create(
            name="Residencia Test Admin",
            slug="residencia-test-admin",
            code="RTA-001",
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
            name="Residencia Otra",
            slug="residencia-otra",
            code="RO-001",
            timezone="Europe/Madrid",
            is_active=True,
        )

        student_role = Role.objects.create(
            name="Student-AdminList",
            description="Residente",
            is_system_default=True,
            residence=None,
        )
        admin_role = Role.objects.create(
            name="Admin",
            description="Administrador",
            is_system_default=False,
            residence=self.residence,
        )

        self.resident_membership = Membership.objects.create(
            user=self.resident_user,
            role=student_role,
            residence=self.residence,
            is_active=True,
        )
        self.admin_membership = Membership.objects.create(
            user=self.admin_user,
            role=admin_role,
            residence=self.residence,
            is_active=True,
        )
        self.other_residence_membership = Membership.objects.create(
            user=self.resident_user,
            role=student_role,
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

    def _create_pass(self, *, resident, pass_code, status, valid_from, valid_until, residence=None):
        return GuestPass.objects.create(
            residence=residence or self.residence,
            resident=resident,
            full_name="Invitado Test",
            id_document="ID-TEST",
            comment="Comentario de prueba",
            pass_code=pass_code,
            access_type="TEMPORAL",
            valid_from=valid_from,
            valid_until=valid_until,
            status=status,
        )

    # --- Flujo positivo ---

    def test_admin_lists_all_passes_of_residence(self):
        now = timezone.now()
        active = self._create_pass(
            resident=self.resident_membership,
            pass_code="ADMIN-PASS-1",
            status=GuestPass.Status.ACTIVE,
            valid_from=now - timedelta(hours=1),
            valid_until=now + timedelta(hours=3),
        )
        used = self._create_pass(
            resident=self.resident_membership,
            pass_code="ADMIN-PASS-2",
            status=GuestPass.Status.USED,
            valid_from=now - timedelta(days=2),
            valid_until=now - timedelta(days=1),
        )

        response = self.admin_client.get(ADMIN_LIST_URL)

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(len(payload), 2)
        ids = {p["id"] for p in payload}
        self.assertIn(active.id, ids)
        self.assertIn(used.id, ids)

    def test_response_includes_required_fields(self):
        now = timezone.now()
        self._create_pass(
            resident=self.resident_membership,
            pass_code="FIELDS-PASS-1",
            status=GuestPass.Status.ACTIVE,
            valid_from=now,
            valid_until=now + timedelta(hours=2),
        )

        response = self.admin_client.get(ADMIN_LIST_URL)

        self.assertEqual(response.status_code, 200)
        item = response.json()[0]
        for field in ["id", "full_name", "pass_code", "valid_from", "valid_until", "status", "comment", "created_at", "resident_name"]:
            self.assertIn(field, item)

    def test_resident_name_is_full_name_when_available(self):
        now = timezone.now()
        self._create_pass(
            resident=self.resident_membership,
            pass_code="NAME-PASS-1",
            status=GuestPass.Status.ACTIVE,
            valid_from=now,
            valid_until=now + timedelta(hours=2),
        )

        response = self.admin_client.get(ADMIN_LIST_URL)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()[0]["resident_name"], "Carlos Ruiz")

    def test_resident_name_falls_back_to_email_when_no_full_name(self):
        user_model = get_user_model()
        no_name_user = user_model.objects.create_user(
            username="noname-adminlist",
            email="noname@adminlist.test",
            password="demo1234",  # NOSONAR
            first_name="",
            last_name="",
        )
        student_role = self.resident_membership.role
        no_name_membership = Membership.objects.create(
            user=no_name_user,
            role=student_role,
            residence=self.residence,
            is_active=True,
        )
        now = timezone.now()
        self._create_pass(
            resident=no_name_membership,
            pass_code="NONAME-PASS-1",
            status=GuestPass.Status.ACTIVE,
            valid_from=now,
            valid_until=now + timedelta(hours=2),
        )

        response = self.admin_client.get(ADMIN_LIST_URL)

        self.assertEqual(response.status_code, 200)
        item = next(p for p in response.json() if p["pass_code"] == "NONAME-PASS-1")
        self.assertEqual(item["resident_name"], "noname@adminlist.test")

    def test_admin_filters_passes_by_status(self):
        now = timezone.now()
        self._create_pass(
            resident=self.resident_membership,
            pass_code="FILTER-ACTIVE-1",
            status=GuestPass.Status.ACTIVE,
            valid_from=now,
            valid_until=now + timedelta(hours=2),
        )
        self._create_pass(
            resident=self.resident_membership,
            pass_code="FILTER-USED-1",
            status=GuestPass.Status.USED,
            valid_from=now - timedelta(days=1),
            valid_until=now - timedelta(hours=1),
        )

        response = self.admin_client.get(ADMIN_LIST_URL + "?status=ACTIVE")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(len(payload), 1)
        self.assertEqual(payload[0]["pass_code"], "FILTER-ACTIVE-1")

    def test_admin_sees_empty_list_when_no_passes_exist(self):
        response = self.admin_client.get(ADMIN_LIST_URL)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), [])

    def test_passes_from_other_residence_are_not_included(self):
        now = timezone.now()
        self._create_pass(
            resident=self.resident_membership,
            pass_code="OWN-PASS-1",
            status=GuestPass.Status.ACTIVE,
            valid_from=now,
            valid_until=now + timedelta(hours=2),
        )
        self._create_pass(
            resident=self.other_residence_membership,
            pass_code="OTHER-RES-PASS-1",
            status=GuestPass.Status.ACTIVE,
            valid_from=now,
            valid_until=now + timedelta(hours=2),
            residence=self.other_residence,
        )

        response = self.admin_client.get(ADMIN_LIST_URL)

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(len(payload), 1)
        self.assertEqual(payload[0]["pass_code"], "OWN-PASS-1")

    def test_filter_by_unknown_status_returns_empty_list(self):
        now = timezone.now()
        self._create_pass(
            resident=self.resident_membership,
            pass_code="UNKNOWN-STATUS-PASS-1",
            status=GuestPass.Status.ACTIVE,
            valid_from=now,
            valid_until=now + timedelta(hours=2),
        )

        response = self.admin_client.get(ADMIN_LIST_URL + "?status=NONEXISTENT")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), [])

    # --- Flujo negativo ---

    def test_resident_cannot_access_admin_list(self):
        response = self.resident_client.get(ADMIN_LIST_URL)
        self.assertEqual(response.status_code, 403)

    def test_unauthenticated_request_is_rejected(self):
        client = TenantClient(self.tenant)
        response = client.get(ADMIN_LIST_URL)
        self.assertEqual(response.status_code, 403)
