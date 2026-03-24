import json
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from django_tenants.test.cases import FastTenantTestCase
from django_tenants.test.client import TenantClient

from apps.objects.models import Object, ObjectRental
from apps.residences.models import Residence, ResidenceDomain


class ObjectViewsCoverageTests(FastTenantTestCase):
    """
    Cubre las ramas de views.py no ejercidas por los tests existentes:
      - ObjectDetailView.get
      - ObjectRentalsView.get
      - ObjectReserveView: fechas ausentes, JSON inválido
      - ObjectCancelView: rama rental_id
      - UserReservationsView: lista vacía, no autenticado
      - AuthenticatedView.dispatch: no autenticado (401)
      - AdminObjectNotificationsView: completo
    """

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

        User = get_user_model()
        self.admin_user = User.objects.create_user(
            username="admin_cov",
            email="admin_cov@example.com",
            password="demo1234",
            first_name="Admin",
            last_name="Cov",
            is_staff=True,
        )
        self.regular_user = User.objects.create_user(
            username="regular_cov",
            email="regular_cov@example.com",
            password="demo1234",
            first_name="Regular",
            last_name="Cov",
        )
        self.other_user = User.objects.create_user(
            username="other_cov",
            email="other_cov@example.com",
            password="demo1234",
            first_name="Other",
            last_name="Cov",
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

        self.obj = Object.objects.create(
            name="Herramienta Cov",
            description="Para tests de cobertura",
            location="Almacén",
            residence=self.residence,
            available=True,
        )

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _future_rental(self, obj, user, hours_from_now=1, duration_hours=1):
        now = timezone.now()
        return ObjectRental.objects.create(
            object=obj,
            user=user,
            start_date=now + timedelta(hours=hours_from_now),
            end_date=now + timedelta(hours=hours_from_now + duration_hours),
        )

    def _active_rental(self, obj, user):
        now = timezone.now()
        return ObjectRental.objects.create(
            object=obj,
            user=user,
            start_date=now - timedelta(minutes=30),
            end_date=now + timedelta(minutes=30),
        )

    # ------------------------------------------------------------------
    # ObjectDetailView GET
    # ------------------------------------------------------------------

    def test_object_detail_get_returns_serialized_object(self):
        self.client.force_login(self.admin_user)

        response = self.client.get(f"/api/objects/{self.obj.id}/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["id"], self.obj.id)
        self.assertIn("availability", payload)
        self.assertIn("lending_enabled", payload)
        self.assertIn("can_rent", payload)

    def test_object_detail_get_not_found(self):
        self.client.force_login(self.admin_user)

        response = self.client.get("/api/objects/9999/")

        self.assertEqual(response.status_code, 404)

    # ------------------------------------------------------------------
    # ObjectRentalsView GET
    # ------------------------------------------------------------------

    def test_object_rentals_returns_list(self):
        self.client.force_login(self.admin_user)
        self._active_rental(self.obj, self.regular_user)

        response = self.client.get(f"/api/objects/{self.obj.id}/rentals/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertIsInstance(payload, list)
        self.assertEqual(len(payload), 1)
        entry = payload[0]
        self.assertIn("id", entry)
        self.assertIn("start_date", entry)
        self.assertIn("end_date", entry)
        self.assertIn("first_name", entry["user"])
        self.assertIn("last_name", entry["user"])

    def test_object_rentals_empty_list(self):
        self.client.force_login(self.admin_user)

        response = self.client.get(f"/api/objects/{self.obj.id}/rentals/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), [])

    def test_object_rentals_object_not_found(self):
        self.client.force_login(self.admin_user)

        response = self.client.get("/api/objects/9999/rentals/")

        self.assertEqual(response.status_code, 404)

    # ------------------------------------------------------------------
    # ObjectReserveView — ramas sin cubrir
    # ------------------------------------------------------------------

    def test_reserve_only_end_date_returns_400(self):
        """Rama: not start or not end — falta start_date."""
        self.client.force_login(self.regular_user)
        now = timezone.now()

        response = self.client.post(
            f"/api/objects/{self.obj.id}/reserve/",
            data=json.dumps({"end_date": (now + timedelta(hours=1)).isoformat()}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("requeridos", response.json()["detail"].lower())

    def test_reserve_only_start_date_returns_400(self):
        """Rama: not start or not end — falta end_date."""
        self.client.force_login(self.regular_user)
        now = timezone.now()

        response = self.client.post(
            f"/api/objects/{self.obj.id}/reserve/",
            data=json.dumps({"start_date": (now + timedelta(hours=1)).isoformat()}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("requeridos", response.json()["detail"].lower())

    def test_reserve_invalid_json_returns_400(self):
        """Rama: JSONDecodeError en ObjectReserveView."""
        self.client.force_login(self.regular_user)

        response = self.client.post(
            f"/api/objects/{self.obj.id}/reserve/",
            data="not-json",
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)

    # ------------------------------------------------------------------
    # ObjectCancelView — rama rental_id
    # ------------------------------------------------------------------

    def test_cancel_by_rental_id_deletes_correct_rental(self):
        """Rama: if rental_id — cancela el rental exacto por ID."""
        self.client.force_login(self.regular_user)
        rental = self._future_rental(self.obj, self.regular_user)

        response = self.client.post(
            f"/api/objects/{self.obj.id}/cancel/",
            data=json.dumps({"rental_id": rental.id}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertFalse(ObjectRental.objects.filter(id=rental.id).exists())

    def test_cancel_by_rental_id_other_users_rental_returns_400(self):
        """El filtro incluye user=request.user, no puede cancelar rental ajeno."""
        self.client.force_login(self.regular_user)
        rental = self._future_rental(self.obj, self.other_user)

        response = self.client.post(
            f"/api/objects/{self.obj.id}/cancel/",
            data=json.dumps({"rental_id": rental.id}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertTrue(ObjectRental.objects.filter(id=rental.id).exists())

    # ------------------------------------------------------------------
    # UserReservationsView
    # ------------------------------------------------------------------

    def test_user_reservations_returns_empty_list(self):
        self.client.force_login(self.regular_user)

        response = self.client.get("/api/my-reservations/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), [])

    def test_user_reservations_unauthenticated_returns_401(self):
        response = self.client.get("/api/my-reservations/")

        self.assertEqual(response.status_code, 401)

    # ------------------------------------------------------------------
    # AuthenticatedView.dispatch — no autenticado
    # ------------------------------------------------------------------

    def test_object_list_unauthenticated_returns_401(self):
        response = self.client.get("/api/objects/")

        self.assertEqual(response.status_code, 401)

    # ------------------------------------------------------------------
    # AdminObjectNotificationsView
    # ------------------------------------------------------------------

    def test_admin_notifications_staff_sees_other_users_rentals(self):
        """Staff obtiene lista con rentals activos de otros usuarios."""
        self.client.force_login(self.admin_user)
        self._active_rental(self.obj, self.regular_user)

        response = self.client.get("/api/admin/objects/notifications/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertIsInstance(payload, list)
        self.assertEqual(len(payload), 1)
        entry = payload[0]
        self.assertIn("id", entry)
        self.assertIn("title", entry)
        self.assertIn("message", entry)
        self.assertIn("created_at", entry)
        self.assertIn("end_time", entry)

    def test_admin_notifications_excludes_own_rentals(self):
        """Los rentals del propio admin no aparecen en sus notificaciones."""
        self.client.force_login(self.admin_user)
        self._active_rental(self.obj, self.admin_user)

        response = self.client.get("/api/admin/objects/notifications/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 0)

    def test_admin_notifications_non_staff_returns_403(self):
        """Un usuario sin permisos de admin recibe 403."""
        self.client.force_login(self.regular_user)

        response = self.client.get("/api/admin/objects/notifications/")

        self.assertEqual(response.status_code, 403)
        self.assertIn("permisos", response.json()["detail"].lower())

    def test_admin_notifications_unauthenticated_returns_401(self):
        response = self.client.get("/api/admin/objects/notifications/")

        self.assertEqual(response.status_code, 401)

    def test_admin_notifications_empty_when_no_active_rentals(self):
        """Sin rentals activos, la lista es vacía."""
        self.client.force_login(self.admin_user)

        response = self.client.get("/api/admin/objects/notifications/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), [])
