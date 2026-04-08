from django.contrib.auth import get_user_model
from django_tenants.test.cases import FastTenantTestCase
from django_tenants.test.client import TenantClient

from apps.bedrooms.models import Bedroom
from apps.membership.models import Membership, Role
from apps.residences.models import Residence, ResidenceDomain


class BedroomDetailViewTests(FastTenantTestCase):
    """[NX-S2.03] Ver detalle de habitación  +  [NX-S1.15] Ocupación en tiempo real"""

    @classmethod
    def get_test_schema_name(cls):
        return "fast_test_bedrooms"

    @classmethod
    def get_test_tenant_domain(cls):
        return "bedroom-audit.test.local"

    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Tenant Bedroom Detail"
        tenant.slug = "tenant-bedroom-detail"
        tenant.is_active = True
        tenant.on_trial = True

    @classmethod
    def setup_domain(cls, domain):
        domain.domain = cls.get_test_tenant_domain()
        domain.is_primary = True

    def setUp(self):
        super().setUp()
        user_model = get_user_model()

        self.admin_user = user_model.objects.create_user(
            username="admin-detail",
            email="admin@bedroomdetail.test",
            password="demo1234",  # NOSONAR  # noqa: S106
            is_staff=True,
        )
        self.student_user = user_model.objects.create_user(
            username="student-detail",
            email="student@bedroomdetail.test",
            password="demo1234",  # NOSONAR  # noqa: S106
            first_name="Ana",
            last_name="García",
        )

        self.residence = Residence.objects.create(
            name="Residencia Detail",
            slug="res-detail",
            code="RD-001",
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
            description="Student",
            is_system_default=True,
            residence=None,
        )

        self.bedroom = Bedroom.objects.create(
            numero="101",
            capacidad_maxima=2,
            tipo=Bedroom.Tipo.DOBLE,
            residence=self.residence,
        )

        self.admin_client = TenantClient(self.tenant)
        self.admin_client.force_login(self.admin_user)

        self.student_client = TenantClient(self.tenant)
        self.student_client.force_login(self.student_user)

        self.anon_client = TenantClient(self.tenant)

    def _detail_url(self, bedroom_id=None):
        pk = bedroom_id if bedroom_id is not None else self.bedroom.id
        return f"/api/bedrooms/{pk}/"

    def _create_membership(self, user, bedroom=None, is_active=True):
        return Membership.objects.create(
            user=user,
            role=self.student_role,
            residence=self.residence,
            bedroom=bedroom,
            is_active=is_active,
        )

    # --- NX-S2.03: Ver detalle de habitación ---

    def test_get_bedroom_detail_returns_200(self):
        response = self.admin_client.get(self._detail_url())
        self.assertEqual(response.status_code, 200)

    def test_response_includes_required_fields(self):
        response = self.admin_client.get(self._detail_url())
        data = response.json()
        for field in ("id", "numero", "tipo", "capacidad_maxima", "ocupantes_actuales", "residentes"):
            self.assertIn(field, data)

    def test_detail_returns_correct_bedroom(self):
        response = self.admin_client.get(self._detail_url())
        data = response.json()
        self.assertEqual(data["id"], self.bedroom.id)
        self.assertEqual(data["numero"], "101")
        self.assertEqual(data["tipo"], Bedroom.Tipo.DOBLE)

    def test_detail_includes_active_student_residents(self):
        self._create_membership(self.student_user, bedroom=self.bedroom)
        response = self.admin_client.get(self._detail_url())
        residentes = response.json()["residentes"]
        self.assertEqual(len(residentes), 1)
        self.assertEqual(residentes[0]["full_name"], "Ana García")

    def test_detail_returns_404_for_unknown_id(self):
        response = self.admin_client.get(self._detail_url(bedroom_id=99999))
        self.assertEqual(response.status_code, 404)

    def test_non_staff_cannot_access_detail(self):
        response = self.student_client.get(self._detail_url())
        self.assertEqual(response.status_code, 403)

    def test_unauthenticated_cannot_access_detail(self):
        response = self.anon_client.get(self._detail_url())
        self.assertEqual(response.status_code, 401)

    # --- NX-S1.15: Ocupación en tiempo real ---

    def test_ocupantes_actuales_is_zero_when_no_residents(self):
        response = self.admin_client.get(self._detail_url())
        self.assertEqual(response.json()["ocupantes_actuales"], 0)

    def test_ocupantes_actuales_reflects_active_students(self):
        self._create_membership(self.student_user, bedroom=self.bedroom)
        response = self.admin_client.get(self._detail_url())
        self.assertEqual(response.json()["ocupantes_actuales"], 1)

    def test_ocupantes_actuales_excludes_inactive_memberships(self):
        self._create_membership(self.student_user, bedroom=self.bedroom, is_active=False)
        response = self.admin_client.get(self._detail_url())
        self.assertEqual(response.json()["ocupantes_actuales"], 0)

    def test_list_includes_ocupantes_actuales(self):
        self._create_membership(self.student_user, bedroom=self.bedroom)
        response = self.admin_client.get("/api/bedrooms/")
        self.assertEqual(response.status_code, 200)
        bedroom_data = next((b for b in response.json() if b["id"] == self.bedroom.id), None)
        self.assertIsNotNone(bedroom_data, f"Bedroom {self.bedroom.id} not found in /api/bedrooms/ response")
        self.assertEqual(bedroom_data["ocupantes_actuales"], 1)
