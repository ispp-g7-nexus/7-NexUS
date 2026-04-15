import json
from datetime import time, timedelta

from django.utils import timezone
from django_tenants.test.cases import FastTenantTestCase
from django_tenants.test.client import TenantClient

from django.contrib.auth import get_user_model
from apps.residences.models import Residence, ResidenceDomain
from apps.spaces.models import CommonSpace, SpaceReservation
from apps.spaces.tests import ensure_tenant_domain, make_tenant_client


class AdminSpaceViewsTests(FastTenantTestCase):
    @classmethod
    def get_test_tenant_domain(cls):
        return "spaces.test.local"

    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Tenant Spaces Admin"
        tenant.slug = "tenant-spaces-admin"
        tenant.is_active = True
        tenant.on_trial = True

    @classmethod
    def setup_domain(cls, domain):
        domain.domain = cls.get_test_tenant_domain()
        domain.is_primary = True

    def setUp(self):
        super().setUp()
        ensure_tenant_domain(self.tenant, self.get_test_tenant_domain())
        User = get_user_model()

        domain = self.get_test_tenant_domain()

        self.admin_user = User.objects.create_user(
            username="admin-sp",
            email="admin@sp.test",
            password="demo1234",
            is_staff=True,
        )
        self.non_staff_user = User.objects.create_user(
            username="student-sp",
            email="student@sp.test",
            password="demo1234",
        )

        self.residence = Residence.objects.create(
            name="Residencia Admin",
            slug="residencia-admin",
            code="RA-ADM",
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
            slug="residencia-otra",
            code="RO-ADM",
            timezone="Europe/Madrid",
            is_active=True,
        )

        self.space = CommonSpace.objects.create(
            name="Sala Admin",
            description="",
            capacity=4,
            is_active=True,
            open_time=time(8, 0),
            close_time=time(20, 0),
            residence=self.residence,
        )

        self.other_space = CommonSpace.objects.create(
            name="Sala Otra",
            description="",
            capacity=6,
            is_active=True,
            open_time=time(8, 0),
            close_time=time(20, 0),
            residence=self.other_residence,
        )

        self.admin_client = make_tenant_client(self.tenant, domain)
        self.admin_client.force_login(self.admin_user)

        self.non_staff_client = make_tenant_client(self.tenant, domain)
        self.non_staff_client.force_login(self.non_staff_user)

        self.anon_client = make_tenant_client(self.tenant, domain)

    def _create_reservation(self, user, space, start_offset_minutes=60, duration_minutes=60):
        start = timezone.now() + timedelta(minutes=start_offset_minutes)
        end = start + timedelta(minutes=duration_minutes)
        return SpaceReservation.objects.create(
            space=space,
            user=user,
            residence=space.residence,
            start_time=start,
            end_time=end,
            status=SpaceReservation.Status.ACTIVE,
        )

    def test_admin_space_reservations_list(self):
        
        res = self._create_reservation(self.non_staff_user, self.space)
        resp = self.admin_client.get(f"/api/admin/spaces/{self.space.id}/reservations/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.json()), 1)
        self.assertEqual(resp.json()[0]["id"], res.id)
    
    def test_admin_list_returns_spaces_for_admin(self):
        
        resp = self.admin_client.get("/api/admin/spaces/")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        found_ids = [item["id"] for item in data]
        self.assertIn(self.space.id, found_ids)

    def test_admin_create_space_success(self):
        payload = {
            "name": "Sala Nueva",
            "description": "desc",
            "capacity": 3,
            "open_time": "09:00",
            "close_time": "18:00",
            "reservation_interval_minutes": 30,
        }

        resp = self.admin_client.post(
            "/api/admin/spaces/",
            data=json.dumps(payload),
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 201)
        body = resp.json()
        self.assertEqual(body["name"], payload["name"])
        self.assertTrue(CommonSpace.objects.filter(id=body["id"]).exists())

    def test_admin_create_space_invalid_times_returns_400(self):
        payload = {
            "name": "Sala Bad",
            "open_time": "18:00",
            "close_time": "09:00",
        }
        resp = self.admin_client.post(
            "/api/admin/spaces/",
            data=json.dumps(payload),
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("close_time", resp.json()["detail"])

    def test_admin_create_duplicate_name_returns_400(self):
        payload = {
            "name": self.space.name,
            "open_time": "09:00",
            "close_time": "18:00",
        }
        resp = self.admin_client.post(
            "/api/admin/spaces/",
            data=json.dumps(payload),
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("Ya existe", resp.json()["detail"])

    def test_admin_patch_space_updates_fields(self):
        payload = {"name": "Sala Admin Editada", "capacity": 10}
        resp = self.admin_client.patch(
            f"/api/admin/spaces/{self.space.id}/",
            data=json.dumps(payload),
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 200)
        self.space.refresh_from_db()
        self.assertEqual(self.space.name, payload["name"])
        self.assertEqual(self.space.capacity, 10)

    def test_admin_patch_invalid_capacity_returns_400(self):
        payload = {"capacity": 0}
        resp = self.admin_client.patch(
            f"/api/admin/spaces/{self.space.id}/",
            data=json.dumps(payload),
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 400)

    def test_admin_delete_soft_deletes_and_cancels_reservations(self):
        reservation = self._create_reservation(self.non_staff_user, self.space)

        resp = self.admin_client.delete(f"/api/admin/spaces/{self.space.id}/")

        self.assertEqual(resp.status_code, 200)
        self.space.refresh_from_db()
        reservation.refresh_from_db()
        self.assertFalse(self.space.is_active)
        self.assertEqual(reservation.status, SpaceReservation.Status.CANCELLED)

    def test_admin_notifications_excludes_requesting_user_and_limits(self):
        User = get_user_model()
        other_users = [
            User.objects.create_user(username=f"u{i}", email=f"u{i}@x") for i in range(5)
        ]
        for i, u in enumerate(other_users):
            self._create_reservation(u, self.space, start_offset_minutes=60 * (i + 1))

        resp = self.admin_client.get("/api/admin/spaces/notifications/")

        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIsInstance(data, list)
        self.assertTrue(len(data) <= 8)

    def test_admin_endpoints_forbidden_for_non_admin(self):
        resp = self.non_staff_client.get("/api/admin/spaces/")
        self.assertEqual(resp.status_code, 403)

        resp = self.non_staff_client.post(
            "/api/admin/spaces/",
            data=json.dumps({"name": "X", "open_time": "08:00", "close_time": "10:00"}),
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 403)

    def test_admin_space_from_other_residence_returns_404(self):
        
        resp = self.admin_client.get(f"/api/admin/spaces/{self.other_space.id}/")
        self.assertEqual(resp.status_code, 404)

    def test_admin_patch_space_invalid_times_returns_400(self):
        payload = {"open_time": "20:00", "close_time": "08:00"}
        resp = self.admin_client.patch(f"/api/admin/spaces/{self.space.id}/", data=json.dumps(payload), content_type="application/json")
        self.assertEqual(resp.status_code, 400)

    def test_admin_patch_space_duplicate_name_returns_400(self):
        
        espacio_2 = CommonSpace.objects.create(
            name="Sala Secundaria", capacity=4, is_active=True, 
            open_time=time(8, 0), close_time=time(20, 0), residence=self.residence
        )
        
        
        payload = {"name": espacio_2.name}
        resp = self.admin_client.patch(
            f"/api/admin/spaces/{self.space.id}/", 
            data=json.dumps(payload), content_type="application/json"
        )
        self.assertEqual(resp.status_code, 400)

    def test_admin_create_space_invalid_json_returns_400(self):
        resp = self.admin_client.post(
            "/api/admin/spaces/",
            data="invalid json{",
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("JSON", resp.json()["detail"])

    def test_admin_create_space_missing_required_fields_returns_400(self):
        payload = {"name": "Sala A"}
        resp = self.admin_client.post(
            "/api/admin/spaces/",
            data=json.dumps(payload),
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("obligatorios", resp.json()["detail"])

    def test_admin_create_space_invalid_capacity_returns_400(self):
        payload = {
            "name": "Sala X",
            "open_time": "09:00",
            "close_time": "18:00",
            "capacity": "not-a-number",
        }
        resp = self.admin_client.post(
            "/api/admin/spaces/",
            data=json.dumps(payload),
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("capacity", resp.json()["detail"])

    def test_admin_create_space_empty_name_returns_400(self):
        payload = {
            "name": "   ",
            "open_time": "09:00",
            "close_time": "18:00",
        }
        resp = self.admin_client.post(
            "/api/admin/spaces/",
            data=json.dumps(payload),
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("obligatorios", resp.json()["detail"])

    def test_admin_create_space_negative_capacity_returns_400(self):
        payload = {
            "name": "Sala Y",
            "open_time": "09:00",
            "close_time": "18:00",
            "capacity": -5,
        }
        resp = self.admin_client.post(
            "/api/admin/spaces/",
            data=json.dumps(payload),
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 400)

    def test_admin_create_space_invalid_interval_returns_400(self):
        payload = {
            "name": "Sala Z",
            "open_time": "09:00",
            "close_time": "18:00",
            "reservation_interval_minutes": 0,
        }
        resp = self.admin_client.post(
            "/api/admin/spaces/",
            data=json.dumps(payload),
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("intervalo", resp.json()["detail"])

    def test_admin_create_space_invalid_time_format_returns_400(self):
        payload = {
            "name": "Sala Bad Time",
            "open_time": "not-a-time",
            "close_time": "18:00",
        }
        resp = self.admin_client.post(
            "/api/admin/spaces/",
            data=json.dumps(payload),
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("hora inválido", resp.json()["detail"])

    def test_admin_patch_space_invalid_json_returns_400(self):
        resp = self.admin_client.patch(
            f"/api/admin/spaces/{self.space.id}/",
            data="not valid json{",
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 400)

    def test_admin_patch_space_nonexistent_returns_404(self):
        resp = self.admin_client.patch(
            "/api/admin/spaces/999999/",
            data=json.dumps({"name": "Nueva Sala"}),
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 404)

    def test_admin_patch_space_empty_name_returns_400(self):
        payload = {"name": ""}
        resp = self.admin_client.patch(
            f"/api/admin/spaces/{self.space.id}/",
            data=json.dumps(payload),
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("nombre", resp.json()["detail"])

    def test_admin_patch_space_invalid_open_time_format_returns_400(self):
        payload = {"open_time": "invalid"}
        resp = self.admin_client.patch(
            f"/api/admin/spaces/{self.space.id}/",
            data=json.dumps(payload),
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("open_time", resp.json()["detail"])

    def test_admin_patch_space_invalid_close_time_format_returns_400(self):
        payload = {"close_time": "not-a-time"}
        resp = self.admin_client.patch(
            f"/api/admin/spaces/{self.space.id}/",
            data=json.dumps(payload),
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("close_time", resp.json()["detail"])

    def test_admin_patch_space_invalid_interval_returns_400(self):
        payload = {"reservation_interval_minutes": -1}
        resp = self.admin_client.patch(
            f"/api/admin/spaces/{self.space.id}/",
            data=json.dumps(payload),
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 400)

    def test_admin_patch_space_invalid_capacity_returns_400(self):
        payload = {"capacity": "abc"}
        resp = self.admin_client.patch(
            f"/api/admin/spaces/{self.space.id}/",
            data=json.dumps(payload),
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 400)

    def test_admin_space_reservations_filtered_by_status_active(self):
        res_active = self._create_reservation(self.non_staff_user, self.space)
        res_cancel = SpaceReservation.objects.create(
            space=self.space,
            user=self.non_staff_user,
            residence=self.residence,
            start_time=timezone.now() + timedelta(hours=3),
            end_time=timezone.now() + timedelta(hours=4),
            status=SpaceReservation.Status.CANCELLED,
        )
        resp = self.admin_client.get(
            f"/api/admin/spaces/{self.space.id}/reservations/?status=active"
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.json()), 1)
        self.assertEqual(resp.json()[0]["id"], res_active.id)

    def test_admin_space_reservations_filtered_by_status_cancelled(self):
        res_active = self._create_reservation(self.non_staff_user, self.space)
        res_cancel = SpaceReservation.objects.create(
            space=self.space,
            user=self.non_staff_user,
            residence=self.residence,
            start_time=timezone.now() + timedelta(hours=3),
            end_time=timezone.now() + timedelta(hours=4),
            status=SpaceReservation.Status.CANCELLED,
        )
        resp = self.admin_client.get(
            f"/api/admin/spaces/{self.space.id}/reservations/?status=cancelled"
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.json()), 1)
        self.assertEqual(resp.json()[0]["id"], res_cancel.id)

    def test_admin_patch_space_updates_is_active(self):
        payload = {"is_active": False}
        resp = self.admin_client.patch(
            f"/api/admin/spaces/{self.space.id}/",
            data=json.dumps(payload),
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 200)
        self.space.refresh_from_db()
        self.assertFalse(self.space.is_active)

    def test_admin_patch_space_updates_description_and_img(self):
        new_desc = "Nueva descripción"
        new_img = "https://example.com/img.jpg"
        payload = {"description": new_desc, "img": new_img}
        resp = self.admin_client.patch(
            f"/api/admin/spaces/{self.space.id}/",
            data=json.dumps(payload),
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 200)
        self.space.refresh_from_db()
        self.assertEqual(self.space.description, new_desc)
        self.assertEqual(self.space.img, new_img)

    def test_admin_patch_space_updates_reservation_interval_minutes(self):
        payload = {"reservation_interval_minutes": 45}
        resp = self.admin_client.patch(
            f"/api/admin/spaces/{self.space.id}/",
            data=json.dumps(payload),
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 200)
        self.space.refresh_from_db()
        self.assertEqual(self.space.reservation_interval_minutes, 45)

    def test_admin_delete_nonexistent_space_returns_404(self):
        resp = self.admin_client.delete("/api/admin/spaces/999999/")
        self.assertEqual(resp.status_code, 404)
