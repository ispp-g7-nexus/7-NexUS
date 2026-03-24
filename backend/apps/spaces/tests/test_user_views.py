import json
from datetime import time, timedelta
from django.utils import timezone
from django.contrib.auth import get_user_model
from django_tenants.test.cases import FastTenantTestCase
from django_tenants.test.client import TenantClient

from apps.residences.models import Residence, ResidenceDomain
from apps.spaces.models import CommonSpace, SpaceReservation
from apps.membership.models import Membership, Role

class UserSpaceViewsTests(FastTenantTestCase):
    @classmethod
    def get_test_tenant_domain(cls):
        return "spaces.test.local"

    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Tenant Spaces User"
        tenant.slug = "tenant-spaces-user"
        tenant.is_active = True

    @classmethod
    def setup_domain(cls, domain):
        domain.domain = cls.get_test_tenant_domain()
        domain.is_primary = True

    def setUp(self):
        super().setUp()
        User = get_user_model()
        domain = self.get_test_tenant_domain()
        self.residence = Residence.objects.create(
            name="Residencia User", slug="residencia-user", code="RU-001", timezone="Europe/Madrid", is_active=True,
        )
        ResidenceDomain.objects.create(
            residence=self.residence, domain=domain, is_primary=True, is_active=True,
        )
        self.user1 = User.objects.create_user(username="user1", email="u1@test.local", password="123")
        self.user2 = User.objects.create_user(username="user2", email="u2@test.local", password="123")
        self.student_role = Role.objects.create(
            name="Student", description="Residente", is_system_default=True, residence=None
        )
        Membership.objects.create(
            user=self.user1, role=self.student_role, residence=self.residence, is_active=True
        )
        Membership.objects.create(
            user=self.user2, role=self.student_role, residence=self.residence, is_active=True
        )
        self.space = CommonSpace.objects.create(
            name="Sala Común", capacity=2, is_active=True, open_time=time(8, 0), close_time=time(22, 0), residence=self.residence,
        )

        self.client1 = TenantClient(self.tenant, SERVER_NAME=domain, HTTP_HOST=domain)
        self.client1.force_login(self.user1)

        self.client2 = TenantClient(self.tenant, SERVER_NAME=domain, HTTP_HOST=domain)
        self.client2.force_login(self.user2)

    def test_list_active_spaces(self):
        resp = self.client1.get("/api/spaces/")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["name"], "Sala Común")

    def test_space_availability_returns_200(self):
        date_str = timezone.now().date().isoformat()
        resp = self.client1.get(f"/api/spaces/{self.space.id}/availability/?date={date_str}")
        
        self.assertEqual(resp.status_code, 200)
        
        data = resp.json()
        self.assertIsInstance(data, dict)
        self.assertIn("available_slots", data)
        self.assertIn("space", data)
    
    def test_create_reservation_invalid_format_returns_400(self):
        payload = {"start_time": "fecha-invalida", "end_time": "bad-date"}
        resp = self.client1.post(f"/api/spaces/{self.space.id}/reservations/", data=json.dumps(payload), content_type="application/json")
        self.assertEqual(resp.status_code, 400)

    def test_create_reservation_end_before_start_returns_400(self):
        start = timezone.now().replace(hour=12, minute=0) + timedelta(days=1)
        end = start - timedelta(hours=1)
        payload = {"start_time": start.isoformat(), "end_time": end.isoformat()}
        resp = self.client1.post(f"/api/spaces/{self.space.id}/reservations/", data=json.dumps(payload), content_type="application/json")
        self.assertEqual(resp.status_code, 400)

    def test_cancel_already_cancelled_reservation_returns_error(self):
        start = timezone.now().replace(hour=12, minute=0) + timedelta(days=1)
        end = start + timedelta(hours=1)
        res = SpaceReservation.objects.create(
            space=self.space, user=self.user1, residence=self.residence, 
            start_time=start, end_time=end, status=SpaceReservation.Status.CANCELLED
        )
        resp = self.client1.post(f"/api/spaces/reservations/{res.id}/cancel/")
        self.assertEqual(resp.status_code, 400)
    
    def test_create_reservation_success(self):
        start = timezone.now().replace(hour=10, minute=0, second=0, microsecond=0) + timedelta(days=1)
        end = start + timedelta(hours=1)
        
        payload = {"start_time": start.isoformat(), "end_time": end.isoformat(), "notes": "Estudiar"}
        
        resp = self.client1.post(
            f"/api/spaces/{self.space.id}/reservations/",
            data=json.dumps(payload),
            content_type="application/json"
        )
        self.assertEqual(resp.status_code, 201)
        self.assertTrue(SpaceReservation.objects.filter(user=self.user1, notes="Estudiar").exists())

    def test_create_reservation_respects_capacity(self):
        start = timezone.now().replace(hour=10, minute=0, second=0, microsecond=0) + timedelta(days=1)
        end = start + timedelta(hours=1)
        payload = {"start_time": start.isoformat(), "end_time": end.isoformat()}

        r1 = self.client1.post(f"/api/spaces/{self.space.id}/reservations/", data=json.dumps(payload), content_type="application/json")
        self.assertEqual(r1.status_code, 201)

        r2 = self.client2.post(f"/api/spaces/{self.space.id}/reservations/", data=json.dumps(payload), content_type="application/json")
        self.assertEqual(r2.status_code, 201)

        user3 = get_user_model().objects.create_user(username="u3", password="123")
        Membership.objects.create(user=user3, role=self.student_role, residence=self.residence, is_active=True)
        
        client3 = TenantClient(self.tenant, SERVER_NAME=self.get_test_tenant_domain(), HTTP_HOST=self.get_test_tenant_domain())
        client3.force_login(user3)
        
        r3 = client3.post(f"/api/spaces/{self.space.id}/reservations/", data=json.dumps(payload), content_type="application/json")
        self.assertEqual(r3.status_code, 400)
        self.assertIn("aforo", str(r3.json()).lower())

    def test_my_reservations_list(self):
        start = timezone.now().replace(hour=12, minute=0) + timedelta(days=1)
        end = start + timedelta(hours=1)
        SpaceReservation.objects.create(space=self.space, user=self.user1, residence=self.residence, start_time=start, end_time=end)

        resp = self.client1.get("/api/spaces/reservations/me/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.json()), 1)

    def test_cancel_own_reservation_success(self):
        start = timezone.now().replace(hour=12, minute=0) + timedelta(days=1)
        end = start + timedelta(hours=1)
        res = SpaceReservation.objects.create(space=self.space, user=self.user1, residence=self.residence, start_time=start, end_time=end)

        resp = self.client1.post(f"/api/spaces/reservations/{res.id}/cancel/")
        self.assertEqual(resp.status_code, 200)
        
        res.refresh_from_db()
        self.assertEqual(res.status, SpaceReservation.Status.CANCELLED)

    def test_create_reservation_outside_open_hours_returns_400(self):
        start = timezone.now().replace(hour=3, minute=0, second=0, microsecond=0) + timedelta(days=1)
        end = start + timedelta(hours=1)
        
        payload = {"start_time": start.isoformat(), "end_time": end.isoformat()}
        
        resp = self.client1.post(
            f"/api/spaces/{self.space.id}/reservations/", 
            data=json.dumps(payload), 
            content_type="application/json"
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("dentro del horario", str(resp.json()).lower())

    def test_cannot_cancel_others_reservation(self):
        start = timezone.now().replace(hour=12, minute=0) + timedelta(days=1)
        end = start + timedelta(hours=1)
        res = SpaceReservation.objects.create(space=self.space, user=self.user1, residence=self.residence, start_time=start, end_time=end)

        resp = self.client2.post(f"/api/spaces/reservations/{res.id}/cancel/")
        self.assertEqual(resp.status_code, 403)