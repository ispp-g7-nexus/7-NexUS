from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from django_tenants.test.cases import FastTenantTestCase
from django_tenants.test.client import TenantClient

from apps.membership.models import Membership, Role
from apps.residences.models import Residence, ResidenceDomain

from .models import Event, EventParticipation

ANALYTICS_URL = "/api/admin/analytics/events/"


class AdminEventsAnalyticsTests(FastTenantTestCase):
    @classmethod
    def get_test_tenant_domain(cls):
        return "admin-events-analytics.test.local"

    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Tenant Admin Events Analytics"
        tenant.slug = "tenant-admin-events-analytics"
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
            username="admin-events-analytics",
            email="admin-events-analytics@example.com",
            password="demo1234",
            first_name="Admin",
            last_name="Eventos",
            is_staff=True,
        )
        self.student_a = user_model.objects.create_user(
            username="student-a-events-analytics",
            email="student-a-events-analytics@example.com",
            password="demo1234",
            first_name="Lucia",
            last_name="Gomez",
        )
        self.student_b = user_model.objects.create_user(
            username="student-b-events-analytics",
            email="student-b-events-analytics@example.com",
            password="demo1234",
            first_name="Mario",
            last_name="Lopez",
        )
        self.student_c = user_model.objects.create_user(
            username="student-c-events-analytics",
            email="student-c-events-analytics@example.com",
            password="demo1234",
            first_name="Nora",
            last_name="Diaz",
        )

        self.residence = Residence.objects.create(
            name="Residencia Events Analytics",
            slug="residencia-events-analytics",
            code="REA-001",
            timezone="Europe/Madrid",
            is_active=True,
        )
        ResidenceDomain.objects.create(
            residence=self.residence,
            domain=domain,
            is_primary=True,
            is_active=True,
        )

        student_role, _ = Role.objects.get_or_create(
            name="Student",
            residence=None,
            defaults={
                "description": "Residente",
                "is_system_default": True,
                "permissions": [],
            },
        )

        Membership.objects.update_or_create(
            user=self.student_a,
            residence=self.residence,
            role=student_role,
            defaults={"is_active": True},
        )
        Membership.objects.update_or_create(
            user=self.student_b,
            residence=self.residence,
            role=student_role,
            defaults={"is_active": True},
        )
        Membership.objects.update_or_create(
            user=self.student_c,
            residence=self.residence,
            role=student_role,
            defaults={"is_active": True},
        )

        self.admin_client = TenantClient(
            self.tenant, SERVER_NAME=domain, HTTP_HOST=domain
        )
        self.admin_client.force_login(self.admin_user)

        self.student_client = TenantClient(
            self.tenant, SERVER_NAME=domain, HTTP_HOST=domain
        )
        self.student_client.force_login(self.student_c)

        self.current_start = timezone.now().replace(minute=0, second=0, microsecond=0) - timedelta(days=5)
        self.current_end = self.current_start + timedelta(days=2, hours=23)
        self.previous_start = self.current_start - (self.current_end - self.current_start)

        self._seed_dataset()

    def _create_event(self, *, host, start_at, created_at):
        event = Event.objects.create(
            title=f"Evento {host.id}-{start_at.strftime('%H%M')}",
            description="Evento demo analytics",
            start_time=start_at,
            end_time=start_at + timedelta(hours=2),
            event_type=Event.Type.EXTERNAL,
            location="Salón principal",
            max_participants=20,
            residence=self.residence,
            host=host,
        )
        Event.objects.filter(id=event.id).update(created_at=created_at, updated_at=created_at)
        event.refresh_from_db()
        return event

    def _seed_dataset(self):
        # Periodo actual (3 eventos, 2 con participación, 3 participaciones)
        current_event_1 = self._create_event(
            host=self.student_a,
            start_at=self.current_start + timedelta(hours=10),
            created_at=self.current_start + timedelta(hours=1),
        )
        current_event_2 = self._create_event(
            host=self.admin_user,
            start_at=self.current_start + timedelta(hours=20),
            created_at=self.current_start + timedelta(hours=2),
        )
        self._create_event(
            host=self.student_b,
            start_at=self.current_start + timedelta(hours=30),
            created_at=self.current_start + timedelta(hours=3),
        )

        EventParticipation.objects.create(event=current_event_1, user=self.student_a)
        EventParticipation.objects.create(event=current_event_1, user=self.student_b)
        EventParticipation.objects.create(event=current_event_2, user=self.student_b)

        # Periodo anterior (2 eventos, 1 con participación, 1 participación)
        previous_event_1 = self._create_event(
            host=self.student_a,
            start_at=self.previous_start + timedelta(hours=10),
            created_at=self.previous_start + timedelta(hours=1),
        )
        self._create_event(
            host=self.admin_user,
            start_at=self.previous_start + timedelta(hours=20),
            created_at=self.previous_start + timedelta(hours=2),
        )

        EventParticipation.objects.create(event=previous_event_1, user=self.student_a)

    def test_admin_gets_events_analytics_with_compare(self):
        response = self.admin_client.get(
            ANALYTICS_URL,
            {
                "from": self.current_start.isoformat(),
                "to": self.current_end.isoformat(),
                "compare": "previous_period",
                "event_type": "all",
            },
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()

        self.assertEqual(payload["summary"]["total_events"], 3)
        self.assertEqual(payload["summary"]["total_event_creators"], 3)
        self.assertEqual(payload["summary"]["total_participants_or_attendees"], 3)
        self.assertAlmostEqual(payload["summary"]["attendance_rate"], 66.67, places=2)
        self.assertEqual(payload["summary"]["compare_value_total_events"], 2)
        self.assertEqual(payload["summary"]["delta_total_events"], 1)

        self.assertEqual(payload["attendance_overview"]["measurement_type"], "registrations_proxy")
        self.assertEqual(payload["attendance_overview"]["total_registered"], 3)
        self.assertEqual(payload["attendance_overview"]["total_attended"], 2)
        self.assertAlmostEqual(payload["attendance_overview"]["attendance_rate"], 66.67, places=2)
        self.assertAlmostEqual(payload["attendance_overview"]["compare_value"], 50.0, places=2)

        creation_map = {
            item["resident_id"]: item for item in payload["event_creation_by_resident"]
        }
        self.assertEqual(creation_map[self.student_b.id]["events_created_count"], 1)
        self.assertEqual(creation_map[self.student_b.id]["compare_value"], 0)
        self.assertEqual(creation_map[self.student_b.id]["delta"], 1)

        attendance_map = {
            item["resident_id"]: item for item in payload["top_residents_by_attendance"]
        }
        self.assertEqual(attendance_map[self.student_b.id]["attended_events_count"], 2)
        self.assertEqual(attendance_map[self.student_b.id]["compare_value"], 0)
        self.assertEqual(attendance_map[self.student_b.id]["delta"], 2)

        self.assertEqual(payload["meta"]["measurement_type"], "registrations_proxy")

    def test_event_type_resident_filters_out_official_creators(self):
        response = self.admin_client.get(
            ANALYTICS_URL,
            {
                "from": self.current_start.isoformat(),
                "to": self.current_end.isoformat(),
                "compare": "none",
                "event_type": "resident",
            },
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()

        self.assertEqual(payload["summary"]["total_events"], 2)
        self.assertEqual(payload["summary"]["total_event_creators"], 2)
        self.assertEqual(payload["summary"]["total_participants_or_attendees"], 2)
        self.assertAlmostEqual(payload["summary"]["attendance_rate"], 50.0, places=2)

        creator_ids = {row["resident_id"] for row in payload["event_creation_by_resident"]}
        self.assertNotIn(self.admin_user.id, creator_ids)

    def test_creator_filter_scopes_metrics(self):
        response = self.admin_client.get(
            ANALYTICS_URL,
            {
                "from": self.current_start.isoformat(),
                "to": self.current_end.isoformat(),
                "compare": "none",
                "event_type": "all",
                "creator_id": str(self.student_a.id),
            },
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()

        self.assertEqual(payload["summary"]["total_events"], 1)
        self.assertEqual(payload["summary"]["total_event_creators"], 1)
        self.assertEqual(payload["summary"]["total_participants_or_attendees"], 2)

        self.assertEqual(len(payload["event_creation_by_resident"]), 1)
        self.assertEqual(payload["event_creation_by_resident"][0]["resident_id"], self.student_a.id)

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

    def test_student_user_cannot_access_events_analytics(self):
        response = self.student_client.get(ANALYTICS_URL)
        self.assertEqual(response.status_code, 403)
