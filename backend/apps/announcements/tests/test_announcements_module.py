import os

from django.contrib.auth import get_user_model
from django.utils import timezone
from django_tenants.test.cases import FastTenantTestCase
from django_tenants.test.client import TenantClient
from django_tenants.utils import tenant_context
import json

from apps.announcements.models import Announcement, AnnouncementView
from apps.residences.models import Residence, ResidenceDomain
from apps.common.services import build_access_token
from apps.membership.models import Membership, Role


class AnnouncementModuleTests(FastTenantTestCase):
    @classmethod
    def get_test_tenant_domain(cls):
        return "announcements.test.local"

    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Tenant Announcements Test"
        tenant.slug = "tenant-announcements-test"
        tenant.is_active = True
        tenant.on_trial = True

    @classmethod
    def setup_domain(cls, domain):
        domain.domain = cls.get_test_tenant_domain()
        domain.is_primary = True

    def _auth_client(self, user, residence):
        """Crea un cliente autenticado usando build_access_token"""
        client = TenantClient(self.tenant)
        token, _ = build_access_token(user, self.tenant, residence)
        client.defaults['HTTP_AUTHORIZATION'] = f'Bearer {token}'
        return client

    def setUp(self):
        super().setUp()
        user_model = get_user_model()

        # Crear residencia
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

        # Crear roles dentro del tenant
        with tenant_context(self.tenant):
            # Crear el rol "admin" y "student" que requieren permisos
            self.admin_role = Role.objects.create(
                name="admin",
                description="Administrator",
                is_system_default=False,
                residence=self.residence,
            )
            
            self.student_role = Role.objects.create(
                name="Student",
                description="Student",
                is_system_default=True,
                residence=None,
            )

            # Crear usuarios
            TEST_PASSWORD = os.environ.get('TEST_PASSWORD', 'demo1234')

            self.admin_user = user_model.objects.create_user(
                username="admin",
                email="admin@test.com",
                password=TEST_PASSWORD,
                is_staff=True,
            )
            self.resident_user = user_model.objects.create_user(
                username="resident",
                email="resident@test.com",
                password=TEST_PASSWORD,
            )

            # Asignar rol "admin" al admin_user
            Membership.objects.create(
                user=self.admin_user,
                role=self.admin_role,
                residence=self.residence,
                is_active=True,
            )
            
            # Asignar rol "Student" al resident_user
            Membership.objects.create(
                user=self.resident_user,
                role=self.student_role,
                residence=self.residence,
                is_active=True,
            )

        # Crear clientes autenticados
        self.admin_client = self._auth_client(self.admin_user, self.residence)
        self.resident_client = self._auth_client(self.resident_user, self.residence)
        self.anon_client = TenantClient(self.tenant)

    def test_create_announcement(self):
        """Crear aviso con rol 'admin'"""
        data = {
            "title": "Aviso de prueba",
            "description": "Descripción del aviso de prueba",
            "category": Announcement.Category.GENERAL,
            "announcement_date": (timezone.now().date()).isoformat(),
        }
        response = self.admin_client.post(
            "/api/announcements/",
            data=json.dumps(data),
            content_type="application/json"
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(Announcement.objects.count(), 1)

    def test_list_announcements(self):
        """Listar avisos como admin"""
        with tenant_context(self.tenant):
            Announcement.objects.create(
                residence=self.tenant,
                user=self.admin_user,
                title="Aviso 1",
                description="Desc 1",
                category=Announcement.Category.EVENT,
                announcement_date=timezone.now().date(),
            )
        response = self.admin_client.get("/api/announcements/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 1)

    def test_update_announcement(self):
        """Actualizar aviso como admin"""
        with tenant_context(self.tenant):
            announcement = Announcement.objects.create(
                residence=self.tenant,
                user=self.admin_user,
                title="Aviso a actualizar",
                description="Desc",
                category=Announcement.Category.GENERAL,
                announcement_date=timezone.now().date(),
            )
        data = {"title": "Aviso actualizado"}
        response = self.admin_client.patch(
            f"/api/announcements/{announcement.id}/",
            data=json.dumps(data),
            content_type="application/json"
        )
        self.assertEqual(response.status_code, 200)

    def test_delete_announcement(self):
        """Eliminar aviso como admin"""
        with tenant_context(self.tenant):
            announcement = Announcement.objects.create(
                residence=self.tenant,
                user=self.admin_user,
                title="Aviso para borrar",
                description="Desc",
                category=Announcement.Category.GENERAL,
                announcement_date=timezone.now().date(),
            )
        response = self.admin_client.delete(f"/api/announcements/{announcement.id}/")
        self.assertEqual(response.status_code, 204)
        with tenant_context(self.tenant):
            self.assertEqual(Announcement.objects.count(), 0)

    def test_toggle_featured(self):
        """Marcar/desmarcar como destacado como admin"""
        with tenant_context(self.tenant):
            announcement = Announcement.objects.create(
                residence=self.tenant,
                user=self.admin_user,
                title="Aviso destacado",
                description="Desc",
                category=Announcement.Category.GENERAL,
                announcement_date=timezone.now().date(),
                featured=False,
            )
        response = self.admin_client.post(f"/api/announcements/{announcement.id}/toggle_featured/")
        self.assertEqual(response.status_code, 200)

    def test_unviewed_count(self):
        """Contar avisos no vistos como residente"""
        with tenant_context(self.tenant):
            Announcement.objects.create(
                residence=self.tenant,
                user=self.admin_user,
                title="Aviso sin leer",
                description="Desc",
                category=Announcement.Category.GENERAL,
                announcement_date=timezone.now().date(),
            )
        response = self.resident_client.get("/api/announcements/unviewed_count/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["count"], 1)

    def test_mark_as_viewed(self):
        """Marcar aviso como visto como residente"""
        with tenant_context(self.tenant):
            announcement = Announcement.objects.create(
                residence=self.tenant,
                user=self.admin_user,
                title="Aviso a marcar leído",
                description="Desc",
                category=Announcement.Category.GENERAL,
                announcement_date=timezone.now().date(),
            )
        data = {"announcement_ids": [announcement.id]}
        response = self.resident_client.post(
            "/api/announcements/mark_as_viewed/",
            data=json.dumps(data),
            content_type="application/json"
        )
        self.assertEqual(response.status_code, 200)
        with tenant_context(self.tenant):
            self.assertEqual(
                AnnouncementView.objects.filter(
                    user=self.resident_user, 
                    announcement=announcement
                ).count(), 
                1
            )

    def test_unauthenticated_access(self):
        """Test usuario no autenticado no puede acceder"""
        response = self.anon_client.get("/api/announcements/")
        self.assertEqual(response.status_code, 403)

    def test_resident_cannot_create_announcement(self):
        """Test para residente que no puede crear avisos"""
        data = {
            "title": "Intento de creación",
            "description": "No debería poder",
            "category": Announcement.Category.GENERAL,
            "announcement_date": (timezone.now().date()).isoformat(),
        }
        response = self.resident_client.post(
            "/api/announcements/",
            data=json.dumps(data),
            content_type="application/json"
        )
        self.assertEqual(response.status_code, 403)

    def test_resident_cannot_update_announcement(self):
        """Test que residente no puede actualizar avisos"""
        with tenant_context(self.tenant):
            announcement = Announcement.objects.create(
                residence=self.tenant,
                user=self.admin_user,
                title="Aviso existente",
                description="Desc",
                category=Announcement.Category.GENERAL,
                announcement_date=timezone.now().date(),
            )
        data = {"title": "Intento de actualización"}
        response = self.resident_client.patch(
            f"/api/announcements/{announcement.id}/",
            data=json.dumps(data),
            content_type="application/json"
        )
        self.assertEqual(response.status_code, 403)

    def test_resident_cannot_delete_announcement(self):
        """Test que residente no puede eliminar avisos"""
        with tenant_context(self.tenant):
            announcement = Announcement.objects.create(
                residence=self.tenant,
                user=self.admin_user,
                title="Aviso a eliminar",
                description="Desc",
                category=Announcement.Category.GENERAL,
                announcement_date=timezone.now().date(),
            )
        response = self.resident_client.delete(f"/api/announcements/{announcement.id}/")
        self.assertEqual(response.status_code, 403)

    def test_filter_announcements_by_category(self):
        """Test filtrar avisos por categoría"""
        with tenant_context(self.tenant):
            Announcement.objects.create(
                residence=self.tenant,
                user=self.admin_user,
                title="Aviso URGENTE",
                description="Desc",
                category=Announcement.Category.URGENT,
                announcement_date=timezone.now().date(),
            )
            Announcement.objects.create(
                residence=self.tenant,
                user=self.admin_user,
                title="Aviso GENERAL",
                description="Desc",
                category=Announcement.Category.GENERAL,
                announcement_date=timezone.now().date(),
            )
        
        response = self.admin_client.get("/api/announcements/?category=URGENT")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 1)
        self.assertEqual(response.json()[0]["category"], "URGENT")

    def test_filter_announcements_by_featured(self):
        """Test filtrar avisos destacados"""
        with tenant_context(self.tenant):
            Announcement.objects.create(
                residence=self.tenant,
                user=self.admin_user,
                title="Aviso Destacado",
                description="Desc",
                category=Announcement.Category.GENERAL,
                announcement_date=timezone.now().date(),
                featured=True,
            )
            Announcement.objects.create(
                residence=self.tenant,
                user=self.admin_user,
                title="Aviso Normal",
                description="Desc",
                category=Announcement.Category.GENERAL,
                announcement_date=timezone.now().date(),
                featured=False,
            )
        
        response = self.admin_client.get("/api/announcements/?featured=true")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 1)
        self.assertTrue(response.json()[0]["featured"])

    def test_mark_as_viewed_multiple_announcements(self):
        """Test marcar múltiples avisos como vistos"""
        with tenant_context(self.tenant):
            announcements = []
            for i in range(3):
                announcements.append(
                    Announcement.objects.create(
                        residence=self.tenant,
                        user=self.admin_user,
                        title=f"Aviso {i}",
                        description="Desc",
                        category=Announcement.Category.GENERAL,
                        announcement_date=timezone.now().date(),
                    )
                )
        
        data = {"announcement_ids": [a.id for a in announcements[:2]]}
        response = self.resident_client.post(
            "/api/announcements/mark_as_viewed/",
            data=json.dumps(data),
            content_type="application/json"
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["viewed_count"], 2)