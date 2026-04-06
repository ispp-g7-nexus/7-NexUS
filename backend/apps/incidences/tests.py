from unittest.mock import MagicMock, patch

from django.contrib.auth import get_user_model
from django.db import connection
from django.test import RequestFactory, TestCase
from django.urls import reverse
from django_tenants.test.cases import TenantTestCase
from django_tenants.utils import schema_context
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.test import APIClient, APIRequestFactory

from apps.incidences.models import Incidence, IncidenceUpdate
from apps.incidences.permissions import IsAdminOrReadOnly
from apps.incidences.serializers import (
    AdminIncidenceSerializer,
    IncidenceSerializer,
    IncidenceUpdateSerializer,
)
from apps.membership.models import Membership, Role
from apps.residences.models import Residence

User = get_user_model()


class IncidenceViewSetTests(TenantTestCase):
    def setUp(self):
        super().setUp()
        self.client = APIClient()
        self.host = self.domain.domain

        self.patcher = patch("apps.incidences.permissions.has_screen_permission")
        self.mock_has_perm = self.patcher.start()
        self.addCleanup(self.patcher.stop)

        with schema_context(self.tenant.schema_name):
            self.residence_obj = Residence.objects.create(
                name="Residencia Demo", slug="demo"
            )
            self.role_admin = Role.objects.create(name="admin", is_system_default=True)
            self.role_student = Role.objects.create(
                name="student", is_system_default=True
            )

            self.admin_user = User.objects.create_user(
                username="admin@test.com",
                email="admin@test.com",
                password="password123",
            )
            self.student_a = User.objects.create_user(
                username="a@test.com",
                email="a@test.com",
                password="password123",
                first_name="Juan",
            )
            self.student_b = User.objects.create_user(
                username="b@test.com",
                email="b@test.com",
                password="password123",
                first_name="Maria",
            )
            self.user_no_roles = User.objects.create_user(
                username="norole@test.com",
                email="norole@test.com",
                password="password123",
            )

            Membership.objects.create(
                user=self.admin_user,
                role=self.role_admin,
                residence=self.residence_obj,
                is_active=True,
            )
            Membership.objects.create(
                user=self.student_a,
                role=self.role_student,
                residence=self.residence_obj,
                is_active=True,
            )

            self.inc_a = Incidence.objects.create(
                title="Incidencia A",
                location_type="habitacion",
                student=self.student_a,
                room_number="101",
            )

        self.list_url = reverse("incidence-list")

        # Simulamos que el admin_user tiene acceso
        def mock_has_screen_permission(user, residence, screen):
            return user == self.admin_user or getattr(user, "is_staff", False)

        self.mock_has_perm.side_effect = mock_has_screen_permission

    def tearDown(self):
        with schema_context(self.tenant.schema_name):
            IncidenceUpdate.objects.all().delete()
            Incidence.objects.all().delete()
            Membership.objects.all().delete()
            User.objects.all().delete()
        super().tearDown()

    @classmethod
    def tearDownClass(cls):
        if hasattr(cls, "tenant"):
            connection.set_schema(cls.tenant.schema_name)
        try:
            super().tearDownClass()
        except Exception:
            pass

    def get_results(self, data):
        return data["results"] if isinstance(data, dict) and "results" in data else data

    def test_get_queryset_admin(self):
        self.client.force_authenticate(user=self.admin_user)
        res = self.client.get(self.list_url, HTTP_HOST=self.host)
        self.assertEqual(len(self.get_results(res.data)), 1)

    def test_get_queryset_student_privacy(self):
        with schema_context(self.tenant.schema_name):
            Incidence.objects.create(
                title="Privada B", location_type="habitacion", student=self.student_b
            )
        self.client.force_authenticate(user=self.student_a)
        res = self.client.get(self.list_url, HTTP_HOST=self.host)
        self.assertEqual(len(self.get_results(res.data)), 1)

    def test_serializer_admin(self):
        self.client.force_authenticate(user=self.admin_user)
        res = self.client.get(
            reverse("incidence-detail", args=[self.inc_a.id]), HTTP_HOST=self.host
        )
        self.assertIn("student", res.data)

    def test_serializer_student(self):
        self.client.force_authenticate(user=self.student_a)
        res = self.client.get(
            reverse("incidence-detail", args=[self.inc_a.id]), HTTP_HOST=self.host
        )
        self.assertNotIn("student", res.data)

    def test_perform_create_staff(self):
        self.admin_user.is_staff = True
        self.admin_user.save()
        self.client.force_authenticate(user=self.admin_user)
        res = self.client.post(
            self.list_url,
            {"title": "S", "description": "D", "location_type": "exterior"},
            HTTP_HOST=self.host,
        )
        self.assertEqual(res.status_code, 201)

    def test_perform_create_resident_logic(self):
        self.client.force_authenticate(user=self.student_a)
        res = self.client.post(
            self.list_url,
            {"title": "S", "description": "D", "location_type": "habitacion"},
            HTTP_HOST=self.host,
        )
        self.assertEqual(res.data["room_number"], "3º A")

    def test_perform_update_full_logs(self):
        self.client.force_authenticate(user=self.admin_user)
        url = reverse("incidence-detail", args=[self.inc_a.id])
        data = {
            "status": "resolved",
            "assigned_external_name": "Pepe",
            "quick_comment": "OK",
        }
        self.client.patch(url, data, HTTP_HOST=self.host)
        with schema_context(self.tenant.schema_name):
            log = IncidenceUpdate.objects.filter(incidence=self.inc_a).last()
            self.assertTrue(
                "Estado" in log.text and "Asignada" in log.text and "Nota" in log.text
            )

    def test_perform_update_remove_assignee(self):
        with schema_context(self.tenant.schema_name):
            self.inc_a.assigned_external_name = "Si"
            self.inc_a.save()
        self.client.force_authenticate(user=self.admin_user)
        self.client.patch(
            reverse("incidence-detail", args=[self.inc_a.id]),
            {"assigned_external_name": ""},
            HTTP_HOST=self.host,
        )
        with schema_context(self.tenant.schema_name):
            log = IncidenceUpdate.objects.filter(incidence=self.inc_a).last()
            self.assertIn("retirado", log.text)

    def test_perform_destroy(self):
        self.client.force_authenticate(user=self.admin_user)
        self.client.delete(
            reverse("incidence-detail", args=[self.inc_a.id]), HTTP_HOST=self.host
        )
        with schema_context(self.tenant.schema_name):
            self.inc_a.refresh_from_db()
            self.assertFalse(self.inc_a.is_active)

    def test_notifications_staff(self):
        self.admin_user.is_staff = True
        self.admin_user.save()
        self.client.force_authenticate(user=self.admin_user)
        res = self.client.get(reverse("incidence-notifications"), HTTP_HOST=self.host)
        self.assertEqual(res.status_code, 200)

    def test_notifications_resident_and_helpers(self):
        with schema_context(self.tenant.schema_name):
            Incidence.objects.create(
                title="Aviso de Maria", location_type="cocina", student=self.student_b
            )
            IncidenceUpdate.objects.create(
                incidence=self.inc_a, author_name="Admin", text="Update"
            )

        self.client.force_authenticate(user=self.student_a)
        res = self.client.get(reverse("incidence-notifications"), HTTP_HOST=self.host)

        results = res.data["results"]
        self.assertGreater(len(results), 0)
        self.assertIn("location_label", results[0])

    def test_serializer_for_user_without_roles(self):
        """Verifica que un usuario sin roles usa AdminIncidenceSerializer al ver una zona común"""
        with schema_context(self.tenant.schema_name):
            inc_comun = Incidence.objects.create(
                title="Bombilla fundida", location_type="cocina", student=self.student_b
            )

        self.client.force_authenticate(user=self.user_no_roles)
        res = self.client.get(
            reverse("incidence-detail", args=[inc_comun.id]), HTTP_HOST=self.host
        )

        self.assertEqual(res.status_code, status.HTTP_200_OK)

        self.assertIn("student", res.data)

    def test_notifications_sorting_and_limit(self):
        """Verifica que las notificaciones respetan el límite de 8 y el orden cronológico"""
        self.admin_user.is_staff = True
        self.admin_user.save()
        self.client.force_authenticate(user=self.admin_user)

        with schema_context(self.tenant.schema_name):
            for i in range(10):
                Incidence.objects.create(
                    title=f"Test {i}", location_type="exterior", student=self.student_a
                )

        res = self.client.get(reverse("incidence-notifications"), HTTP_HOST=self.host)
        self.assertEqual(len(res.data["results"]), 8)
        self.assertIn("Test 9", res.data["results"][0]["message"])

    def test_notifications_resident_privacy_filter(self):
        """Verifica que los residentes NO ven notificaciones de habitaciones ajenas"""
        with schema_context(self.tenant.schema_name):
            # Student B crea algo en su habitación
            Incidence.objects.create(
                title="Secreto", location_type="habitacion", student=self.student_b
            )

        self.client.force_authenticate(user=self.student_a)
        res = self.client.get(reverse("incidence-notifications"), HTTP_HOST=self.host)

        # Student A no debería recibir nada
        messages = [n["message"] for n in res.data["results"]]
        for msg in messages:
            self.assertNotIn("Secreto", msg)


class IncidenceSerializersTests(TestCase):
    def setUp(self):
        self.factory = RequestFactory()
        # Usuario mock
        self.user = MagicMock()
        self.user.id = 1
        self.user.username = "student1"
        self.user.get_full_name.return_value = "Student One"
        self.user.memberships.filter.return_value.values_list.return_value = []

        # Usuario admin mock
        self.admin_user = MagicMock()
        self.admin_user.id = 2
        self.admin_user.username = "admin1"
        self.admin_user.is_staff = True
        self.admin_user.memberships.filter.return_value.values_list.return_value = [
            "admin"
        ]

        # Objeto incidencia mock
        self.incidence = MagicMock()
        self.incidence.id = 10
        self.incidence.student_id = 1
        self.incidence.student = self.user
        self.incidence.status = "pending"
        self.incidence.priority = "high"
        self.incidence.assigned_staff_id = None
        self.incidence.location_type = "habitacion"

    def test_incidence_update_serializer_fields(self):
        class FakeAuthor:
            def get_full_name(self):
                return "Author Name"

        update = MagicMock()
        update.author = FakeAuthor()
        update.id = 1
        update.text = "Update text"
        update.created_at = "2026-03-24T12:00:00Z"

        serializer = IncidenceUpdateSerializer(update)
        data = serializer.data
        self.assertEqual(data["author_name"], "Author Name")
        self.assertEqual(data["text"], "Update text")

    def test_incidence_serializer_is_mine_true(self):
        request = self.factory.get("/")
        request.user = self.user
        serializer = IncidenceSerializer(self.incidence, context={"request": request})
        self.assertTrue(serializer.get_is_mine(self.incidence))

    def test_incidence_serializer_is_mine_false(self):
        request = self.factory.get("/")
        request.user = self.admin_user
        serializer = IncidenceSerializer(self.incidence, context={"request": request})
        self.assertFalse(serializer.get_is_mine(self.incidence))

    def test_incidence_serializer_student_name(self):
        serializer = IncidenceSerializer(self.incidence)
        name = serializer.get_student_name(self.incidence)
        self.assertEqual(name, "Student One")

    def test_validate_modify_fields_as_owner(self):
        request = self.factory.patch("/")
        request.user = self.user
        serializer = IncidenceSerializer(
            instance=self.incidence,
            data={"title": "New Title"},
            context={"request": request},
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        self.assertEqual(serializer.validated_data["title"], "New Title")

    def test_validate_modify_fields_as_non_owner(self):
        request = self.factory.patch("/")
        other_user = MagicMock()
        other_user.id = 99
        other_user.memberships.filter.return_value.values_list.return_value = []
        request.user = other_user

        serializer = IncidenceSerializer(
            instance=self.incidence,
            data={"title": "New Title"},
            context={"request": request},
            partial=True,
        )
        with self.assertRaises(ValidationError):
            serializer.is_valid(raise_exception=True)

    def test_admin_incidence_serializer_student_name(self):
        serializer = AdminIncidenceSerializer(self.incidence)
        self.assertEqual(serializer.get_student_name(self.incidence), "Student One")

    def test_get_student_name_no_student(self):
        inc = MagicMock()
        inc.student = None
        serializer = IncidenceSerializer(inc)
        self.assertEqual(serializer.get_student_name(inc), "Sistema")

    def test_get_student_name_username_if_no_fullname(self):
        student = MagicMock()
        student.get_full_name.return_value = ""
        student.username = "u123"
        inc = MagicMock()
        inc.student = student
        serializer = IncidenceSerializer(inc)
        self.assertEqual(serializer.get_student_name(inc), "u123")

    def test_get_is_mine_no_request(self):
        inc = MagicMock()
        inc.student_id = 5
        serializer = IncidenceSerializer(inc, context={})
        self.assertFalse(serializer.get_is_mine(inc))

    def test_validate_non_admin_cannot_change_status(self):
        request = self.factory.patch("/")
        other_user = MagicMock()
        other_user.id = 99
        other_user.memberships.filter.return_value.values_list.return_value = []
        request.user = other_user

        inc_instance = MagicMock()
        inc_instance.student_id = 1
        inc_instance.status = "pending"
        inc_instance.priority = "high"
        inc_instance.assigned_staff_id = None

        serializer = IncidenceSerializer(
            instance=inc_instance,
            data={"status": "resolved"},
            context={"request": request},
            partial=True,
        )
        with self.assertRaises(ValidationError):
            serializer.is_valid(raise_exception=True)

    def test_validate_priority_owner_non_pending(self):
        request = self.factory.patch("/")
        request.user = self.user

        inc_instance = MagicMock()
        inc_instance.student_id = 1
        inc_instance.status = "in_progress"
        inc_instance.priority = "high"
        inc_instance.assigned_staff_id = None
        inc_instance.title = "t"
        inc_instance.description = ""
        inc_instance.location_type = "habitacion"
        inc_instance.img = None
        inc_instance.room_number = ""

        serializer = IncidenceSerializer(
            instance=inc_instance,
            data={"priority": "low"},
            context={"request": request},
            partial=True,
        )
        with self.assertRaises(ValidationError):
            serializer.is_valid(raise_exception=True)

    def test_admin_can_change_status(self):
        request = self.factory.patch("/")
        admin = MagicMock()
        admin.id = 2
        admin.is_staff = True
        admin.memberships.filter.return_value.values_list.return_value = ["admin"]
        request.user = admin

        inc_instance = MagicMock()
        inc_instance.student_id = 1
        inc_instance.status = "pending"
        inc_instance.priority = "high"
        inc_instance.assigned_staff_id = None

        serializer = IncidenceSerializer(
            instance=inc_instance,
            data={"status": "resolved"},
            context={"request": request},
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        self.assertEqual(serializer.validated_data["status"], "resolved")


class PermissionsTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.permission = IsAdminOrReadOnly()

        # Estudiante propietario
        self.student = MagicMock()
        self.student.id = 1

        # Admin
        self.admin = MagicMock()
        self.admin.id = 2
        self.admin.is_staff = True
        self.admin.memberships.filter.return_value.values_list.return_value = ["admin"]

        # Incidencia
        class FakeIncidence:
            def __init__(self, student, status, location_type):
                self.student = student
                self.status = status
                self.location_type = location_type

        self.incidence = FakeIncidence(
            student=self.student, status="pending", location_type="habitacion"
        )

    def test_has_permission_authenticated(self):
        request = self.factory.get("/")
        request.user = self.student
        self.assertTrue(self.permission.has_permission(request, None))

    def test_has_permission_unauthenticated(self):
        request = self.factory.get("/")
        request.user = None
        self.assertFalse(self.permission.has_permission(request, None))

    @patch("apps.incidences.permissions.has_screen_permission")
    def test_has_object_permission_admin(self, mock_has_perm):
        mock_has_perm.return_value = True
        request = self.factory.get("/")
        request.user = self.admin
        self.assertTrue(
            self.permission.has_object_permission(request, None, self.incidence)
        )

    @patch("apps.incidences.permissions.has_screen_permission")
    def test_has_object_permission_student_safe_method(self, mock_has_perm):
        mock_has_perm.return_value = False
        request = self.factory.get("/")
        request.user = self.student
        self.assertTrue(
            self.permission.has_object_permission(request, None, self.incidence)
        )

    @patch("apps.incidences.permissions.has_screen_permission")
    def test_has_object_permission_student_put_pending(self, mock_has_perm):
        mock_has_perm.return_value = False
        request = self.factory.put("/")
        request.user = self.student
        self.assertTrue(
            self.permission.has_object_permission(request, None, self.incidence)
        )

    @patch("apps.incidences.permissions.has_screen_permission")
    def test_has_object_permission_student_put_non_pending(self, mock_has_perm):
        mock_has_perm.return_value = False
        request = self.factory.put("/")
        request.user = self.student
        self.incidence.status = "in_progress"
        self.assertFalse(
            self.permission.has_object_permission(request, None, self.incidence)
        )

    @patch("apps.incidences.permissions.has_screen_permission")
    def test_memberships_filter_raises_exception_safe_method_non_habitacion(
        self, mock_has_perm
    ):
        mock_has_perm.return_value = False
        bad_user = MagicMock()
        bad_user.id = 3
        bad_user.is_staff = False

        request = self.factory.get("/")
        request.user = bad_user

        class FakeInc:
            def __init__(self):
                self.student = MagicMock(id=1)
                self.location_type = "cocina"
                self.status = "pending"

        inc = FakeInc()
        self.assertTrue(self.permission.has_object_permission(request, None, inc))

    @patch("apps.incidences.permissions.has_screen_permission")
    def test_memberships_filter_raises_exception_safe_method_habitacion_non_owner(
        self, mock_has_perm
    ):
        mock_has_perm.return_value = False
        bad_user = MagicMock()
        bad_user.id = 3
        bad_user.is_staff = False

        request = self.factory.get("/")
        request.user = bad_user

        class FakeInc2:
            def __init__(self):
                self.student = MagicMock(id=1)
                self.location_type = "habitacion"
                self.status = "pending"

        inc2 = FakeInc2()
        self.assertFalse(self.permission.has_object_permission(request, None, inc2))
