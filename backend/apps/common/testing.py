from django.db import ProgrammingError, connection
from django_tenants.test.cases import TenantTestCase


class TenantSchemaCleanupMixin:
    """Reusable tenant cleanup aligned with django-tenants public API."""

    @classmethod
    def tearDownClass(cls):
        try:
            tenant = getattr(cls, "tenant", None)
            if tenant:
                # Keep tenant schema in search_path while deleting tenant
                # to avoid reverse checks against tenant-only tables in public.
                connection.set_tenant(tenant)
                domain = getattr(cls, "domain", None)
                if domain:
                    domain.delete()
                try:
                    tenant.delete(force_drop=True)
                except ProgrammingError as exc:
                    if "announcements_announcement" not in str(exc):
                        raise
                    # Fallback for teardown ordering issues in some suites where
                    # reverse relation checks hit tenant-only tables.
                    connection.set_schema_to_public()
                    quoted_schema = connection.ops.quote_name(tenant.schema_name)
                    tenant_table = connection.ops.quote_name(
                        tenant.__class__._meta.db_table
                    )
                    with connection.cursor() as cursor:
                        cursor.execute(f"DROP SCHEMA IF EXISTS {quoted_schema} CASCADE")
                        cursor.execute(
                            f"DELETE FROM {tenant_table} WHERE id = %s",
                            [tenant.pk],
                        )
        finally:
            connection.set_schema_to_public()
            if hasattr(cls, "remove_allowed_test_domain"):
                cls.remove_allowed_test_domain()
            if hasattr(cls, "cls_atomics"):
                super(TenantTestCase, cls).tearDownClass()
