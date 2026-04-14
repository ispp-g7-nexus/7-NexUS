import json

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django_tenants.test.cases import FastTenantTestCase
from django_tenants.test.client import TenantClient

from apps.common.services import build_access_token
from apps.residences.models import Residence, ResidenceDomain

from .models import Membership, Role
from .services import RoleService

ROLES_URL = "/api/membership/roles/"
ANALYTICS_SUMMARY_URL = "/api/membership/analytics/summary/"


class MembershipRoleApiTests(FastTenantTestCase):
    @classmethod
    def get_test_tenant_domain(cls):
        return "membership-role-api.test.local"

    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Tenant Membership Roles"
        tenant.slug = "tenant-membership-roles"
        tenant.is_active = True
        tenant.on_trial = True

    @classmethod
    def setup_domain(cls, domain):
        domain.domain = cls.get_test_tenant_domain()
        domain.is_primary = True

    def setUp(self):
        super().setUp()
        user_model = get_user_model()
        domain = self.get_test_tenant_domain()

        self.residence = Residence.objects.create(
            name="Residencia Roles A",
            slug="residencia-roles-a",
            code="RRA-001",
            timezone="Europe/Madrid",
            is_active=True,
        )
        ResidenceDomain.objects.create(
            residence=self.residence,
            domain=domain,
            is_primary=True,
            is_active=True,
        )

        self.other_residence = Residence.objects.create(
            name="Residencia Roles B",
            slug="residencia-roles-b",
            code="RRB-001",
            timezone="Europe/Madrid",
            is_active=True,
        )

        self.admin_user = user_model.objects.create_user(
            username="membership-admin",
            email="membership-admin@test.local",
            password="demo1234",  # NOSONAR
            first_name="Admin",
            last_name="Roles",
        )
        self.student_user = user_model.objects.create_user(
            username="membership-student",
            email="membership-student@test.local",
            password="demo1234",  # NOSONAR
            first_name="Student",
            last_name="Roles",
        )
        self.analytics_user = user_model.objects.create_user(
            username="membership-analytics",
            email="membership-analytics@test.local",
            password="demo1234",  # NOSONAR
            first_name="Analytics",
            last_name="Roles",
        )

        self.system_admin_role = Role.objects.create(
            name="Admin",
            description="Administrador del sistema",
            is_system_default=True,
            residence=None,
            permissions=[],
        )
        self.system_student_role = Role.objects.create(
            name="Student",
            description="Residente del sistema",
            is_system_default=True,
            residence=None,
            permissions=[],
        )
        self.custom_role = Role.objects.create(
            name="Conserjeria",
            description="Gestión del edificio",
            is_system_default=False,
            residence=self.residence,
            permissions=["rooms"],
        )
        self.analytics_role = Role.objects.create(
            name="Analista",
            description="Acceso a analytics",
            is_system_default=False,
            residence=self.residence,
            permissions=["analytics"],
        )
        self.other_custom_role = Role.objects.create(
            name="Conserjeria",
            description="Rol de otra residencia",
            is_system_default=False,
            residence=self.other_residence,
            permissions=["rooms"],
        )

        Membership.objects.create(
            user=self.admin_user,
            role=self.system_admin_role,
            residence=self.residence,
            is_active=True,
        )
        Membership.objects.create(
            user=self.student_user,
            role=self.system_student_role,
            residence=self.residence,
            is_active=True,
        )
        Membership.objects.create(
            user=self.analytics_user,
            role=self.analytics_role,
            residence=self.residence,
            is_active=True,
        )

        self.admin_client = self._auth_client(self.admin_user, self.residence)
        self.student_client = self._auth_client(self.student_user, self.residence)
        self.analytics_client = self._auth_client(self.analytics_user, self.residence)
        self.anon_client = TenantClient(self.tenant, SERVER_NAME=domain, HTTP_HOST=domain)

    def _auth_client(self, user, residence, host=None):
        domain = host or self.get_test_tenant_domain()
        client = TenantClient(self.tenant, SERVER_NAME=domain, HTTP_HOST=domain)
        token, _ = build_access_token(user, self.tenant, residence)
        client.defaults["HTTP_AUTHORIZATION"] = f"Bearer {token}"
        return client

    def test_post_roles_creates_custom_role_with_name_and_permissions(self):
        payload = {
            "name": "Mantenimiento",
            "description": "Equipo técnico",
            "permissions": ["rooms", "incidences"],
        }

        response = self.admin_client.post(
            ROLES_URL,
            data=json.dumps(payload),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        body = response.json()
        self.assertEqual(body["name"], "Mantenimiento")
        self.assertEqual(body["permissions"], ["rooms", "incidences"])
        self.assertFalse(body["is_system_default"])

        created = Role.objects.get(id=body["id"])
        self.assertEqual(created.residence_id, self.residence.id)
        self.assertEqual(created.description, "Equipo técnico")

    def test_post_roles_duplicate_name_in_same_residence_returns_400(self):
        payload = {
            "name": "Conserjeria",
            "description": "Duplicado",
            "permissions": ["rooms"],
        }

        response = self.admin_client.post(
            ROLES_URL,
            data=json.dumps(payload),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("Ya existe", str(response.json()))

    def test_post_roles_empty_name_returns_400(self):
        payload = {
            "name": "",
            "description": "Inválido",
            "permissions": ["rooms"],
        }

        response = self.admin_client.post(
            ROLES_URL,
            data=json.dumps(payload),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("name", response.json())

    def test_post_roles_without_residence_context_is_forbidden_by_permission(self):
        ResidenceDomain.objects.filter(
            residence=self.residence,
            domain=self.get_test_tenant_domain(),
        ).delete()
        no_residence_client = self._auth_client(self.admin_user, residence=None)

        response = no_residence_client.post(
            ROLES_URL,
            data=json.dumps({"name": "Sin residencia", "description": "x", "permissions": []}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 403)

    def test_get_roles_lists_system_and_custom_roles_for_residence(self):
        response = self.admin_client.get(ROLES_URL)

        self.assertEqual(response.status_code, 200)
        names = {item["name"] for item in response.json()}
        self.assertIn("Admin", names)
        self.assertIn("Student", names)
        self.assertIn("Conserjeria", names)

    def test_get_roles_does_not_list_custom_roles_from_other_residence(self):
        response = self.admin_client.get(ROLES_URL)

        self.assertEqual(response.status_code, 200)
        role_ids = {item["id"] for item in response.json()}
        self.assertNotIn(self.other_custom_role.id, role_ids)

    def test_get_role_detail_returns_role_data(self):
        response = self.admin_client.get(f"{ROLES_URL}{self.custom_role.id}/")

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["id"], self.custom_role.id)
        self.assertEqual(body["name"], "Conserjeria")

    def test_put_role_updates_name_description_and_permissions(self):
        payload = {
            "name": "Conserjeria Plus",
            "description": "Actualizado",
            "permissions": ["rooms", "guests"],
        }

        response = self.admin_client.put(
            f"{ROLES_URL}{self.custom_role.id}/",
            data=json.dumps(payload),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        self.custom_role.refresh_from_db()
        self.assertEqual(self.custom_role.name, "Conserjeria Plus")
        self.assertEqual(self.custom_role.description, "Actualizado")
        self.assertEqual(self.custom_role.permissions, ["rooms", "guests"])

    def test_put_role_rejects_system_default_role(self):
        payload = {
            "name": "Admin editado",
            "description": "No debería",
            "permissions": ["roles"],
        }

        response = self.admin_client.put(
            f"{ROLES_URL}{self.system_admin_role.id}/",
            data=json.dumps(payload),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("No se pueden editar", str(response.json()))

    def test_put_role_duplicate_name_returns_400(self):
        other_role = Role.objects.create(
            name="Seguridad",
            description="Otro rol",
            is_system_default=False,
            residence=self.residence,
            permissions=["guests"],
        )

        response = self.admin_client.put(
            f"{ROLES_URL}{other_role.id}/",
            data=json.dumps(
                {
                    "name": self.custom_role.name,
                    "description": "Intento duplicado",
                    "permissions": ["rooms"],
                }
            ),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("Ya existe", str(response.json()))

    def test_delete_custom_role_returns_204(self):
        role_to_delete = Role.objects.create(
            name="Temporal",
            description="Se elimina",
            is_system_default=False,
            residence=self.residence,
            permissions=["rooms"],
        )

        response = self.admin_client.delete(f"{ROLES_URL}{role_to_delete.id}/")

        self.assertEqual(response.status_code, 204)
        self.assertFalse(Role.objects.filter(id=role_to_delete.id).exists())

    def test_delete_system_role_is_rejected(self):
        response = self.admin_client.delete(f"{ROLES_URL}{self.system_student_role.id}/")

        self.assertEqual(response.status_code, 400)
        self.assertIn("No se pueden eliminar", str(response.json()))

    def test_delete_non_existing_role_returns_404(self):
        response = self.admin_client.delete(f"{ROLES_URL}999999/")

        self.assertEqual(response.status_code, 404)

    def test_permissions_only_residence_admin_can_access_role_endpoints(self):
        list_response = self.student_client.get(ROLES_URL)
        create_response = self.student_client.post(
            ROLES_URL,
            data=json.dumps({"name": "No permitido", "description": "x", "permissions": []}),
            content_type="application/json",
        )

        self.assertEqual(list_response.status_code, 403)
        self.assertEqual(create_response.status_code, 403)

        admin_response = self.admin_client.get(ROLES_URL)
        self.assertEqual(admin_response.status_code, 200)

    def test_permissions_unauthenticated_user_gets_403(self):
        response = self.anon_client.get(ROLES_URL)
        self.assertEqual(response.status_code, 403)

    def test_get_membership_analytics_summary_returns_role_and_activity_data(self):
        extra_active_user = get_user_model().objects.create_user(
            username="membership-extra-active",
            email="membership-extra-active@test.local",
            password="demo1234",  # NOSONAR
        )
        extra_inactive_user = get_user_model().objects.create_user(
            username="membership-extra-inactive",
            email="membership-extra-inactive@test.local",
            password="demo1234",  # NOSONAR
        )

        Membership.objects.create(
            user=extra_active_user,
            role=self.system_student_role,
            residence=self.residence,
            is_active=True,
        )
        Membership.objects.create(
            user=extra_inactive_user,
            role=self.system_student_role,
            residence=self.residence,
            is_active=False,
        )

        response = self.admin_client.get(ANALYTICS_SUMMARY_URL)

        self.assertEqual(response.status_code, 200)
        payload = response.json()

        self.assertIn("active_members_by_role", payload)
        self.assertIn("active_vs_inactive", payload)
        self.assertIn("membership_evolution", payload)
        self.assertIn("average_stay", payload)
        self.assertIn("staff_capacity", payload)
        self.assertIn("staff_vacation", payload)
        self.assertIn("residents_without_room", payload)

        active_by_role = {
            item["role__name"]: item["count"] for item in payload["active_members_by_role"]
        }
        self.assertEqual(active_by_role["Student"], 2)
        self.assertEqual(active_by_role["Admin"], 1)

        activity_rows = {
            item["is_active"]: item["count"] for item in payload["active_vs_inactive"]
        }
        self.assertEqual(activity_rows[True], 4)
        self.assertEqual(activity_rows[False], 1)

    def test_get_membership_analytics_summary_requires_analytics_screen_access(self):
        forbidden_response = self.student_client.get(ANALYTICS_SUMMARY_URL)
        self.assertEqual(forbidden_response.status_code, 403)

        allowed_response = self.analytics_client.get(ANALYTICS_SUMMARY_URL)
        self.assertEqual(allowed_response.status_code, 200)


class RoleServiceTests(FastTenantTestCase):
    @classmethod
    def get_test_tenant_domain(cls):
        return "membership-role-service.test.local"

    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Tenant Membership Service"
        tenant.slug = "tenant-membership-service"
        tenant.is_active = True
        tenant.on_trial = True

    @classmethod
    def setup_domain(cls, domain):
        domain.domain = cls.get_test_tenant_domain()
        domain.is_primary = True

    def setUp(self):
        super().setUp()
        self.residence = Residence.objects.create(
            name="Residencia Service A",
            slug="residencia-service-a",
            code="RSA-001",
            timezone="Europe/Madrid",
            is_active=True,
        )
        self.other_residence = Residence.objects.create(
            name="Residencia Service B",
            slug="residencia-service-b",
            code="RSB-001",
            timezone="Europe/Madrid",
            is_active=True,
        )

        self.system_role = Role.objects.create(
            name="Admin",
            description="Rol del sistema",
            is_system_default=True,
            residence=None,
            permissions=[],
        )
        self.custom_role = Role.objects.create(
            name="Conserjeria",
            description="Rol custom",
            is_system_default=False,
            residence=self.residence,
            permissions=["rooms"],
        )

    def test_create_role_validates_residence_not_null(self):
        with self.assertRaises(ValidationError):
            RoleService.create_role(
                name="SinResidencia",
                description="Inválido",
                residence=None,
                permissions=["rooms"],
            )

    def test_create_role_validates_uniqueness_within_residence_and_system(self):
        with self.assertRaises(ValidationError):
            RoleService.create_role(
                name="Conserjeria",
                description="Duplicado en residencia",
                residence=self.residence,
                permissions=["rooms"],
            )

        with self.assertRaises(ValidationError):
            RoleService.create_role(
                name="admin",
                description="Duplicado con sistema",
                residence=self.other_residence,
                permissions=["roles"],
            )

    def test_update_role_blocks_system_default_roles(self):
        with self.assertRaises(ValidationError):
            RoleService.update_role(
                self.system_role,
                name="Admin actualizado",
                permissions=["roles"],
            )

    def test_delete_role_blocks_system_default_roles(self):
        with self.assertRaises(ValidationError):
            RoleService.delete_role(self.system_role)
