from datetime import time, timedelta
from zoneinfo import ZoneInfo

from django.contrib.auth import get_user_model
from django.utils import timezone
from django_tenants.test.cases import FastTenantTestCase
from django_tenants.test.client import TenantClient

from apps.objects.models import Object, ObjectRental
from apps.residences.models import Residence, ResidenceDomain
from apps.spaces.models import CommonSpace, SpaceReservation

ANALYTICS_URL = "/api/admin/analytics/reservations/"


class AdminReservationsAnalyticsTests(FastTenantTestCase):
    @classmethod
    def get_test_tenant_domain(cls):
        return "reservations-analytics.test.local"

    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Tenant Reservations Analytics"
        tenant.slug = "tenant-reservations-analytics"
        tenant.is_active = True
        tenant.on_trial = True

    @classmethod
    def setup_domain(cls, domain):
        domain.domain = cls.get_test_tenant_domain()
        domain.is_primary = True

    def setUp(self):
        super().setUp()
        user_model = get_user_model()
        domain = self.get_test_tenant_domain()

        self.admin_user = user_model.objects.create_user(
            username="admin-reservations-analytics",
            email="admin-reservations-analytics@example.com",
            password="demo1234",
            is_staff=True,
            first_name="Admin",
            last_name="Analytics",
        )
        self.user_a = user_model.objects.create_user(
            username="user-a-reservations-analytics",
            email="user-a-reservations-analytics@example.com",
            password="demo1234",
            first_name="Lucia",
            last_name="Gomez",
        )
        self.user_b = user_model.objects.create_user(
            username="user-b-reservations-analytics",
            email="user-b-reservations-analytics@example.com",
            password="demo1234",
            first_name="Mario",
            last_name="Lopez",
        )
        self.student_user = user_model.objects.create_user(
            username="student-reservations-analytics",
            email="student-reservations-analytics@example.com",
            password="demo1234",
            first_name="Student",
            last_name="Demo",
        )

        self.residence = Residence.objects.create(
            name="Residencia Analytics",
            slug="residencia-analytics-reservations",
            code="RA-RES-001",
            timezone="Europe/Madrid",
            is_active=True,
        )
        ResidenceDomain.objects.create(
            residence=self.residence,
            domain=domain,
            is_primary=True,
            is_active=True,
        )

        self.space_a = CommonSpace.objects.create(
            residence=self.residence,
            name="Sala de Estudio",
            description="",
            capacity=8,
            is_active=True,
            open_time=time(8, 0),
            close_time=time(22, 0),
            reservation_interval_minutes=60,
        )
        self.space_b = CommonSpace.objects.create(
            residence=self.residence,
            name="Gimnasio",
            description="",
            capacity=10,
            is_active=True,
            open_time=time(8, 0),
            close_time=time(22, 0),
            reservation_interval_minutes=60,
        )

        self.object_a = Object.objects.create(
            name="Proyector 4K",
            description="",
            location="Sala A",
            residence=self.residence,
            available=True,
            stock_total=1,
        )
        self.object_b = Object.objects.create(
            name="Kit Sonido",
            description="",
            location="Sala B",
            residence=self.residence,
            available=True,
            stock_total=1,
        )

        self.admin_client = TenantClient(
            self.tenant, SERVER_NAME=domain, HTTP_HOST=domain
        )
        self.admin_client.force_login(self.admin_user)

        self.student_client = TenantClient(
            self.tenant, SERVER_NAME=domain, HTTP_HOST=domain
        )
        self.student_client.force_login(self.student_user)

        self.residence_tz = ZoneInfo("Europe/Madrid")
        self.current_start = timezone.now().replace(
            minute=0, second=0, microsecond=0
        ) - timedelta(days=5)
        self.current_end = self.current_start + timedelta(days=1, hours=23)
        self.previous_start = self.current_start - (
            self.current_end - self.current_start
        )

        self._seed_dataset()

    def _create_space_reservation(self, *, user, space, start_at, status):
        return SpaceReservation.objects.create(
            space=space,
            user=user,
            residence=self.residence,
            start_time=start_at,
            end_time=start_at + timedelta(hours=1),
            status=status,
        )

    def _create_object_rental(self, *, user, obj, start_at, status):
        return ObjectRental.objects.create(
            object=obj,
            user=user,
            start_date=start_at,
            end_date=start_at + timedelta(hours=1),
            status=status,
        )

    def _seed_dataset(self):
        # Periodo actual (5 reservas / 2 canceladas)
        self._create_space_reservation(
            user=self.user_a,
            space=self.space_a,
            start_at=self.current_start + timedelta(hours=10),
            status=SpaceReservation.Status.ACTIVE,
        )
        self._create_space_reservation(
            user=self.user_a,
            space=self.space_a,
            start_at=self.current_start + timedelta(hours=11),
            status=SpaceReservation.Status.CANCELLED,
        )
        self._create_space_reservation(
            user=self.user_b,
            space=self.space_b,
            start_at=self.current_start + timedelta(hours=18),
            status=SpaceReservation.Status.ACTIVE,
        )
        self._create_object_rental(
            user=self.user_a,
            obj=self.object_a,
            start_at=self.current_start + timedelta(hours=10),
            status=ObjectRental.Status.ACTIVE,
        )
        self._create_object_rental(
            user=self.user_b,
            obj=self.object_b,
            start_at=self.current_start + timedelta(hours=12),
            status=ObjectRental.Status.CANCELLED,
        )

        # Periodo anterior (4 reservas / 1 cancelada)
        self._create_space_reservation(
            user=self.user_a,
            space=self.space_a,
            start_at=self.previous_start + timedelta(hours=10),
            status=SpaceReservation.Status.ACTIVE,
        )
        self._create_space_reservation(
            user=self.user_b,
            space=self.space_b,
            start_at=self.previous_start + timedelta(hours=18),
            status=SpaceReservation.Status.CANCELLED,
        )
        self._create_object_rental(
            user=self.user_a,
            obj=self.object_a,
            start_at=self.previous_start + timedelta(hours=10),
            status=ObjectRental.Status.ACTIVE,
        )
        self._create_object_rental(
            user=self.user_b,
            obj=self.object_a,
            start_at=self.previous_start + timedelta(hours=11),
            status=ObjectRental.Status.ACTIVE,
        )

    def test_admin_gets_reservations_analytics_with_compare(self):
        response = self.admin_client.get(
            ANALYTICS_URL,
            {
                "from": self.current_start.isoformat(),
                "to": self.current_end.isoformat(),
                "compare": "previous_period",
                "resource_type": "all",
            },
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()

        self.assertEqual(payload["summary"]["total_reservations"], 5)
        self.assertEqual(payload["summary"]["total_cancelled"], 2)
        self.assertEqual(payload["summary"]["cancellation_rate"], 40.0)
        self.assertEqual(payload["summary"]["active_zones"], 4)
        self.assertEqual(payload["summary"]["compare_value_total_reservations"], 4)
        self.assertEqual(payload["summary"]["delta_total_reservations"], 1)
        self.assertEqual(payload["summary"]["delta_pct_total_reservations"], 25.0)

        zones = {item["zone_id"]: item for item in payload["most_reserved_zones"]}
        self.assertEqual(zones[f"spaces:{self.space_a.id}"]["reservations_count"], 2)
        self.assertEqual(zones[f"spaces:{self.space_a.id}"]["compare_value"], 1)
        self.assertEqual(zones[f"spaces:{self.space_a.id}"]["delta"], 1)

        cancellation_by_zone = {
            item["zone_id"]: item for item in payload["cancellation_rate_by_zone"]
        }
        self.assertEqual(
            cancellation_by_zone[f"objects:{self.object_b.id}"]["cancellation_rate"], 100.0
        )
        self.assertEqual(
            cancellation_by_zone[f"objects:{self.object_b.id}"]["total_reservations"], 1
        )
        self.assertEqual(
            cancellation_by_zone[f"objects:{self.object_b.id}"]["cancelled_reservations"], 1
        )

        cancellation_by_user = {
            item["user_id"]: item for item in payload["cancellation_rate_by_user"]
        }
        user_b_row = cancellation_by_user[self.user_b.id]
        self.assertEqual(user_b_row["total_reservations"], 2)
        self.assertEqual(user_b_row["cancelled_reservations"], 1)
        self.assertEqual(user_b_row["cancellation_rate"], 50.0)
        self.assertEqual(user_b_row["compare_value"], 50.0)
        self.assertEqual(user_b_row["delta"], 0.0)

        space_a_peaks = [
            item
            for item in payload["peak_time_by_zone"]
            if item["zone_id"] == f"spaces:{self.space_a.id}"
        ]
        self.assertEqual(len(space_a_peaks), 24)
        self.assertEqual(sum(item["reservations_count"] for item in space_a_peaks), 2)
        self.assertEqual(
            sum((item["compare_value"] or 0) for item in space_a_peaks),
            1,
        )

    def test_resource_type_and_zone_filter_scope_data(self):
        response = self.admin_client.get(
            ANALYTICS_URL,
            {
                "from": self.current_start.isoformat(),
                "to": self.current_end.isoformat(),
                "compare": "none",
                "resource_type": "spaces",
                "zone_id": str(self.space_a.id),
            },
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["summary"]["total_reservations"], 2)
        self.assertEqual(payload["summary"]["total_cancelled"], 1)
        self.assertEqual(payload["summary"]["active_zones"], 1)
        self.assertEqual(len(payload["most_reserved_zones"]), 1)
        self.assertEqual(payload["most_reserved_zones"][0]["zone_id"], f"spaces:{self.space_a.id}")
        self.assertTrue(
            all(
                item["zone_id"] == f"spaces:{self.space_a.id}"
                for item in payload["peak_time_by_zone"]
            )
        )

    def test_invalid_range_returns_400(self):
        response = self.admin_client.get(
            ANALYTICS_URL,
            {
                "from": self.current_end.isoformat(),
                "to": self.current_start.isoformat(),
            },
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("detail", response.json())

    def test_student_user_cannot_access_admin_analytics(self):
        response = self.student_client.get(ANALYTICS_URL)
        self.assertEqual(response.status_code, 403)
