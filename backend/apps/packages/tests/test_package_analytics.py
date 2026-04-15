"""Tests for PackageAnalyticsView — GET /api/packages/analytics/"""
from datetime import date, datetime, timedelta

from django.contrib.auth import get_user_model
from django.db.utils import ProgrammingError
from django.utils.timezone import make_aware
from django_tenants.test.cases import TenantTestCase
from django_tenants.test.client import TenantClient

from apps.bedrooms.models import Bedroom
from apps.common.services import build_access_token
from apps.membership.models import Membership, Role
from apps.packages.models import Package
from apps.residences.models import Residence, ResidenceDomain

ANALYTICS_URL = "/api/packages/analytics/"
TEST_PASSWORD = "demo1234"  # NOSONAR


class PackageAnalyticsViewTests(TenantTestCase):

    @classmethod
    def get_test_schema_name(cls):
        return "test_package_analytics"

    @classmethod
    def get_test_tenant_domain(cls):
        return "package-analytics.test.local"

    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Tenant Package Analytics"
        tenant.slug = "tenant-package-analytics"
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

        self.residence = Residence.objects.create(
            name="Residencia Packages",
            slug="residencia-packages-an",
            code="RP-AN-001",
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
            slug="residencia-b-pkg",
            code="RB-PKG-001",
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

        self.admin_user = user_model.objects.create_user(
            username="pkg-admin",
            email="pkg-admin@test.local",
            password=TEST_PASSWORD,
        )
        self.student_user = user_model.objects.create_user(
            username="pkg-student",
            email="pkg-student@test.local",
            password=TEST_PASSWORD,
        )
        self.resident_a_user = user_model.objects.create_user(
            username="resident-a",
            email="resident-a@test.local",
            password=TEST_PASSWORD,
            first_name="Ana",
            last_name="García",
        )
        self.resident_b_user = user_model.objects.create_user(
            username="resident-b",
            email="resident-b@test.local",
            password=TEST_PASSWORD,
            first_name="Luis",
            last_name="Pérez",
        )

        self.bedroom = Bedroom.objects.create(
            numero="101",
            edificio="A",
            capacidad_maxima=2,
            tipo=Bedroom.Tipo.DOBLE,
            residence=self.residence,
        )
        self.other_bedroom = Bedroom.objects.create(
            numero="201",
            edificio="Z",
            capacidad_maxima=1,
            tipo=Bedroom.Tipo.INDIVIDUAL,
            residence=self.other_residence,
        )

        self.admin_membership = Membership.objects.create(
            user=self.admin_user,
            role=self.admin_role,
            residence=self.residence,
            is_active=True,
        )
        self.student_membership = Membership.objects.create(
            user=self.student_user,
            role=self.student_role,
            residence=self.residence,
            is_active=True,
            bedroom=self.bedroom,
        )
        self.resident_a = Membership.objects.create(
            user=self.resident_a_user,
            role=self.student_role,
            residence=self.residence,
            is_active=True,
            bedroom=self.bedroom,
        )
        self.resident_b = Membership.objects.create(
            user=self.resident_b_user,
            role=self.student_role,
            residence=self.residence,
            is_active=True,
            bedroom=self.bedroom,
        )
        other_user = user_model.objects.create_user(username="other-res", email="other@test.local", password="x")  # NOSONAR
        self.other_resident = Membership.objects.create(
            user=other_user,
            role=self.student_role,
            residence=self.other_residence,
            is_active=True,
            bedroom=self.other_bedroom,
        )

        self.admin_client = TenantClient(self.tenant)
        self._auth(self.admin_client, self.admin_user)

        self.student_client = TenantClient(self.tenant)
        self._auth(self.student_client, self.student_user)

        self.anon_client = TenantClient(self.tenant)

        # Fixed reference dates
        self.today = date(2024, 6, 15)
        self.yesterday = self.today - timedelta(days=1)
        self.day_before = self.today - timedelta(days=2)

    # ── Helpers ──────────────────────────────────────────────────────────────

    def _auth(self, client: TenantClient, user) -> None:
        token, _ = build_access_token(user, self.tenant, self.residence)
        client.defaults["HTTP_AUTHORIZATION"] = f"Bearer {token}"

    def _dt(self, d: date, hour: int = 10) -> datetime:
        return make_aware(datetime(d.year, d.month, d.day, hour, 0, 0))

    def _pkg(
        self,
        *,
        resident,
        received_on: date,
        delivered_on: date | None = None,
        residence=None,
    ) -> Package:
        bedroom = resident.bedroom
        status = Package.Status.DELIVERED if delivered_on else Package.Status.RECEIVED
        return Package.objects.create(
            residence=residence or self.residence,
            resident=resident,
            resident_name_snapshot=resident.user.get_full_name() or resident.user.username,
            room_snapshot=bedroom.numero if bedroom else "",
            building_snapshot=bedroom.edificio if bedroom else "",
            carrier="Correos",
            tracking_number="TEST",
            status=status,
            received_at=self._dt(received_on),
            delivered_at=self._dt(delivered_on) if delivered_on else None,
            created_by=self.admin_user,
        )

    def _url_with_range(self, from_date: date, to_date: date) -> str:
        return f"{ANALYTICS_URL}?from={from_date.isoformat()}&to={to_date.isoformat()}"

    # ── Auth / permissions ────────────────────────────────────────────────────

    def test_unauthenticated_returns_403(self):
        # IsPackageAdmin returns False (not NotAuthenticated) for anonymous users,
        # so DRF responds with 403 instead of 401.
        response = self.anon_client.get(ANALYTICS_URL)
        self.assertEqual(response.status_code, 403)

    def test_student_returns_403(self):
        response = self.student_client.get(ANALYTICS_URL)
        self.assertEqual(response.status_code, 403)

    def test_admin_returns_200(self):
        response = self.admin_client.get(ANALYTICS_URL)
        self.assertEqual(response.status_code, 200)

    # ── Response structure ────────────────────────────────────────────────────

    def test_response_has_required_keys(self):
        payload = self.admin_client.get(ANALYTICS_URL).json()
        for key in ("summary", "daily_activity", "by_resident", "meta"):
            self.assertIn(key, payload)

    def test_summary_has_required_keys(self):
        summary = self.admin_client.get(ANALYTICS_URL).json()["summary"]
        for key in ("total_received_in_period", "total_delivered_in_period", "currently_pending"):
            self.assertIn(key, summary)

    def test_meta_reflects_date_range(self):
        url = self._url_with_range(self.day_before, self.today)
        meta = self.admin_client.get(url).json()["meta"]
        self.assertEqual(meta["from"], self.day_before.isoformat())
        self.assertEqual(meta["to"], self.today.isoformat())

    # ── Summary counts ────────────────────────────────────────────────────────

    def test_summary_received_count_in_period(self):
        self._pkg(resident=self.resident_a, received_on=self.today)
        self._pkg(resident=self.resident_a, received_on=self.yesterday)
        # Outside range — should NOT be counted
        self._pkg(resident=self.resident_a, received_on=self.today - timedelta(days=60))

        url = self._url_with_range(self.yesterday, self.today)
        summary = self.admin_client.get(url).json()["summary"]
        self.assertEqual(summary["total_received_in_period"], 2)

    def test_summary_delivered_count_in_period(self):
        self._pkg(resident=self.resident_a, received_on=self.day_before, delivered_on=self.today)
        self._pkg(resident=self.resident_b, received_on=self.day_before, delivered_on=self.yesterday)
        # Received but NOT delivered
        self._pkg(resident=self.resident_a, received_on=self.today)

        url = self._url_with_range(self.day_before, self.today)
        summary = self.admin_client.get(url).json()["summary"]
        self.assertEqual(summary["total_delivered_in_period"], 2)

    def test_currently_pending_counts_all_received_status(self):
        # One from long ago (still RECEIVED), one delivered in range
        self._pkg(resident=self.resident_a, received_on=self.today - timedelta(days=90))
        self._pkg(resident=self.resident_b, received_on=self.day_before, delivered_on=self.today)

        url = self._url_with_range(self.yesterday, self.today)
        summary = self.admin_client.get(url).json()["summary"]
        # The old one is still RECEIVED regardless of the date filter
        self.assertEqual(summary["currently_pending"], 1)

    # ── Daily activity ────────────────────────────────────────────────────────

    def test_daily_activity_length_matches_range(self):
        url = self._url_with_range(self.day_before, self.today)
        daily = self.admin_client.get(url).json()["daily_activity"]
        self.assertEqual(len(daily), 3)  # day_before, yesterday, today

    def test_daily_activity_received_per_day(self):
        self._pkg(resident=self.resident_a, received_on=self.today)
        self._pkg(resident=self.resident_b, received_on=self.today)
        self._pkg(resident=self.resident_a, received_on=self.yesterday)

        url = self._url_with_range(self.yesterday, self.today)
        daily = {item["date"]: item for item in self.admin_client.get(url).json()["daily_activity"]}

        self.assertEqual(daily[self.today.isoformat()]["received"], 2)
        self.assertEqual(daily[self.yesterday.isoformat()]["received"], 1)

    def test_daily_activity_delivered_per_day(self):
        self._pkg(resident=self.resident_a, received_on=self.day_before, delivered_on=self.today)
        self._pkg(resident=self.resident_b, received_on=self.day_before, delivered_on=self.yesterday)

        url = self._url_with_range(self.day_before, self.today)
        daily = {item["date"]: item for item in self.admin_client.get(url).json()["daily_activity"]}

        self.assertEqual(daily[self.today.isoformat()]["delivered"], 1)
        self.assertEqual(daily[self.yesterday.isoformat()]["delivered"], 1)
        self.assertEqual(daily[self.day_before.isoformat()]["delivered"], 0)

    def test_cumulative_pending_grows_with_received(self):
        self._pkg(resident=self.resident_a, received_on=self.day_before)
        self._pkg(resident=self.resident_b, received_on=self.yesterday)
        # None delivered

        url = self._url_with_range(self.day_before, self.today)
        daily = {item["date"]: item for item in self.admin_client.get(url).json()["daily_activity"]}

        self.assertEqual(daily[self.day_before.isoformat()]["pending_cumulative"], 1)
        self.assertEqual(daily[self.yesterday.isoformat()]["pending_cumulative"], 2)
        self.assertEqual(daily[self.today.isoformat()]["pending_cumulative"], 2)

    def test_cumulative_pending_decreases_with_delivery(self):
        self._pkg(resident=self.resident_a, received_on=self.day_before)
        self._pkg(resident=self.resident_b, received_on=self.day_before)
        self._pkg(resident=self.resident_a, received_on=self.day_before, delivered_on=self.yesterday)

        url = self._url_with_range(self.day_before, self.today)
        daily = {item["date"]: item for item in self.admin_client.get(url).json()["daily_activity"]}

        # After day_before: 3 received, 0 delivered that day → 3 pending
        self.assertEqual(daily[self.day_before.isoformat()]["pending_cumulative"], 3)
        # After yesterday: 3 received total, 1 delivered → 2 pending
        self.assertEqual(daily[self.yesterday.isoformat()]["pending_cumulative"], 2)
        # After today: no changes → still 2 pending
        self.assertEqual(daily[self.today.isoformat()]["pending_cumulative"], 2)

    def test_cumulative_pending_accounts_for_pre_range_stock(self):
        """Packages received before the range window still count toward the running stock."""
        old_day = self.day_before - timedelta(days=10)
        self._pkg(resident=self.resident_a, received_on=old_day)  # before range, still RECEIVED

        url = self._url_with_range(self.day_before, self.today)
        daily = {item["date"]: item for item in self.admin_client.get(url).json()["daily_activity"]}

        # The old package should be reflected in the opening cumulative
        self.assertGreaterEqual(daily[self.day_before.isoformat()]["pending_cumulative"], 1)

    # ── By resident ───────────────────────────────────────────────────────────

    def test_by_resident_counts_received(self):
        self._pkg(resident=self.resident_a, received_on=self.today)
        self._pkg(resident=self.resident_a, received_on=self.today)
        self._pkg(resident=self.resident_b, received_on=self.today)

        url = self._url_with_range(self.today, self.today)
        by_resident = {
            r["resident_name"]: r
            for r in self.admin_client.get(url).json()["by_resident"]
        }

        name_a = self.resident_a_user.get_full_name()
        name_b = self.resident_b_user.get_full_name()

        self.assertEqual(by_resident[name_a]["total_received"], 2)
        self.assertEqual(by_resident[name_b]["total_received"], 1)

    def test_by_resident_counts_delivered_separately(self):
        self._pkg(resident=self.resident_a, received_on=self.today)
        self._pkg(resident=self.resident_a, received_on=self.yesterday, delivered_on=self.today)

        url = self._url_with_range(self.yesterday, self.today)
        name_a = self.resident_a_user.get_full_name()
        by_resident = {
            r["resident_name"]: r
            for r in self.admin_client.get(url).json()["by_resident"]
        }

        self.assertEqual(by_resident[name_a]["total_received"], 2)
        self.assertEqual(by_resident[name_a]["total_delivered"], 1)

    def test_by_resident_ordered_by_received_descending(self):
        self._pkg(resident=self.resident_b, received_on=self.today)
        self._pkg(resident=self.resident_a, received_on=self.today)
        self._pkg(resident=self.resident_a, received_on=self.today)

        url = self._url_with_range(self.today, self.today)
        by_resident = self.admin_client.get(url).json()["by_resident"]

        # resident_a (2 pkgs) must appear before resident_b (1 pkg)
        names = [r["resident_name"] for r in by_resident]
        name_a = self.resident_a_user.get_full_name()
        name_b = self.resident_b_user.get_full_name()
        self.assertLess(names.index(name_a), names.index(name_b))

    # ── Date filter ───────────────────────────────────────────────────────────

    def test_invalid_date_range_returns_400(self):
        url = f"{ANALYTICS_URL}?from={self.today.isoformat()}&to={self.yesterday.isoformat()}"
        response = self.admin_client.get(url)
        self.assertEqual(response.status_code, 400)

    def test_packages_outside_range_excluded(self):
        self._pkg(resident=self.resident_a, received_on=self.today - timedelta(days=90))

        url = self._url_with_range(self.yesterday, self.today)
        summary = self.admin_client.get(url).json()["summary"]
        self.assertEqual(summary["total_received_in_period"], 0)

    # ── Residence scope ───────────────────────────────────────────────────────

    def test_packages_from_other_residence_excluded(self):
        self._pkg(resident=self.resident_a, received_on=self.today)
        self._pkg(resident=self.other_resident, received_on=self.today, residence=self.other_residence)

        url = self._url_with_range(self.today, self.today)
        summary = self.admin_client.get(url).json()["summary"]
        self.assertEqual(summary["total_received_in_period"], 1)
