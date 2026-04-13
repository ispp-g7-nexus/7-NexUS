from django_tenants.test.cases import FastTenantTestCase

from apps.membership.models import Membership


class BedroomTestBase(FastTenantTestCase):
    """Base compartida para tests del módulo bedrooms."""

    @classmethod
    def get_test_schema_name(cls):
        return "fast_test_bedrooms"

    @classmethod
    def get_test_tenant_domain(cls):
        return "bedroom-audit.test.local"

    @classmethod
    def setup_domain(cls, domain):
        domain.domain = cls.get_test_tenant_domain()
        domain.is_primary = True

    def _create_membership(self, user, bedroom=None, is_active=True, role=None):
        return Membership.objects.create(
            user=user,
            role=role or self.student_role,
            residence=self.residence,
            bedroom=bedroom,
            is_active=is_active,
        )
