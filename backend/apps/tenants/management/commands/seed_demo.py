import os
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.utils.text import slugify
from django_tenants.utils import schema_context

from apps.tenants.models import Client, Domain, Plan


class Command(BaseCommand):
    help = "Crea o actualiza datos demo para desarrollo (tenant, residencia y usuarios)."

    def add_arguments(self, parser):
        parser.add_argument("--domain", default=None, help="Dominio del tenant demo.")
        parser.add_argument("--schema", default=None, help="Schema del tenant demo.")
        parser.add_argument("--tenant-slug", default=None, help="Slug del tenant demo.")
        parser.add_argument("--tenant-name", default=None, help="Nombre del tenant demo.")
        parser.add_argument("--admin-email", default=None, help="Email del admin demo.")
        parser.add_argument("--student-email", default=None, help="Email del estudiante demo.")
        parser.add_argument("--password", default=None, help="Contrasena para ambos usuarios demo.")

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

    def _safe_slug(self, value: str) -> str:
        normalized = slugify(value) or "demo"
        return normalized

    def _upsert_user(self, *, email: str, password: str, first_name: str, last_name: str, is_staff: bool):
        UserModel = get_user_model()
        normalized_email = email.strip().lower()
        username = normalized_email

        user = UserModel.objects.filter(email__iexact=normalized_email).first()
        if not user:
            user = UserModel.objects.filter(username=username).first()

        if not user:
            user = UserModel(username=username)

        user.username = username
        user.email = normalized_email
        user.first_name = first_name
        user.last_name = last_name
        user.is_active = True
        user.is_staff = is_staff
        user.set_password(password)
        user.save()
        return user

    def handle(self, *args, **options):
        domain = self._env_or_option(options, "domain", "DEMO_TENANT_DOMAIN", "demo.nexus.local").lower()
        schema_name = self._safe_schema_name(
            self._env_or_option(options, "schema", "DEMO_TENANT_SCHEMA", domain.split(".", 1)[0])
        )
        tenant_name = self._env_or_option(options, "tenant_name", "DEMO_TENANT_NAME", "Residencia Demo")
        tenant_slug = self._safe_slug(self._env_or_option(options, "tenant_slug", "DEMO_TENANT_SLUG", schema_name))
        admin_email = self._env_or_option(
            options,
            "admin_email",
            "DEMO_ADMIN_EMAIL",
            f"admin@{domain}",
        ).lower()
        student_email = self._env_or_option(
            options,
            "student_email",
            "DEMO_STUDENT_EMAIL",
            f"estudiante@{domain}",
        ).lower()
        demo_password = self._env_or_option(options, "password", "DEMO_USERS_PASSWORD", "demo1234")

        plan, _ = Plan.objects.update_or_create(
            code="demo",
            defaults={
                "name": "Plan Demo",
                "description": "Plan de desarrollo para tenant demo.",
                "max_residences": 10,
                "allows_whitelabel": True,
                "is_active": True,
            },
        )

        client, created = Client.objects.get_or_create(
            schema_name=schema_name,
            defaults={
                "name": tenant_name,
                "slug": tenant_slug,
                "plan": plan,
                "is_active": True,
                "on_trial": True,
                "whitelabel_enabled": True,
                "paid_until": timezone.now().date() + timedelta(days=365),
                "metadata": {"seed": "demo"},
            },
        )

        if not created:
            changed_fields = []
            if client.name != tenant_name:
                client.name = tenant_name
                changed_fields.append("name")
            if client.slug != tenant_slug:
                client.slug = tenant_slug
                changed_fields.append("slug")
            if client.plan_id != plan.id:
                client.plan = plan
                changed_fields.append("plan")
            if not client.is_active:
                client.is_active = True
                changed_fields.append("is_active")
            if not client.whitelabel_enabled:
                client.whitelabel_enabled = True
                changed_fields.append("whitelabel_enabled")
            if changed_fields:
                changed_fields.append("updated_at")
                client.save(update_fields=changed_fields)

        primary_domain, _ = Domain.objects.update_or_create(
            domain=domain,
            defaults={
                "tenant": client,
                "is_primary": True,
            },
        )
        Domain.objects.filter(tenant=client).exclude(pk=primary_domain.pk).update(is_primary=False)

        with schema_context(client.schema_name):
            from apps.residences.models import Membership, Residence, ResidenceBranding, ResidenceDomain

            residence, _ = Residence.objects.update_or_create(
                code="DEMO-01",
                defaults={
                    "name": "Residencia Demo",
                    "slug": "residencia-demo",
                    "timezone": "Europe/Madrid",
                    "is_active": True,
                },
            )

            ResidenceDomain.objects.update_or_create(
                domain=domain,
                defaults={
                    "residence": residence,
                    "is_primary": True,
                    "is_active": True,
                },
            )
            ResidenceDomain.objects.filter(residence=residence).exclude(domain=domain).update(is_primary=False)

            ResidenceBranding.objects.update_or_create(
                residence=residence,
                defaults={
                    "primary_color": "#1B5E20",
                    "secondary_color": "#F5A623",
                    "accent_color": "#35C759",
                },
            )

            admin_user = self._upsert_user(
                email=admin_email,
                password=demo_password,
                first_name="Admin",
                last_name="Demo",
                is_staff=True,
            )
            student_user = self._upsert_user(
                email=student_email,
                password=demo_password,
                first_name="Estudiante",
                last_name="Demo",
                is_staff=False,
            )

            Membership.objects.update_or_create(
                user=admin_user,
                role=Membership.Role.PORTFOLIO_ADMIN,
                residence=None,
                defaults={"is_active": True},
            )
            Membership.objects.update_or_create(
                user=admin_user,
                role=Membership.Role.RESIDENCE_ADMIN,
                residence=residence,
                defaults={"is_active": True},
            )
            Membership.objects.update_or_create(
                user=student_user,
                role=Membership.Role.RESIDENT,
                residence=residence,
                defaults={"is_active": True},
            )

        self.stdout.write(self.style.SUCCESS("Seed demo aplicado correctamente."))
        self.stdout.write(f"Tenant domain: {domain}")
        self.stdout.write(f"Admin demo: {admin_email} / {demo_password}")
        self.stdout.write(f"Estudiante demo: {student_email} / {demo_password}")
