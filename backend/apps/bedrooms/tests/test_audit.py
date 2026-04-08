"""[NX-S3.02] Tests de auditoría de habitaciones"""
from django.contrib.auth import get_user_model
from django_tenants.test.cases import FastTenantTestCase
from django_tenants.test.client import TenantClient

from apps.bedrooms.models import Bedroom, BedroomAuditLog
from apps.residences.models import Residence, ResidenceDomain


class BedroomAuditLogViewTests(FastTenantTestCase):
    """[NX-S3.02] Auditoría de habitaciones — endpoint GET /api/bedrooms/<id>/audit/"""

    @classmethod
    def get_test_schema_name(cls):
        return "fast_test_bedrooms"

    @classmethod
    def get_test_tenant_domain(cls):
        return "bedroom-audit.test.local"

    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Tenant Bedroom Audit"
        tenant.slug = "tenant-bedroom-audit"
        tenant.is_active = True
        tenant.on_trial = True

    @classmethod
    def setup_domain(cls, domain):
        domain.domain = cls.get_test_tenant_domain()
        domain.is_primary = True

    def setUp(self):
        super().setUp()
        User = get_user_model()
        self.admin = User.objects.create_user(
            username="audit-admin",
            email="audit@test.local",
            password="demo1234",  # NOSONAR
            is_staff=True,
            first_name="Admin",
            last_name="User",
        )
        self.other_admin = User.objects.create_user(
            username="audit-admin2",
            email="audit2@test.local",
            password="demo1234",  # NOSONAR
            is_staff=True,
        )
        self.non_admin = User.objects.create_user(
            username="audit-student",
            email="student@test.local",
            password="demo1234",  # NOSONAR
            is_staff=False,
        )
        self.residence = Residence.objects.create(
            name="Residencia Audit",
            slug="res-audit",
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
        self.bedroom = Bedroom.objects.create(
            numero="201",
            capacidad_maxima=1,
            tipo=Bedroom.Tipo.INDIVIDUAL,
            residence=self.residence,
        )

        self.admin_client = TenantClient(self.tenant)
        self.admin_client.force_login(self.admin)

        self.non_admin_client = TenantClient(self.tenant)
        self.non_admin_client.force_login(self.non_admin)

        self.anon_client = TenantClient(self.tenant)

    def _url(self):
        return f"/api/bedrooms/{self.bedroom.id}/audit/"

    def test_empty_audit_log(self):
        res = self.admin_client.get(self._url())
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json(), [])

    def test_returns_created_entry(self):
        BedroomAuditLog.objects.create(
            bedroom=self.bedroom,
            user=self.admin,
            action=BedroomAuditLog.Action.CREATED,
        )
        res = self.admin_client.get(self._url())
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["action"], "CREATED")
        self.assertEqual(data[0]["performed_by"], "Admin User")

    def test_returns_multiple_entries_newest_first(self):
        BedroomAuditLog.objects.create(bedroom=self.bedroom, user=self.admin, action=BedroomAuditLog.Action.CREATED)
        BedroomAuditLog.objects.create(bedroom=self.bedroom, user=self.admin, action=BedroomAuditLog.Action.UPDATED, changes={"tipo": {"before": "Individual", "after": "Doble"}})
        res = self.admin_client.get(self._url())
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(len(data), 2)
        self.assertEqual(data[0]["action"], "UPDATED")

    def test_entry_includes_changes(self):
        changes = {"numero": {"before": "201", "after": "202"}}
        BedroomAuditLog.objects.create(
            bedroom=self.bedroom,
            user=self.admin,
            action=BedroomAuditLog.Action.UPDATED,
            changes=changes,
        )
        res = self.admin_client.get(self._url())
        data = res.json()
        self.assertEqual(data[0]["changes"], changes)

    def test_performed_by_null_after_user_actually_deleted(self):
        BedroomAuditLog.objects.create(
            bedroom=self.bedroom,
            user=self.other_admin,
            action=BedroomAuditLog.Action.CREATED,
        )
        self.other_admin.delete()
        res = self.admin_client.get(self._url())
        data = res.json()
        self.assertIsNone(data[0]["performed_by"])

    def test_audit_log_isolated_by_residence(self):
        from apps.residences.models import Residence as _Residence
        other_residence = _Residence.objects.create(
            name="Otra Residencia Audit",
            slug="otra-res-audit",
            code="ORA-001",
            timezone="Europe/Madrid",
            is_active=True,
        )
        other_bedroom = Bedroom.objects.create(
            numero="999",
            capacidad_maxima=1,
            tipo=Bedroom.Tipo.INDIVIDUAL,
            residence=other_residence,
        )
        BedroomAuditLog.objects.create(bedroom=self.bedroom, user=self.admin, action=BedroomAuditLog.Action.CREATED)
        BedroomAuditLog.objects.create(bedroom=other_bedroom, user=self.admin, action=BedroomAuditLog.Action.CREATED)

        res = self.admin_client.get(self._url())
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(len(data), 1)

    def test_non_admin_forbidden(self):
        res = self.non_admin_client.get(self._url())
        self.assertEqual(res.status_code, 403)

    def test_anonymous_unauthorized(self):
        res = self.anon_client.get(self._url())
        self.assertEqual(res.status_code, 401)

    def test_unknown_bedroom_returns_404(self):
        res = self.admin_client.get("/api/bedrooms/999999/audit/")
        self.assertEqual(res.status_code, 404)


class BedroomCreateAuditTests(FastTenantTestCase):
    """Verifica que crear una habitación genera entrada de auditoría CREATED"""

    @classmethod
    def get_test_schema_name(cls):
        return "fast_test_bedrooms"

    @classmethod
    def get_test_tenant_domain(cls):
        return "bedroom-audit.test.local"

    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Tenant Create Audit"
        tenant.slug = "tenant-create-audit"
        tenant.is_active = True
        tenant.on_trial = True

    @classmethod
    def setup_domain(cls, domain):
        domain.domain = cls.get_test_tenant_domain()
        domain.is_primary = True

    def setUp(self):
        super().setUp()
        User = get_user_model()
        self.admin = User.objects.create_user(
            username="create-audit-admin",
            email="create@test.local",
            password="demo1234",  # NOSONAR
            is_staff=True,
        )
        self.residence = Residence.objects.create(
            name="Residencia Create Audit",
            slug="res-create-audit",
            code="RCA-001",
            timezone="Europe/Madrid",
            is_active=True,
        )
        ResidenceDomain.objects.create(
            residence=self.residence,
            domain=self.get_test_tenant_domain(),
            is_primary=True,
            is_active=True,
        )
        self.client = TenantClient(self.tenant)
        self.client.force_login(self.admin)

    def test_create_bedroom_generates_audit_entry(self):
        res = self.client.post(
            "/api/bedrooms/create/",
            data={"numero": "301", "tipo": "Individual", "capacidad_maxima": 1, "edificio": "A"},
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 201)
        bedroom_id = res.json()["id"]
        bedroom = Bedroom.objects.get(id=bedroom_id)
        logs = BedroomAuditLog.objects.filter(bedroom=bedroom)
        self.assertEqual(logs.count(), 1)
        self.assertEqual(logs.first().action, BedroomAuditLog.Action.CREATED)
        self.assertEqual(logs.first().user, self.admin)


class BedroomUpdateAuditTests(FastTenantTestCase):
    """Verifica que actualizar una habitación genera entrada de auditoría UPDATED"""

    @classmethod
    def get_test_schema_name(cls):
        return "fast_test_bedrooms"

    @classmethod
    def get_test_tenant_domain(cls):
        return "bedroom-audit.test.local"

    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Tenant Update Audit"
        tenant.slug = "tenant-update-audit"
        tenant.is_active = True
        tenant.on_trial = True

    @classmethod
    def setup_domain(cls, domain):
        domain.domain = cls.get_test_tenant_domain()
        domain.is_primary = True

    def setUp(self):
        super().setUp()
        User = get_user_model()
        self.admin = User.objects.create_user(
            username="update-audit-admin",
            email="update@test.local",
            password="demo1234",  # NOSONAR
            is_staff=True,
        )
        self.residence = Residence.objects.create(
            name="Residencia Update Audit",
            slug="res-update-audit",
            code="RUA-001",
            timezone="Europe/Madrid",
            is_active=True,
        )
        ResidenceDomain.objects.create(
            residence=self.residence,
            domain=self.get_test_tenant_domain(),
            is_primary=True,
            is_active=True,
        )
        self.bedroom = Bedroom.objects.create(
            numero="401",
            capacidad_maxima=1,
            tipo=Bedroom.Tipo.INDIVIDUAL,
            residence=self.residence,
            edificio="B",
        )
        self.client = TenantClient(self.tenant)
        self.client.force_login(self.admin)

    def test_update_bedroom_generates_audit_entry(self):
        res = self.client.put(
            f"/api/bedrooms/{self.bedroom.id}/update/",
            data={"numero": "401", "tipo": "Individual", "capacidad_maxima": 1, "edificio": "C"},
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 200)
        logs = BedroomAuditLog.objects.filter(bedroom=self.bedroom)
        self.assertEqual(logs.count(), 1)
        self.assertEqual(logs.first().action, BedroomAuditLog.Action.UPDATED)

    def test_update_audit_contains_changes_diff(self):
        self.client.put(
            f"/api/bedrooms/{self.bedroom.id}/update/",
            data={"numero": "401", "tipo": "Individual", "capacidad_maxima": 1, "edificio": "D"},
            content_type="application/json",
        )
        log = BedroomAuditLog.objects.filter(bedroom=self.bedroom).first()
        self.assertIn("edificio", log.changes)
        self.assertEqual(log.changes["edificio"]["before"], "B")
        self.assertEqual(log.changes["edificio"]["after"], "D")
