"""Re-export de los helpers multi-tenant compartidos.

Se mantiene aquí para no romper los imports existentes dentro de
``apps.spaces.tests``. La implementación real vive en
``apps.common.test_utils`` y se comparte con el resto de apps.
"""

from apps.common.test_utils import ensure_tenant_domain, make_tenant_client

__all__ = ["ensure_tenant_domain", "make_tenant_client"]
