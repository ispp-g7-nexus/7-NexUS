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

        self.anon_client = TenantClient(self.tenant, SERVER_NAME=domain, HTTP_HOST=domain)

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

    def test_reservation_reminders_only_include_upcoming_within_one_hour(self):
        now = timezone.now()
        upcoming_start = now + timedelta(minutes=45)
        upcoming_end = upcoming_start + timedelta(hours=1)
        later_start = now + timedelta(hours=2)
        later_end = later_start + timedelta(hours=1)
        active_start = now - timedelta(minutes=10)
        active_end = active_start + timedelta(hours=1)

        SpaceReservation.objects.create(
            space=self.space,
            user=self.user1,
            residence=self.residence,
            start_time=upcoming_start,
            end_time=upcoming_end,
        )
        SpaceReservation.objects.create(
            space=self.space,
            user=self.user1,
            residence=self.residence,
            start_time=later_start,
            end_time=later_end,
        )
        SpaceReservation.objects.create(
            space=self.space,
            user=self.user1,
            residence=self.residence,
            start_time=active_start,
            end_time=active_end,
        )

        resp = self.client1.get("/api/spaces/reservations/reminders/")
        self.assertEqual(resp.status_code, 200)
        payload = resp.json()
        self.assertEqual(len(payload), 1)
        self.assertIn("Sala Común", payload[0]["title"])

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

    def test_create_reservation_with_user_overlap_returns_400(self):
        start = timezone.now().replace(hour=10, minute=0, second=0, microsecond=0) + timedelta(days=1)
        end = start + timedelta(hours=1)
        payload = {"start_time": start.isoformat(), "end_time": end.isoformat()}

        resp1 = self.client1.post(
            f"/api/spaces/{self.space.id}/reservations/",
            data=json.dumps(payload),
            content_type="application/json",
        )
        self.assertEqual(resp1.status_code, 201)

        resp2 = self.client1.post(
            f"/api/spaces/{self.space.id}/reservations/",
            data=json.dumps(payload),
            content_type="application/json",
        )
        self.assertEqual(resp2.status_code, 400)
        self.assertIn("otra reserva", str(resp2.json()).lower())

    def test_create_reservation_past_datetime_returns_400(self):
        start = timezone.now() - timedelta(hours=1)
        end = start + timedelta(hours=1)
        payload = {"start_time": start.isoformat(), "end_time": end.isoformat()}
        
        resp = self.client1.post(
            f"/api/spaces/{self.space.id}/reservations/",
            data=json.dumps(payload),
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("pasado", str(resp.json()).lower())

    def test_create_reservation_different_days_returns_400(self):
        start = timezone.now().replace(hour=20, minute=0, second=0, microsecond=0) + timedelta(days=1)
        end = start + timedelta(hours=5)
        payload = {"start_time": start.isoformat(), "end_time": end.isoformat()}
        
        resp = self.client1.post(
            f"/api/spaces/{self.space.id}/reservations/",
            data=json.dumps(payload),
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("mismo día", str(resp.json()).lower())

    def test_create_reservation_invalid_json_returns_400(self):
        resp = self.client1.post(
            f"/api/spaces/{self.space.id}/reservations/",
            data="invalid json",
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("JSON", resp.json()["detail"])

    def test_create_reservation_missing_times_returns_400(self):
        payload = {"start_time": ""}
        resp = self.client1.post(
            f"/api/spaces/{self.space.id}/reservations/",
            data=json.dumps(payload),
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("inicio y fin", str(resp.json()).lower())

    def test_space_availability_missing_date_param_returns_400(self):
        resp = self.client1.get(f"/api/spaces/{self.space.id}/availability/")
        self.assertEqual(resp.status_code, 400)
        self.assertIn("fecha", str(resp.json()).lower())

    def test_space_availability_invalid_date_format_returns_400(self):
        resp = self.client1.get(f"/api/spaces/{self.space.id}/availability/?date=invalid-date")
        self.assertEqual(resp.status_code, 400)
        self.assertIn("fecha inválido", str(resp.json()).lower())

    def test_space_availability_nonexistent_space_returns_404(self):
        date_str = timezone.now().date().isoformat()
        resp = self.client1.get(f"/api/spaces/999999/availability/?date={date_str}")
        self.assertEqual(resp.status_code, 404)

    def test_space_availability_marks_past_slots_for_past_date(self):
        date_str = (timezone.now() - timedelta(days=1)).date().isoformat()
        resp = self.client1.get(f"/api/spaces/{self.space.id}/availability/?date={date_str}")
        self.assertEqual(resp.status_code, 200)
        payload = resp.json()
        self.assertTrue(len(payload["available_slots"]) > 0)
        self.assertTrue(all(slot["status"] == "past" for slot in payload["available_slots"]))

    def test_list_spaces_includes_all_active_spaces(self):
        space2 = CommonSpace.objects.create(
            name="Sala 2",
            capacity=3,
            is_active=True,
            open_time=time(9, 0),
            close_time=time(21, 0),
            residence=self.residence,
        )
        resp = self.client1.get("/api/spaces/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.json()), 2)

    def test_space_availability_shows_all_reservations_for_date(self):
        date_str = (timezone.now() + timedelta(days=1)).date().isoformat()
        start1 = timezone.now().replace(hour=10, minute=0, second=0, microsecond=0) + timedelta(days=1)
        end1 = start1 + timedelta(hours=1)
        start2 = start1 + timedelta(hours=2)
        end2 = start2 + timedelta(hours=1)
        
        SpaceReservation.objects.create(
            space=self.space, user=self.user1, residence=self.residence,
            start_time=start1, end_time=end1, status=SpaceReservation.Status.ACTIVE
        )
        SpaceReservation.objects.create(
            space=self.space, user=self.user2, residence=self.residence,
            start_time=start2, end_time=end2, status=SpaceReservation.Status.ACTIVE
        )
        
        resp = self.client1.get(f"/api/spaces/{self.space.id}/availability/?date={date_str}")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(len(data["reservations"]), 2)

    def test_my_reservations_returns_empty_when_no_reservations(self):
        resp = self.client1.get("/api/spaces/reservations/me/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.json()), 0)

    def test_reminders_returns_empty_when_no_upcoming_reservations(self):
        resp = self.client1.get("/api/spaces/reservations/reminders/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.json()), 0)

    def test_cancel_nonexistent_reservation_returns_404(self):
        resp = self.client1.post("/api/spaces/reservations/99999/cancel/")
        self.assertEqual(resp.status_code, 404)

    def test_create_reservation_for_inactive_space_returns_404(self):
        self.space.is_active = False
        self.space.save(update_fields=["is_active"])

        start = timezone.now().replace(hour=10, minute=0, second=0, microsecond=0) + timedelta(days=1)
        end = start + timedelta(hours=1)
        payload = {"start_time": start.isoformat(), "end_time": end.isoformat()}

        resp = self.client1.post(
            f"/api/spaces/{self.space.id}/reservations/",
            data=json.dumps(payload),
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 404)

    def test_admin_can_cancel_others_reservation(self):
        User = get_user_model()
        admin_user = User.objects.create_user(
            username="spaces-admin",
            email="spaces-admin@test.local",
            password="123",
            is_staff=True,
        )
        admin_client = TenantClient(self.tenant, SERVER_NAME=self.get_test_tenant_domain(), HTTP_HOST=self.get_test_tenant_domain())
        admin_client.force_login(admin_user)

        start = timezone.now().replace(hour=12, minute=0) + timedelta(days=1)
        end = start + timedelta(hours=1)
        res = SpaceReservation.objects.create(
            space=self.space,
            user=self.user1,
            residence=self.residence,
            start_time=start,
            end_time=end,
            status=SpaceReservation.Status.ACTIVE,
        )

        resp = admin_client.post(f"/api/spaces/reservations/{res.id}/cancel/")
        self.assertEqual(resp.status_code, 200)
        res.refresh_from_db()
        self.assertEqual(res.status, SpaceReservation.Status.CANCELLED)

    def test_user_views_require_authentication(self):
        start = timezone.now().replace(hour=10, minute=0, second=0, microsecond=0) + timedelta(days=1)
        end = start + timedelta(hours=1)
        date_str = timezone.now().date().isoformat()

        urls = [
            ("/api/spaces/", "get", None),
            (f"/api/spaces/{self.space.id}/availability/?date={date_str}", "get", None),
            (
                f"/api/spaces/{self.space.id}/reservations/",
                "post",
                json.dumps({"start_time": start.isoformat(), "end_time": end.isoformat()}),
            ),
            ("/api/spaces/reservations/me/", "get", None),
            ("/api/spaces/reservations/reminders/", "get", None),
            ("/api/spaces/reservations/99999/cancel/", "post", json.dumps({})),
        ]

        for url, method, payload in urls:
            if method == "get":
                resp = self.anon_client.get(url)
            else:
                resp = self.anon_client.post(
                    url,
                    data=payload,
                    content_type="application/json",
                )
            self.assertEqual(resp.status_code, 401)
