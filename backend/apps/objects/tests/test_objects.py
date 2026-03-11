from django.contrib.auth import get_user_model
from django_tenants.test.cases import TenantTestCase
from django_tenants.test.client import TenantClient

from apps.objects.models import Object
from apps.residences.models import Residence, ResidenceDomain


class ObjectApiTests(TenantTestCase):
    @classmethod
    def get_test_tenant_domain(cls):
        return "objects.test.local"

    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Tenant de Test"
        tenant.slug = "tenant-test"
        tenant.is_active = True
        tenant.on_trial = True

    @classmethod
    def setup_domain(cls, domain):
        domain.domain = cls.get_test_tenant_domain()
        domain.is_primary = True

    def setUp(self):
        super().setUp()
        self.client = TenantClient(self.tenant)
        self.client.raise_request_exception = False

        user_model = get_user_model()
        self.user = user_model.objects.create_user(
            username="admin",
            email="admin@example.com",
            password="demo1234",
            is_staff=True,
        )
        self.non_staff_user = user_model.objects.create_user(
            username="student",
            email="student@example.com",
            password="demo1234",
        )
        self.client.force_login(self.user)

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

    def test_create_object_accepts_valid_name(self):
        response = self.client.post(
            "/api/objects/",
            data={
                "name": "Kit de Herramientas (Básico) 2.0",
                "description": "Caja con herramientas",
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(Object.objects.count(), 1)
        self.assertEqual(Object.objects.first().name, "Kit de Herramientas (Básico) 2.0")

    def test_create_object_rejects_invalid_special_characters_in_name(self):
        response = self.client.post(
            "/api/objects/",
            data={
                "name": "Proyector @ Aula",
                "description": "No debería guardarse",
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("caracteres no válidos", response.json().get("detail", "").lower())
        self.assertEqual(Object.objects.count(), 0)

    def test_create_object_rejects_blank_name(self):
        response = self.client.post(
            "/api/objects/",
            data={"name": "   "},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("obligatorio", response.json().get("detail", "").lower())
        self.assertEqual(Object.objects.count(), 0)

    def test_create_object_requires_staff_permissions(self):
        self.client.force_login(self.non_staff_user)

        response = self.client.post(
            "/api/objects/",
            data={"name": "Objeto válido"},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 403)
        self.assertIn("permisos", response.json().get("detail", "").lower())
        self.assertEqual(Object.objects.count(), 0)
