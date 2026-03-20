from django.contrib.auth import get_user_model
from django_tenants.test.cases import FastTenantTestCase
from django_tenants.test.client import TenantClient

from apps.bedrooms.models import Bedroom
from apps.membership.models import Membership, Role
from apps.residences.models import Residence, ResidenceDomain


class BedroomDetailViewTests(FastTenantTestCase):
    @classmethod
    def get_test_tenant_domain(cls):
        return "bedrooms.test.local"

    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Tenant Bedrooms Test"
        tenant.slug = "tenant-bedrooms-test"
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
            username="admin-bed",
            email="admin@bedrooms.test",
            password="demo1234",  # NOSONAR
            first_name="Admin",
            last_name="Bed",
            is_staff=True,
        )
        self.student_user = user_model.objects.create_user(
            username="student-bed",
            email="student@bedrooms.test",
            password="demo1234",  # NOSONAR
            first_name="Carlos",
            last_name="Ruiz",
        )
        self.other_student_user = user_model.objects.create_user(
            username="student-bed-2",
            email="student2@bedrooms.test",
            password="demo1234",  # NOSONAR
            first_name="Ana",
            last_name="López",
        )

        self.residence = Residence.objects.create(
            name="Residencia Bedrooms",
            slug="residencia-bedrooms",
            code="RB-001",
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
            slug="residencia-otra-bed",
            code="ROB-001",
            timezone="Europe/Madrid",
            is_active=True,
        )

        self.student_role = Role.objects.create(
            name="Student",
            description="Residente",
            is_system_default=True,
            residence=None,
        )

        self.bedroom = Bedroom.objects.create(
            numero="101",
            planta=1,
            capacidad_maxima=2,
            tipo=Bedroom.Tipo.DOBLE,
            residence=self.residence,
            is_active=True,
        )
        self.other_bedroom = Bedroom.objects.create(
            numero="201",
            planta=2,
            capacidad_maxima=1,
            tipo=Bedroom.Tipo.INDIVIDUAL,
            residence=self.other_residence,
            is_active=True,
        )

        self.admin_client = TenantClient(self.tenant)
        self.admin_client.force_login(self.admin_user)

        self.anon_client = TenantClient(self.tenant)

        self.non_staff_client = TenantClient(self.tenant)
        self.non_staff_client.force_login(self.student_user)

    def _url(self, bedroom_id):
        return f"/api/bedrooms/{bedroom_id}/"

    def _create_membership(self, user, bedroom=None, is_active=True, role=None):
        return Membership.objects.create(
            user=user,
            role=role or self.student_role,
            residence=self.residence,
            bedroom=bedroom,
            is_active=is_active,
        )

    # --- Campos del detalle ---

    def test_response_includes_detail_fields(self):
        response = self.admin_client.get(self._url(self.bedroom.id))

        self.assertEqual(response.status_code, 200)
        data = response.json()
        for field in ["id", "numero", "planta", "tipo", "capacidad_maxima", "ocupantes_actuales", "residentes"]:
            self.assertIn(field, data)

    def test_residentes_is_empty_when_no_residents(self):
        response = self.admin_client.get(self._url(self.bedroom.id))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["residentes"], [])
        self.assertEqual(response.json()["ocupantes_actuales"], 0)

    def test_residentes_includes_active_student(self):
        self._create_membership(self.student_user, bedroom=self.bedroom)

        response = self.admin_client.get(self._url(self.bedroom.id))

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data["residentes"]), 1)
        residente = data["residentes"][0]
        self.assertEqual(residente["full_name"], "Carlos Ruiz")
        self.assertIn("email", residente)
        self.assertEqual(residente["email"], "student@bedrooms.test")

    def test_ocupantes_actuales_matches_active_students(self):
        self._create_membership(self.student_user, bedroom=self.bedroom)
        self._create_membership(self.other_student_user, bedroom=self.bedroom)

        response = self.admin_client.get(self._url(self.bedroom.id))

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["ocupantes_actuales"], 2)
        self.assertEqual(len(data["residentes"]), 2)

    def test_inactive_membership_excluded_from_residentes(self):
        self._create_membership(self.student_user, bedroom=self.bedroom, is_active=False)

        response = self.admin_client.get(self._url(self.bedroom.id))

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["residentes"], [])
        self.assertEqual(data["ocupantes_actuales"], 0)

    def test_non_student_role_excluded_from_residentes(self):
        admin_role = Role.objects.create(
            name="Admin",
            description="Administrador",
            is_system_default=False,
            residence=self.residence,
        )
        self._create_membership(self.student_user, bedroom=self.bedroom, role=admin_role)

        response = self.admin_client.get(self._url(self.bedroom.id))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["residentes"], [])

    # --- Flujo negativo ---

    def test_non_staff_is_forbidden(self):
        response = self.non_staff_client.get(self._url(self.bedroom.id))
        self.assertEqual(response.status_code, 403)

    def test_unauthenticated_is_rejected(self):
        response = self.anon_client.get(self._url(self.bedroom.id))
        self.assertEqual(response.status_code, 401)

    def test_bedroom_from_other_residence_returns_404(self):
        response = self.admin_client.get(self._url(self.other_bedroom.id))
        self.assertEqual(response.status_code, 404)

    def test_nonexistent_bedroom_returns_404(self):
        response = self.admin_client.get(self._url(99999))
        self.assertEqual(response.status_code, 404)
