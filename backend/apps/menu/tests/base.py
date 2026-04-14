from django_tenants.test.cases import FastTenantTestCase
from django_tenants.test.client import TenantClient
from django_tenants.utils import tenant_context
from django.contrib.auth import get_user_model
from apps.common.services import build_access_token
from apps.membership.models import Membership, Role
from apps.residences.models import Residence, ResidenceDomain
import datetime

PASSWORD = "demo1234"

class MenuTestBase(FastTenantTestCase):

    @classmethod
    def setup_tenant(cls, tenant):
        # CAMBIA ESTOS TEXTOS:
        tenant.name = "Menu Unit System" 
        tenant.slug = "menu-unit-sys"
        tenant.is_active = True
        tenant.on_trial = True

    @classmethod
    def setup_domain(cls, domain):
        domain.domain = "menu-unit.test.local" # Dominio distinto
        domain.is_primary = True

    def _auth_client(self, user, residence):
        client = TenantClient(self.tenant)
        token, _ = build_access_token(user, self.tenant, residence)
        client.defaults["HTTP_AUTHORIZATION"] = f"Bearer {token}"
        return client

    def setUp(self):
        super().setUp()
        user_model = get_user_model()

        # CAMBIA LOS VALORES DE LOS STRINGS:
        self.residence = Residence.objects.create(
            name="Menu-Resi", 
            slug="m-res",
            code="M-101",
            timezone="Europe/Madrid",
            is_active=True,
        )
        
        ResidenceDomain.objects.create(
            residence=self.residence,
            domain="menu-unit.test.local",
            is_primary=True,
            is_active=True,
        )

        with tenant_context(self.tenant):
            # Cambia ligeramente los nombres o descripciones
            self.admin_role = Role.objects.create(
                name="admin",
                description="Menu Admin Role",
                is_system_default=False,
                residence=self.residence,
            )
            self.student_role = Role.objects.create(
                name="Student",
                description="Menu Student Role",
                is_system_default=True,
                residence=None,
            )

            self.admin_user = user_model.objects.create_user(
                username="chef_admin", # Nombre distinto
                email="chef@test.com", # Email distinto
                password=PASSWORD,
                is_staff=True,
            )
            self.resident_user = user_model.objects.create_user(
                username="student_menu", # Nombre distinto
                email="student_m@test.com", 
                password=PASSWORD,
            )

            Membership.objects.create(
                user=self.admin_user, role=self.admin_role,
                residence=self.residence, is_active=True,
            )
            Membership.objects.create(
                user=self.resident_user, role=self.student_role,
                residence=self.residence, is_active=True,
            )

        self.admin_client = self._auth_client(self.admin_user, self.residence)
        self.resident_client = self._auth_client(self.resident_user, self.residence)
        self.anon_client = TenantClient(self.tenant)