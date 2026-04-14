from types import SimpleNamespace
from datetime import datetime, timedelta, time

from django.utils import timezone
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from django.test import RequestFactory
from django_tenants.test.cases import FastTenantTestCase

from apps.residences.models import Residence, ResidenceDomain
from apps.spaces import permissions as spaces_permissions
from apps.spaces.views import (
    _parse_request_datetime,
    _build_occupancy_events,
    _build_reservation_reminders,
    _compute_available_slots,
    _is_capacity_reached,
    SpaceListView,
    SpaceAvailabilityView,
    SpaceReservationCreateView,
    MyReservationsView,
    MyReservationRemindersView,
    SpaceReservationCancelView,
    AdminSpaceDetailView,
    AdminSpaceNotificationsView,
)
from apps.spaces.models import CommonSpace, SpaceReservation
from apps.membership.models import Membership, Role


class PermissionsAndUtilsTests(FastTenantTestCase):
    @classmethod
    def get_test_tenant_domain(cls):
        return "spaces.perms.test.local"

    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Tenant Spaces Perms"
        tenant.slug = "tenant-spaces-perms"
        tenant.is_active = True

    @classmethod
    def setup_domain(cls, domain):
        domain.domain = cls.get_test_tenant_domain()
        domain.is_primary = True

    def setUp(self):
        super().setUp()
        self.factory = RequestFactory()
        User = get_user_model()
        self.user = User.objects.create_user(username="permuser", email="p@t.local")

        self.residence = Residence.objects.create(
            name="Residencia Perms",
            slug="residencia-perms",
            code="RP-001",
            timezone="Europe/Madrid",
            is_active=True,
        )
        ResidenceDomain.objects.create(
            residence=self.residence,
            domain=self.get_test_tenant_domain(),
            is_primary=True,
            is_active=True,
        )

    def test_is_reservations_admin_false_for_unauthenticated(self):
        class FakeUser:
            is_authenticated = False

        self.assertFalse(spaces_permissions.is_reservations_admin(FakeUser(), self.residence))

    def test_is_spaces_admin_safe_method_excludes_student(self):
        student_role = Role.objects.create(name="Student", description="", is_system_default=True, residence=None)
        Membership.objects.create(user=self.user, role=student_role, residence=self.residence, is_active=True)

        req = SimpleNamespace()
        req.user = self.user
        req.method = 'GET'
        req.residence = self.residence

        perm = spaces_permissions.IsSpacesAdmin()
        self.assertFalse(perm.has_permission(req, None))

    def test_is_spaces_admin_safe_method_allows_non_student(self):
        admin_role = Role.objects.create(name="Admin", description="", is_system_default=False, residence=None)
        Membership.objects.create(user=self.user, role=admin_role, residence=self.residence, is_active=True)

        req = SimpleNamespace()
        req.user = self.user
        req.method = 'GET'
        req.residence = self.residence

        perm = spaces_permissions.IsSpacesAdmin()
        self.assertTrue(perm.has_permission(req, None))

    def test_is_spaces_admin_unsafe_delegates_to_has_screen_permission(self):
        original = spaces_permissions.has_screen_permission

        try:
            spaces_permissions.has_screen_permission = lambda u, r, s: True
            req = SimpleNamespace()
            req.user = self.user
            req.method = 'POST'
            req.residence = self.residence

            perm = spaces_permissions.IsSpacesAdmin()
            self.assertTrue(perm.has_permission(req, None))

            spaces_permissions.has_screen_permission = lambda u, r, s: False
            self.assertFalse(perm.has_permission(req, None))
        finally:
            spaces_permissions.has_screen_permission = original

    def test_parse_request_datetime_returns_aware_or_none(self):
        s = timezone.now().replace(hour=12, minute=0, second=0, microsecond=0).isoformat()
        parsed = _parse_request_datetime(s)
        self.assertIsNotNone(parsed)
        self.assertIsNotNone(parsed.tzinfo)
        self.assertIsNone(_parse_request_datetime("not-a-date"))

    def test_build_occupancy_events_and_capacity_checks(self):
        space = CommonSpace.objects.create(
            name="Sala Test",
            capacity=2,
            is_active=True,
            open_time=time(0, 0),
            close_time=time(23, 59),
            residence=self.residence,
        )

        now = timezone.now()
        r1 = SpaceReservation.objects.create(
            space=space, user=self.user, residence=self.residence,
            start_time=now + timedelta(minutes=10), end_time=now + timedelta(minutes=70)
        )
        user2 = get_user_model().objects.create_user(username="u2")
        r2 = SpaceReservation.objects.create(
            space=space, user=user2, residence=self.residence,
            start_time=now + timedelta(minutes=30), end_time=now + timedelta(minutes=90)
        )

        window_start = now
        window_end = now + timedelta(hours=2)

        events = _build_occupancy_events(reservations=[r1, r2], window_start=window_start, window_end=window_end)
        self.assertEqual(len(events), 4)
        self.assertTrue(events[0][0] <= events[1][0])

        start_interval = now + timedelta(minutes=20)
        end_interval = now + timedelta(minutes=40)
        self.assertTrue(
            _is_capacity_reached(reservations=[r1, r2], interval_start=start_interval, interval_end=end_interval, capacity=2)
        )

        self.assertTrue(
            _is_capacity_reached(reservations=[r1, r2], interval_start=start_interval, interval_end=end_interval, capacity=1)
        )

    def test_is_reservations_admin_returns_false_for_none_user(self):
        self.assertFalse(spaces_permissions.is_reservations_admin(None, self.residence))

    def test_is_spaces_admin_permission_denied_when_residence_missing(self):
        req = SimpleNamespace()
        req.user = self.user
        req.method = 'GET'
        req.residence = None

        perm = spaces_permissions.IsSpacesAdmin()
        self.assertFalse(perm.has_permission(req, None))

    def test_is_spaces_admin_permission_denied_when_user_not_authenticated(self):
        class FakeUser:
            is_authenticated = False

        req = SimpleNamespace()
        req.user = FakeUser()
        req.method = 'GET'
        req.residence = self.residence

        perm = spaces_permissions.IsSpacesAdmin()
        self.assertFalse(perm.has_permission(req, None))

    def test_parse_request_datetime_naive_converts_to_aware(self):
        from datetime import datetime
        naive_dt = datetime(2024, 4, 15, 14, 30, 0)
        parsed = _parse_request_datetime(naive_dt.isoformat())
        self.assertIsNotNone(parsed)
        self.assertIsNotNone(parsed.tzinfo)

    def test_is_capacity_reached_with_no_reservations_returns_false(self):
        from datetime import datetime
        now = timezone.now()
        start = now + timedelta(hours=1)
        end = start + timedelta(hours=1)
        
        result = _is_capacity_reached(
            reservations=[],
            interval_start=start,
            interval_end=end,
            capacity=5
        )
        self.assertFalse(result)

    def test_is_capacity_reached_with_zero_capacity_uses_default(self):
        space = CommonSpace.objects.create(
            name="Sala Zero Cap",
            capacity=0,
            is_active=True,
            open_time=time(0, 0),
            close_time=time(23, 59),
            residence=self.residence,
        )
        
        now = timezone.now()
        r1 = SpaceReservation.objects.create(
            space=space, user=self.user, residence=self.residence,
            start_time=now + timedelta(minutes=10), end_time=now + timedelta(minutes=70)
        )
        
        start_interval = now + timedelta(minutes=20)
        end_interval = now + timedelta(minutes=40)
        
        result = _is_capacity_reached(
            reservations=[r1],
            interval_start=start_interval,
            interval_end=end_interval,
            capacity=0
        )
        self.assertTrue(result)

    def test_build_occupancy_events_with_overlapping_window(self):
        space = CommonSpace.objects.create(
            name="Sala Window",
            capacity=1,
            is_active=True,
            open_time=time(0, 0),
            close_time=time(23, 59),
            residence=self.residence,
        )
        
        now = timezone.now()
        r1 = SpaceReservation.objects.create(
            space=space, user=self.user, residence=self.residence,
            start_time=now + timedelta(minutes=100), 
            end_time=now + timedelta(minutes=120)
        )
        
        window_start = now
        window_end = now + timedelta(minutes=50)
        
        events = _build_occupancy_events(
            reservations=[r1],
            window_start=window_start,
            window_end=window_end
        )
        self.assertEqual(len(events), 0)

    def test_authenticated_view_returns_401_when_no_credentials(self):
        request = self.factory.get("/api/spaces/")
        request.user = AnonymousUser()
        request.residence = self.residence

        response = SpaceListView.as_view()(request)

        self.assertEqual(response.status_code, 401)
        self.assertIn("Authentication credentials", response.content.decode())

    def test_authenticated_view_returns_401_when_jwt_user_not_found(self):
        request = self.factory.get("/api/spaces/")
        request.user = AnonymousUser()
        request.residence = self.residence

        from apps.spaces import views as spaces_views

        original_resolve = spaces_views.resolve_user_from_request
        try:
            spaces_views.resolve_user_from_request = lambda req: {"id": 999999}
            response = SpaceListView.as_view()(request)
        finally:
            spaces_views.resolve_user_from_request = original_resolve

        self.assertEqual(response.status_code, 401)
        self.assertIn("User not found", response.content.decode())

    def test_authenticated_view_uses_resolved_jwt_user_when_present(self):
        request = self.factory.get("/api/spaces/")
        request.user = AnonymousUser()
        request.residence = self.residence

        from apps.spaces import views as spaces_views

        original_resolve = spaces_views.resolve_user_from_request
        try:
            spaces_views.resolve_user_from_request = lambda req: {"id": self.user.id}
            response = SpaceListView.as_view()(request)
        finally:
            spaces_views.resolve_user_from_request = original_resolve

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content.decode(), "[]")

    def test_build_reservation_reminders_returns_sorted_payload(self):
        space = CommonSpace.objects.create(
            name="Sala Reminder",
            capacity=2,
            is_active=True,
            open_time=time(8, 0),
            close_time=time(22, 0),
            residence=self.residence,
        )

        later = SpaceReservation.objects.create(
            space=space,
            user=self.user,
            residence=self.residence,
            start_time=timezone.now() + timedelta(minutes=50),
            end_time=timezone.now() + timedelta(minutes=80),
        )
        earlier = SpaceReservation.objects.create(
            space=space,
            user=self.user,
            residence=self.residence,
            start_time=timezone.now() + timedelta(minutes=20),
            end_time=timezone.now() + timedelta(minutes=40),
        )

        reminders = _build_reservation_reminders([later, earlier])

        self.assertEqual(len(reminders), 2)
        self.assertEqual(reminders[0]["id"], f"space-reservations-{earlier.id}")
        self.assertIn("Sala Reminder", reminders[0]["title"])
        self.assertEqual(reminders[0]["start_time"], earlier.start_time.isoformat())

    def test_compute_available_slots_marks_available_and_occupied_slots(self):
        space = CommonSpace.objects.create(
            name="Sala Slots",
            capacity=1,
            is_active=True,
            open_time=time(10, 0),
            close_time=time(12, 0),
            reservation_interval_minutes=60,
            residence=self.residence,
        )

        target_date = (timezone.now() + timedelta(days=1)).date()
        reserved_start = timezone.make_aware(
            datetime.combine(target_date, time(11, 0)),
            timezone.get_current_timezone(),
        )
        reserved_end = timezone.make_aware(
            datetime.combine(target_date, time(12, 0)),
            timezone.get_current_timezone(),
        )
        reservation = SpaceReservation.objects.create(
            space=space,
            user=self.user,
            residence=self.residence,
            start_time=reserved_start,
            end_time=reserved_end,
        )

        slots = _compute_available_slots(
            target_date=target_date,
            space=space,
            reservations=[reservation],
        )

        self.assertEqual(len(slots), 2)
        self.assertEqual([slot["status"] for slot in slots], ["available", "occupied"])
        self.assertEqual(slots[0]["start_time"], reserved_start.replace(hour=10).isoformat())

    def test_views_return_400_when_residence_missing(self):
        request_list = self.factory.get("/api/spaces/")
        request_list.user = self.user
        request_list.residence = None

        request_availability = self.factory.get("/api/spaces/1/availability/?date=2026-01-01")
        request_availability.user = self.user
        request_availability.residence = None

        request_create = self.factory.post(
            "/api/spaces/1/reservations/",
            data="{}",
            content_type="application/json",
        )
        request_create.user = self.user
        request_create.residence = None

        request_my = self.factory.get("/api/spaces/reservations/me/")
        request_my.user = self.user
        request_my.residence = None

        request_rem = self.factory.get("/api/spaces/reservations/reminders/")
        request_rem.user = self.user
        request_rem.residence = None

        request_cancel = self.factory.post("/api/spaces/reservations/1/cancel/")
        request_cancel.user = self.user
        request_cancel.residence = None

        list_response = SpaceListView.as_view()(request_list)
        availability_response = SpaceAvailabilityView.as_view()(request_availability, space_id=1)
        create_response = SpaceReservationCreateView.as_view()(request_create, space_id=1)
        my_response = MyReservationsView.as_view()(request_my)
        reminders_response = MyReservationRemindersView.as_view()(request_rem)
        cancel_response = SpaceReservationCancelView.as_view()(request_cancel, reservation_id=1)

        self.assertEqual(list_response.status_code, 400)
        self.assertEqual(availability_response.status_code, 400)
        self.assertEqual(create_response.status_code, 400)
        self.assertEqual(my_response.status_code, 400)
        self.assertEqual(reminders_response.status_code, 400)
        self.assertEqual(cancel_response.status_code, 400)

    def test_admin_views_return_403_when_residence_missing(self):
        request_detail = self.factory.get("/api/admin/spaces/1/")
        request_detail.user = self.user
        request_detail.residence = None

        request_notifications = self.factory.get("/api/admin/spaces/notifications/")
        request_notifications.user = self.user
        request_notifications.residence = None

        from apps.spaces import views as spaces_views

        original_is_admin = spaces_views.is_reservations_admin
        try:
            spaces_views.is_reservations_admin = lambda user, residence: True
            detail_response = AdminSpaceDetailView.as_view()(request_detail, space_id=1)
            notifications_response = AdminSpaceNotificationsView.as_view()(request_notifications)
        finally:
            spaces_views.is_reservations_admin = original_is_admin

        self.assertEqual(detail_response.status_code, 403)
        self.assertEqual(notifications_response.status_code, 403)
