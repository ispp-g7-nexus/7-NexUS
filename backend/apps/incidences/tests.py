from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from django_tenants.test.cases import TenantTestCase
from django_tenants.utils import schema_context
from django.db import connection

from apps.incidences.models import Incidence, IncidenceUpdate
from apps.membership.models import Role, Membership
from apps.residences.models import Residence

User = get_user_model()

class IncidenceViewSetTests(TenantTestCase):

    def setUp(self):
        super().setUp()
        self.client = APIClient()
        self.host = self.domain.domain

        with schema_context(self.tenant.schema_name):
            self.residence_obj = Residence.objects.create(name="Residencia Demo", slug="demo")
            self.role_admin = Role.objects.create(name='admin', is_system_default=True)
            self.role_student = Role.objects.create(name='student', is_system_default=True)

            self.admin_user = User.objects.create_user(username='admin@test.com', email='admin@test.com', password='password123')
            self.student_a = User.objects.create_user(username='a@test.com', email='a@test.com', password='password123', first_name="Juan")
            self.student_b = User.objects.create_user(username='b@test.com', email='b@test.com', password='password123', first_name="Maria")
            self.user_no_roles = User.objects.create_user(username='norole@test.com', email='norole@test.com', password='password123')

            Membership.objects.create(user=self.admin_user, role=self.role_admin, residence=self.residence_obj, is_active=True)
            Membership.objects.create(user=self.student_a, role=self.role_student, residence=self.residence_obj, is_active=True)

            # Incidencia para pruebas de update
            self.inc_a = Incidence.objects.create(
                title="Incidencia A", location_type="habitacion", student=self.student_a, room_number="101"
            )

        self.list_url = reverse('incidence-list')

    def tearDown(self):
        with schema_context(self.tenant.schema_name):
            IncidenceUpdate.objects.all().delete()
            Incidence.objects.all().delete()
            Membership.objects.all().delete()
            User.objects.all().delete()
        super().tearDown()

    @classmethod
    def tearDownClass(cls):
        if hasattr(cls, 'tenant'):
            connection.set_schema(cls.tenant.schema_name)
        try:
            super().tearDownClass()
        except Exception:
            pass

    def get_results(self, data):
        return data['results'] if isinstance(data, dict) and 'results' in data else data

    def test_get_queryset_admin(self):
        self.client.force_authenticate(user=self.admin_user)
        res = self.client.get(self.list_url, HTTP_HOST=self.host)
        self.assertEqual(len(self.get_results(res.data)), 1)

    def test_get_queryset_student_privacy(self):
        with schema_context(self.tenant.schema_name):
            Incidence.objects.create(title="Privada B", location_type="habitacion", student=self.student_b)
        self.client.force_authenticate(user=self.student_a)
        res = self.client.get(self.list_url, HTTP_HOST=self.host)
        self.assertEqual(len(self.get_results(res.data)), 1)

    def test_serializer_admin(self):
        self.client.force_authenticate(user=self.admin_user)
        res = self.client.get(reverse('incidence-detail', args=[self.inc_a.id]), HTTP_HOST=self.host)
        self.assertIn('student', res.data)

    def test_serializer_student(self):
        self.client.force_authenticate(user=self.student_a)
        res = self.client.get(reverse('incidence-detail', args=[self.inc_a.id]), HTTP_HOST=self.host)
        self.assertNotIn('student', res.data)

    def test_perform_create_staff(self):
        self.admin_user.is_staff = True
        self.admin_user.save()
        self.client.force_authenticate(user=self.admin_user)
        res = self.client.post(self.list_url, {"title": "S", "description": "D", "location_type": "exterior"}, HTTP_HOST=self.host)
        self.assertEqual(res.status_code, 201)

    def test_perform_create_resident_logic(self):
        self.client.force_authenticate(user=self.student_a)
        res = self.client.post(self.list_url, {"title": "S", "description": "D", "location_type": "habitacion"}, HTTP_HOST=self.host)
        self.assertEqual(res.data['room_number'], "3º A")

    def test_perform_update_full_logs(self):
        self.client.force_authenticate(user=self.admin_user)
        url = reverse('incidence-detail', args=[self.inc_a.id])
        data = {"status": "resolved", "assigned_external_name": "Pepe", "quick_comment": "OK"}
        self.client.patch(url, data, HTTP_HOST=self.host)
        with schema_context(self.tenant.schema_name):
            log = IncidenceUpdate.objects.filter(incidence=self.inc_a).last()
            self.assertTrue("Estado" in log.text and "Asignada" in log.text and "Nota" in log.text)

    def test_perform_update_remove_assignee(self):
        with schema_context(self.tenant.schema_name):
            self.inc_a.assigned_external_name = "Si"
            self.inc_a.save()
        self.client.force_authenticate(user=self.admin_user)
        self.client.patch(reverse('incidence-detail', args=[self.inc_a.id]), {"assigned_external_name": ""}, HTTP_HOST=self.host)
        with schema_context(self.tenant.schema_name):
            log = IncidenceUpdate.objects.filter(incidence=self.inc_a).last()
            self.assertIn("retirado", log.text)

    def test_perform_destroy(self):
        self.client.force_authenticate(user=self.admin_user)
        self.client.delete(reverse('incidence-detail', args=[self.inc_a.id]), HTTP_HOST=self.host)
        with schema_context(self.tenant.schema_name):
            self.inc_a.refresh_from_db()
            self.assertFalse(self.inc_a.is_active)

    def test_notifications_staff(self):
        self.admin_user.is_staff = True
        self.admin_user.save()
        self.client.force_authenticate(user=self.admin_user)
        res = self.client.get(reverse('incidence-notifications'), HTTP_HOST=self.host)
        self.assertEqual(res.status_code, 200)

    def test_notifications_resident_and_helpers(self):
        with schema_context(self.tenant.schema_name):
            Incidence.objects.create(
                title="Aviso de Maria", 
                location_type="cocina", 
                student=self.student_b
            )
            IncidenceUpdate.objects.create(incidence=self.inc_a, author_name="Admin", text="Update")

        self.client.force_authenticate(user=self.student_a)
        res = self.client.get(reverse('incidence-notifications'), HTTP_HOST=self.host)
        
        results = res.data['results']
        self.assertGreater(len(results), 0)
        self.assertIn('location_label', results[0])

    def test_serializer_for_user_without_roles(self):
        """Verifica que un usuario sin roles usa AdminIncidenceSerializer al ver una zona común"""
        with schema_context(self.tenant.schema_name):
            inc_comun = Incidence.objects.create(
                title="Bombilla fundida", 
                location_type="cocina", 
                student=self.student_b
            )

        self.client.force_authenticate(user=self.user_no_roles)
        res = self.client.get(reverse('incidence-detail', args=[inc_comun.id]), HTTP_HOST=self.host)
        
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        
        self.assertIn('student', res.data)

    def test_notifications_sorting_and_limit(self):
        """Verifica que las notificaciones respetan el límite de 8 y el orden cronológico"""
        self.admin_user.is_staff = True
        self.admin_user.save()
        self.client.force_authenticate(user=self.admin_user)
        
        with schema_context(self.tenant.schema_name):
            for i in range(10):
                Incidence.objects.create(
                    title=f"Test {i}", 
                    location_type="exterior", 
                    student=self.student_a
                )
        
        res = self.client.get(reverse('incidence-notifications'), HTTP_HOST=self.host)
        self.assertEqual(len(res.data['results']), 8)
        self.assertIn("Test 9", res.data['results'][0]['message'])

    def test_notifications_resident_privacy_filter(self):
        """Verifica que los residentes NO ven notificaciones de habitaciones ajenas"""
        with schema_context(self.tenant.schema_name):
            # Student B crea algo en su habitación
            Incidence.objects.create(
                title="Secreto", 
                location_type="habitacion", 
                student=self.student_b
            )
        
        self.client.force_authenticate(user=self.student_a)
        res = self.client.get(reverse('incidence-notifications'), HTTP_HOST=self.host)
        
        # Student A no debería recibir nada 
        messages = [n['message'] for n in res.data['results']]
        for msg in messages:
            self.assertNotIn("Secreto", msg)
    
    

    