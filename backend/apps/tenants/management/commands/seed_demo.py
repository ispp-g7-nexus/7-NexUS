import os
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.utils.text import slugify
from django_tenants.utils import schema_context

from apps.tenants.models import Client, Domain, Plan


class Command(BaseCommand):
    help = (
        "Crea o actualiza datos demo para desarrollo (tenant, residencia y usuarios)."
    )

    def add_arguments(self, parser):
        parser.add_argument("--domain", default=None, help="Dominio del tenant demo.")
        parser.add_argument("--schema", default=None, help="Schema del tenant demo.")
        parser.add_argument("--tenant-slug", default=None, help="Slug del tenant demo.")
        parser.add_argument(
            "--tenant-name", default=None, help="Nombre del tenant demo."
        )
        parser.add_argument("--admin-email", default=None, help="Email del admin demo.")
        parser.add_argument(
            "--student-email", default=None, help="Email del estudiante demo."
        )
        parser.add_argument(
            "--student2-email", default=None, help="Email del segundo estudiante demo."
        )
        parser.add_argument(
            "--password", default=None, help="Contrasena para ambos usuarios demo."
        )

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

    def _upsert_user(
        self,
        *,
        email: str,
        password: str,
        first_name: str,
        last_name: str,
        is_staff: bool,
    ):
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
        domain = self._env_or_option(
            options, "domain", "DEMO_TENANT_DOMAIN", "demo.nexus.local"
        ).lower()
        schema_name = self._safe_schema_name(
            self._env_or_option(
                options, "schema", "DEMO_TENANT_SCHEMA", domain.split(".", 1)[0]
            )
        )
        tenant_name = self._env_or_option(
            options, "tenant_name", "DEMO_TENANT_NAME", "Residencia Demo"
        )
        tenant_slug = self._safe_slug(
            self._env_or_option(options, "tenant_slug", "DEMO_TENANT_SLUG", schema_name)
        )
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
        student2_email = self._env_or_option(
            options,
            "student2_email",
            "DEMO_STUDENT_2_EMAIL",
            f"estudiante2@{domain}",
        ).lower()
        demo_password = self._env_or_option(
            options, "password", "DEMO_USERS_PASSWORD", "demo1234"
        )

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
        Domain.objects.filter(tenant=client).exclude(pk=primary_domain.pk).update(
            is_primary=False
        )

        with schema_context(client.schema_name):
            from apps.membership.models import Membership, Role
            from apps.packages.models import Package
            from apps.residences.models import (
                Residence,
                ResidenceBranding,
                ResidenceDomain,
            )
            from apps.spaces.models import CommonSpace

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
            ResidenceDomain.objects.filter(residence=residence).exclude(
                domain=domain
            ).update(is_primary=False)

            ResidenceBranding.objects.update_or_create(
                residence=residence,
                defaults={
                    "primary_color": "#1B5E20",
                    "secondary_color": "#F5A623",
                    "accent_color": "#35C759",
                },
            )

            demo_spaces = [
                {
                    "name": "Sala de Estudio",
                    "description": "Espacio silencioso para estudio individual o en grupo reducido.",
                    "capacity": 12,
                    "open_time": "08:00",
                    "close_time": "22:00",
                },
                {
                    "name": "Sala Multimedia",
                    "description": "Sala equipada con proyector para presentaciones y cinefórum.",
                    "capacity": 20,
                    "open_time": "10:00",
                    "close_time": "23:00",
                },
                {
                    "name": "Gimnasio",
                    "description": "Zona deportiva con aforo limitado por seguridad.",
                    "capacity": 8,
                    "open_time": "07:00",
                    "close_time": "21:30",
                },
            ]
            for item in demo_spaces:
                CommonSpace.objects.update_or_create(
                    residence=residence,
                    name=item["name"],
                    defaults={
                        "description": item["description"],
                        "capacity": item["capacity"],
                        "is_active": True,
                        "open_time": item["open_time"],
                        "close_time": item["close_time"],
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

            admin_role, _ = Role.objects.get_or_create(
                name="Admin",
                defaults={
                    "description": "Administrador del sistema",
                    "is_system_default": True,
                    "residence": None,
                },
            )

            student_role, _ = Role.objects.get_or_create(
                name="Student",
                defaults={
                    "description": "Estudiante / Residente",
                    "is_system_default": True,
                    "residence": None,
                },
            )

            Membership.objects.update_or_create(
                user=admin_user,
                role=admin_role,
                residence=residence,
                defaults={"is_active": True},
            )

            student_membership, _ = Membership.objects.update_or_create(
                user=student_user,
                role=student_role,
                residence=residence,
                defaults={"is_active": True},
            )

            Package.objects.update_or_create(
                residence=residence,
                tracking_number="TRK-DEMO-001",
                defaults={
                    "resident": student_membership,
                    "resident_name_snapshot": f"{student_user.first_name} {student_user.last_name}",
                    "room_snapshot": "101",
                    "carrier": "Amazon",
                    "notes": "Caja mediana",
                    "status": Package.Status.RECEIVED,
                    "delivered_at": None,
                },
            )

            Package.objects.update_or_create(
                residence=residence,
                tracking_number="TRK-DEMO-002",
                defaults={
                    "resident": student_membership,
                    "resident_name_snapshot": f"{student_user.first_name} {student_user.last_name}",
                    "room_snapshot": "101",
                    "carrier": "Correos",
                    "notes": "Sobre impreso",
                    "status": Package.Status.RECEIVED,
                    "delivered_at": None,
                },
            )

            self._seed_analytics(
                client=client,
                residence=residence,
                student_role=student_role,
                admin_user=admin_user,
                student_membership=student_membership,
                demo_password=demo_password,
                domain=domain,
            )

        self.stdout.write(self.style.SUCCESS("Seed demo aplicado correctamente."))
        self.stdout.write(f"Tenant domain: {domain}")
        self.stdout.write(f"Admin demo: {admin_email} / {demo_password}")
        self.stdout.write(f"Estudiante demo: {student_email} / {demo_password}")

    # ── Analytics seed ────────────────────────────────────────────────────────

    def _seed_analytics(
        self,
        *,
        client,
        residence,
        student_role,
        admin_user,
        student_membership,
        demo_password: str,
        domain: str,
    ):
        """
        Seed historical bedrooms, incidences and packages so the analytics
        charts have meaningful data to display.  The method is idempotent:
        it exits early if analytics data already exists.
        """
        from apps.bedrooms.models import Bedroom
        from apps.incidences.models import Incidence
        from apps.membership.models import Membership
        from apps.packages.models import Package
        from apps.staff.models import Staff

        from django.contrib.auth import get_user_model
        from django.utils import timezone as tz
        from datetime import datetime, timedelta

        UserModel = get_user_model()
        now = tz.now()

        # ── Idempotency guard ──────────────────────────────────────────────────
        if Incidence.objects.filter(
            student=admin_user,
            title__startswith="Incidencia demo",
        ).exists():
            self.stdout.write("Analytics seed data already present — skipping.")
            return

        # ── Extra student users ───────────────────────────────────────────────
        extra_students_data = [
            ("ana.garcia", "Ana", "García"),
            ("luis.martinez", "Luis", "Martínez"),
            ("sofia.rodriguez", "Sofía", "Rodríguez"),
            ("pablo.sanchez", "Pablo", "Sánchez"),
            ("elena.lopez", "Elena", "López"),
        ]
        extra_memberships = []
        for username, first, last in extra_students_data:
            email = f"{username}@{domain}"
            user = self._upsert_user(
                email=email,
                password=demo_password,
                first_name=first,
                last_name=last,
                is_staff=False,
            )
            membership, _ = Membership.objects.update_or_create(
                user=user,
                role=student_role,
                residence=residence,
                defaults={"is_active": True},
            )
            extra_memberships.append(membership)

        all_students = [student_membership] + extra_memberships  # 6 total

        # ── Bedrooms ──────────────────────────────────────────────────────────
        bedrooms_data = [
            # Edificio A
            ("101", "Edificio A", Bedroom.Tipo.INDIVIDUAL, 1, 1, all_students[0]),
            ("102", "Edificio A", Bedroom.Tipo.INDIVIDUAL, 1, 1, all_students[1]),
            ("103", "Edificio A", Bedroom.Tipo.INDIVIDUAL, 1, 1, all_students[2]),
            ("201", "Edificio A", Bedroom.Tipo.DOBLE,      2, 2, None),
            ("202", "Edificio A", Bedroom.Tipo.DOBLE,      2, 2, all_students[3]),
            # Edificio B
            ("301", "Edificio B", Bedroom.Tipo.TRIPLE,     3, 3, all_students[4]),
            ("302", "Edificio B", Bedroom.Tipo.TRIPLE,     3, 3, all_students[5]),
            ("401", "Edificio B", Bedroom.Tipo.INDIVIDUAL, 1, 1, None),
            ("402", "Edificio B", Bedroom.Tipo.INDIVIDUAL, 1, 1, None),
        ]
        for numero, edificio, tipo, planta, capacidad, _ in bedrooms_data:
            Bedroom.objects.update_or_create(
                residence=residence,
                numero=numero,
                edificio=edificio,
                defaults={
                    "tipo": tipo,
                    "planta": planta,
                    "capacidad_maxima": capacidad,
                    "is_active": True,
                },
            )

        # Spread bedroom creation dates across 3 years for the yearly chart
        bedrooms = list(Bedroom.objects.filter(residence=residence))
        year_offsets = [
            now - timedelta(days=730),  # 2 years ago
            now - timedelta(days=730),
            now - timedelta(days=730),
            now - timedelta(days=365),  # 1 year ago
            now - timedelta(days=365),
            now - timedelta(days=365),
            now,                        # this year
            now,
            now,
        ]
        for bedroom, ts in zip(bedrooms, year_offsets):
            Bedroom.objects.filter(pk=bedroom.pk).update(created_at=ts)

        # ── Staff ─────────────────────────────────────────────────────────────
        staff_data = [
            ("maria.garcia.staff", "María", "García", "Técnico de Mantenimiento", "Mantenimiento", "Edificio A"),
            ("carlos.lopez.staff", "Carlos", "López", "Auxiliar de Limpieza", "Limpieza", "Edificio B"),
        ]
        staff_objects = []
        for username, first, last, job, dept, loc in staff_data:
            email = f"{username}@{domain}"
            user = self._upsert_user(
                email=email,
                password=demo_password,
                first_name=first,
                last_name=last,
                is_staff=False,
            )
            staff_obj, _ = Staff.objects.update_or_create(
                user=user,
                defaults={
                    "job_title": job,
                    "department": dept,
                    "location": loc,
                    "schedule": "L-V 8:00-16:00",
                    "status": "active",
                },
            )
            staff_objects.append(staff_obj)

        staff_a, staff_b = staff_objects

        # ── Incidences ────────────────────────────────────────────────────────
        def _make_dt(days_ago: int, hour: int = 10):
            return now - timedelta(days=days_ago) + timedelta(hours=hour - now.hour)

        incidences_spec = [
            # (days_ago_created, status, days_ago_resolved, staff, external)
            (85, "resolved",    82, staff_a, ""),
            (80, "resolved",    77, staff_a, ""),
            (75, "resolved",    73, staff_b, ""),
            (70, "resolved",    68, staff_a, ""),
            (65, "in_progress", None, staff_b, ""),
            (60, "resolved",    57, staff_a, ""),
            (55, "resolved",    52, None, "Empresa Fontanería S.L."),
            (50, "resolved",    47, staff_b, ""),
            (45, "reviewing",   None, staff_a, ""),
            (40, "resolved",    37, staff_a, ""),
            (35, "resolved",    33, staff_b, ""),
            (30, "resolved",    28, staff_a, ""),
            (25, "pending",     None, None, ""),
            (20, "resolved",    18, staff_b, ""),
            (15, "resolved",    13, staff_a, ""),
            (10, "in_progress", None, staff_b, ""),
            (7,  "resolved",    5,  staff_a, ""),
            (5,  "pending",     None, None, ""),
            (3,  "resolved",    1,  staff_b, ""),
            (1,  "pending",     None, None, ""),
        ]
        for days_created, status, days_resolved, staff, ext in incidences_spec:
            inc = Incidence.objects.create(
                title=f"Incidencia demo ({days_created}d)",
                description="Datos de demostración para analíticas.",
                location_type="cocina",
                student=admin_user,
                status=status,
                assigned_staff=staff,
                assigned_external_name=ext,
                is_active=True,
            )
            created_dt = _make_dt(days_created)
            resolved_dt = _make_dt(days_resolved) if days_resolved is not None else created_dt
            Incidence.objects.filter(pk=inc.pk).update(
                created_at=created_dt,
                updated_at=resolved_dt,
            )

        # ── Packages ─────────────────────────────────────────────────────────
        carriers = ["Amazon", "Correos", "DHL", "SEUR", "MRW", "GLS"]
        packages_spec = [
            # (days_ago_received, delivered_days_ago_or_None, membership_index)
            (88, 87, 0), (85, 84, 1), (82, None, 2), (79, 78, 3),
            (76, 75, 4), (73, None, 5), (70, 69, 0), (67, 66, 1),
            (64, None, 2), (61, 60, 3), (58, 57, 4), (55, None, 5),
            (52, 51, 0), (49, 48, 1), (46, None, 2), (43, 42, 3),
            (40, 39, 4), (37, None, 5), (34, 33, 0), (31, 30, 1),
            (28, None, 2), (25, 24, 3), (22, 21, 4), (19, None, 5),
            (16, 15, 0), (13, 12, 1), (10, None, 2), (7,  6,  3),
            (4,  None, 4), (1,  None, 5),
        ]
        for i, (recv_days, deliv_days, member_idx) in enumerate(packages_spec):
            membership = all_students[member_idx]
            user = membership.user
            received_dt = now - timedelta(days=recv_days)
            delivered_dt = (now - timedelta(days=deliv_days)) if deliv_days is not None else None
            status = Package.Status.DELIVERED if delivered_dt is not None else Package.Status.RECEIVED
            tracking = f"TRK-ANALYTICS-{i+1:03d}"
            pkg, created = Package.objects.get_or_create(
                residence=residence,
                tracking_number=tracking,
                defaults={
                    "resident": membership,
                    "resident_name_snapshot": f"{user.first_name} {user.last_name}",
                    "room_snapshot": f"A-{100 + member_idx + 1}",
                    "carrier": carriers[i % len(carriers)],
                    "status": status,
                    "received_at": received_dt,
                    "delivered_at": delivered_dt,
                },
            )
            if created:
                Package.objects.filter(pk=pkg.pk).update(
                    received_at=received_dt,
                    delivered_at=delivered_dt,
                )