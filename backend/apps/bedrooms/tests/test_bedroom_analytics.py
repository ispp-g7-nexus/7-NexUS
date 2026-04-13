"""Tests for BedroomAnalyticsView — GET /api/bedrooms/analytics/"""
from datetime import datetime, timezone as dt_timezone

from django.contrib.auth import get_user_model
from django_tenants.test.cases import FastTenantTestCase
from django_tenants.test.client import TenantClient

from apps.bedrooms.models import Bedroom
from apps.membership.models import Membership, Role
from apps.residences.models import Residence, ResidenceDomain

ANALYTICS_URL = "/api/bedrooms/analytics/"


class BedroomAnalyticsViewTests(FastTenantTestCase):

    @classmethod
    def get_test_schema_name(cls):
        return "fast_test_bedroom_analytics"

    @classmethod
    def get_test_tenant_domain(cls):
        return "bedroom-analytics.test.local"

    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Tenant Bedroom Analytics"
        tenant.slug = "tenant-bedroom-analytics"
        tenant.is_active = True
        tenant.on_trial = True

    @classmethod
    def setup_domain(cls, domain):
        domain.domain = cls.get_test_tenant_domain()
        domain.is_primary = True

    def setUp(self):
        super().setUp()
        User = get_user_model()

        self.residence = Residence.objects.create(
            name="Residencia Analytics",
            slug="residencia-analytics-bed",
            code="RA-BED-001",
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
            slug="residencia-b-bed",
            code="RB-BED-001",
            timezone="Europe/Madrid",
            is_active=True,
        )

        self.student_role = Role.objects.create(
            name="Student",
            description="Residente",
            is_system_default=True,
            residence=None,
        )

        # Admin user: is_staff=True grants access via has_screen_permission
        self.admin_user = User.objects.create_user(
            username="analytics-admin",
            email="analytics-admin@test.local",
            password="demo1234",  # NOSONAR
            is_staff=True,
        )
        self.student_user = User.objects.create_user(
            username="analytics-student",
            email="analytics-student@test.local",
            password="demo1234",  # NOSONAR
        )

        self.admin_client = TenantClient(self.tenant)
        self.admin_client.force_login(self.admin_user)

        self.student_client = TenantClient(self.tenant)
        self.student_client.force_login(self.student_user)

        self.anon_client = TenantClient(self.tenant)

    # ── Helpers ──────────────────────────────────────────────────────────────

    def _bedroom(self, numero, tipo, capacidad, edificio=None, residence=None):
        return Bedroom.objects.create(
            numero=numero,
            tipo=tipo,
            capacidad_maxima=capacidad,
            edificio=edificio,
            residence=residence or self.residence,
        )

    def _student(self, username, bedroom=None, is_active=True, residence=None):
        User = get_user_model()
        user = User.objects.create_user(username=username, email=f"{username}@test.local", password="x")
        return Membership.objects.create(
            user=user,
            role=self.student_role,
            residence=residence or self.residence,
            bedroom=bedroom,
            is_active=is_active,
        )

    # ── Auth / permissions ────────────────────────────────────────────────────

    def test_unauthenticated_returns_401(self):
        response = self.anon_client.get(ANALYTICS_URL)
        self.assertEqual(response.status_code, 401)

    def test_student_returns_403(self):
        Membership.objects.create(
            user=self.student_user,
            role=self.student_role,
            residence=self.residence,
            is_active=True,
        )
        response = self.student_client.get(ANALYTICS_URL)
        self.assertEqual(response.status_code, 403)

    def test_admin_returns_200(self):
        response = self.admin_client.get(ANALYTICS_URL)
        self.assertEqual(response.status_code, 200)

    # ── Response structure ────────────────────────────────────────────────────

    def test_response_has_required_keys(self):
        response = self.admin_client.get(ANALYTICS_URL)
        payload = response.json()
        self.assertIn("summary", payload)
        self.assertIn("occupation_by_building", payload)
        self.assertIn("occupation_by_type", payload)
        self.assertIn("occupation_by_year", payload)

    def test_summary_keys(self):
        response = self.admin_client.get(ANALYTICS_URL)
        summary = response.json()["summary"]
        for key in ("total_rooms", "total_capacity", "total_occupants", "overall_occupation_rate"):
            self.assertIn(key, summary)

    # ── Summary counts ────────────────────────────────────────────────────────

    def test_summary_empty_residence(self):
        response = self.admin_client.get(ANALYTICS_URL)
        summary = response.json()["summary"]
        self.assertEqual(summary["total_rooms"], 0)
        self.assertEqual(summary["total_capacity"], 0)
        self.assertEqual(summary["total_occupants"], 0)
        self.assertEqual(summary["overall_occupation_rate"], 0.0)

    def test_summary_total_rooms_and_capacity(self):
        self._bedroom("101", Bedroom.Tipo.INDIVIDUAL, 1)
        self._bedroom("102", Bedroom.Tipo.DOBLE, 2)

        summary = self.admin_client.get(ANALYTICS_URL).json()["summary"]

        self.assertEqual(summary["total_rooms"], 2)
        self.assertEqual(summary["total_capacity"], 3)

    def test_summary_counts_only_active_students_with_bedroom(self):
        room = self._bedroom("101", Bedroom.Tipo.INDIVIDUAL, 1)
        self._student("s1", bedroom=room)            # active + bedroom  → counted
        self._student("s2", bedroom=None)             # active, no bedroom → NOT counted
        self._student("s3", bedroom=room, is_active=False)  # inactive → NOT counted

        summary = self.admin_client.get(ANALYTICS_URL).json()["summary"]
        self.assertEqual(summary["total_occupants"], 1)

    def test_overall_occupation_rate(self):
        room = self._bedroom("101", Bedroom.Tipo.DOBLE, 2)
        self._student("s1", bedroom=room)

        summary = self.admin_client.get(ANALYTICS_URL).json()["summary"]
        # 1 occupant / 2 capacity → 50%
        self.assertEqual(summary["overall_occupation_rate"], 50.0)

    # ── Occupation by building ────────────────────────────────────────────────

    def test_occupation_by_building_groups_correctly(self):
        room_a1 = self._bedroom("A101", Bedroom.Tipo.INDIVIDUAL, 1, edificio="A")
        room_a2 = self._bedroom("A102", Bedroom.Tipo.DOBLE, 2, edificio="A")
        room_b1 = self._bedroom("B101", Bedroom.Tipo.INDIVIDUAL, 1, edificio="B")

        self._student("sa1", bedroom=room_a1)
        self._student("sa2", bedroom=room_a2)
        # room_b1 left empty

        payload = self.admin_client.get(ANALYTICS_URL).json()
        buildings = {b["edificio"]: b for b in payload["occupation_by_building"]}

        self.assertIn("A", buildings)
        self.assertIn("B", buildings)
        self.assertEqual(buildings["A"]["total_rooms"], 2)
        self.assertEqual(buildings["A"]["total_capacity"], 3)
        self.assertEqual(buildings["A"]["occupants"], 2)
        self.assertEqual(buildings["A"]["occupied_rooms"], 2)
        self.assertAlmostEqual(buildings["A"]["occupation_rate"], 66.7, places=1)

        self.assertEqual(buildings["B"]["occupants"], 0)
        self.assertEqual(buildings["B"]["occupation_rate"], 0.0)

    def test_building_none_shown_as_sin_edificio(self):
        room = self._bedroom("101", Bedroom.Tipo.INDIVIDUAL, 1, edificio=None)
        self._student("s1", bedroom=room)

        buildings = {b["edificio"]: b for b in self.admin_client.get(ANALYTICS_URL).json()["occupation_by_building"]}
        self.assertIn("Sin edificio", buildings)

    # ── Occupation by type ────────────────────────────────────────────────────

    def test_occupation_by_type_groups_correctly(self):
        ind_room = self._bedroom("101", Bedroom.Tipo.INDIVIDUAL, 1)
        dbl_room = self._bedroom("102", Bedroom.Tipo.DOBLE, 2)
        self._student("s1", bedroom=ind_room)
        # dbl_room left empty

        types = {t["tipo"]: t for t in self.admin_client.get(ANALYTICS_URL).json()["occupation_by_type"]}

        self.assertEqual(types["Individual"]["total_rooms"], 1)
        self.assertEqual(types["Individual"]["occupants"], 1)
        self.assertEqual(types["Individual"]["occupation_rate"], 100.0)

        self.assertEqual(types["Doble"]["total_rooms"], 1)
        self.assertEqual(types["Doble"]["occupants"], 0)
        self.assertEqual(types["Doble"]["occupation_rate"], 0.0)

    def test_occupation_by_type_rate_partial_fill(self):
        room = self._bedroom("301", Bedroom.Tipo.TRIPLE, 3)
        self._student("s1", bedroom=room)
        self._student("s2", bedroom=room)

        types = {t["tipo"]: t for t in self.admin_client.get(ANALYTICS_URL).json()["occupation_by_type"]}
        self.assertEqual(types["Triple"]["occupants"], 2)
        self.assertAlmostEqual(types["Triple"]["occupation_rate"], 66.7, places=1)

    # ── Occupation by year ────────────────────────────────────────────────────

    def test_occupation_by_year_groups_assignments(self):
        room = self._bedroom("101", Bedroom.Tipo.INDIVIDUAL, 1)

        m2023 = self._student("s2023", bedroom=room)
        m2024 = self._student("s2024", bedroom=room)
        m2024b = self._student("s2024b", bedroom=room)

        # Override created_at (auto_now_add can be bypassed via queryset update)
        Membership.objects.filter(id=m2023.id).update(
            created_at=datetime(2023, 6, 1, tzinfo=dt_timezone.utc)
        )
        Membership.objects.filter(id__in=[m2024.id, m2024b.id]).update(
            created_at=datetime(2024, 3, 15, tzinfo=dt_timezone.utc)
        )

        by_year = {item["year"]: item["assignments"] for item in self.admin_client.get(ANALYTICS_URL).json()["occupation_by_year"]}

        self.assertEqual(by_year.get(2023), 1)
        self.assertEqual(by_year.get(2024), 2)

    def test_occupation_by_year_includes_inactive_memberships(self):
        """Historical assignments (even later deactivated) should appear in the chart."""
        room = self._bedroom("101", Bedroom.Tipo.INDIVIDUAL, 1)
        m = self._student("s_inactive", bedroom=room, is_active=False)
        Membership.objects.filter(id=m.id).update(
            created_at=datetime(2022, 1, 1, tzinfo=dt_timezone.utc)
        )

        by_year = {item["year"]: item["assignments"] for item in self.admin_client.get(ANALYTICS_URL).json()["occupation_by_year"]}
        self.assertEqual(by_year.get(2022), 1)

    # ── Residence scope ───────────────────────────────────────────────────────

    def test_data_scoped_to_current_residence(self):
        # Bedroom and student in another residence
        other_room = self._bedroom("999", Bedroom.Tipo.INDIVIDUAL, 1, residence=self.other_residence)
        self._student("other_s", bedroom=other_room, residence=self.other_residence)

        summary = self.admin_client.get(ANALYTICS_URL).json()["summary"]
        self.assertEqual(summary["total_rooms"], 0)
        self.assertEqual(summary["total_occupants"], 0)
