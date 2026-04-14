"""Tests para el endpoint de analíticas del módulo de menú.

Cubre:
- Acceso / permisos (admin OK, student 403, anónimo 403).
- Estructura del payload (todas las claves que consume el frontend).
- Agregados básicos: estado, día de la semana, tipos de comida y resumen dietético.
- Filtro por ventana temporal (``start_date``/``end_date``).
- Scoping por tenant: datos de otra residencia no se cuelan.

El servicio ``get_menu_analytics`` se testea indirectamente a través del
endpoint HTTP para que los tests sigan el mismo patrón que el resto de
``apps.menu`` y, de paso, cubran también los permisos y la view.
"""

import json
from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from django.contrib.auth import get_user_model
from django.db import connection
from django.utils import timezone
from django_tenants.test.cases import FastTenantTestCase
from django_tenants.test.client import TenantClient
from django_tenants.utils import tenant_context, schema_context

from apps.common.services import build_access_token
from apps.menu.analytics_services import get_menu_analytics
from apps.menu.models import Meal, MenuDay, MenuWeek, SpecialMenuRequest
from apps.membership.models import Membership, Role
from apps.residences.models import Residence, ResidenceDomain

from .base import MenuTestBase, PASSWORD


# Días conocidos dentro de la ventana por defecto (8 semanas).
# Usamos lunes/miércoles/viernes/domingo de la semana pasada para probar
# el ExtractWeekDay del servicio sin depender del día exacto en que se
# ejecutan los tests.
def _weekday_base():
    today = date.today()
    # Lunes de la semana pasada (para que todos los días hábiles caigan en
    # el pasado y entren en la ventana por defecto de 8 semanas, sin depender
    # del día de la semana en el que se ejecuten los tests).
    monday_this_week = today - timedelta(days=today.weekday())
    return monday_this_week - timedelta(days=7)


class MenuAnalyticsBase(MenuTestBase):
    """Añade un segundo tenant para verificar el scoping por residence."""

    ANALYTICS_URL = "/api/menu/analytics/"

    def setUp(self):
        super().setUp()
        with tenant_context(self.tenant):
            self.week_monday = _weekday_base()

            # MenuWeek publicada con varias Meal de distintos tipos.
            self.menu_week = MenuWeek.objects.create(
                residence=self.tenant,
                week_start=self.week_monday,
                week_end=self.week_monday + timedelta(days=6),
                created_by=self.admin_user,
                is_published=True,
            )
            self.menu_day_monday = MenuDay.objects.create(
                menu_week=self.menu_week,
                day="lunes",
                date=self.week_monday,
            )
            self.menu_day_wednesday = MenuDay.objects.create(
                menu_week=self.menu_week,
                day="miércoles",
                date=self.week_monday + timedelta(days=2),
            )

            # 4 meals: un breakfast vegetariano, un lunch vegano,
            # un dinner sin gluten, un snack neutro.
            Meal.objects.create(
                menu_day=self.menu_day_monday,
                name="Tostadas integrales",
                type=Meal.MealType.BREAKFAST,
                is_vegetarian=True,
            )
            Meal.objects.create(
                menu_day=self.menu_day_monday,
                name="Ensalada de quinoa",
                type=Meal.MealType.LUNCH,
                is_vegetarian=True,
                is_vegan=True,
            )
            Meal.objects.create(
                menu_day=self.menu_day_wednesday,
                name="Pescado al horno",
                type=Meal.MealType.DINNER,
                is_gluten_free=True,
            )
            Meal.objects.create(
                menu_day=self.menu_day_wednesday,
                name="Fruta de temporada",
                type=Meal.MealType.SNACK,
            )

            # SpecialMenuRequest: 2 pending + 1 approved + 1 rejected,
            # todos dentro de la ventana por defecto.
            SpecialMenuRequest.objects.create(
                residence=self.tenant,
                user=self.resident_user,
                date=self.week_monday,  # lunes
                description="Sin lactosa",
                status="pending",
            )
            SpecialMenuRequest.objects.create(
                residence=self.tenant,
                user=self.resident_user,
                date=self.week_monday + timedelta(days=2),  # miércoles
                description="Alergia cacahuete",
                status="pending",
            )
            SpecialMenuRequest.objects.create(
                residence=self.tenant,
                user=self.admin_user,
                date=self.week_monday + timedelta(days=4),  # viernes
                description="Cena festiva",
                status="approved",
            )
            SpecialMenuRequest.objects.create(
                residence=self.tenant,
                user=self.admin_user,
                date=self.week_monday + timedelta(days=4),  # viernes
                description="Dieta hipocalórica",
                status="rejected",
            )


class MenuAnalyticsViewTests(MenuAnalyticsBase):
    """Tests del endpoint ``GET /api/menu/analytics/``."""

    # ── Permisos ──────────────────────────────────────────────────────────────

    def test_admin_returns_200(self):
        response = self.admin_client.get(self.ANALYTICS_URL)
        self.assertEqual(response.status_code, 200)

    def test_student_is_forbidden(self):
        response = self.resident_client.get(self.ANALYTICS_URL)
        self.assertEqual(response.status_code, 403)

    def test_anonymous_is_rejected(self):
        response = self.anon_client.get(self.ANALYTICS_URL)
        # Sin token el middleware deja request.user anónimo → IsAuthenticated
        # responde 401; RequireScreenAccess respondería 403 si llegara.
        self.assertIn(response.status_code, (401, 403))

    # ── Estructura del payload ────────────────────────────────────────────────

    def test_response_has_required_keys(self):
        response = self.admin_client.get(self.ANALYTICS_URL)
        self.assertEqual(response.status_code, 200)
        body = response.json()
        for key in (
            "top_special_requesters",
            "special_requester_percentage",
            "total_special_requests",
            "special_requests_by_status",
            "special_requests_by_weekday",
            "average_requests_per_requester",
            "published_menu_lead_days_avg",
            "meal_type_distribution",
            "dietary_summary",
            "top_meals",
            "total_residents",
        ):
            self.assertIn(key, body)

    # ── Agregados ─────────────────────────────────────────────────────────────

    def test_special_requests_counts(self):
        body = self.admin_client.get(self.ANALYTICS_URL).json()
        self.assertEqual(body["total_special_requests"], 4)
        self.assertEqual(body["special_requests_by_status"]["pending"], 2)
        self.assertEqual(body["special_requests_by_status"]["approved"], 1)
        self.assertEqual(body["special_requests_by_status"]["rejected"], 1)

    def test_special_requests_by_weekday_contains_all_days(self):
        body = self.admin_client.get(self.ANALYTICS_URL).json()
        weekdays = {item["weekday"] for item in body["special_requests_by_weekday"]}
        self.assertEqual(
            weekdays,
            {"lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"},
        )
        by_name = {item["weekday"]: item["count"] for item in body["special_requests_by_weekday"]}
        self.assertEqual(by_name["lunes"], 1)
        self.assertEqual(by_name["miércoles"], 1)
        self.assertEqual(by_name["viernes"], 2)
        self.assertEqual(by_name["martes"], 0)

    def test_top_special_requesters_ordered(self):
        body = self.admin_client.get(self.ANALYTICS_URL).json()
        top = body["top_special_requesters"]
        self.assertEqual(len(top), 2)
        # El admin hizo 2 peticiones, el resident 2 → ambos aparecen.
        counts = sorted(item["request_count"] for item in top)
        self.assertEqual(counts, [2, 2])

    def test_meal_type_distribution(self):
        body = self.admin_client.get(self.ANALYTICS_URL).json()
        self.assertEqual(body["meal_type_distribution"]["breakfast"], 1)
        self.assertEqual(body["meal_type_distribution"]["lunch"], 1)
        self.assertEqual(body["meal_type_distribution"]["dinner"], 1)
        self.assertEqual(body["meal_type_distribution"]["snack"], 1)

    def test_dietary_summary_percentages(self):
        body = self.admin_client.get(self.ANALYTICS_URL).json()
        diet = body["dietary_summary"]
        self.assertEqual(diet["total_meals"], 4)
        # 2 vegetarianas / 4 → 50%
        self.assertEqual(diet["vegetarian_percentage"], 50.0)
        # 1 vegana / 4 → 25%
        self.assertEqual(diet["vegan_percentage"], 25.0)
        # 1 sin gluten / 4 → 25%
        self.assertEqual(diet["gluten_free_percentage"], 25.0)

    def test_top_meals_sorted_by_count(self):
        body = self.admin_client.get(self.ANALYTICS_URL).json()
        top = body["top_meals"]
        names = [item["name"] for item in top]
        # Todas las meals son únicas → aparecen las 4 con count=1.
        self.assertEqual(len(top), 4)
        self.assertIn("Tostadas integrales", names)
        self.assertIn("Ensalada de quinoa", names)

    # ── Filtro por ventana temporal ───────────────────────────────────────────

    def test_start_date_in_future_returns_empty_requests(self):
        far_future = (date.today() + timedelta(days=365)).isoformat()
        url = f"{self.ANALYTICS_URL}?start_date={far_future}&end_date={far_future}"
        body = self.admin_client.get(url).json()
        self.assertEqual(body["total_special_requests"], 0)
        self.assertEqual(
            body["special_requests_by_status"],
            {"pending": 0, "approved": 0, "rejected": 0},
        )

    def test_explicit_window_includes_monday_request(self):
        start = self.week_monday.isoformat()
        end = (self.week_monday + timedelta(days=1)).isoformat()
        url = f"{self.ANALYTICS_URL}?start_date={start}&end_date={end}"
        body = self.admin_client.get(url).json()
        # Sólo la petición del lunes entra en el rango [lunes, martes].
        self.assertEqual(body["total_special_requests"], 1)
        self.assertEqual(body["special_requests_by_status"]["pending"], 1)

    def test_inverted_dates_are_normalised(self):
        start = (self.week_monday + timedelta(days=4)).isoformat()  # viernes
        end = self.week_monday.isoformat()  # lunes — orden invertido
        url = f"{self.ANALYTICS_URL}?start_date={start}&end_date={end}"
        body = self.admin_client.get(url).json()
        # El servicio invierte automáticamente → todas las 4 peticiones caen
        # dentro de la ventana [lunes, viernes].
        self.assertEqual(body["total_special_requests"], 4)


class MenuAnalyticsTenantScopeTests(FastTenantTestCase):
    """Asegura que los datos de otra residencia no contaminan los resultados.

    Usa un segundo tenant con sus propios ``SpecialMenuRequest`` y verifica
    que ``get_menu_analytics(residence=tenantA)`` no los cuenta.
    """

    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Menu Analytics Scope"
        tenant.slug = "menu-analytics-scope"
        tenant.is_active = True
        tenant.on_trial = True

    @classmethod
    def setup_domain(cls, domain):
        domain.domain = "menu-analytics-scope.test.local"
        domain.is_primary = True

    def setUp(self):
        super().setUp()
        user_model = get_user_model()

        self.residence_a = Residence.objects.create(
            name="Res A",
            slug="menu-res-a",
            code="MA-1",
            timezone="Europe/Madrid",
            is_active=True,
        )
        ResidenceDomain.objects.create(
            residence=self.residence_a,
            domain="menu-analytics-scope.test.local",
            is_primary=True,
            is_active=True,
        )

        self.user_a = user_model.objects.create_user(
            username="user-a", email="a@menu.test", password=PASSWORD,
        )
        self.user_b = user_model.objects.create_user(
            username="user-b", email="b@menu.test", password=PASSWORD,
        )

        today = date.today()
        SpecialMenuRequest.objects.create(
            residence=self.tenant,
            user=self.user_a,
            date=today,
            description="Req A",
            status="pending",
        )
        # Petición de "otra residencia" → la ponemos con un residence distinto
        # creando un Client adicional y usándolo como residence del request.
        # Como FastTenantTestCase comparte un único tenant, simulamos la
        # contaminación creando un Client huérfano en el schema público.
        from apps.tenants.models import Client
        with schema_context("public"):
            self.other_tenant = Client(
                schema_name="menu_analytics_other_" + self.tenant.schema_name[-6:],
                name="Other Tenant",
                slug="menu-analytics-other",
                is_active=True,
                on_trial=True,
            )
            # Evitamos django-tenants' auto-create schema porque no lo
            # necesitamos para las filas del public-schema test; basta con
            # que exista la fila en ``tenants_client`` para poder usarla
            # como FK.
            self.other_tenant.auto_create_schema = False
            self.other_tenant.save()

        SpecialMenuRequest.objects.create(
            residence=self.other_tenant,
            user=self.user_b,
            date=today,
            description="Req B — otra residencia",
            status="approved",
        )

    def tearDown(self):
        super().tearDown()
        with schema_context("public"):
            try:
                self.other_tenant.delete(force_drop=True)
            except Exception:
                pass

    def test_analytics_scoped_to_current_residence(self):
        data = get_menu_analytics(residence=self.tenant)
        self.assertEqual(data["total_special_requests"], 1)
        self.assertEqual(data["special_requests_by_status"]["pending"], 1)
        self.assertEqual(data["special_requests_by_status"]["approved"], 0)

    def test_analytics_scoped_to_other_residence(self):
        data = get_menu_analytics(residence=self.other_tenant)
        self.assertEqual(data["total_special_requests"], 1)
        self.assertEqual(data["special_requests_by_status"]["approved"], 1)
        self.assertEqual(data["special_requests_by_status"]["pending"], 0)
