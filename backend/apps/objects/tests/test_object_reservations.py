from datetime import datetime, time, timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from django_tenants.test.cases import FastTenantTestCase

from apps.common.test_utils import ensure_tenant_domain, make_tenant_client
from apps.membership.models import Membership, Role
from apps.objects.models import Object, ObjectLabel, ObjectRental
from apps.objects.views import _serialize_object, _sync_started_rentals_for_residence
from apps.residences.models import Residence, ResidenceDomain


class ObjectReservationApiTests(FastTenantTestCase):
    @classmethod
    def get_test_tenant_domain(cls):
        return "spaces.test.local"

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
        ensure_tenant_domain(self.tenant, self.get_test_tenant_domain())
        domain = self.get_test_tenant_domain()
        self.client = make_tenant_client(self.tenant, domain)

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
            end_hour=10,
            end_minute=55,
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
            end_hour=10,
            end_minute=55,
        )
        self.object.stock_total = 2
        self.object.save(update_fields=["stock_total"])
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
            end_hour=10,
            end_minute=55,
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
            end_hour=10,
            end_minute=55,
        )
        second_start, second_end = self._build_slot(
            day_offset=1,
            start_hour=11,
            start_minute=0,
            end_hour=11,
            end_minute=55,
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

    def test_rejects_duration_different_from_fixed_slot(self):
        start_time, end_time = self._build_slot(
            day_offset=1,
            start_hour=10,
            start_minute=0,
            end_hour=11,
            end_minute=55,
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
        self.assertIn("exactamente 55 minutos", response.json()["detail"].lower())

    def test_availability_returns_slots_and_existing_reservations(self):
        start_time, end_time = self._build_slot(
            day_offset=1,
            start_hour=10,
            start_minute=0,
            end_hour=10,
            end_minute=55,
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
        self.assertEqual(target_slot["status"], "occupied")

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

    def test_admin_rentals_overdue_in_progress_are_reported_in_completed(self):
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
        self.assertIn("completed", payload)
        self.assertEqual(len(payload["completed"]), 1)
        self.assertEqual(payload["completed"][0]["id"], overdue_rental.id)
        self.assertEqual(payload["completed"][0]["is_overdue"], True)
        self.assertGreaterEqual(payload["completed"][0]["overdue_minutes"], 20)

    def test_reservation_reminders_only_include_upcoming_within_one_hour(self):
        now = timezone.now()
        upcoming_start = now + timedelta(minutes=45)
        upcoming_end = upcoming_start + timedelta(hours=1)
        later_start = now + timedelta(hours=2)
        later_end = later_start + timedelta(hours=1)
        active_start = now - timedelta(minutes=10)
        active_end = active_start + timedelta(hours=1)

        ObjectRental.objects.create(
            object=self.object,
            user=self.user,
            start_date=upcoming_start,
            end_date=upcoming_end,
        )
        ObjectRental.objects.create(
            object=self.object,
            user=self.user,
            start_date=later_start,
            end_date=later_end,
        )
        ObjectRental.objects.create(
            object=self.object,
            user=self.user,
            start_date=active_start,
            end_date=active_end,
        )

        response = self.client.get("/api/my-reservations/reminders/")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(len(payload), 1)
        self.assertIn("Taladro", payload[0]["title"])

    def test_user_reservations_list_only_returns_requesting_user(self):
        now = timezone.now()
        own_rental = ObjectRental.objects.create(
            object=self.object,
            user=self.user,
            start_date=now + timedelta(hours=1),
            end_date=now + timedelta(hours=1, minutes=55),
            status="ACTIVE",
        )
        ObjectRental.objects.create(
            object=self.object,
            user=self.other_user,
            start_date=now + timedelta(hours=2),
            end_date=now + timedelta(hours=2, minutes=55),
            status="ACTIVE",
        )

        response = self.client.get("/api/my-reservations/")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(len(payload), 1)
        self.assertEqual(payload[0]["rental"]["id"], own_rental.id)

    def test_admin_cancel_active_rental_with_reason(self):
        start_time, end_time = self._build_slot(
            day_offset=1,
            start_hour=10,
            start_minute=0,
            end_hour=10,
            end_minute=55,
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
            f"/api/objects/{self.object.id}/rentals/{rental.id}/admin-cancel/",
            data={"reason": "Incidencia operativa"},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        rental.refresh_from_db()
        self.assertEqual(rental.status, "CANCELLED")
        self.assertEqual(rental.admin_cancelled_reason, "Incidencia operativa")
        self.assertEqual(rental.admin_cancelled_by_id, self.admin_user.id)

    def test_admin_object_rentals_groups_statuses(self):
        now = timezone.now()
        active_rental = ObjectRental.objects.create(
            object=self.object,
            user=self.user,
            start_date=now + timedelta(hours=2),
            end_date=now + timedelta(hours=2, minutes=55),
            status="ACTIVE",
        )
        in_progress_rental = ObjectRental.objects.create(
            object=self.object,
            user=self.other_user,
            start_date=now - timedelta(minutes=20),
            end_date=now + timedelta(minutes=35),
            status="IN_PROGRESS",
        )
        completed_rental = ObjectRental.objects.create(
            object=self.object,
            user=self.user,
            start_date=now - timedelta(hours=3),
            end_date=now - timedelta(hours=2, minutes=5),
            status="COMPLETED",
        )
        cancelled_rental = ObjectRental.objects.create(
            object=self.object,
            user=self.other_user,
            start_date=now + timedelta(hours=4),
            end_date=now + timedelta(hours=4, minutes=55),
            status="CANCELLED",
        )

        self.client.force_login(self.admin_user)
        response = self.client.get(f"/api/objects/{self.object.id}/rentals/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["active"][0]["id"], active_rental.id)
        self.assertEqual(payload["in_progress"][0]["id"], in_progress_rental.id)
        self.assertEqual(payload["completed"][0]["id"], completed_rental.id)
        self.assertEqual(payload["cancelled"][0]["id"], cancelled_rental.id)

    def test_admin_label_create_requires_unique_name_per_residence(self):
        self.client.force_login(self.admin_user)

        first = self.client.post(
            "/api/objects/labels/",
            data={"name": "Deportes"},
            content_type="application/json",
        )
        duplicate = self.client.post(
            "/api/objects/labels/",
            data={"name": "Deportes"},
            content_type="application/json",
        )

        self.assertEqual(first.status_code, 201)
        self.assertEqual(duplicate.status_code, 400)
        self.assertIn("ya existe", duplicate.json()["detail"].lower())

    def test_admin_delete_label_success(self):
        label = ObjectLabel.objects.create(residence=self.residence, name="Gaming")

        self.client.force_login(self.admin_user)
        response = self.client.delete(f"/api/objects/labels/{label.id}/")

        self.assertEqual(response.status_code, 204)
        self.assertFalse(ObjectLabel.objects.filter(id=label.id).exists())

    def test_admin_notifications_returns_upcoming_reservations(self):
        now = timezone.now()
        own_rental = ObjectRental.objects.create(
            object=self.object,
            user=self.admin_user,
            start_date=now + timedelta(minutes=20),
            end_date=now + timedelta(hours=1, minutes=15),
            status="ACTIVE",
        )
        other_rental = ObjectRental.objects.create(
            object=self.object,
            user=self.user,
            start_date=now + timedelta(minutes=30),
            end_date=now + timedelta(hours=1, minutes=25),
            status="ACTIVE",
        )

        self.client.force_login(self.admin_user)
        response = self.client.get("/api/admin/objects/notifications/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(len(payload), 1)
        self.assertEqual(payload[0]["id"], other_rental.id)
        self.assertIn("Taladro", payload[0]["title"])

    def test_sync_started_rentals_for_residence_moves_active_to_in_progress(self):
        now = timezone.now()
        started = ObjectRental.objects.create(
            object=self.object,
            user=self.user,
            start_date=now - timedelta(minutes=10),
            end_date=now + timedelta(minutes=45),
            status="ACTIVE",
        )
        future = ObjectRental.objects.create(
            object=self.object,
            user=self.user,
            start_date=now + timedelta(minutes=10),
            end_date=now + timedelta(hours=1, minutes=5),
            status="ACTIVE",
        )
        cancelled = ObjectRental.objects.create(
            object=self.object,
            user=self.user,
            start_date=now - timedelta(minutes=30),
            end_date=now + timedelta(minutes=25),
            status="CANCELLED",
        )

        _sync_started_rentals_for_residence(self.residence)

        started.refresh_from_db()
        future.refresh_from_db()
        cancelled.refresh_from_db()
        self.assertEqual(started.status, "IN_PROGRESS")
        self.assertEqual(future.status, "ACTIVE")
        self.assertEqual(cancelled.status, "CANCELLED")

    def test_serialize_object_counts_stock_with_five_minute_return_buffer(self):
        now = timezone.now().replace(second=0, microsecond=0)
        obj = Object.objects.create(
            name="Cámara",
            description="Con buffer",
            location="Armario",
            residence=self.residence,
            available=True,
            stock_total=3,
        )

        ObjectRental.objects.create(
            object=obj,
            user=self.user,
            start_date=now - timedelta(minutes=20),
            end_date=now + timedelta(minutes=35),
            status="IN_PROGRESS",
        )
        ObjectRental.objects.create(
            object=obj,
            user=self.other_user,
            start_date=now - timedelta(minutes=70),
            end_date=now - timedelta(minutes=4),
            status="ACTIVE",
        )
        ObjectRental.objects.create(
            object=obj,
            user=self.admin_user,
            start_date=now - timedelta(minutes=80),
            end_date=now - timedelta(minutes=6),
            status="ACTIVE",
        )

        payload = _serialize_object(obj)
        self.assertEqual(payload["current_reserved_stock"], 2)
        self.assertEqual(payload["current_available_stock"], 1)
