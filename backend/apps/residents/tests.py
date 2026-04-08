from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import RequestFactory
from django_tenants.test.cases import FastTenantTestCase
from django_tenants.test.client import TenantClient

from apps.bedrooms.models import Bedroom
from apps.common.services import build_access_token
from apps.membership.models import Membership, Role
from apps.residences.models import Residence, ResidenceDomain
from apps.residents.permissions import IsResidenceAdmin

UserModel = get_user_model()
PASSWORD = "demo1234"  # NOSONAR  # noqa: S105


def _create_admin_and_student_roles():
    admin_role = Role.objects.create(
        name="Admin", description="Administrador", is_system_default=True, residence=None,
    )
    student_role = Role.objects.create(
        name="Student", description="Residente", is_system_default=True, residence=None,
    )
    return admin_role, student_role


class IsResidenceAdminPermissionTests(FastTenantTestCase):
    @classmethod
    def get_test_tenant_domain(cls):
        return "residents-perm.test.local"

    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Tenant Residents Perm"
        tenant.slug = "tenant-residents-perm"
        tenant.is_active = True

    @classmethod
    def setup_domain(cls, domain):
        domain.domain = cls.get_test_tenant_domain()
        domain.is_primary = True

    def setUp(self):
        super().setUp()
        self.factory = RequestFactory()
        self.permission = IsResidenceAdmin()

        self.residence = Residence.objects.create(
            name="Residencia Perm",
            slug="res-perm-res",
            code="RPR-001",
            timezone="Europe/Madrid",
            is_active=True,
        )
        ResidenceDomain.objects.create(
            residence=self.residence,
            domain=self.get_test_tenant_domain(),
            is_primary=True,
            is_active=True,
        )
        self.admin_role = Role.objects.create(
            name="residence_admin",
            description="Admin",
            is_system_default=False,
            residence=self.residence,
        )
        self.student_role, _ = Role.objects.get_or_create(
            name="Student",
            defaults={"description": "Student", "is_system_default": True, "residence": None},
        )
        self.admin_user = UserModel.objects.create_user(
            username="res-admin-perm",
            email="res-admin-perm@test.com",
            password=PASSWORD,
        )
        self.student_user = UserModel.objects.create_user(
            username="res-student-perm",
            email="res-student-perm@test.com",
            password=PASSWORD,
        )
        Membership.objects.create(
            user=self.admin_user,
            role=self.admin_role,
            residence=self.residence,
            is_active=True,
        )
        Membership.objects.create(
            user=self.student_user,
            role=self.student_role,
            residence=self.residence,
            is_active=True,
        )

    def _request(self, user, residence=None):
        request = self.factory.get("/")
        request.user = user
        request.residence = residence
        return request

    def test_admin_with_residence_has_permission(self):
        request = self._request(self.admin_user, self.residence)
        self.assertTrue(self.permission.has_permission(request, None))

    def test_student_is_denied(self):
        request = self._request(self.student_user, self.residence)
        self.assertFalse(self.permission.has_permission(request, None))

    def test_no_residence_context_is_denied(self):
        request = self._request(self.admin_user, residence=None)
        self.assertFalse(self.permission.has_permission(request, None))

    def test_unauthenticated_user_is_denied(self):
        from django.contrib.auth.models import AnonymousUser
        request = self._request(AnonymousUser(), self.residence)
        self.assertFalse(self.permission.has_permission(request, None))


class ResidentsServiceLoggingTests(FastTenantTestCase):
    @classmethod
    def get_test_tenant_domain(cls):
        return "residents-log.test.local"

    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Tenant Residents Log"
        tenant.slug = "tenant-residents-log"
        tenant.is_active = True

    @classmethod
    def setup_domain(cls, domain):
        domain.domain = cls.get_test_tenant_domain()
        domain.is_primary = True

    def setUp(self):
        super().setUp()
        self.residence = Residence.objects.create(
            name="Residencia Log",
            slug="res-log",
            code="RL-001",
            timezone="Europe/Madrid",
            is_active=True,
        )
        ResidenceDomain.objects.create(
            residence=self.residence,
            domain=self.get_test_tenant_domain(),
            is_primary=True,
            is_active=True,
        )
        Role.objects.get_or_create(
            name="Student",
            defaults={"description": "Student", "is_system_default": True, "residence": None},
        )

    @patch("apps.residents.services.logger")
    @patch("apps.residents.services.process_password_reset_request")
    def test_smtp_error_is_logged_and_does_not_propagate(self, mock_reset, mock_logger):
        from apps.common.services import SMTPServerError
        from apps.residents.services import create_resident

        mock_reset.side_effect = SMTPServerError("SMTP fail")

        data = {
            "full_name": "Log Test",
            "email": "log-test@example.com",
        }
        # Should not raise — SMTPServerError is caught and logged
        result = create_resident(data, self.residence, request=None)

        self.assertEqual(result["email"], "log-test@example.com")
        mock_logger.exception.assert_called_once()
        call_args = mock_logger.exception.call_args[0]
        self.assertIn("user_id", call_args[0])


class ResidentUpdateViewTests(FastTenantTestCase):
    """Tests del endpoint PATCH/PUT /api/residents/{id}/ — [NX-S2.27]."""

    @classmethod
    def get_test_tenant_domain(cls):
        return "resident-update.test.local"

    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Tenant Resident Update"
        tenant.slug = "tenant-resident-update"
        tenant.is_active = True

    @classmethod
    def setup_domain(cls, domain):
        domain.domain = cls.get_test_tenant_domain()
        domain.is_primary = True

    def setUp(self):
        super().setUp()
        user_model = get_user_model()

        self.admin_user = user_model.objects.create_user(
            username="admin-upd",
            email="admin-upd@test.com",
            password=PASSWORD,
            is_staff=True,
        )
        self.student_user = user_model.objects.create_user(
            username="student-upd",
            email="student-upd@test.com",
            password=PASSWORD,
            first_name="Carlos",
            last_name="Ruiz",
        )
        self.other_user = user_model.objects.create_user(
            username="other-upd",
            email="other-upd@test.com",
            password=PASSWORD,
        )

        self.residence = Residence.objects.create(
            name="Residencia Update",
            slug="res-update",
            code="RU-001",
            timezone="Europe/Madrid",
            is_active=True,
        )
        ResidenceDomain.objects.create(
            residence=self.residence,
            domain=self.get_test_tenant_domain(),
            is_primary=True,
            is_active=True,
        )

        self.admin_role, self.student_role = _create_admin_and_student_roles()

        self.bedroom = Bedroom.objects.create(
            numero="101",
            planta=1,
            capacidad_maxima=2,
            tipo=Bedroom.Tipo.DOBLE,
            residence=self.residence,
            is_active=True,
        )

        # El admin user necesita membership para pasar IsResidenceAdmin
        Membership.objects.create(
            user=self.admin_user,
            role=self.admin_role,
            residence=self.residence,
            is_active=True,
        )
        self.membership = Membership.objects.create(
            user=self.student_user,
            role=self.student_role,
            residence=self.residence,
            bedroom=self.bedroom,
            is_active=True,
        )

        self.admin_client = self._auth_client(self.admin_user)
        self.student_client = self._auth_client(self.student_user)
        self.anon_client = TenantClient(self.tenant)

    def _auth_client(self, user):
        client = TenantClient(self.tenant)
        token, _ = build_access_token(user, self.tenant, self.residence)
        client.defaults["HTTP_AUTHORIZATION"] = f"Bearer {token}"
        return client

    def _url(self, pk):
        return f"/api/residents/{pk}/"

    # --- Flujo positivo ---

    def test_patch_actualiza_nombre(self):
        response = self.admin_client.patch(
            self._url(self.membership.id),
            {"full_name": "Ana García"},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["full_name"], "Ana García")
        self.student_user.refresh_from_db()
        self.assertEqual(self.student_user.first_name, "Ana")
        self.assertEqual(self.student_user.last_name, "García")

    def test_patch_actualiza_email(self):
        response = self.admin_client.patch(
            self._url(self.membership.id),
            {"email": "nuevo@test.com"},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.student_user.refresh_from_db()
        self.assertEqual(self.student_user.email, "nuevo@test.com")

    def test_patch_desactiva_residente(self):
        response = self.admin_client.patch(
            self._url(self.membership.id),
            {"is_active": False},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.membership.refresh_from_db()
        self.assertFalse(self.membership.is_active)

    def test_patch_asigna_habitacion(self):
        new_bedroom = Bedroom.objects.create(
            numero="102",
            planta=1,
            capacidad_maxima=1,
            tipo=Bedroom.Tipo.INDIVIDUAL,
            residence=self.residence,
            is_active=True,
        )
        response = self.admin_client.patch(
            self._url(self.membership.id),
            {"bedroom_id": new_bedroom.id},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.membership.refresh_from_db()
        self.assertEqual(self.membership.bedroom_id, new_bedroom.id)

    def test_patch_desasigna_habitacion(self):
        response = self.admin_client.patch(
            self._url(self.membership.id),
            {"bedroom_id": None},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.membership.refresh_from_db()
        self.assertIsNone(self.membership.bedroom)

    # --- Flujo negativo ---

    def test_patch_residente_inexistente_devuelve_404(self):
        response = self.admin_client.patch(
            self._url(99999),
            {"full_name": "Test Usuario"},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 404)

    def test_patch_no_admin_devuelve_403(self):
        response = self.student_client.patch(
            self._url(self.membership.id),
            {"full_name": "Test"},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 403)

    def test_patch_no_autenticado_devuelve_403(self):
        response = self.anon_client.patch(
            self._url(self.membership.id),
            {"full_name": "Test"},
            content_type="application/json",
        )
        # IsResidenceAdmin devuelve False para anónimos → DRF responde 403
        self.assertEqual(response.status_code, 403)


class ResidentAuditLogTests(FastTenantTestCase):
    """[NX-S3.02] Auditoría de habitaciones — acciones de residentes."""

    @classmethod
    def get_test_tenant_domain(cls):
        return "residents-audit.test.local"

    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Tenant Resident Audit"
        tenant.slug = "tenant-resident-audit"
        tenant.is_active = True

    @classmethod
    def setup_domain(cls, domain):
        domain.domain = cls.get_test_tenant_domain()
        domain.is_primary = True

    def setUp(self):
        super().setUp()
        from apps.bedrooms.models import BedroomAuditLog  # noqa: PLC0415
        self.BedroomAuditLog = BedroomAuditLog

        user_model = get_user_model()
        self.admin_user = user_model.objects.create_user(
            username="audit-admin-res",
            email="audit-admin-res@test.com",
            password=PASSWORD,
            is_staff=True,
        )
        self.student_user = user_model.objects.create_user(
            username="audit-student-res",
            email="audit-student-res@test.com",
            password=PASSWORD,
            first_name="Audit",
            last_name="Student",
        )
        self.residence = Residence.objects.create(
            name="Residencia Audit Res",
            slug="res-audit-res",
            code="RAR-001",
            timezone="Europe/Madrid",
            is_active=True,
        )
        ResidenceDomain.objects.create(
            residence=self.residence,
            domain=self.get_test_tenant_domain(),
            is_primary=True,
            is_active=True,
        )
        self.admin_role, self.student_role = _create_admin_and_student_roles()
        self.bedroom = Bedroom.objects.create(
            numero="201",
            capacidad_maxima=2,
            tipo=Bedroom.Tipo.DOBLE,
            residence=self.residence,
            is_active=True,
        )
        self.other_bedroom = Bedroom.objects.create(
            numero="202",
            capacidad_maxima=1,
            tipo=Bedroom.Tipo.INDIVIDUAL,
            residence=self.residence,
            is_active=True,
        )
        Membership.objects.create(
            user=self.admin_user,
            role=self.admin_role,
            residence=self.residence,
            is_active=True,
        )
        self.membership = Membership.objects.create(
            user=self.student_user,
            role=self.student_role,
            residence=self.residence,
            bedroom=self.bedroom,
            is_active=True,
        )
        self.admin_client = TenantClient(self.tenant)
        token, _ = build_access_token(self.admin_user, self.tenant, self.residence)
        self.admin_client.defaults["HTTP_AUTHORIZATION"] = f"Bearer {token}"

    def _url(self, pk):
        return f"/api/residents/{pk}/"

    # --- RESIDENT_ASSIGNED ---

    def test_asignar_habitacion_genera_audit_assigned(self):
        """PATCH bedroom_id distinto genera entrada RESIDENT_ASSIGNED en la nueva habitación."""
        self.membership.bedroom = None
        self.membership.save()

        self.admin_client.patch(
            self._url(self.membership.id),
            {"bedroom_id": self.bedroom.id},
            content_type="application/json",
        )

        log = self.BedroomAuditLog.objects.filter(
            bedroom=self.bedroom, action=self.BedroomAuditLog.Action.RESIDENT_ASSIGNED
        ).first()
        self.assertIsNotNone(log)
        self.assertEqual(log.changes["resident_email"], self.student_user.email)
        self.assertEqual(log.user, self.admin_user)

    def test_crear_residente_con_habitacion_genera_audit_assigned(self):
        """POST /residents/ con bedroom_id genera entrada RESIDENT_ASSIGNED."""
        new_bedroom = Bedroom.objects.create(
            numero="203",
            capacidad_maxima=1,
            tipo=Bedroom.Tipo.INDIVIDUAL,
            residence=self.residence,
            is_active=True,
        )
        with patch("apps.residents.services.process_password_reset_request"):
            self.admin_client.post(
                "/api/residents/",
                {
                    "full_name": "Nuevo Residente",
                    "email": "nuevo-audit@test.com",
                    "bedroom_id": new_bedroom.id,
                },
                content_type="application/json",
            )

        log = self.BedroomAuditLog.objects.filter(
            bedroom=new_bedroom, action=self.BedroomAuditLog.Action.RESIDENT_ASSIGNED
        ).first()
        self.assertIsNotNone(log)
        self.assertEqual(log.changes["resident_email"], "nuevo-audit@test.com")

    # --- RESIDENT_REMOVED ---

    def test_desasignar_habitacion_genera_audit_removed(self):
        """PATCH bedroom_id=null genera entrada RESIDENT_REMOVED en la habitación anterior."""
        self.admin_client.patch(
            self._url(self.membership.id),
            {"bedroom_id": None},
            content_type="application/json",
        )

        log = self.BedroomAuditLog.objects.filter(
            bedroom=self.bedroom, action=self.BedroomAuditLog.Action.RESIDENT_REMOVED
        ).first()
        self.assertIsNotNone(log)
        self.assertEqual(log.changes["resident_email"], self.student_user.email)
        self.assertEqual(log.user, self.admin_user)

    def test_eliminar_residente_con_habitacion_genera_audit_removed(self):
        """DELETE /residents/{id}/ genera RESIDENT_REMOVED si tenía habitación."""
        self.admin_client.delete(self._url(self.membership.id))

        log = self.BedroomAuditLog.objects.filter(
            bedroom=self.bedroom, action=self.BedroomAuditLog.Action.RESIDENT_REMOVED
        ).first()
        self.assertIsNotNone(log)
        self.assertEqual(log.changes["resident_email"], self.student_user.email)
        self.assertEqual(log.user, self.admin_user)

    def test_eliminar_residente_sin_habitacion_no_genera_audit(self):
        """DELETE /residents/{id}/ sin habitación asignada no genera entrada de auditoría."""
        self.membership.bedroom = None
        self.membership.save()

        count_before = self.BedroomAuditLog.objects.count()
        self.admin_client.delete(self._url(self.membership.id))
        self.assertEqual(self.BedroomAuditLog.objects.count(), count_before)

    # --- Cambio de habitación ---

    def test_cambiar_habitacion_genera_removed_en_anterior_y_assigned_en_nueva(self):
        """PATCH a una habitación diferente genera REMOVED en la anterior y ASSIGNED en la nueva."""
        self.admin_client.patch(
            self._url(self.membership.id),
            {"bedroom_id": self.other_bedroom.id},
            content_type="application/json",
        )

        removed = self.BedroomAuditLog.objects.filter(
            bedroom=self.bedroom, action=self.BedroomAuditLog.Action.RESIDENT_REMOVED
        ).first()
        assigned = self.BedroomAuditLog.objects.filter(
            bedroom=self.other_bedroom, action=self.BedroomAuditLog.Action.RESIDENT_ASSIGNED
        ).first()
        self.assertIsNotNone(removed)
        self.assertIsNotNone(assigned)
