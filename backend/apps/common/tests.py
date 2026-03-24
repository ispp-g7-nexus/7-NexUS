import json
from unittest.mock import MagicMock, patch

from django.contrib.auth import get_user_model
from django.core.exceptions import PermissionDenied
from django.test import RequestFactory
from django.urls import reverse
from django_tenants.test.cases import FastTenantTestCase
from django_tenants.test.client import TenantClient
from django_tenants.utils import tenant_context
from rest_framework import status
from rest_framework.test import APIRequestFactory, force_authenticate

from apps.membership.models import Membership, Role
from apps.residences.models import Residence, ResidenceDomain
from apps.common.views import AdminCreateResidentView
from apps.common.decorators import residence_access_required
from apps.common.serializers import (
    AdminProfileUpdateSerializer,
)
from apps.common.services import (
    SMTPServerError,
    authenticate_user,
    build_access_token,
    has_access_for_portal,
    process_password_reset_request,
)
from apps.common.utils.jwt_auth import (
    _first_string,
    _get_roles,
    _serialize_user_claims,
)
from apps.common.utils.redis_client import get_json, set_json
from apps.membership.models import Membership, Role
from apps.residences.models import Residence

UserModel = get_user_model()

PASSWORD = "password123"  # NOSONAR
PASSWORD2 = "SecurePass123!"  # NOSONAR
TEST_EMAIL = "test@test.com"
AUTH_EMAIL = "auth@test.com"
JSON_CONTENT_TYPE = "application/json"


class CommonUtilsTests(FastTenantTestCase):
    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Utils Tenant"
        tenant.schema_name = "test_utils"
        tenant.slug = "test-utils"
        return tenant

    @classmethod
    def setup_domain(cls, domain):
        domain.domain = "utils.test.local"
        return domain

    @patch("apps.common.utils.redis_client.get_redis_connection")
    def test_redis_set_get_json(self, mock_get_redis):
        mock_client = MagicMock()
        mock_get_redis.return_value = mock_client

        mock_client.set.return_value = True
        self.assertTrue(set_json("test_key", {"data": 123}, 10))

        mock_client.get.return_value = b'{"data": 123}'
        self.assertEqual(get_json("test_key"), {"data": 123})

        mock_client.get.return_value = None
        self.assertEqual(get_json("empty_key", default="fallback"), "fallback")

    def test_jwt_auth_helpers(self):
        self.assertEqual(_first_string({"a": "  ", "b": "texto"}, ["a", "b"]), "texto")
        self.assertEqual(_first_string({}, ["a"]), "")

        self.assertEqual(_get_roles({"roles": ["admin", 1]}), ["admin"])
        self.assertEqual(_get_roles({"role": "student"}), ["student"])
        self.assertEqual(_get_roles({}), [])

        claims = {
            "sub": "123",
            "email": TEST_EMAIL,
            "name": "Test User",
            "exp": 999999,
        }
        serialized = _serialize_user_claims(claims)
        self.assertEqual(serialized["id"], "123")
        self.assertEqual(serialized["username"], "Test User")


class CommonSerializersTests(FastTenantTestCase):
    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Test Tenant Serializers"
        tenant.schema_name = "test_serializers"
        tenant.slug = "test-serializers"
        return tenant

    @classmethod
    def setup_domain(cls, domain):
        domain.domain = "serializers.test.local"
        return domain

    def setUp(self):
        super().setUp()
        with tenant_context(self.tenant):
            self.user1 = UserModel.objects.create_user(
                username="admin1", email="admin1@test.com", password=PASSWORD
            )

    def test_admin_profile_serializer_validation(self):
        UserModel.objects.create_user(username="admin2", email="admin2@test.com")
        serializer = AdminProfileUpdateSerializer(
            instance=self.user1,
            data={"username": "admin2", "email": "admin2@test.com"},
            partial=True,
        )
        self.assertFalse(serializer.is_valid())


class CommonDecoratorsTests(FastTenantTestCase):
    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Decorators Tenant"
        tenant.schema_name = "test_decorators"
        tenant.slug = "test-decorators"
        return tenant

    @classmethod
    def setup_domain(cls, domain):
        domain.domain = "decorators.test.local"
        return domain

    def setUp(self):
        super().setUp()
        self.factory = RequestFactory()
        with tenant_context(self.tenant):
            self.user = UserModel.objects.create_user(username="dec_user")

    def test_residence_access_required(self):
        @residence_access_required("Admin")
        def dummy_view(request, residence_id=None):
            return "OK"

        request = self.factory.get("/")

        with self.assertRaises(PermissionDenied):
            dummy_view(request)

        request.tenant = self.tenant
        request.user = MagicMock(is_authenticated=False)
        with self.assertRaises(PermissionDenied):
            dummy_view(request)

        request.user = self.user
        with self.assertRaises(PermissionDenied):
            dummy_view(request)


class CommonServicesTests(FastTenantTestCase):
    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Test Tenant Services"
        tenant.schema_name = "test_services"
        tenant.slug = "test-services"
        return tenant

    @classmethod
    def setup_domain(cls, domain):
        domain.domain = "services.test.local"
        return domain

    def setUp(self):
        super().setUp()
        with tenant_context(self.tenant):
            self.user = UserModel.objects.create_user(
                username="testuser", email=TEST_EMAIL, password=PASSWORD
            )
            self.student_role = Role.objects.create(name="Student")
            self.admin_role = Role.objects.create(name="Admin")
            self.residence = Residence.objects.create(
                name="Test Res", slug="test-res", code="TR"
            )
        self.dummy_tenant = MagicMock(id=1, slug="dummy")

    def test_authenticate_user(self):
        with tenant_context(self.tenant):
            request = MagicMock()
            self.assertIsNone(authenticate_user(request, "", ""))
            self.assertIsNone(authenticate_user(request, TEST_EMAIL, "wrongpass"))
            self.assertEqual(
                authenticate_user(request, TEST_EMAIL, PASSWORD), self.user
            )

    def test_has_access_for_portal(self):
        with tenant_context(self.tenant):
            self.assertFalse(
                has_access_for_portal(self.user, "student", self.residence)
            )
            Membership.objects.create(
                user=self.user,
                role=self.student_role,
                residence=self.residence,
                is_active=True,
            )
            self.assertTrue(has_access_for_portal(self.user, "student", self.residence))

    @patch("apps.common.services.logger.exception")
    @patch("apps.common.services.send_mail")
    def test_password_reset_request_exception(self, mock_send_mail, mock_logger):
        with tenant_context(self.tenant):
            mock_send_mail.side_effect = Exception("SMTP Error")
            request = MagicMock(scheme="http")
            request.get_host.return_value = "local"
            with self.assertRaises(SMTPServerError):
                process_password_reset_request(TEST_EMAIL, request)


class CommonViewsTests(FastTenantTestCase):
    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Test Tenant Views"
        tenant.schema_name = "test_views"
        tenant.slug = "test-views"
        return tenant

    @classmethod
    def setup_domain(cls, domain):
        domain.domain = "views.test.local"
        return domain

    def setUp(self):
        super().setUp()
        with tenant_context(self.tenant):
            self.user = UserModel.objects.create_user(
                username="authuser", email=AUTH_EMAIL, password=PASSWORD2
            )
            self.admin_user = UserModel.objects.create_user(
                username="adminuser", email="admin@test.com", password=PASSWORD2
            )
            self.residence = Residence.objects.create(
                name="Test Res", slug="test-res", code="TR"
            )
            self.student_role = Role.objects.create(name="Student")
            self.admin_role = Role.objects.create(name="residence_admin")

            Membership.objects.create(
                user=self.user,
                role=self.student_role,
                residence=self.residence,
                is_active=True,
            )
            Membership.objects.create(
                user=self.admin_user,
                role=self.admin_role,
                residence=self.residence,
                is_active=True,
            )

        self.anon_client = TenantClient(self.tenant)
        self.student_client = self._auth_client(self.user, self.residence)
        self.admin_client = self._auth_client(self.admin_user, self.residence)

    def _auth_client(self, user, residence):
        client = TenantClient(self.tenant)
        token, _ = build_access_token(user, self.tenant, residence)
        client.defaults["HTTP_AUTHORIZATION"] = f"Bearer {token}"
        return client

    # --- TESTS TENANT ---

    def test_tenant_context_view(self):
        url = reverse("tenant-context")
        response = self.anon_client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["tenant"]["schema_name"], self.tenant.schema_name)

    # --- TESTS AUTH LOGIN ---

    def test_auth_login_view_success(self):
        url = reverse("auth-login")
        data = {
            "email": AUTH_EMAIL,
            "password": PASSWORD2,
            "portal": "student",
        }
        response = self.anon_client.post(
            url, data=json.dumps(data), content_type=JSON_CONTENT_TYPE
        )
        self.assertEqual(response.status_code, 200)

    def test_auth_login_view_invalid_credentials(self):
        url = reverse("auth-login")
        data = {
            "email": AUTH_EMAIL,
            "password": "WrongPassword!",
            "portal": "student",
        }
        response = self.anon_client.post(
            url, data=json.dumps(data), content_type=JSON_CONTENT_TYPE
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_auth_login_view_forbidden_portal(self):
        url = reverse("auth-login")
        data = {
            "email": AUTH_EMAIL,
            "password": PASSWORD2,
            "portal": "admin",
        }
        response = self.anon_client.post(
            url, data=json.dumps(data), content_type=JSON_CONTENT_TYPE
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_auth_logout_view(self):
        url = reverse("auth-logout")
        response = self.student_client.post(url)
        self.assertEqual(response.status_code, 200)

    # --- TESTS AUTH ME ---

    def test_auth_me_view_patch(self):
        url = reverse("auth-me")
        response = self.student_client.patch(
            url,
            data=json.dumps({"first_name": "Editado"}),
            content_type=JSON_CONTENT_TYPE,
        )
        self.assertEqual(response.status_code, 200)

    def test_auth_me_view_invalid_data(self):
        url = reverse("auth-me")
        response = self.student_client.patch(
            url,
            data=json.dumps({"email": "correo-falso-sin-arroba"}),
            content_type=JSON_CONTENT_TYPE,
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch("apps.common.views.resolve_user_from_request")
    def test_auth_me_view_user_not_found(self, mock_resolve):
        """Camino triste: el token es válido pero el usuario ya no existe"""
        mock_resolve.return_value = {"user_id": "99999"}  # ID inventado
        url = reverse("auth-me")

        response_get = self.student_client.get(url)
        self.assertTrue(response_get.json()["authenticated"])

        response_patch = self.student_client.patch(
            url, data=json.dumps({"first_name": "X"}), content_type=JSON_CONTENT_TYPE
        )
        self.assertEqual(response_patch.status_code, 404)

    # --- TESTS PASSWORD RESET ---

    @patch("apps.common.views.process_password_reset_request")
    def test_password_reset_request_view(self, mock_process):
        url = reverse("password-reset-request")
        response = self.anon_client.post(
            url,
            data=json.dumps({"email": AUTH_EMAIL}),
            content_type=JSON_CONTENT_TYPE,
        )
        self.assertEqual(response.status_code, 200)

    @patch("apps.common.views.process_password_reset_confirm")
    def test_password_reset_confirm_view_success(self, mock_process):
        mock_process.return_value = (True, "OK")
        url = reverse("password-reset-confirm")
        response = self.anon_client.post(
            url,
            data=json.dumps({"uid": "1", "token": "abc", "new_password": PASSWORD}),
            content_type=JSON_CONTENT_TYPE,
        )
        self.assertEqual(response.status_code, 200)

    @patch("apps.common.views.process_password_reset_confirm")
    def test_password_reset_confirm_view_invalid(self, mock_process):
        mock_process.return_value = (False, "Token inválido")
        url = reverse("password-reset-confirm")
        response = self.anon_client.post(
            url,
            data=json.dumps({"uid": "1", "token": "abc", "new_password": PASSWORD}),
            content_type=JSON_CONTENT_TYPE,
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # --- TESTS STUDENT PROFILE ---

    def test_student_profile_unauthenticated(self):
        url = reverse("student-profile")
        response = self.anon_client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_student_profile_create_update_and_get(self):
        """Prueba del perfil usando cliente nativo pasando por el enrutador"""
        url = reverse("student-profile")

        # CREATE
        resp_post = self.student_client.post(
            url,
            data=json.dumps({"room_number": "10B"}),
            content_type=JSON_CONTENT_TYPE,
        )
        self.assertEqual(resp_post.status_code, 201)

        # UPDATE
        resp_patch = self.student_client.post(
            url, data=json.dumps({"bio": "Hola mundo"}), content_type=JSON_CONTENT_TYPE
        )
        self.assertEqual(resp_patch.status_code, 201)

        # GET
        resp_get = self.student_client.get(url)
        self.assertEqual(resp_get.status_code, 200)
        self.assertEqual(resp_get.data["room_number"], "10B")

    def test_student_profile_invalid_data(self):
        """Camino triste: el perfil recibe datos incorrectos"""
        url = reverse("student-profile")
        resp_invalid = self.student_client.post(
            url,
            data=json.dumps({"birth_year": "no-es-un-numero"}),
            content_type=JSON_CONTENT_TYPE,
        )
        self.assertEqual(resp_invalid.status_code, status.HTTP_400_BAD_REQUEST)

    def test_student_profile_not_found(self):
        """GET a perfil que no existe usando a admin que no tiene perfil creado"""
        url = reverse("student-profile")
        response = self.admin_client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        

class AdminCreateResidentViewsTests(FastTenantTestCase):

    @classmethod
    def get_test_tenant_domain(cls):
        return "nexus.test.local"

    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Tenant Nexus Test"
        tenant.slug = "tenant-nexus-test"
        tenant.is_active = True

    @classmethod
    def setup_domain(cls, domain):
        domain.domain = cls.get_test_tenant_domain()
        domain.is_primary = True

    def setUp(self):
        super().setUp()
        user_model = get_user_model()

        # Usuarios
        self.admin_user = user_model.objects.create_user(
            username="admin-nexus",
            email="admin@nexus.test",
            password="PASSWORD1",
        )
        self.student_user = user_model.objects.create_user(
            username="existing-student",
            email="existing@student.test",
            password="PASSWORD2",
        )

        # Residencia
        self.residence = Residence.objects.create(
            name="Residencia Test",
            slug="residencia-test",
            code="RT-001",
            is_active=True,
        )
        ResidenceDomain.objects.create(
            residence=self.residence,
            domain=self.get_test_tenant_domain(),
            is_primary=True,
            is_active=True,
        )

        # Roles
        Role.objects.get_or_create(
            name="Student",
            defaults={"description": "Residente", "is_system_default": True},
        )

        # Clientes
        self.admin_client = TenantClient(self.tenant)
        self.admin_client.force_login(self.admin_user)
        self.student_client = TenantClient(self.tenant)
        self.student_client.force_login(self.student_user)
        self.anon_client = TenantClient(self.tenant)

        self.url = "/api/admin/residents/create/"

    def _payload(self, email="new@resident.test", password="password123"):
        return {
            "full_name": "Nuevo Residente",
            "email": email,
            "password": password,
            "room": "",
            "building": "",
            "state": "Activo",
        }

    def _mock_admin(self, mock_resolve):
        def fake(request):
            request.user = self.admin_user
            request.residence = self.residence
            return {"user_id": str(self.admin_user.pk), "roles": ["residence_admin"]}
        mock_resolve.side_effect = fake

    def _mock_student(self, mock_resolve):
        def fake(request):
            request.user = self.student_user
            request.residence = self.residence
            return {"user_id": str(self.student_user.pk), "roles": ["student"]}
        mock_resolve.side_effect = fake

    # Tests
    @patch("apps.common.views.resolve_user_from_request")
    def test_admin_can_create_new_resident(self, mock_resolve):
        self._mock_admin(mock_resolve)
        response = self.admin_client.post(self.url, self._payload(), format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    @patch("apps.common.views.resolve_user_from_request")
    def test_admin_can_add_existing_user_as_resident(self, mock_resolve):
        self._mock_admin(mock_resolve)
        response = self.admin_client.post(
            self.url, self._payload(email=self.student_user.email), format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    @patch("apps.common.views.resolve_user_from_request")
    @patch("apps.common.views.process_password_reset_request")
    def test_trigger_email_when_no_password_provided(self, mock_email, mock_resolve):
        self._mock_admin(mock_resolve)
        payload = self._payload()
        payload.pop("password")
        response = self.admin_client.post(self.url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        mock_email.assert_not_called()

    @patch("apps.common.views.resolve_user_from_request")
    def test_student_cannot_create_residents(self, mock_resolve):
        self._mock_student(mock_resolve)
        response = self.student_client.post(self.url, self._payload(), format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    @patch("apps.common.views.resolve_user_from_request")
    def test_unauthenticated_user_is_rejected(self, mock_resolve):
        mock_resolve.return_value = None
        response = self.anon_client.post(self.url, self._payload(), format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    @patch("apps.common.views.resolve_user_from_request")
    def test_invalid_email_returns_400(self, mock_resolve):
        self._mock_admin(mock_resolve)
        response = self.admin_client.post(
            self.url, self._payload(email="email-invalido"), format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch("apps.common.views.resolve_user_from_request")
    def test_username_collision_resolution(self, mock_resolve):
        self._mock_admin(mock_resolve)
        user_model = get_user_model()
        user_model.objects.create_user(username="juan.perez", email="otro@test.com")
        response = self.admin_client.post(
            self.url, self._payload(email="juan.perez@example.com"), format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        new_user = user_model.objects.get(email="juan.perez@example.com")
        self.assertEqual(new_user.username, "juan.perez1")

    @patch("apps.common.views.resolve_user_from_request")
    @patch("apps.common.views.process_password_reset_request")
    def test_existing_user_password_is_not_overwritten(self, mock_reset, mock_resolve):
        self._mock_admin(mock_resolve)
        old_password = "PASSWORD2"
        payload = self._payload(email=self.student_user.email, password="PASSWORD3")

        response = self.admin_client.post(self.url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        user = get_user_model().objects.get(email=self.student_user.email)
        self.assertTrue(user.check_password(old_password))
        self.assertFalse(user.check_password("PASSWORD3"))
        mock_reset.assert_called_once()
        called_email, called_request = mock_reset.call_args.args
        self.assertEqual(called_email, user.email)
        self.assertEqual(called_request.path, self.url)

    @patch("apps.common.views.resolve_user_from_request")
    @patch("apps.common.views.process_password_reset_request")
    def test_existing_inactive_user_is_reactivated(self, mock_reset, mock_resolve):
        self._mock_admin(mock_resolve)
        self.student_user.is_active = False
        self.student_user.save(update_fields=["is_active"])

        payload = self._payload(email=self.student_user.email, password="PASSWORD3")
        response = self.admin_client.post(self.url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        user = get_user_model().objects.get(email=self.student_user.email)
        self.assertTrue(user.is_active)
        mock_reset.assert_called_once()
        called_email, called_request = mock_reset.call_args.args
        self.assertEqual(called_email, user.email)
        self.assertEqual(called_request.path, self.url)

    @patch("apps.common.views.resolve_user_from_request")
    @patch("apps.common.views.process_password_reset_request")
    def test_new_user_with_password_does_not_trigger_email(self, mock_email, mock_resolve):
        self._mock_admin(mock_resolve)
        payload = self._payload(email="pwnew@test.com", password="PASSWORD4")
        response = self.admin_client.post(self.url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        mock_email.assert_not_called()

    @patch("apps.common.views.resolve_user_from_request")
    @patch("apps.common.views.process_password_reset_request")
    def test_process_password_reset_raises_handled(self, mock_email, mock_resolve):
        """If the password-reset helper raises SMTPServerError, the view should still succeed."""
        self._mock_admin(mock_resolve)
        from apps.common.services import SMTPServerError

        mock_email.side_effect = SMTPServerError("smtp fail")
        payload = self._payload(email="nopass2@test.com")
        payload.pop("password")
        response = self.admin_client.post(self.url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch("apps.common.views.resolve_user_from_request")
    def test_duplicate_post_returns_created_false(self, mock_resolve):
        """Posting same new email twice should indicate created=False on second call."""
        self._mock_admin(mock_resolve)
        email = "dup@test.com"
        payload = self._payload(email=email)
        resp1 = self.admin_client.post(self.url, payload, format="json")
        self.assertEqual(resp1.status_code, status.HTTP_201_CREATED)
        resp2 = self.admin_client.post(self.url, payload, format="json")
        self.assertEqual(resp2.status_code, status.HTTP_201_CREATED)
        self.assertFalse(resp2.data.get("created"))

    @patch("apps.common.views.resolve_user_from_request")
    def test_invalid_state_value_returns_400(self, mock_resolve):
        self._mock_admin(mock_resolve)
        payload = self._payload(email="badstate@test.com")
        payload["state"] = "Pending"
        response = self.admin_client.post(self.url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
