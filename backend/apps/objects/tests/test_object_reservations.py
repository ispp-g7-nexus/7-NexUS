from datetime import datetime, time, timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from django_tenants.test.cases import FastTenantTestCase
from django_tenants.test.client import TenantClient

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
            password="demo1234",
            first_name="Student",
            last_name="Demo",
        )
        self.other_user = user_model.objects.create_user(
            username="other",
            email="other@example.com",
            password="demo1234",
            first_name="Other",
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

    def test_blocks_overlapping_object_reservation(self):
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
                "start_date": (start_time + timedelta(minutes=15)).isoformat(),
                "end_date": (end_time + timedelta(minutes=15)).isoformat(),
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("disponibilidad", response.json()["detail"].lower())

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
