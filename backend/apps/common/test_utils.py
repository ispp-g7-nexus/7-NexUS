"""Utilidades compartidas para la suite de tests multi-tenant.

Contexto del problema que resuelven
-----------------------------------

La mayoría de las suites de tests de Nexus heredan de
``django_tenants.test.cases.FastTenantTestCase``. Esta clase **comparte un
único tenant entre todas las clases de test** (``schema_name='fast_test'``).
Eso provoca dos problemas cuando varias clases usan dominios distintos:

1. ``django-tenants`` resuelve el tenant de cada request mirando la tabla
   pública ``tenants.Domain`` por el ``HTTP_HOST``. Solo la **primera** clase
   que se ejecuta registra su dominio ahí (a través de ``setup_domain``).
   Las demás clases escriben su dominio únicamente en
   ``residences.ResidenceDomain``, que no es donde django-tenants busca.
   Sus requests caen al schema público y el middleware
   ``ResidenceByDomainMiddleware`` deja ``request.residence = None`` →
   respuestas 400/403.

2. ``BaseTenantRequestFactory.generic`` sobrescribe ``HTTP_HOST`` con
   ``tenant.get_primary_domain().domain`` en cada request, ignorando
   cualquier ``HTTP_HOST`` que se le pase al construir el ``TenantClient``.
   Como el tenant está compartido, ese primary domain pertenece siempre a
   la primera clase que se ejecutó, y todos los requests de las clases
   siguientes acaban ruteados al dominio incorrecto.

``ensure_tenant_domain`` soluciona (1) registrando el dominio de la clase
actual en ``tenants.Domain`` (dentro de ``schema_context('public')``).

``make_tenant_client`` soluciona (2) devolviendo una subclase de
``TenantClient`` cuyo ``generic`` inyecta el ``HTTP_HOST`` correcto en cada
request, saltándose el override de django-tenants.
"""

from apps.tenants.models import Domain


def ensure_tenant_domain(tenant, domain_name: str) -> None:
    """Registra ``domain_name`` en ``tenants.Domain`` si falta."""
    from django_tenants.utils import schema_context

    with schema_context("public"):
        Domain.objects.get_or_create(
            domain=domain_name,
            defaults={"tenant": tenant, "is_primary": False},
        )


def make_tenant_client(tenant, domain_name: str):
    """Construye un ``TenantClient`` que respeta el dominio en todos los requests.

    Devuelve una subclase cuyo ``generic`` inyecta el ``HTTP_HOST`` correcto
    antes de delegar en ``django.test.Client.generic`` (saltándose el override
    de ``BaseTenantRequestFactory.generic`` de django-tenants).
    """
    from django.test import Client
    from django_tenants.test.client import TenantClient

    class _FixedHostTenantClient(TenantClient):
        _domain_name = domain_name
        _tenant = tenant

        def generic(self, *args, **kwargs):
            kwargs["HTTP_HOST"] = self._domain_name
            request = Client.generic(self, *args, **kwargs)
            request.tenant = self._tenant
            return request

    return _FixedHostTenantClient(
        tenant, SERVER_NAME=domain_name, HTTP_HOST=domain_name
    )
