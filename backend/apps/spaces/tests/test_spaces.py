from datetime import datetime, time, timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from django_tenants.test.cases import TenantTestCase
from django_tenants.test.client import TenantClient

from apps.residences.models import Residence, ResidenceDomain
from apps.spaces.models import CommonSpace, SpaceReservation


class SpaceReservationApiTests(TenantTestCase):
    @classmethod
    def get_test_tenant_domain(cls):
        return "spaces.test.local"

    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Tenant de Test"
        tenant.slug = "tenant-test"
        tenant.is_active = True
        tenant.on_trial = True

    @classmethod
    def setup_domain(cls, domain):
        domain.domain = cls.get_test_tenant_domain()
        domain.is_primary = True

    def setUp(self):
        super().setUp()
        self.client = TenantClient(self.tenant)
        self.anonymous_client = TenantClient(self.tenant)

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
            slug="residencia-a",
            code="RA-001",
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
            name="Sala de Estudio",
            description="Sala tranquila",
            capacity=10,
            is_active=True,
            open_time=time(8, 0),
            close_time=time(22, 0),
            residence=self.residence,
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

    def test_create_valid_reservation(self):
        start_time, end_time = self._build_slot(
            day_offset=1,
            start_hour=10,
            start_minute=0,
            end_hour=11,
            end_minute=0,
        )

        response = self.client.post(
            f"/api/spaces/{self.space.id}/reservations/",
            data={
                "start_time": start_time.isoformat(),
                "end_time": end_time.isoformat(),
                "notes": "Repasar examen",
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(SpaceReservation.objects.count(), 1)
        reservation = SpaceReservation.objects.first()
        self.assertIsNotNone(reservation)
        self.assertEqual(reservation.status, SpaceReservation.Status.ACTIVE)

    def test_blocks_overlapping_reservation(self):
        start_time, end_time = self._build_slot(
            day_offset=1,
            start_hour=10,
            start_minute=0,
            end_hour=11,
            end_minute=0,
        )
        SpaceReservation.objects.create(
            space=self.space,
            user=self.other_user,
            residence=self.residence,
            start_time=start_time,
            end_time=end_time,
            status=SpaceReservation.Status.ACTIVE,
            notes="Primera reserva",
        )

        response = self.client.post(
            f"/api/spaces/{self.space.id}/reservations/",
            data={
                "start_time": (start_time + timedelta(minutes=30)).isoformat(),
                "end_time": (end_time + timedelta(minutes=30)).isoformat(),
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        payload = response.json()
        self.assertIn("espacio", payload["detail"].lower())

    def test_blocks_reservation_outside_schedule(self):
        start_time, end_time = self._build_slot(
            day_offset=1,
            start_hour=7,
            start_minute=30,
            end_hour=8,
            end_minute=30,
        )

        response = self.client.post(
            f"/api/spaces/{self.space.id}/reservations/",
            data={
                "start_time": start_time.isoformat(),
                "end_time": end_time.isoformat(),
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        payload = response.json()
        self.assertIn("horario", payload["detail"].lower())

    def test_blocks_access_without_auth(self):
        response = self.anonymous_client.get("/api/spaces/")
        self.assertEqual(response.status_code, 401)

    def test_residence_isolation_on_my_reservations(self):
        start_time, end_time = self._build_slot(
            day_offset=1,
            start_hour=12,
            start_minute=0,
            end_hour=13,
            end_minute=0,
        )

        SpaceReservation.objects.create(
            space=self.space,
            user=self.user,
            residence=self.residence,
            start_time=start_time,
            end_time=end_time,
            status=SpaceReservation.Status.ACTIVE,
            notes="Reserva residencia A",
        )

        other_residence = Residence.objects.create(
            name="Residencia B",
            slug="residencia-b",
            code="RB-001",
            timezone="Europe/Madrid",
            is_active=True,
        )
        other_space = CommonSpace.objects.create(
            name="Sala Gaming",
            description="Otra residencia",
            capacity=6,
            is_active=True,
            open_time=time(8, 0),
            close_time=time(22, 0),
            residence=other_residence,
        )
        SpaceReservation.objects.create(
            space=other_space,
            user=self.user,
            residence=other_residence,
            start_time=start_time,
            end_time=end_time,
            status=SpaceReservation.Status.ACTIVE,
            notes="Reserva residencia B",
        )

        response = self.client.get("/api/spaces/reservations/me/")
        self.assertEqual(response.status_code, 200)

        data = response.json()
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["residence_id"], self.residence.id)
        self.assertEqual(data[0]["space"]["id"], self.space.id)
