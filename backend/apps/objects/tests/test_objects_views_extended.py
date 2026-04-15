"""Extended coverage tests for apps/objects/views.py"""
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from django_tenants.test.cases import FastTenantTestCase
from django_tenants.test.client import TenantClient

from apps.objects.models import Object, ObjectLabel, ObjectRental
from apps.residences.models import Residence, ResidenceDomain


class ObjectViewsExtendedTests(FastTenantTestCase):
    """Covers views not exercised by existing tests."""

    @classmethod
    def get_test_schema_name(cls):
        return "fast_test_objects_ext"

    @classmethod
    def get_test_tenant_domain(cls):
        return "objects-ext.test.local"

    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Tenant Objects Extended"
        tenant.slug = "tenant-objects-ext"
        tenant.is_active = True
        tenant.on_trial = True

    @classmethod
    def setup_domain(cls, domain):
        domain.domain = cls.get_test_tenant_domain()
        domain.is_primary = True

    def setUp(self):
        super().setUp()
        user_model = get_user_model()

        self.admin = user_model.objects.create_user(
            username="obj-admin",
            email="obj-admin@test.local",
            password="demo1234",  # NOSONAR
            is_staff=True,
        )
        self.user = user_model.objects.create_user(
            username="obj-user",
            email="obj-user@test.local",
            password="demo1234",  # NOSONAR
        )
        self.other = user_model.objects.create_user(
            username="obj-other",
            email="obj-other@test.local",
            password="demo1234",  # NOSONAR
        )

        self.residence = Residence.objects.create(
            name="Residencia Ext",
            slug="residencia-ext",
            code="RE-001",
            timezone="Europe/Madrid",
            is_active=True,
        )
        ResidenceDomain.objects.create(
            residence=self.residence,
            domain=self.get_test_tenant_domain(),
            is_primary=True,
            is_active=True,
        )

        self.obj = Object.objects.create(
            name="Taladro",
            description="Desc",
            location="Almacén",
            residence=self.residence,
            available=True,
            stock_total=1,
        )
        self.multi_obj = Object.objects.create(
            name="Kit Herramientas",
            description="Stock múltiple",
            location="Sala",
            residence=self.residence,
            available=True,
            stock_total=5,
        )

        self.admin_client = TenantClient(self.tenant)
        self.admin_client.force_login(self.admin)

        self.user_client = TenantClient(self.tenant)
        self.user_client.force_login(self.user)

        self.other_client = TenantClient(self.tenant)
        self.other_client.force_login(self.other)

    # ── ObjectDetailView ──────────────────────────────────────────────────────

    def test_object_detail_get(self):
        response = self.user_client.get(f"/api/objects/{self.obj.id}/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["id"], self.obj.id)

    def test_object_detail_get_not_found(self):
        response = self.user_client.get("/api/objects/99999/")
        self.assertEqual(response.status_code, 404)

    def test_object_delete_as_admin(self):
        obj_to_delete = Object.objects.create(
            name="Borrable",
            description="",
            location="",
            residence=self.residence,
            available=True,
        )
        response = self.admin_client.delete(f"/api/objects/{obj_to_delete.id}/")
        self.assertEqual(response.status_code, 200)
        self.assertFalse(Object.objects.filter(id=obj_to_delete.id).exists())

    def test_object_delete_unauthorized(self):
        response = self.user_client.delete(f"/api/objects/{self.obj.id}/")
        self.assertEqual(response.status_code, 403)

    # ── ObjectAvailabilityView ────────────────────────────────────────────────

    def test_availability_missing_date_returns_400(self):
        response = self.user_client.get(f"/api/objects/{self.obj.id}/availability/")
        self.assertEqual(response.status_code, 400)

    def test_availability_invalid_date_returns_400(self):
        response = self.user_client.get(
            f"/api/objects/{self.obj.id}/availability/?date=not-a-date"
        )
        self.assertEqual(response.status_code, 400)

    # ── ObjectLabelListCreateView ─────────────────────────────────────────────

    def test_label_list_returns_empty(self):
        response = self.user_client.get("/api/objects/labels/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), [])

    def test_label_create_as_admin(self):
        response = self.admin_client.post(
            "/api/objects/labels/",
            data={"name": "Frágil"},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertTrue(ObjectLabel.objects.filter(name="Frágil", residence=self.residence).exists())

    def test_label_create_duplicate_returns_400(self):
        ObjectLabel.objects.create(name="Fragil", residence=self.residence)
        response = self.admin_client.post(
            "/api/objects/labels/",
            data={"name": "Fragil"},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)

    def test_label_create_too_long_returns_400(self):
        response = self.admin_client.post(
            "/api/objects/labels/",
            data={"name": "A" * 31},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)

    def test_label_create_empty_name_returns_400(self):
        response = self.admin_client.post(
            "/api/objects/labels/",
            data={"name": ""},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)

    def test_label_create_non_admin_returns_403(self):
        response = self.user_client.post(
            "/api/objects/labels/",
            data={"name": "Frágil"},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 403)

    # ── ObjectLabelDetailView ─────────────────────────────────────────────────

    def test_label_delete_as_admin(self):
        label = ObjectLabel.objects.create(name="Temporal", residence=self.residence)
        response = self.admin_client.delete(f"/api/objects/labels/{label.id}/")
        self.assertEqual(response.status_code, 204)
        self.assertFalse(ObjectLabel.objects.filter(id=label.id).exists())

    def test_label_delete_not_found(self):
        response = self.admin_client.delete("/api/objects/labels/99999/")
        self.assertEqual(response.status_code, 404)

    def test_label_delete_non_admin_returns_403(self):
        label = ObjectLabel.objects.create(name="Protegida", residence=self.residence)
        response = self.user_client.delete(f"/api/objects/labels/{label.id}/")
        self.assertEqual(response.status_code, 403)

    # ── ObjectCancelView – extra paths ────────────────────────────────────────

    def test_cancel_by_rental_id(self):
        now = timezone.now()
        rental = ObjectRental.objects.create(
            object=self.obj,
            user=self.user,
            start_date=now + timedelta(hours=1),
            end_date=now + timedelta(hours=1, minutes=55),
            status="ACTIVE",
        )
        response = self.user_client.post(
            f"/api/objects/{self.obj.id}/cancel/",
            data={"rental_id": rental.id},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        rental.refresh_from_db()
        self.assertEqual(rental.status, "CANCELLED")

    def test_cancel_no_active_rental_returns_400(self):
        response = self.user_client.post(
            f"/api/objects/{self.obj.id}/cancel/",
            data={},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)

    # ── ObjectRentalsView ─────────────────────────────────────────────────────

    def test_admin_rentals_view_returns_buckets(self):
        now = timezone.now()
        # ACTIVE future
        ObjectRental.objects.create(
            object=self.obj, user=self.user,
            start_date=now + timedelta(hours=2),
            end_date=now + timedelta(hours=2, minutes=55),
            status="ACTIVE",
        )
        # IN_PROGRESS (not overdue)
        ObjectRental.objects.create(
            object=self.multi_obj, user=self.user,
            start_date=now - timedelta(minutes=10),
            end_date=now + timedelta(minutes=45),
            status="IN_PROGRESS",
        )
        # CANCELLED
        ObjectRental.objects.create(
            object=self.obj, user=self.other,
            start_date=now - timedelta(hours=3),
            end_date=now - timedelta(hours=2, minutes=5),
            status="CANCELLED",
        )
        response = self.admin_client.get(f"/api/objects/{self.obj.id}/rentals/")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertIn("active", payload)
        self.assertIn("in_progress", payload)
        self.assertIn("cancelled", payload)
        self.assertIn("completed", payload)

    def test_admin_rentals_view_non_admin_returns_403(self):
        response = self.user_client.get(f"/api/objects/{self.obj.id}/rentals/")
        self.assertEqual(response.status_code, 403)

    def test_admin_rentals_completed_status_in_correct_bucket(self):
        now = timezone.now()
        ObjectRental.objects.create(
            object=self.obj, user=self.user,
            start_date=now - timedelta(hours=2),
            end_date=now - timedelta(hours=1, minutes=5),
            status="COMPLETED",
        )
        response = self.admin_client.get(f"/api/objects/{self.obj.id}/rentals/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()["completed"]), 1)

    # ── ObjectAdminCancelRentalView ───────────────────────────────────────────

    def _create_active_future_rental(self, user=None):
        now = timezone.now()
        return ObjectRental.objects.create(
            object=self.obj,
            user=user or self.user,
            start_date=now + timedelta(hours=2),
            end_date=now + timedelta(hours=2, minutes=55),
            status="ACTIVE",
        )

    def test_admin_cancel_active_rental(self):
        rental = self._create_active_future_rental()
        response = self.admin_client.post(
            f"/api/objects/{self.obj.id}/rentals/{rental.id}/admin-cancel/",
            data={"reason": "Mantenimiento programado"},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        rental.refresh_from_db()
        self.assertEqual(rental.status, "CANCELLED")
        self.assertEqual(rental.admin_cancelled_by, self.admin)
        self.assertIsNotNone(rental.admin_cancelled_at)

    def test_admin_cancel_requires_reason(self):
        rental = self._create_active_future_rental()
        response = self.admin_client.post(
            f"/api/objects/{self.obj.id}/rentals/{rental.id}/admin-cancel/",
            data={"reason": ""},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)

    def test_admin_cancel_reason_too_long(self):
        rental = self._create_active_future_rental()
        response = self.admin_client.post(
            f"/api/objects/{self.obj.id}/rentals/{rental.id}/admin-cancel/",
            data={"reason": "x" * 201},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)

    def test_admin_cancel_completed_rental_rejected(self):
        now = timezone.now()
        rental = ObjectRental.objects.create(
            object=self.obj, user=self.user,
            start_date=now - timedelta(hours=2),
            end_date=now - timedelta(hours=1),
            status="COMPLETED",
        )
        response = self.admin_client.post(
            f"/api/objects/{self.obj.id}/rentals/{rental.id}/admin-cancel/",
            data={"reason": "Motivo"},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)

    def test_admin_cancel_in_progress_rental_rejected(self):
        now = timezone.now()
        rental = ObjectRental.objects.create(
            object=self.obj, user=self.user,
            start_date=now - timedelta(minutes=10),
            end_date=now + timedelta(minutes=45),
            status="IN_PROGRESS",
        )
        response = self.admin_client.post(
            f"/api/objects/{self.obj.id}/rentals/{rental.id}/admin-cancel/",
            data={"reason": "Motivo"},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)

    def test_admin_cancel_already_cancelled_rejected(self):
        now = timezone.now()
        rental = ObjectRental.objects.create(
            object=self.obj, user=self.user,
            start_date=now + timedelta(hours=2),
            end_date=now + timedelta(hours=2, minutes=55),
            status="CANCELLED",
        )
        response = self.admin_client.post(
            f"/api/objects/{self.obj.id}/rentals/{rental.id}/admin-cancel/",
            data={"reason": "Motivo"},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)

    def test_admin_cancel_not_found_returns_404(self):
        response = self.admin_client.post(
            f"/api/objects/{self.obj.id}/rentals/99999/admin-cancel/",
            data={"reason": "Motivo"},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 404)

    def test_admin_cancel_non_admin_returns_403(self):
        rental = self._create_active_future_rental()
        response = self.user_client.post(
            f"/api/objects/{self.obj.id}/rentals/{rental.id}/admin-cancel/",
            data={"reason": "Motivo"},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 403)

    # ── UserReservationsView ──────────────────────────────────────────────────

    def test_user_reservations_empty(self):
        response = self.user_client.get("/api/my-reservations/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), [])

    def test_user_reservations_includes_active(self):
        now = timezone.now()
        rental = ObjectRental.objects.create(
            object=self.obj, user=self.user,
            start_date=now + timedelta(hours=1),
            end_date=now + timedelta(hours=1, minutes=55),
            status="ACTIVE",
        )
        response = self.user_client.get("/api/my-reservations/")
        self.assertEqual(response.status_code, 200)
        ids = [item["rental"]["id"] for item in response.json()]
        self.assertIn(rental.id, ids)

    def test_user_reservations_includes_cancelled_undismissed(self):
        now = timezone.now()
        rental = ObjectRental.objects.create(
            object=self.obj, user=self.user,
            start_date=now - timedelta(hours=3),
            end_date=now - timedelta(hours=2, minutes=5),
            status="CANCELLED",
            user_dismissed_at=None,
        )
        response = self.user_client.get("/api/my-reservations/")
        self.assertEqual(response.status_code, 200)
        ids = [item["rental"]["id"] for item in response.json()]
        self.assertIn(rental.id, ids)

    # ── UserDismissReservationView ────────────────────────────────────────────

    def test_dismiss_cancelled_rental(self):
        now = timezone.now()
        rental = ObjectRental.objects.create(
            object=self.obj, user=self.user,
            start_date=now - timedelta(hours=3),
            end_date=now - timedelta(hours=2, minutes=5),
            status="CANCELLED",
        )
        response = self.user_client.post(f"/api/my-reservations/{rental.id}/dismiss/")
        self.assertEqual(response.status_code, 200)
        rental.refresh_from_db()
        self.assertIsNotNone(rental.user_dismissed_at)

    def test_dismiss_active_rental_returns_400(self):
        now = timezone.now()
        rental = ObjectRental.objects.create(
            object=self.obj, user=self.user,
            start_date=now + timedelta(hours=1),
            end_date=now + timedelta(hours=1, minutes=55),
            status="ACTIVE",
        )
        response = self.user_client.post(f"/api/my-reservations/{rental.id}/dismiss/")
        self.assertEqual(response.status_code, 400)

    def test_dismiss_not_found_returns_404(self):
        response = self.user_client.post("/api/my-reservations/99999/dismiss/")
        self.assertEqual(response.status_code, 404)

    # ── AdminAllObjectRentalsView ─────────────────────────────────────────────

    def test_admin_all_rentals_empty(self):
        response = self.admin_client.get("/api/admin/objects/rentals/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), [])

    def test_admin_all_rentals_returns_data(self):
        now = timezone.now()
        ObjectRental.objects.create(
            object=self.obj, user=self.user,
            start_date=now + timedelta(hours=1),
            end_date=now + timedelta(hours=1, minutes=55),
        )
        response = self.admin_client.get("/api/admin/objects/rentals/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 1)
        self.assertIn("object", response.json()[0])

    def test_admin_all_rentals_non_admin_returns_403(self):
        response = self.user_client.get("/api/admin/objects/rentals/")
        self.assertEqual(response.status_code, 403)

    # ── AdminObjectNotificationsView ──────────────────────────────────────────

    def test_admin_notifications_empty(self):
        response = self.admin_client.get("/api/admin/objects/notifications/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), [])

    def test_admin_notifications_includes_active_rentals(self):
        now = timezone.now()
        ObjectRental.objects.create(
            object=self.obj, user=self.user,
            start_date=now + timedelta(hours=1),
            end_date=now + timedelta(hours=1, minutes=55),
            status="ACTIVE",
        )
        response = self.admin_client.get("/api/admin/objects/notifications/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 1)

    def test_admin_notifications_non_admin_returns_403(self):
        response = self.user_client.get("/api/admin/objects/notifications/")
        self.assertEqual(response.status_code, 403)

    # ── UserPendingRemindersCountView ─────────────────────────────────────────

    def test_pending_reminders_count_zero(self):
        response = self.user_client.get("/api/my-reservations/reminders/unread-count/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["count"], 0)

    def test_pending_reminders_count_with_upcoming(self):
        now = timezone.now()
        # Rental ending in 10 minutes falls inside the 15-min reminder window
        ObjectRental.objects.create(
            object=self.obj, user=self.user,
            start_date=now - timedelta(minutes=45),
            end_date=now + timedelta(minutes=10),
            status="IN_PROGRESS",
            reminder_viewed_at=None,
        )
        response = self.user_client.get("/api/my-reservations/reminders/unread-count/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["count"], 1)

    # ── UserMarkRemindersAsViewedView ─────────────────────────────────────────

    def test_mark_reminders_as_viewed(self):
        now = timezone.now()
        # Rental ending in 10 minutes falls inside the 15-min reminder window
        ObjectRental.objects.create(
            object=self.obj, user=self.user,
            start_date=now - timedelta(minutes=45),
            end_date=now + timedelta(minutes=10),
            status="IN_PROGRESS",
            reminder_viewed_at=None,
        )
        response = self.user_client.post("/api/my-reservations/reminders/mark-as-viewed/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["marked_count"], 1)

    def test_mark_reminders_as_viewed_no_reminders(self):
        response = self.user_client.post("/api/my-reservations/reminders/mark-as-viewed/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["marked_count"], 0)

    # ── UserObjectNotificationsView ───────────────────────────────────────────

    def test_user_notifications_no_blocked_stock(self):
        response = self.user_client.get("/api/objects/notifications/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), [])

    def test_user_notifications_blocked_stock_triggers_notification(self):
        """All stock IN_PROGRESS overdue → user's reservation gets a notification."""
        now = timezone.now()
        # Other user holds the only unit and it's overdue
        ObjectRental.objects.create(
            object=self.obj,
            user=self.other,
            start_date=now - timedelta(hours=2),
            end_date=now - timedelta(minutes=10),
            status="IN_PROGRESS",
        )
        # User has a reservation starting very soon (within grace window)
        grace_deadline = now - timedelta(minutes=OBJECT_RESERVATION_GAP_MINUTES_VALUE)
        user_rental = ObjectRental.objects.create(
            object=self.obj,
            user=self.user,
            start_date=now + timedelta(minutes=1),
            end_date=now + timedelta(minutes=1, seconds=55 * 60),
            status="ACTIVE",
        )
        response = self.user_client.get("/api/objects/notifications/")
        self.assertEqual(response.status_code, 200)
        # The notification should fire because blocking_overdue_count(1) >= stock_total(1)
        payload = response.json()
        self.assertEqual(len(payload), 1)
        self.assertIn("Taladro", payload[0]["title"])

    # ── ObjectReserveView – missing date branches ─────────────────────────────

    def test_reserve_missing_dates_returns_400(self):
        response = self.user_client.post(
            f"/api/objects/{self.obj.id}/reserve/",
            data={},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("requeridos", response.json()["detail"].lower())

    def test_reserve_stock_exhausted_returns_400(self):
        now = timezone.now()
        # Fill the only stock unit with an existing IN_PROGRESS rental
        ObjectRental.objects.create(
            object=self.obj,
            user=self.other,
            start_date=now - timedelta(minutes=5),
            end_date=now + timedelta(minutes=50),
            status="IN_PROGRESS",
        )
        # User tries to reserve the same slot
        target_start = now.replace(minute=0, second=0, microsecond=0) + timedelta(hours=1)
        target_end = target_start + timedelta(minutes=55)
        response = self.user_client.post(
            f"/api/objects/{self.obj.id}/reserve/",
            data={
                "start_date": target_start.isoformat(),
                "end_date": target_end.isoformat(),
            },
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)


# Used by the notification test to compute the grace window
from apps.objects.views import OBJECT_RESERVATION_GAP_MINUTES as OBJECT_RESERVATION_GAP_MINUTES_VALUE  # noqa: E402
