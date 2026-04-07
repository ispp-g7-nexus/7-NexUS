from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from django_tenants.test.cases import FastTenantTestCase
from django_tenants.test.client import TenantClient

from apps.objects.models import Object, ObjectRental
from apps.residences.models import Residence, ResidenceDomain


class ObjectAvailabilityApiTests(FastTenantTestCase):
    @classmethod
    def get_test_tenant_domain(cls):
        return "objects.test.local"

    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Tenant de Test"
        tenant.slug = "tenant-objects-test"
        tenant.is_active = True
        tenant.on_trial = True

    @classmethod
    def setup_domain(cls, domain):
        domain.domain = cls.get_test_tenant_domain()
        domain.is_primary = True

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
            is_staff=True,
        )
        self.other_user = user_model.objects.create_user(
            username="other",
            email="other@example.com",
            password="demo1234",
            first_name="Other",
            last_name="Demo",
        )
        self.client.force_login(self.user)

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

        self.object_available = Object.objects.create(
            name="Bicicleta",
            description="Bici libre",
            location="Garaje",
            residence=self.residence,
            available=True,
        )
        self.object_busy_now = Object.objects.create(
            name="Taladro",
            description="Prestado en este momento",
            location="Trastero",
            residence=self.residence,
            available=True,
        )
        self.object_disabled = Object.objects.create(
            name="Proyector",
            description="No prestable por configuración",
            location="Recepción",
            residence=self.residence,
            available=False,
        )

    def _create_active_rental_now(self, obj, user):
        now = timezone.now()
        return ObjectRental.objects.create(
            object=obj,
            user=user,
            start_date=now - timedelta(minutes=30),
            end_date=now + timedelta(minutes=30),
        )

    def test_list_availability_is_consistent_for_all_objects(self):
        self._create_active_rental_now(self.object_busy_now, self.other_user)

        response = self.client.get("/api/objects/")
        self.assertEqual(response.status_code, 200)

        payload = {item["id"]: item for item in response.json()}

        available_item = payload[self.object_available.id]
        self.assertTrue(available_item["availability"])
        self.assertTrue(available_item["can_rent"])
        self.assertTrue(available_item["lending_enabled"])

        busy_item = payload[self.object_busy_now.id]
        self.assertFalse(busy_item["availability"])
        self.assertFalse(busy_item["can_rent"])
        self.assertTrue(busy_item["lending_enabled"])

        disabled_item = payload[self.object_disabled.id]
        self.assertFalse(disabled_item["availability"])
        self.assertFalse(disabled_item["can_rent"])
        self.assertFalse(disabled_item["lending_enabled"])

    def test_rejects_reservation_when_object_is_disabled(self):
        now = timezone.now()
        response = self.client.post(
            f"/api/objects/{self.object_disabled.id}/reserve/",
            data={
                "start_date": (now + timedelta(hours=1)).isoformat(),
                "end_date": (now + timedelta(hours=2)).isoformat(),
            },
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)

    def test_create_object_accepts_valid_name(self):
        response = self.client.post(
            "/api/objects/",
            data={
                "name": "Kit de Herramientas (Básico) 2.0",
                "description": "Caja con herramientas",
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(Object.objects.count(), 4)
        self.assertEqual(
            Object.objects.filter(name="Kit de Herramientas (Básico) 2.0").exists(),
            True,
        )

    def test_create_object_rejects_invalid_special_characters_in_name(self):
        response = self.client.post(
            "/api/objects/",
            data={
                "name": "Proyector @ Aula",
                "description": "No debería guardarse",
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)

    def test_user_reservations_use_same_availability_logic(self):
        rental = self._create_active_rental_now(self.object_busy_now, self.user)

        response = self.client.get("/api/my-reservations/")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(len(payload), 1)
        self.assertEqual(payload[0]["rental"]["id"], rental.id)

        object_payload = payload[0]["object"]
        self.assertEqual(object_payload["id"], self.object_busy_now.id)
        self.assertFalse(object_payload["availability"])
        self.assertFalse(object_payload["can_rent"])
        self.assertTrue(object_payload["lending_enabled"])

    def test_object_is_released_automatically_after_reservation_end(self):
        rental = self._create_active_rental_now(self.object_busy_now, self.other_user)

        response_during = self.client.get("/api/objects/")
        self.assertEqual(response_during.status_code, 200)
        during_payload = {item["id"]: item for item in response_during.json()}
        self.assertFalse(during_payload[self.object_busy_now.id]["availability"])

        rental.end_date = timezone.now() - timedelta(minutes=1)
        rental.save(update_fields=["end_date"])

        response_after = self.client.get("/api/objects/")
        self.assertEqual(response_after.status_code, 200)
        after_payload = {item["id"]: item for item in response_after.json()}
        self.assertTrue(after_payload[self.object_busy_now.id]["availability"])

    def test_cancel_without_rental_id_preserves_past_history(self):
        now = timezone.now()
        past_rental = ObjectRental.objects.create(
            object=self.object_available,
            user=self.user,
            start_date=now - timedelta(hours=3),
            end_date=now - timedelta(hours=2),
        )
        future_rental = ObjectRental.objects.create(
            object=self.object_available,
            user=self.user,
            start_date=now + timedelta(hours=2),
            end_date=now + timedelta(hours=3),
        )

        response = self.client.post(
            f"/api/objects/{self.object_available.id}/cancel/",
            data={},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        past_rental.refresh_from_db()
        future_rental.refresh_from_db()
        self.assertEqual(past_rental.status, "ACTIVE")
        self.assertEqual(future_rental.status, "CANCELLED")

        self.assertEqual(Object.objects.count(), 3)

    def test_create_object_rejects_blank_name(self):
        response = self.client.post(
            "/api/objects/",
            data={"name": "  "},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(Object.objects.count(), 3)

    def test_create_object_requires_staff_permissions(self):
        self.client.force_login(self.other_user)

        response = self.client.post(
            "/api/objects/",
            data={"name": "Objeto válido"},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 403)
        self.assertEqual(Object.objects.count(), 3)
