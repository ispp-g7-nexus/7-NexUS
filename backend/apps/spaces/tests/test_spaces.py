from datetime import datetime, time, timedelta

from django.contrib.auth import get_user_model
from django.db import connection
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

    @classmethod
    def tearDownClass(cls):
        # Keep tenant schema in search_path while deleting to avoid reverse
        # relation checks against tenant-only tables in public schema.
        try:
            connection.set_tenant(cls.tenant)
            if getattr(cls, "domain", None):
                cls.domain.delete()
            cls.tenant.__class__.objects.filter(pk=cls.tenant.pk).delete()
            cls.tenant._drop_schema(force_drop=True)
        finally:
            connection.set_schema_to_public()
            cls.remove_allowed_test_domain()
            if hasattr(cls, "cls_atomics"):
                super(TenantTestCase, cls).tearDownClass()

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
        self.third_user = user_model.objects.create_user(
            username="third",
            email="third@example.com",
            password="demo1234",
            first_name="Third",
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
        self.space.capacity = 1
        self.space.save(update_fields=["capacity"])

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
        self.assertIn("aforo", payload["detail"].lower())

    def test_allows_overlapping_reservation_when_capacity_has_room(self):
        self.space.capacity = 2
        self.space.save(update_fields=["capacity"])

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
        )

        response = self.client.post(
            f"/api/spaces/{self.space.id}/reservations/",
            data={
                "start_time": (start_time + timedelta(minutes=15)).isoformat(),
                "end_time": (end_time - timedelta(minutes=15)).isoformat(),
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(SpaceReservation.objects.count(), 2)

    def test_allows_overlapping_reservation_with_multiple_existing_below_capacity(self):
        self.space.capacity = 3
        self.space.save(update_fields=["capacity"])

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
        )
        SpaceReservation.objects.create(
            space=self.space,
            user=self.third_user,
            residence=self.residence,
            start_time=start_time,
            end_time=end_time,
            status=SpaceReservation.Status.ACTIVE,
        )

        response = self.client.post(
            f"/api/spaces/{self.space.id}/reservations/",
            data={
                "start_time": (start_time + timedelta(minutes=20)).isoformat(),
                "end_time": (end_time - timedelta(minutes=20)).isoformat(),
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(SpaceReservation.objects.count(), 3)

    def test_blocks_overlapping_reservation_when_capacity_is_full(self):
        self.space.capacity = 2
        self.space.save(update_fields=["capacity"])

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
        )
        SpaceReservation.objects.create(
            space=self.space,
            user=self.third_user,
            residence=self.residence,
            start_time=start_time,
            end_time=end_time,
            status=SpaceReservation.Status.ACTIVE,
        )

        response = self.client.post(
            f"/api/spaces/{self.space.id}/reservations/",
            data={
                "start_time": (start_time + timedelta(minutes=10)).isoformat(),
                "end_time": (end_time - timedelta(minutes=10)).isoformat(),
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        payload = response.json()
        self.assertIn("aforo", payload["detail"].lower())

    def test_partial_overlaps_are_evaluated_by_real_concurrency(self):
        self.space.capacity = 2
        self.space.save(update_fields=["capacity"])

        start_time, _ = self._build_slot(
            day_offset=1,
            start_hour=10,
            start_minute=0,
            end_hour=12,
            end_minute=0,
        )

        # Dos reservas existentes con solape parcial entre sí.
        first_start = start_time + timedelta(minutes=15)  # 10:15
        first_end = start_time + timedelta(minutes=45)  # 10:45
        second_start = start_time + timedelta(minutes=30)  # 10:30
        second_end = start_time + timedelta(minutes=60)  # 11:00

        SpaceReservation.objects.create(
            space=self.space,
            user=self.other_user,
            residence=self.residence,
            start_time=first_start,
            end_time=first_end,
            status=SpaceReservation.Status.ACTIVE,
        )
        SpaceReservation.objects.create(
            space=self.space,
            user=self.third_user,
            residence=self.residence,
            start_time=second_start,
            end_time=second_end,
            status=SpaceReservation.Status.ACTIVE,
        )

        # Esta reserva engloba a las anteriores y debe rechazarse porque
        # hay un tramo donde la ocupación existente ya alcanza el aforo.
        blocking_response = self.client.post(
            f"/api/spaces/{self.space.id}/reservations/",
            data={
                "start_time": start_time.isoformat(),  # 10:00
                "end_time": (start_time + timedelta(minutes=90)).isoformat(),  # 11:30
            },
            content_type="application/json",
        )
        self.assertEqual(blocking_response.status_code, 400)

        # Reserva con solape repartido, sin superar aforo en ningún instante.
        ok_response = self.client.post(
            f"/api/spaces/{self.space.id}/reservations/",
            data={
                "start_time": (start_time + timedelta(minutes=60)).isoformat(),  # 11:00
                "end_time": (start_time + timedelta(minutes=120)).isoformat(),  # 12:00
            },
            content_type="application/json",
        )
        self.assertEqual(ok_response.status_code, 201)

    def test_adjacent_slots_do_not_count_as_overlap(self):
        self.space.capacity = 1
        self.space.save(update_fields=["capacity"])

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
        )

        response = self.client.post(
            f"/api/spaces/{self.space.id}/reservations/",
            data={
                "start_time": end_time.isoformat(),
                "end_time": (end_time + timedelta(hours=1)).isoformat(),
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)

    def test_availability_only_blocks_when_capacity_is_reached(self):
        self.space.capacity = 2
        self.space.open_time = time(10, 0)
        self.space.close_time = time(12, 0)
        self.space.save(update_fields=["capacity", "open_time", "close_time"])

        start_time, end_time = self._build_slot(
            day_offset=1,
            start_hour=10,
            start_minute=0,
            end_hour=12,
            end_minute=0,
        )

        SpaceReservation.objects.create(
            space=self.space,
            user=self.other_user,
            residence=self.residence,
            start_time=start_time,
            end_time=end_time,
            status=SpaceReservation.Status.ACTIVE,
        )

        available_response = self.client.get(
            f"/api/spaces/{self.space.id}/availability/?date={start_time.date().isoformat()}"
        )
        self.assertEqual(available_response.status_code, 200)
        available_slots = available_response.json()["available_slots"]
        self.assertEqual(len(available_slots), 2)
        self.assertTrue(all(slot["status"] == "available" for slot in available_slots))

        SpaceReservation.objects.create(
            space=self.space,
            user=self.third_user,
            residence=self.residence,
            start_time=start_time,
            end_time=end_time,
            status=SpaceReservation.Status.ACTIVE,
        )

        full_response = self.client.get(
            f"/api/spaces/{self.space.id}/availability/?date={start_time.date().isoformat()}"
        )
        self.assertEqual(full_response.status_code, 200)
        full_slots = full_response.json()["available_slots"]
        self.assertEqual(len(full_slots), 2)
        self.assertTrue(all(slot["status"] == "occupied" for slot in full_slots))

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
