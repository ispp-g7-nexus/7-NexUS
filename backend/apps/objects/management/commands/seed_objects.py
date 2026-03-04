import os
from django.core.management.base import BaseCommand
from django.utils.text import slugify
from django_tenants.utils import schema_context
from apps.tenants.models import Client


class Command(BaseCommand):
    help = "Crea objetos de prueba para testing de funcionalidades"

    def add_arguments(self, parser):
        parser.add_argument("--tenant-domain", default=None, help="Dominio del tenant (ej: demo.nexus.local)")
        parser.add_argument("--schema", default=None, help="Schema del tenant")
        parser.add_argument("--residence-code", default="DEMO-01", help="Código de la residencia")

    def _env_or_option(self, options, option_key, env_key, default):
        option_value = options.get(option_key)
        if isinstance(option_value, str) and option_value.strip():
            return option_value.strip()
        env_value = os.getenv(env_key, "").strip()
        if env_value:
            return env_value
        return default

    def _safe_schema_name(self, value: str) -> str:
        normalized = value.strip().lower().replace("-", "_").replace(".", "_")
        return normalized or "demo"

    def handle(self, *args, **options):
        tenant_domain = self._env_or_option(options, "tenant_domain", "DEMO_TENANT_DOMAIN", "demo.nexus.local")
        schema_name = self._env_or_option(options, "schema", "DEMO_TENANT_SCHEMA", 
                                        self._safe_schema_name(tenant_domain.split(".", 1)[0]))
        residence_code = options.get("residence_code", "DEMO-01")

        try:
            # Find the tenant by schema name or domain
            tenant = None
            if schema_name:
                tenant = Client.objects.filter(schema_name=schema_name).first()
            if not tenant and tenant_domain:
                domain_obj = tenant.domains.filter(domain=tenant_domain).first()
                if domain_obj:
                    tenant = domain_obj.tenant

            if not tenant:
                self.stdout.write(
                    self.style.ERROR(
                        f"No se encontró tenant con schema '{schema_name}' o dominio '{tenant_domain}'. "
                        "Ejecuta primero: python manage.py seed_demo"
                    )
                )
                return

            # Work within the tenant schema
            with schema_context(tenant.schema_name):
                from apps.residences.models import Residence
                from apps.objects.models import Object

                # Find the residence
                residence = Residence.objects.filter(code=residence_code).first()
                if not residence:
                    self.stdout.write(
                        self.style.ERROR(
                            f"No se encontró residencia con código '{residence_code}'. "
                            "Verifica que existe o ejecuta: python manage.py seed_demo"
                        )
                    )
                    return

                # Object seed data
                objects_data = [
                    {
                        "name": "Plancha de Ropa",
                        "description": "Plancha de vapor con base antiadherente. Perfecta para mantener tu ropa sin arrugas antes de salir.",
                        "location": "Cuarto de lavandería",
                        "tags": "plancha, ropa, limpieza, cuidado personal",
                        "available": True,
                        "image_url": "https://www.tmelectron.com/media/TMPPL016_01_PLANCHA_VAPOR-scaled.jpg"
                    },
                    {
                        "name": "Aspiradora",
                        "description": "Aspiradora compacta para limpiar habitaciones y espacios comunes. Incluye diferentes accesorios.",
                        "location": "Armario de limpieza",
                        "tags": "limpieza, aspirar, mantenimiento, hogar",
                        "available": True,
                        "image_url": "https://storage.googleapis.com/catalog-pictures-carrefour-es/catalog/pictures/hd_510x_/5608475015403_1.jpg"
                    },
                    {
                        "name": "Secador de Pelo",
                        "description": "Secador de pelo profesional con diferentes velocidades y temperatura. Ideal para prepararse rápido.",
                        "location": "Baño común",
                        "tags": "secador, pelo, cuidado personal, belleza",
                        "available": True,
                        "image_url": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQsfa3s6YO7An8IsZxQYyobWTSE11XV3Xclpw&s"
                    },
                    {
                        "name": "Kit de Herramientas Básico",
                        "description": "Set de herramientas esenciales: destornilladores, martillo, llaves y alicates. Para pequeñas reparaciones.",
                        "location": "Trastero",
                        "tags": "herramientas, reparación, mantenimiento, útil",
                        "available": True,
                        "image_url": "https://www.mercatron.es/wp-content/uploads/2022/08/hrv813_v02_01.jpg"
                    },
                    {
                        "name": "Batidora de Mano",
                        "description": "Batidora de inmersión con vaso medidor. Perfecta para batidos, sopas y recetas caseras.",
                        "location": "Cocina común",
                        "tags": "cocina, batidora, electrodoméstico, comida",
                        "available": False,  # This one is not available for testing
                        "image_url": "https://www.cuisinart.es/dw/image/v2/BDGM_PRD/on/demandware.static/-/Sites-master-fr/default/dw8fdea93f/images/cuisinart/RHB100E/RHB100E%20Image%206.jpg?sw=556&sh=680&sm=fit"
                    },
                    {
                        "name": "Ventilador Portátil",
                        "description": "Ventilador de torre con control remoto y temporizador. Ideal para habitaciones en verano.",
                        "location": "Almacén general",
                        "tags": "ventilador, aire, verano, climatización",
                        "available": True,
                        "image_url": "https://media2.bricoprofesional.com/91917-large_default/ventilador-portatil-recargable-con-usb-bateria-de-litio-7200-mah-galan-negro-mini-ventilador-plegable-inalambrico-sin-cables-.jpg"
                    },
                ]

                created_count = 0
                updated_count = 0

                for obj_data in objects_data:
                    obj, created = Object.objects.update_or_create(
                        name=obj_data["name"],
                        residence=residence,
                        defaults={
                            "description": obj_data["description"],
                            "location": obj_data["location"],
                            "tags": obj_data["tags"],
                            "available": obj_data["available"],
                            "image_url": obj_data.get("image_url"),
                        }
                    )
                    if created:
                        created_count += 1
                    else:
                        updated_count += 1

                self.stdout.write(self.style.SUCCESS(f"Seeder de objetos completado:"))
                self.stdout.write(f"   - {created_count} objetos creados")
                self.stdout.write(f"   - {updated_count} objetos actualizados")
                self.stdout.write(f"   - Residencia: {residence.name} ({residence_code})")
                self.stdout.write(f"   - Tenant: {tenant.name} ({tenant.schema_name})")

        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error ejecutando seeder: {str(e)}"))
            raise