from django.contrib.auth import get_user_model
from django_tenants.test.cases import FastTenantTestCase
from django_tenants.test.client import TenantClient

from apps.membership.models import Membership, Role
from apps.residences.models import Residence, ResidenceDomain, StudentProfile


class AdminStudentProfileViewTests(FastTenantTestCase):
    @classmethod
    def get_test_tenant_domain(cls):
        return "admin-student-profile.test.local"

    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Tenant Admin Student Profile"
        tenant.slug = "tenant-admin-student-profile"
        tenant.is_active = True
        tenant.on_trial = True

    @classmethod
    def setup_domain(cls, domain):
        domain.domain = cls.get_test_tenant_domain()
        domain.is_primary = True

    def setUp(self):
        super().setUp()
        user_model = get_user_model()

        self.admin_user = user_model.objects.create_user(
            username="profile-admin",
            email="profile-admin@test.com",
            password="demo1234",  # NOSONAR
            is_staff=True,
        )
        self.student_user = user_model.objects.create_user(
            username="profile-student",
            email="profile-student@test.com",
            password="demo1234",  # NOSONAR
            first_name="Lucia",
            last_name="Martin",
        )
        self.other_student_user = user_model.objects.create_user(
            username="other-student",
            email="other-student@test.com",
            password="demo1234",  # NOSONAR
            first_name="Mario",
            last_name="Sanz",
        )

        self.residence = Residence.objects.create(
            name="Residence Profile",
            slug="res-profile",
            code="RP-001",
            timezone="Europe/Madrid",
            is_active=True,
        )
        ResidenceDomain.objects.create(
            residence=self.residence,
            domain=self.get_test_tenant_domain(),
            is_primary=True,
            is_active=True,
        )
        self.other_residence = Residence.objects.create(
            name="Residence Other",
            slug="res-other-profile",
            code="ROP-001",
            timezone="Europe/Madrid",
            is_active=True,
        )

        self.student_role = Role.objects.create(
            name="Student",
            description="Student",
            is_system_default=True,
            residence=None,
        )

        Membership.objects.create(
            user=self.student_user,
            role=self.student_role,
            residence=self.residence,
            is_active=True,
        )
        Membership.objects.create(
            user=self.other_student_user,
            role=self.student_role,
            residence=self.other_residence,
            is_active=True,
        )

        self.client = TenantClient(self.tenant)
        self.client.force_login(self.admin_user)

        self.non_staff_client = TenantClient(self.tenant)
        self.non_staff_client.force_login(self.student_user)

        self.anon_client = TenantClient(self.tenant)

    def _url(self, user_id):
        return f"/api/admin/students/{user_id}/profile/"

    def test_returns_existing_student_profile(self):
        StudentProfile.objects.create(
            user=self.student_user,
            residence=self.residence,
            nickname="luchi",
            bio="Me gusta estudiar en silencio.",
            interests=["cine", "deporte"],
        )

        response = self.client.get(self._url(self.student_user.id))

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["name"], "Lucia Martin")
        self.assertEqual(data["nickname"], "luchi")
        self.assertEqual(data["bio"], "Me gusta estudiar en silencio.")
        self.assertEqual(data["interests"], ["cine", "deporte"])

    def test_returns_fallback_payload_when_student_has_no_profile(self):
        response = self.client.get(self._url(self.student_user.id))

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["name"], "Lucia Martin")
        self.assertEqual(data["nickname"], "")
        self.assertEqual(data["bio"], "")
        self.assertEqual(data["interests"], [])

    def test_non_staff_is_forbidden(self):
        response = self.non_staff_client.get(self._url(self.student_user.id))

        self.assertEqual(response.status_code, 403)

    def test_unauthenticated_is_rejected(self):
        response = self.anon_client.get(self._url(self.student_user.id))

        self.assertEqual(response.status_code, 401)

    def test_student_from_other_residence_returns_404(self):
        response = self.client.get(self._url(self.other_student_user.id))

        self.assertEqual(response.status_code, 404)
