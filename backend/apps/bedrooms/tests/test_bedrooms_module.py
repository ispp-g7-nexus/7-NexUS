from django.contrib.auth import get_user_model
from django_tenants.test.client import TenantClient

from apps.bedrooms.models import Bedroom
from apps.bedrooms.services import list_available_bedrooms, delete_bedroom
from apps.membership.models import Role
from apps.residences.models import Residence, ResidenceDomain

from .base import BedroomTestBase


class BedroomsModuleTests(BedroomTestBase):
    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Tenant Bedrooms Test"
        tenant.slug = "tenant-bedrooms-test"
        tenant.is_active = True
        tenant.on_trial = True

    def setUp(self):
        super().setUp()
        user_model = get_user_model()

        self.admin_user = user_model.objects.create_user(
            username="admin",
            email="admin@test.com",
            password="demo1234",
            is_staff=True,
        )
        self.student_user = user_model.objects.create_user(
            username="student",
            email="student@test.com",
            password="demo1234",
        )

        self.residence = Residence.objects.create(
            name="Residence",
            slug="res",
            code="RES-1",
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

        self.client = TenantClient(self.tenant)
        self.client.force_login(self.admin_user)

        self.anon_client = TenantClient(self.tenant)

    def _url(self, path):
        return f"/api/bedrooms{path}"

    # ------------------------
    # SERVICES
    # ------------------------

    def test_list_available_bedrooms(self):
        self._create_membership(self.student_user, bedroom=self.bedroom)

        result = list_available_bedrooms(self.residence)

        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["ocupantes_actuales"], 1)

    def test_list_available_bedrooms_full(self):
        self.bedroom.capacidad_maxima = 1
        self.bedroom.save()

        self._create_membership(self.student_user, bedroom=self.bedroom)

        result = list_available_bedrooms(self.residence)

        self.assertEqual(result, [])

    def test_delete_bedroom_success(self):
        bedroom = Bedroom.objects.create(
            numero="999",
            capacidad_maxima=1,
            tipo=Bedroom.Tipo.INDIVIDUAL,
            residence=self.residence,
        )

        result = delete_bedroom(bedroom.id, self.residence)

        self.assertTrue(result)

    def test_delete_bedroom_with_active_residents(self):
        self._create_membership(self.student_user, bedroom=self.bedroom)

        with self.assertRaises(ValueError):
            delete_bedroom(self.bedroom.id, self.residence)

    # ------------------------
    # VIEWS
    # ------------------------

    def test_bedroom_list(self):
        response = self.client.get(self._url("/"))
        self.assertEqual(response.status_code, 200)

    def test_bedroom_create(self):
        payload = {
            "numero": "202",
            "tipo": "Individual",
            "capacidad_maxima": 1,
        }

        response = self.client.post(self._url("/create/"), payload, content_type="application/json")

        self.assertEqual(response.status_code, 201)

    def test_bedroom_update(self):
        response = self.client.put(
            self._url(f"/{self.bedroom.id}/update/"),
            data='{"numero": "999"}',
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)

    def test_bedroom_delete(self):
        bedroom = Bedroom.objects.create(
            numero="300",
            capacidad_maxima=1,
            tipo=Bedroom.Tipo.INDIVIDUAL,
            residence=self.residence,
        )

        response = self.client.delete(self._url(f"/{bedroom.id}/delete/"))

        self.assertEqual(response.status_code, 200)

    def test_available_bedrooms_view(self):
        self._create_membership(self.student_user, bedroom=self.bedroom)

        response = self.client.get(self._url("/available/"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 1)

    def test_bedroom_residents(self):
        self._create_membership(self.student_user, bedroom=self.bedroom)

        response = self.client.get(self._url(f"/{self.bedroom.id}/residents/"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 1)

    def test_buildings_list(self):
        response = self.client.get(self._url("/buildings/"))
        self.assertEqual(response.status_code, 200)

    # ------------------------
    # PERMISSIONS
    # ------------------------

    def test_non_staff_forbidden(self):
        client = TenantClient(self.tenant)
        client.force_login(self.student_user)

        response = client.get(self._url("/"))
        self.assertEqual(response.status_code, 403)

    def test_unauthenticated(self):
        response = self.anon_client.get(self._url("/"))
        self.assertEqual(response.status_code, 401)
