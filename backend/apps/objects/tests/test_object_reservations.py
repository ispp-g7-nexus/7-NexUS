from datetime import datetime, time, timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from django_tenants.test.cases import FastTenantTestCase
from django_tenants.test.client import TenantClient

from apps.membership.models import Membership, Role
from apps.objects.models import Object, ObjectRental
from apps.residences.models import Residence, ResidenceDomain


class ObjectReservationApiTests(FastTenantTestCase):
    @classmethod
    def get_test_tenant_domain(cls):
        return "objects.test.local"

    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Tenant de Test"
        tenant.slug = "tenant-test-objects"
        tenant.is_active = True
        tenant.on_trial = True
        return tenant

    @classmethod
    def setup_domain(cls, domain):
        domain.domain = cls.get_test_tenant_domain()
        domain.is_primary = True
        return domain

    def setUp(self):
        super().setUp()
        self.client = TenantClient(self.tenant)

        user_model = get_user_model()
        self.user = user_model.objects.create_user(
            username="student",
            email="student@example.com",
            password="demo1234", #NOSONAR
            first_name="Student",
            last_name="Demo",
        )
        self.other_user = user_model.objects.create_user(
            username="other",
            email="other@example.com",
            password="demo1234", #NOSONAR
            first_name="Other",
            last_name="Demo",
        )
        self.admin_user = user_model.objects.create_user(
            username="admin",
            email="admin@example.com",
            password="demo1234", #NOSONAR
            first_name="Admin",
            last_name="Demo",
        )

        self.residence = Residence.objects.create(
            name="Residencia A",
            slug="residencia-a-objects",
            code="RO-001",
            timezone="Europe/Madrid",
            is_active=True,
        )
        ResidenceDomain.objects.create(
            residence=self.residence,
            domain=self.get_test_tenant_domain(),
            is_primary=True,
            is_active=True,
        )

        self.object = Object.objects.create(
            name="Taladro",
            description="Taladro compartido",
            location="Almacén",
            residence=self.residence,
            available=True,
        )

        student_role, _ = Role.objects.get_or_create(
            name="Student",
            residence=None,
            defaults={
                "description": "Residente",
                "is_system_default": True,
            },
        )
        admin_role = Role.objects.create(
            name="Admin",
            description="Administrador",
            is_system_default=False,
            residence=self.residence,
        )
        Membership.objects.create(
            user=self.user,
            role=student_role,
            residence=self.residence,
            is_active=True,
        )
        Membership.objects.create(
            user=self.other_user,
            role=student_role,
            residence=self.residence,
            is_active=True,
        )
        Membership.objects.create(
            user=self.admin_user,
            role=admin_role,
            residence=self.residence,
            is_active=True,
        )

        self.client.force_login(self.user)

    def _build_slot(
        self,
        *,
        day_offset: int,
        start_hour: int,
        start_minute: int,
        end_hour: int,
        end_minute: int,
    ):
        target_date = timezone.localdate() + timedelta(days=day_offset)
        tz = timezone.get_current_timezone()
        start_time = timezone.make_aware(
            datetime.combine(target_date, time(start_hour, start_minute)),
            tz,
        )
        end_time = timezone.make_aware(
            datetime.combine(target_date, time(end_hour, end_minute)),
            tz,
        )
        return start_time, end_time

    def test_create_valid_object_reservation(self):
        start_time, end_time = self._build_slot(
            day_offset=1,
            start_hour=10,
            start_minute=0,
            end_hour=11,
            end_minute=0,
        )

        response = self.client.post(
            f"/api/objects/{self.object.id}/reserve/",
            data={
                "start_date": start_time.isoformat(),
                "end_date": end_time.isoformat(),
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(ObjectRental.objects.count(), 1)

    def test_allows_overlapping_object_reservation_with_infinite_stock(self):
        start_time, end_time = self._build_slot(
            day_offset=1,
            start_hour=10,
            start_minute=0,
            end_hour=11,
            end_minute=0,
        )
        ObjectRental.objects.create(
            object=self.object,
            user=self.other_user,
            start_date=start_time,
            end_date=end_time,
        )

        response = self.client.post(
            f"/api/objects/{self.object.id}/reserve/",
            data={
                "start_date": start_time.isoformat(),
                "end_date": end_time.isoformat(),
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(ObjectRental.objects.count(), 2)

    def test_rejects_duplicate_same_user_same_object_same_slot(self):
        start_time, end_time = self._build_slot(
            day_offset=1,
            start_hour=10,
            start_minute=0,
            end_hour=11,
            end_minute=0,
        )
        ObjectRental.objects.create(
            object=self.object,
            user=self.user,
            start_date=start_time,
            end_date=end_time,
        )

        response = self.client.post(
            f"/api/objects/{self.object.id}/reserve/",
            data={
                "start_date": start_time.isoformat(),
                "end_date": end_time.isoformat(),
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("ya tienes una reserva", response.json()["detail"].lower())
        self.assertEqual(ObjectRental.objects.count(), 1)

    def test_allows_back_to_back_reservations(self):
        first_start, first_end = self._build_slot(
            day_offset=1,
            start_hour=10,
            start_minute=0,
            end_hour=11,
            end_minute=0,
        )
        second_start, second_end = self._build_slot(
            day_offset=1,
            start_hour=11,
            start_minute=0,
            end_hour=12,
            end_minute=0,
        )
        ObjectRental.objects.create(
            object=self.object,
            user=self.other_user,
            start_date=first_start,
            end_date=first_end,
        )

        response = self.client.post(
            f"/api/objects/{self.object.id}/reserve/",
            data={
                "start_date": second_start.isoformat(),
                "end_date": second_end.isoformat(),
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(ObjectRental.objects.count(), 2)

    def test_rejects_end_before_start(self):
        start_time, end_time = self._build_slot(
            day_offset=1,
            start_hour=12,
            start_minute=0,
            end_hour=11,
            end_minute=0,
        )

        response = self.client.post(
            f"/api/objects/{self.object.id}/reserve/",
            data={
                "start_date": start_time.isoformat(),
                "end_date": end_time.isoformat(),
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("posterior", response.json()["detail"].lower())

    def test_rejects_non_hourly_slot_boundaries(self):
        start_time, end_time = self._build_slot(
            day_offset=1,
            start_hour=10,
            start_minute=30,
            end_hour=11,
            end_minute=30,
        )

        response = self.client.post(
            f"/api/objects/{self.object.id}/reserve/",
            data={
                "start_date": start_time.isoformat(),
                "end_date": end_time.isoformat(),
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("hh:00", response.json()["detail"].lower())

    def test_rejects_duration_different_from_one_hour(self):
        start_time, end_time = self._build_slot(
            day_offset=1,
            start_hour=10,
            start_minute=0,
            end_hour=12,
            end_minute=0,
        )

        response = self.client.post(
            f"/api/objects/{self.object.id}/reserve/",
            data={
                "start_date": start_time.isoformat(),
                "end_date": end_time.isoformat(),
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("exactamente 1 hora", response.json()["detail"].lower())

    def test_availability_returns_slots_and_existing_reservations(self):
        start_time, end_time = self._build_slot(
            day_offset=1,
            start_hour=10,
            start_minute=0,
            end_hour=11,
            end_minute=0,
        )
        rental = ObjectRental.objects.create(
            object=self.object,
            user=self.other_user,
            start_date=start_time,
            end_date=end_time,
        )

        target_date = (timezone.localdate() + timedelta(days=1)).isoformat()
        response = self.client.get(
            f"/api/objects/{self.object.id}/availability/?date={target_date}"
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["reservation_interval_minutes"], 60)
        self.assertEqual(len(payload["available_slots"]), 24)
        self.assertEqual(len(payload["reservations"]), 1)
        self.assertEqual(payload["reservations"][0]["id"], rental.id)

        target_slot = next(
            slot
            for slot in payload["available_slots"]
            if slot["start_time"] == start_time.isoformat()
        )
        self.assertEqual(target_slot["status"], "available")

    def test_admin_can_mark_rental_as_returned(self):
        now = timezone.now()
        rental = ObjectRental.objects.create(
            object=self.object,
            user=self.user,
            start_date=now - timedelta(minutes=15),
            end_date=now + timedelta(minutes=45),
            status="ACTIVE",
        )

        self.client.force_login(self.admin_user)
        response = self.client.post(
            f"/api/objects/{self.object.id}/rentals/{rental.id}/complete/",
            data={},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        rental.refresh_from_db()
        self.assertEqual(rental.status, "COMPLETED")

    def test_admin_cannot_mark_future_active_rental_as_returned(self):
        start_time, end_time = self._build_slot(
            day_offset=1,
            start_hour=10,
            start_minute=0,
            end_hour=11,
            end_minute=0,
        )
        rental = ObjectRental.objects.create(
            object=self.object,
            user=self.user,
            start_date=start_time,
            end_date=end_time,
            status="ACTIVE",
        )

        self.client.force_login(self.admin_user)
        response = self.client.post(
            f"/api/objects/{self.object.id}/rentals/{rental.id}/complete/",
            data={},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        rental.refresh_from_db()
        self.assertEqual(rental.status, "ACTIVE")

    def test_student_cannot_mark_rental_as_returned(self):
        start_time, end_time = self._build_slot(
            day_offset=1,
            start_hour=10,
            start_minute=0,
            end_hour=11,
            end_minute=0,
        )
        rental = ObjectRental.objects.create(
            object=self.object,
            user=self.other_user,
            start_date=start_time,
            end_date=end_time,
            status="ACTIVE",
        )

        response = self.client.post(
            f"/api/objects/{self.object.id}/rentals/{rental.id}/complete/",
            data={},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 403)
        rental.refresh_from_db()
        self.assertEqual(rental.status, "ACTIVE")

    def test_admin_rentals_in_progress_include_overdue_metrics(self):
        now = timezone.now()
        overdue_rental = ObjectRental.objects.create(
            object=self.object,
            user=self.user,
            start_date=now - timedelta(hours=2),
            end_date=now - timedelta(minutes=20),
            status="IN_PROGRESS",
        )

        self.client.force_login(self.admin_user)
        response = self.client.get(f"/api/objects/{self.object.id}/rentals/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertIn("in_progress", payload)
        self.assertEqual(len(payload["in_progress"]), 1)
        self.assertEqual(payload["in_progress"][0]["id"], overdue_rental.id)
        self.assertEqual(payload["in_progress"][0]["is_overdue"], True)
        self.assertGreaterEqual(payload["in_progress"][0]["overdue_minutes"], 20)
