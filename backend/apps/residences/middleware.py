from django.utils.deprecation import MiddlewareMixin


class ResidenceByDomainMiddleware(MiddlewareMixin):
    """
    Resuelve la residencia a partir del encabezado Host dentro del esquema tenant actual.

    Nota: la resolucion del tenant ocurre antes con django-tenants usando
    las entradas de Domain en el esquema publico.
    """

    def process_request(self, request):
        request.residence = None

        tenant = getattr(request, "tenant", None)
        if not tenant or getattr(tenant, "schema_name", "public") == "public":
            return None

        host = request.get_host().split(":", 1)[0].lower().strip()
        if not host:
            return None

        from apps.residences.models import ResidenceDomain

        match = (
            ResidenceDomain.objects.select_related("residence")
            .filter(domain__iexact=host, is_active=True, residence__is_active=True)
            .order_by("-is_primary")
            .first()
        )
        if match:
            request.residence = match.residence

        return None
