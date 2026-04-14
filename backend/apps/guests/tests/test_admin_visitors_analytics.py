from collections import Counter
from datetime import timedelta
from zoneinfo import ZoneInfo

from django.contrib.auth import get_user_model
from django.db.utils import ProgrammingError
from django.utils import timezone
from django_tenants.test.cases import TenantTestCase
from django_tenants.test.client import TenantClient

from apps.common.services import build_access_token
from apps.guests.models import GuestPass
from apps.membership.models import Membership, Role
from apps.residences.models import Residence, ResidenceDomain

ANALYTICS_URL = "/api/admin/analytics/visitors/"


class AdminVisitorsAnalyticsTests(TenantTestCase):
    @classmethod
    def get_test_tenant_domain(cls):
        return "admin-visitors-analytics.test.local"

    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Tenant Admin Visitors Analytics"
        tenant.slug = "tenant-admin-visitors-analytics"
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
            if 'relation "announcements_announcement" does not exist' not in str(exc):
                raise

    def setUp(self):
        super().setUp()
        user_model = get_user_model()

        self.residence = Residence.objects.create(
            name="Residencia Analytics",
            slug="residencia-analytics",
            code="RA-AN-001",
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
            slug="residencia-b-analytics",
            code="RA-AN-002",
            timezone="Europe/Madrid",
            is_active=True,
        )

        student_role = Role.objects.create(
            name="Student",
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

        self.admin_user = user_model.objects.create_user(
            username="admin-analytics",
            email="admin-analytics@example.com",
            password="demo1234",  # NOSONAR
            first_name="Admin",
            last_name="Analytics",
        )
        self.host_a_user = user_model.objects.create_user(
            username="host-a",
            email="host-a@example.com",
            password="demo1234",  # NOSONAR
            first_name="Lucia",
            last_name="Gomez",
        )
        self.host_b_user = user_model.objects.create_user(
            username="host-b",
            email="host-b@example.com",
            password="demo1234",  # NOSONAR
            first_name="Mario",
            last_name="Lopez",
        )

        self.admin_membership = Membership.objects.create(
            user=self.admin_user,
            role=admin_role,
            residence=self.residence,
            is_active=True,
        )
        self.host_a_membership = Membership.objects.create(
            user=self.host_a_user,
            role=student_role,
            residence=self.residence,
            is_active=True,
        )
        self.host_b_membership = Membership.objects.create(
            user=self.host_b_user,
            role=student_role,
            residence=self.residence,
            is_active=True,
        )
        self.host_a_other_residence = Membership.objects.create(
            user=self.host_a_user,
            role=student_role,
            residence=self.other_residence,
            is_active=True,
        )

        self.admin_client = self._auth_client(self.admin_user, self.residence)
        self.host_client = self._auth_client(self.host_a_user, self.residence)
        self.anchor = timezone.now().replace(minute=0, second=0, microsecond=0)
        self.residence_tz = ZoneInfo(self.residence.timezone or "Europe/Madrid")
        self._pass_seq = 0

    def _auth_client(self, user, residence):
        client = TenantClient(self.tenant)
        token, _ = build_access_token(user, self.tenant, residence)
        client.defaults["HTTP_AUTHORIZATION"] = f"Bearer {token}"
        return client

    def _create_pass(
        self,
        *,
        resident,
        valid_from,
        status=GuestPass.Status.ACTIVE,
        residence=None,
        cancelled_at=None,
        revoked_at=None,
    ):
        self._pass_seq += 1
        return GuestPass.objects.create(
            residence=residence or self.residence,
            resident=resident,
            full_name="Invitado Test",
            id_document="ID-TEST",
            comment="Comentario",
            pass_code=f"PASS-{resident.id}-{self._pass_seq}",
            access_type="TEMPORAL",
            valid_from=valid_from,
            valid_until=valid_from + timedelta(hours=2),
            status=status,
            cancelled_at=cancelled_at,
            revoked_at=revoked_at,
        )

    def test_admin_gets_visitors_analytics_with_compare_previous_period(self):
        current_start = self.anchor - timedelta(days=7)
        current_end = self.anchor + timedelta(hours=1)
        previous_start = current_start - (current_end - current_start)

        current_passes = [
            current_start + timedelta(hours=9),
            current_start + timedelta(hours=10),
            current_start + timedelta(days=1, hours=10),
            current_start + timedelta(hours=18),
        ]
        previous_passes = [
            previous_start + timedelta(hours=9),
            previous_start + timedelta(hours=18),
            previous_start + timedelta(days=1, hours=18),
        ]

        self._create_pass(
            resident=self.host_a_membership,
            valid_from=current_passes[0],
        )
        self._create_pass(
            resident=self.host_a_membership,
            valid_from=current_passes[1],
        )
        self._create_pass(
            resident=self.host_a_membership,
            valid_from=current_passes[2],
        )
        self._create_pass(
            resident=self.host_b_membership,
            valid_from=current_passes[3],
        )

        self._create_pass(
            resident=self.host_a_membership,
            valid_from=previous_passes[0],
        )
        self._create_pass(
            resident=self.host_b_membership,
            valid_from=previous_passes[1],
        )
        self._create_pass(
            resident=self.host_b_membership,
            valid_from=previous_passes[2],
        )

        self._create_pass(
            resident=self.host_b_membership,
            valid_from=current_start + timedelta(hours=19),
            status=GuestPass.Status.CANCELLED,
            cancelled_at=current_start + timedelta(hours=20),
        )

        response = self.admin_client.get(
            ANALYTICS_URL,
            {
                "from": current_start.date().isoformat(),
                "to": current_end.date().isoformat(),
                "granularity": "hour",
                "compare": "previous_period",
            },
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()

        self.assertIn("summary", payload)
        self.assertIn("visitors_by_host", payload)
        self.assertIn("peak_hours", payload)

        self.assertEqual(payload["summary"]["total_visits"], 4)
        self.assertEqual(payload["summary"]["total_hosts"], 2)
        self.assertEqual(payload["summary"]["compare_value_total_visits"], 3)
        self.assertEqual(payload["summary"]["delta_total_visits"], 1)
        self.assertAlmostEqual(payload["summary"]["delta_pct_total_visits"], 33.33, places=2)

        hosts = {item["host_id"]: item for item in payload["visitors_by_host"]}
        host_a = hosts[self.host_a_membership.id]
        host_b = hosts[self.host_b_membership.id]

        self.assertEqual(host_a["host_name"], "Lucia Gomez")
        self.assertEqual(host_a["visitors_count"], 3)
        self.assertEqual(host_a["compare_value"], 1)
        self.assertEqual(host_a["delta"], 2)
        self.assertAlmostEqual(host_a["delta_pct"], 200.0, places=2)
        self.assertAlmostEqual(host_a["pct_of_total"], 75.0, places=2)

        self.assertEqual(host_b["visitors_count"], 1)
        self.assertEqual(host_b["compare_value"], 2)
        self.assertEqual(host_b["delta"], -1)
        self.assertAlmostEqual(host_b["delta_pct"], -50.0, places=2)
        self.assertAlmostEqual(host_b["pct_of_total"], 25.0, places=2)

        self.assertEqual(len(payload["peak_hours"]), 24)
        peak_by_hour = {item["hour"]: item for item in payload["peak_hours"]}
        expected_current_hour_counts = Counter(
            dt.astimezone(self.residence_tz).hour for dt in current_passes
        )
        expected_previous_hour_counts = Counter(
            dt.astimezone(self.residence_tz).hour for dt in previous_passes
        )
        for hour in range(24):
            self.assertEqual(
                peak_by_hour[hour]["visits_count"],
                expected_current_hour_counts.get(hour, 0),
            )
            self.assertEqual(
                peak_by_hour[hour]["compare_value"],
                expected_previous_hour_counts.get(hour, 0),
            )

    def test_endpoint_is_scoped_to_current_residence(self):
        current_start = self.anchor - timedelta(days=2)
        current_end = self.anchor

        self._create_pass(
            resident=self.host_a_membership,
            valid_from=current_start + timedelta(hours=8),
        )
        self._create_pass(
            resident=self.host_a_other_residence,
            residence=self.other_residence,
            valid_from=current_start + timedelta(hours=9),
        )

        response = self.admin_client.get(
            ANALYTICS_URL,
            {"from": current_start.date().isoformat(), "to": current_end.date().isoformat()},
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["summary"]["total_visits"], 1)
        self.assertEqual(payload["summary"]["total_hosts"], 1)

    def test_compare_none_returns_null_compare_values(self):
        current_start = self.anchor - timedelta(days=2)
        current_end = self.anchor

        self._create_pass(
            resident=self.host_a_membership,
            valid_from=current_start + timedelta(hours=8),
        )

        response = self.admin_client.get(
            ANALYTICS_URL,
            {
                "from": current_start.date().isoformat(),
                "to": current_end.date().isoformat(),
                "compare": "none",
            },
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()

        self.assertIsNone(payload["summary"]["compare_value_total_visits"])
        self.assertIsNone(payload["summary"]["delta_total_visits"])
        self.assertIsNone(payload["summary"]["delta_pct_total_visits"])

        host_row = payload["visitors_by_host"][0]
        self.assertIsNone(host_row["compare_value"])
        self.assertIsNone(host_row["delta"])
        self.assertIsNone(host_row["delta_pct"])

    def test_invalid_granularity_returns_400(self):
        response = self.admin_client.get(ANALYTICS_URL, {"granularity": "day"})
        self.assertEqual(response.status_code, 400)
        self.assertIn("granularity", response.json())

    def test_invalid_compare_returns_400(self):
        response = self.admin_client.get(ANALYTICS_URL, {"compare": "month_over_month"})
        self.assertEqual(response.status_code, 400)
        self.assertIn("compare", response.json())

    def test_invalid_date_format_returns_400(self):
        response = self.admin_client.get(ANALYTICS_URL, {"from": "2026/01/20"})
        self.assertEqual(response.status_code, 400)
        self.assertIn("from", response.json())

    def test_from_after_to_returns_400(self):
        tomorrow = (self.anchor + timedelta(days=1)).date().isoformat()
        yesterday = (self.anchor - timedelta(days=1)).date().isoformat()
        response = self.admin_client.get(ANALYTICS_URL, {"from": tomorrow, "to": yesterday})
        self.assertEqual(response.status_code, 400)
        self.assertIn("detail", response.json())

    def test_student_user_cannot_access_admin_analytics(self):
        response = self.host_client.get(ANALYTICS_URL)
        self.assertEqual(response.status_code, 403)
