from types import SimpleNamespace
from datetime import timedelta, time

from django.utils import timezone
from django.contrib.auth import get_user_model
from django_tenants.test.cases import FastTenantTestCase

from apps.residences.models import Residence, ResidenceDomain
from apps.spaces import permissions as spaces_permissions
from apps.spaces.views import _parse_request_datetime, _build_occupancy_events, _is_capacity_reached
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
