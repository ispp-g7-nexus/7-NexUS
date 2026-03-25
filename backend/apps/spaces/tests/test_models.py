from datetime import time

from django.db import IntegrityError
from django_tenants.test.cases import FastTenantTestCase
from django_tenants.test.client import TenantClient

from apps.residences.models import Residence, ResidenceDomain
from apps.spaces.models import CommonSpace, SpaceReservation


class CommonSpaceModelTests(FastTenantTestCase):
    
    @classmethod
    def get_test_tenant_domain(cls):
        return "spaces.test.local"

    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Tenant Spaces Models"
        tenant.slug = "tenant-spaces-models"
        tenant.is_active = True
        tenant.on_trial = True

    @classmethod
    def setup_domain(cls, domain):
        domain.domain = cls.get_test_tenant_domain()
        domain.is_primary = True

    def setUp(self):
        super().setUp()
        domain = self.get_test_tenant_domain()
        self.client = TenantClient(self.tenant, SERVER_NAME=domain, HTTP_HOST=domain)
        self.client.defaults["HTTP_HOST"] = domain
        try:
            self.client.tenant = self.tenant
        except Exception:
            pass
        self.client.defaults["HTTP_X_TEST_TENANT"] = self.tenant.slug

        self.residence = Residence.objects.create(
            name="Residencia Models",
            slug="residencia-models",
            code="RM-001",
            timezone="Europe/Madrid",
            is_active=True,
        )
        ResidenceDomain.objects.create(
            residence=self.residence,
            domain=self.get_test_tenant_domain(),
            is_primary=True,
            is_active=True,
        )

    def test_common_space_str_includes_name_and_residence(self):
        space = CommonSpace.objects.create(
            name="Sala A",
            description="",
            capacity=4,
            is_active=True,
            open_time=time(8, 0),
            close_time=time(20, 0),
            residence=self.residence,
        )

        text = str(space)

        self.assertIn("Sala A", text)
        self.assertIn(self.residence.name, text)

    def test_unique_name_per_residence_raises_integrity_error(self):
        CommonSpace.objects.create(
            name="Sala B",
            description="",
            capacity=2,
            is_active=True,
            open_time=time(9, 0),
            close_time=time(10, 0),
            residence=self.residence,
        )
        with self.assertRaises(IntegrityError):
            CommonSpace.objects.create(
                name="Sala B",
                description="dup",
                capacity=1,
                is_active=True,
                open_time=time(11, 0),
                close_time=time(12, 0),
                residence=self.residence,
            )

    def test_close_time_must_be_after_open_time_enforced_in_db(self):
        with self.assertRaises(IntegrityError):
            CommonSpace.objects.create(
                name="Sala Invalid",
                description="",
                capacity=1,
                is_active=True,
                open_time=time(12, 0),
                close_time=time(12, 0),
                residence=self.residence,
            )


class SpaceReservationModelTests(FastTenantTestCase):
    @classmethod
    def get_test_tenant_domain(cls):
        return "spaces.reservations.test.local"

    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Tenant Spaces Reservations"
        tenant.slug = "tenant-spaces-reservations"
        tenant.is_active = True
        tenant.on_trial = True

    @classmethod
    def setup_domain(cls, domain):
        domain.domain = cls.get_test_tenant_domain()
        domain.is_primary = True

    def setUp(self):
        super().setUp()
        from django.contrib.auth import get_user_model

        self.client = TenantClient(self.tenant)
        User = get_user_model()
        self.user = User.objects.create_user(username="u1", email="u1@t.local")

        self.residence = Residence.objects.create(
            name="Residencia R",
            slug="residencia-r",
            code="RR-001",
            timezone="Europe/Madrid",
            is_active=True,
        )
        ResidenceDomain.objects.create(
            residence=self.residence,
            domain=self.get_test_tenant_domain(),
            is_primary=True,
            is_active=True,
        )

        self.space = CommonSpace.objects.create(
            name="Sala Reservas",
            description="",
            capacity=2,
            is_active=True,
            open_time=time(8, 0),
            close_time=time(20, 0),
            residence=self.residence,
        )

    def test_space_reservation_str_contains_space_and_times(self):
        from django.utils import timezone
        from datetime import timedelta

        start = timezone.now() + timedelta(days=1)
        end = start + timedelta(hours=1)

        reservation = SpaceReservation.objects.create(
            space=self.space,
            user=self.user,
            residence=self.residence,
            start_time=start,
            end_time=end,
        )
        text = str(reservation)

        self.assertIn(self.space.name, text)
        self.assertIn(str(start.date()), text)