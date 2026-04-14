"""Tests for IncidenceAnalyticsView — GET /api/incidences/analytics/"""
from datetime import date, datetime, timedelta, timezone as dt_timezone

from django.contrib.auth import get_user_model
from django.db.utils import ProgrammingError
from django.utils.timezone import make_aware
from django_tenants.test.cases import TenantTestCase
from django_tenants.test.client import TenantClient
from django_tenants.utils import schema_context

from apps.common.services import build_access_token
from apps.incidences.models import Incidence
from apps.membership.models import Membership, Role
from apps.residences.models import Residence, ResidenceDomain
from apps.staff.models import Staff

ANALYTICS_URL = "/api/incidences/analytics/"
TEST_PASSWORD = "demo1234"  # NOSONAR


class IncidenceAnalyticsViewTests(TenantTestCase):

    @classmethod
    def get_test_tenant_domain(cls):
        return "incidence-analytics.test.local"

    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Tenant Incidence Analytics"
        tenant.slug = "tenant-incidence-analytics"
        tenant.schema_name = f"test_schema_{cls.__name__.lower()}"
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

        with schema_context(self.tenant.schema_name):
            self.residence = Residence.objects.create(
                name="Residencia Incidencias",
                slug="residencia-incidencias-an",
                code="RI-AN-001",
                timezone="Europe/Madrid",
                is_active=True,
            )
            ResidenceDomain.objects.create(
                residence=self.residence,
                domain=self.get_test_tenant_domain(),
                is_primary=True,
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
                username="inc-admin",
                email="inc-admin@test.local",
                password=TEST_PASSWORD,
                first_name="Admin",
                last_name="User",
                is_staff=True,
            )
            self.student_user = user_model.objects.create_user(
                username="inc-student",
                email="inc-student@test.local",
                password=TEST_PASSWORD,
            )
            self.staff_user_a = user_model.objects.create_user(
                username="staff-a",
                email="staff-a@test.local",
                password=TEST_PASSWORD,
                first_name="María",
                last_name="García",
            )
            self.staff_user_b = user_model.objects.create_user(
                username="staff-b",
                email="staff-b@test.local",
                password=TEST_PASSWORD,
                first_name="Luis",
                last_name="Pérez",
            )

            Membership.objects.create(
                user=self.admin_user,
                role=self.admin_role,
                residence=self.residence,
                is_active=True,
            )
            Membership.objects.create(
                user=self.student_user,
                role=self.student_role,
                residence=self.residence,
                is_active=True,
            )

            self.staff_a = Staff.objects.create(
                user=self.staff_user_a,
                job_title="Mantenimiento",
                department="Mantenimiento",
                location="Edificio A",
                schedule="L-V 8-16",
            )
            self.staff_b = Staff.objects.create(
                user=self.staff_user_b,
                job_title="Conserje",
                department="Recepción",
                location="Entrada",
                schedule="L-V 9-17",
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

    def _inc(
        self,
        *,
        created_on: date,
        status: str = "pending",
        resolved_on: date | None = None,
        assigned_staff: Staff | None = None,
        assigned_external_name: str = "",
    ) -> Incidence:
        with schema_context(self.tenant.schema_name):
            inc = Incidence.objects.create(
                title="Test incidence",
                description="Test",
                location_type="cocina",
                student=self.admin_user,
                status=status,
                assigned_staff=assigned_staff,
                assigned_external_name=assigned_external_name,
            )
            # Override created_at (auto_now_add) and updated_at via queryset update
            resolved_dt = self._dt(resolved_on) if resolved_on else self._dt(created_on)
            Incidence.objects.filter(id=inc.id).update(
                created_at=self._dt(created_on),
                updated_at=resolved_dt,
            )
            inc.refresh_from_db()
            return inc

    def _url_with_range(self, from_date: date, to_date: date) -> str:
        return f"{ANALYTICS_URL}?from={from_date.isoformat()}&to={to_date.isoformat()}"

    # ── Auth / permissions ────────────────────────────────────────────────────

    def test_unauthenticated_returns_403(self):
        # CookieJWTAuthentication returns None for anonymous → permission check → 403
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
        for key in ("summary", "open_by_day", "resolved_by_staff", "meta"):
            self.assertIn(key, payload)

    def test_summary_has_required_keys(self):
        summary = self.admin_client.get(ANALYTICS_URL).json()["summary"]
        for key in (
            "total_created_in_period",
            "total_resolved_in_period",
            "currently_open",
            "avg_resolution_hours",
        ):
            self.assertIn(key, summary)

    def test_meta_reflects_date_range(self):
        url = self._url_with_range(self.day_before, self.today)
        meta = self.admin_client.get(url).json()["meta"]
        self.assertEqual(meta["from"], self.day_before.isoformat())
        self.assertEqual(meta["to"], self.today.isoformat())

    # ── Summary counts ────────────────────────────────────────────────────────

    def test_summary_created_in_period(self):
        self._inc(created_on=self.today)
        self._inc(created_on=self.yesterday)
        self._inc(created_on=self.today - timedelta(days=60))  # outside range

        url = self._url_with_range(self.yesterday, self.today)
        summary = self.admin_client.get(url).json()["summary"]
        self.assertEqual(summary["total_created_in_period"], 2)

    def test_summary_resolved_in_period(self):
        # resolved_on approximated by updated_at
        self._inc(created_on=self.day_before, status="resolved", resolved_on=self.today)
        self._inc(created_on=self.day_before, status="resolved", resolved_on=self.yesterday)
        self._inc(created_on=self.day_before)  # still pending

        url = self._url_with_range(self.day_before, self.today)
        summary = self.admin_client.get(url).json()["summary"]
        self.assertEqual(summary["total_resolved_in_period"], 2)

    def test_currently_open_is_not_filtered_by_date(self):
        """currently_open counts ALL non-resolved incidences, regardless of date range."""
        self._inc(created_on=self.today - timedelta(days=90))  # old, still open
        self._inc(created_on=self.today, status="resolved", resolved_on=self.today)

        url = self._url_with_range(self.yesterday, self.today)
        summary = self.admin_client.get(url).json()["summary"]
        # The old open one must appear even though it's outside the range
        self.assertEqual(summary["currently_open"], 1)

    def test_avg_resolution_hours_none_when_no_resolved(self):
        self._inc(created_on=self.today)  # pending
        summary = self.admin_client.get(ANALYTICS_URL).json()["summary"]
        self.assertIsNone(summary["avg_resolution_hours"])

    def test_avg_resolution_hours_computed(self):
        # Created at 10:00, resolved at 18:00 → 8 hours
        with schema_context(self.tenant.schema_name):
            inc = Incidence.objects.create(
                title="Timed",
                description="x",
                location_type="cocina",
                student=self.admin_user,
                status="resolved",
            )
            created_dt = make_aware(datetime(2024, 1, 1, 10, 0, 0))
            resolved_dt = make_aware(datetime(2024, 1, 1, 18, 0, 0))
            Incidence.objects.filter(id=inc.id).update(
                created_at=created_dt, updated_at=resolved_dt
            )

        summary = self.admin_client.get(ANALYTICS_URL).json()["summary"]
        self.assertEqual(summary["avg_resolution_hours"], 8.0)

    # ── Invalid date range ────────────────────────────────────────────────────

    def test_invalid_date_range_returns_400(self):
        url = f"{ANALYTICS_URL}?from={self.today.isoformat()}&to={self.yesterday.isoformat()}"
        response = self.admin_client.get(url)
        self.assertEqual(response.status_code, 400)

    # ── Open by day ───────────────────────────────────────────────────────────

    def test_open_by_day_length_matches_range(self):
        url = self._url_with_range(self.day_before, self.today)
        open_by_day = self.admin_client.get(url).json()["open_by_day"]
        self.assertEqual(len(open_by_day), 3)

    def test_open_by_day_accumulates_unresolved(self):
        """Unresolved incidences keep adding to the open count each day."""
        self._inc(created_on=self.day_before)   # never resolved
        self._inc(created_on=self.yesterday)     # never resolved

        url = self._url_with_range(self.day_before, self.today)
        by_day = {d["date"]: d["open_count"] for d in self.admin_client.get(url).json()["open_by_day"]}

        self.assertEqual(by_day[self.day_before.isoformat()], 1)  # only first exists
        self.assertEqual(by_day[self.yesterday.isoformat()], 2)   # both exist and open
        self.assertEqual(by_day[self.today.isoformat()], 2)       # still both open

    def test_open_by_day_decreases_when_resolved(self):
        """Resolving an incidence removes it from the open count on the resolution day."""
        self._inc(created_on=self.day_before)
        self._inc(
            created_on=self.day_before,
            status="resolved",
            resolved_on=self.yesterday,
        )

        url = self._url_with_range(self.day_before, self.today)
        by_day = {d["date"]: d["open_count"] for d in self.admin_client.get(url).json()["open_by_day"]}

        # Both created on day_before → 2 open that day
        self.assertEqual(by_day[self.day_before.isoformat()], 2)
        # One resolved on yesterday → only 1 open from yesterday onwards
        self.assertEqual(by_day[self.yesterday.isoformat()], 1)
        self.assertEqual(by_day[self.today.isoformat()], 1)

    def test_open_by_day_pre_range_incidences_counted(self):
        """Incidences created before the range and still open appear in the backlog."""
        self._inc(created_on=self.today - timedelta(days=60))  # old and still open

        url = self._url_with_range(self.day_before, self.today)
        by_day = {d["date"]: d["open_count"] for d in self.admin_client.get(url).json()["open_by_day"]}

        # Must be at least 1 on every day of the range
        for d in (self.day_before, self.yesterday, self.today):
            self.assertGreaterEqual(by_day[d.isoformat()], 1)

    # ── Resolved by staff ─────────────────────────────────────────────────────

    def test_resolved_by_staff_counts_assigned_staff(self):
        self._inc(
            created_on=self.day_before,
            status="resolved",
            resolved_on=self.today,
            assigned_staff=self.staff_a,
        )
        self._inc(
            created_on=self.day_before,
            status="resolved",
            resolved_on=self.today,
            assigned_staff=self.staff_a,
        )
        self._inc(
            created_on=self.day_before,
            status="resolved",
            resolved_on=self.today,
            assigned_staff=self.staff_b,
        )

        url = self._url_with_range(self.day_before, self.today)
        by_staff = {
            s["staff_name"]: s["resolved_count"]
            for s in self.admin_client.get(url).json()["resolved_by_staff"]
        }

        self.assertEqual(by_staff[self.staff_user_a.get_full_name()], 2)
        self.assertEqual(by_staff[self.staff_user_b.get_full_name()], 1)

    def test_resolved_by_staff_uses_external_name_when_no_staff(self):
        self._inc(
            created_on=self.day_before,
            status="resolved",
            resolved_on=self.today,
            assigned_external_name="Empresa Externa S.L.",
        )

        url = self._url_with_range(self.day_before, self.today)
        by_staff = {
            s["staff_name"]: s["resolved_count"]
            for s in self.admin_client.get(url).json()["resolved_by_staff"]
        }
        self.assertIn("Empresa Externa S.L.", by_staff)

    def test_resolved_by_staff_shows_sin_asignar_when_no_assignee(self):
        self._inc(
            created_on=self.day_before,
            status="resolved",
            resolved_on=self.today,
        )

        url = self._url_with_range(self.day_before, self.today)
        by_staff = {
            s["staff_name"]: s["resolved_count"]
            for s in self.admin_client.get(url).json()["resolved_by_staff"]
        }
        self.assertIn("Sin asignar", by_staff)

    def test_resolved_by_staff_ordered_by_count_descending(self):
        for _ in range(3):
            self._inc(
                created_on=self.day_before,
                status="resolved",
                resolved_on=self.today,
                assigned_staff=self.staff_a,
            )
        self._inc(
            created_on=self.day_before,
            status="resolved",
            resolved_on=self.today,
            assigned_staff=self.staff_b,
        )

        url = self._url_with_range(self.day_before, self.today)
        by_staff = self.admin_client.get(url).json()["resolved_by_staff"]
        names = [s["staff_name"] for s in by_staff]
        self.assertLess(
            names.index(self.staff_user_a.get_full_name()),
            names.index(self.staff_user_b.get_full_name()),
        )

    def test_resolved_outside_range_not_in_staff_chart(self):
        """Incidences resolved before the filter window should not appear in resolved_by_staff."""
        self._inc(
            created_on=self.today - timedelta(days=60),
            status="resolved",
            resolved_on=self.today - timedelta(days=59),  # outside range
            assigned_staff=self.staff_a,
        )

        url = self._url_with_range(self.yesterday, self.today)
        resolved_by_staff = self.admin_client.get(url).json()["resolved_by_staff"]
        self.assertEqual(resolved_by_staff, [])
