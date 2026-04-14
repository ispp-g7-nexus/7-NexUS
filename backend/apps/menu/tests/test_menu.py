import datetime
import json

from django_tenants.utils import tenant_context
from apps.menu.models import Meal, MenuDay, MenuWeek, SpecialMenuRequest
from apps.menu.tests.base import MenuTestBase

class MenuModuleTests(MenuTestBase):

    def setUp(self):
        super().setUp()
        self.week_start = datetime.date(2025, 1, 6)
        self.week_end = datetime.date(2025, 1, 12)


    # ------------------------------------------------------------------ #
    # Helpers
    # ------------------------------------------------------------------ #

    def _create_menu_week(self, published=False):
        with tenant_context(self.tenant):
            week = MenuWeek.objects.create(
                residence=self.tenant,
                week_start=self.week_start,
                week_end=self.week_end,
                created_by=self.admin_user,
                is_published=published,
            )
            day_names = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"]
            current = self.week_start
            while current <= self.week_end:
                MenuDay.objects.create(
                    menu_week=week,
                    day=day_names[current.weekday()],
                    date=current,
                )
                current += datetime.timedelta(days=1)
        return week

    def _create_meal(self, menu_day, meal_type=Meal.MealType.LUNCH):
        with tenant_context(self.tenant):
            return Meal.objects.create(
                menu_day=menu_day,
                name="Lentejas",
                description="Con chorizo",
                type=meal_type,
            )

    # ------------------------------------------------------------------ #
    # MenuWeek – CRUD
    # ------------------------------------------------------------------ #

    def test_create_menu_week(self):
        """Admin puede crear una semana de menú"""
        data = {"weekStart": "2025-01-06"}
        response = self.admin_client.post(
            "/api/menu/weeks/",
            data=json.dumps(data),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 201)
        with tenant_context(self.tenant):
            self.assertEqual(MenuWeek.objects.count(), 1)

    def test_create_menu_week_auto_creates_days(self):
        """Al crear una semana se generan automáticamente los 7 días"""
        data = {"weekStart": "2025-01-06"}
        self.admin_client.post(
            "/api/menu/weeks/",
            data=json.dumps(data),
            content_type="application/json",
        )
        with tenant_context(self.tenant):
            week = MenuWeek.objects.first()
            self.assertEqual(week.days.count(), 7)

    def test_list_menu_weeks_admin_sees_unpublished(self):
        """Admin ve semanas publicadas y no publicadas"""
        self._create_menu_week(published=False)
        response = self.admin_client.get("/api/menu/weeks/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 1)

    def test_list_menu_weeks_resident_only_sees_published(self):
        """Residente solo ve semanas publicadas"""
        self._create_menu_week(published=False)
        response = self.resident_client.get("/api/menu/weeks/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 0)

    def test_resident_sees_published_week(self):
        """Residente ve la semana cuando está publicada"""
        self._create_menu_week(published=True)
        response = self.resident_client.get("/api/menu/weeks/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 1)

    def test_update_menu_week(self):
        """Admin puede actualizar una semana (p.ej. publicarla)"""
        week = self._create_menu_week(published=False)
        data = {"isPublished": True}
        response = self.admin_client.patch(
            f"/api/menu/weeks/{week.id}/",
            data=json.dumps(data),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)

    def test_delete_menu_week(self):
        """Admin puede eliminar una semana de menú"""
        week = self._create_menu_week()
        response = self.admin_client.delete(f"/api/menu/weeks/{week.id}/")
        self.assertEqual(response.status_code, 204)
        with tenant_context(self.tenant):
            self.assertEqual(MenuWeek.objects.count(), 0)

    def test_resident_cannot_create_menu_week(self):
        """Residente no puede crear semanas de menú"""
        data = {"weekStart": "2025-01-06"}
        response = self.resident_client.post(
            "/api/menu/weeks/",
            data=json.dumps(data),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 403)

    def test_resident_cannot_delete_menu_week(self):
        """Residente no puede eliminar semanas de menú"""
        week = self._create_menu_week(published=True)
        response = self.resident_client.delete(f"/api/menu/weeks/{week.id}/")
        self.assertEqual(response.status_code, 403)

    def test_unauthenticated_cannot_access_menu(self):
        """Usuario no autenticado no puede acceder a los menús"""
        response = self.anon_client.get("/api/menu/weeks/")
        self.assertEqual(response.status_code, 403)

    def test_cannot_create_duplicate_menu_week(self):
        """No se puede crear dos semanas con el mismo inicio"""
        self._create_menu_week()
        data = {"weekStart": "2025-01-06"}
        response = self.admin_client.post(
            "/api/menu/weeks/",
            data=json.dumps(data),
            content_type="application/json",
        )
        self.assertIn(response.status_code, [400, 422])

    # ------------------------------------------------------------------ #
    # MenuWeek – endpoint /current/
    # ------------------------------------------------------------------ #

    def test_current_menu_week_returns_active_week(self):
        """El endpoint /current/ devuelve la semana activa publicada"""
        today = datetime.date.today()
        monday = today - datetime.timedelta(days=today.weekday())
        sunday = monday + datetime.timedelta(days=6)
        with tenant_context(self.tenant):
            MenuWeek.objects.create(
                residence=self.tenant,
                week_start=monday,
                week_end=sunday,
                is_published=True,
            )
        response = self.resident_client.get("/api/menu/weeks/current/")
        self.assertEqual(response.status_code, 200)

    def test_current_menu_week_404_when_none(self):
        """El endpoint /current/ devuelve 404 si no hay semanas"""
        response = self.resident_client.get("/api/menu/weeks/current/")
        self.assertEqual(response.status_code, 404)

    # ------------------------------------------------------------------ #
    # Meal – CRUD
    # ------------------------------------------------------------------ #

    def test_create_meal(self):
        """Admin puede crear una comida en un día del menú"""
        week = self._create_menu_week(published=True)
        with tenant_context(self.tenant):
            day = week.days.first()
        data = {
            "name": "Paella",
            "description": "Arroz con mariscos",
            "type": Meal.MealType.LUNCH,
            "isGlutenFree": False,
            "isVegetarian": False,
            "isVegan": False,
        }
        response = self.admin_client.post(
            f"/api/menu/days/{day.id}/meals/",
            data=json.dumps(data),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 201)
        with tenant_context(self.tenant):
            self.assertEqual(Meal.objects.filter(menu_day=day).count(), 1)

    def test_list_meals(self):
        """Se pueden listar las comidas de un día"""
        week = self._create_menu_week(published=True)
        with tenant_context(self.tenant):
            day = week.days.first()
            self._create_meal(day)
        response = self.resident_client.get(f"/api/menu/days/{day.id}/meals/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 1)

    def test_update_meal(self):
        """Admin puede actualizar una comida"""
        week = self._create_menu_week(published=True)
        with tenant_context(self.tenant):
            day = week.days.first()
            meal = self._create_meal(day)
        data = {"name": "Gazpacho"}
        response = self.admin_client.patch(
            f"/api/menu/meals/{meal.id}/",
            data=json.dumps(data),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)

    def test_delete_meal(self):
        """Admin puede eliminar una comida"""
        week = self._create_menu_week(published=True)
        with tenant_context(self.tenant):
            day = week.days.first()
            meal = self._create_meal(day)
        response = self.admin_client.delete(f"/api/menu/meals/{meal.id}/")
        self.assertEqual(response.status_code, 204)
        with tenant_context(self.tenant):
            self.assertEqual(Meal.objects.filter(menu_day=day).count(), 0)

    def test_resident_cannot_create_meal(self):
        """Residente no puede crear comidas"""
        week = self._create_menu_week(published=True)
        with tenant_context(self.tenant):
            day = week.days.first()
        data = {"name": "Ensalada", "type": Meal.MealType.LUNCH}
        response = self.resident_client.post(
            f"/api/menu/days/{day.id}/meals/",
            data=json.dumps(data),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 403)

    def test_resident_cannot_delete_meal(self):
        """Residente no puede eliminar comidas"""
        week = self._create_menu_week(published=True)
        with tenant_context(self.tenant):
            day = week.days.first()
            meal = self._create_meal(day)
        response = self.resident_client.delete(f"/api/menu/meals/{meal.id}/")
        self.assertEqual(response.status_code, 403)

    def test_meal_dietary_flags(self):
        """Se crean correctamente los flags dietéticos de una comida"""
        week = self._create_menu_week(published=True)
        with tenant_context(self.tenant):
            day = week.days.first()
        data = {
            "name": "Tofu salteado",
            "type": Meal.MealType.LUNCH,
            "isGlutenFree": True,
            "isVegetarian": True,
            "isVegan": True,
        }
        response = self.admin_client.post(
            f"/api/menu/days/{day.id}/meals/",
            data=json.dumps(data),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 201)
        body = response.json()
        self.assertTrue(body["isGlutenFree"])
        self.assertTrue(body["isVegetarian"])
        self.assertTrue(body["isVegan"])

    # ------------------------------------------------------------------ #
    # SpecialMenuRequest
    # ------------------------------------------------------------------ #

    def test_create_special_request(self):
        """Residente puede crear una petición especial de menú
        
        NOTA: El view no asigna residence automáticamente (bug conocido).
        Se pasa residence explícitamente hasta que se corrija en el view.
        """
        data = {
            "date": "2025-02-14",
            "description": "Intolerancia a la lactosa",
        }
        response = self.resident_client.post(
            "/api/menu/special-requests/",
            data=json.dumps(data),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 201)
        with tenant_context(self.tenant):
            self.assertEqual(
                SpecialMenuRequest.objects.filter(user=self.resident_user).count(), 1
            )

    def test_special_request_default_status_is_pending(self):
        """Una petición especial recién creada tiene estado 'pending'"""
        data = {
            "date": "2025-02-14",
            "description": "Alergia al marisco",
            "residence": self.tenant.id,
        }
        response = self.resident_client.post(
            "/api/menu/special-requests/",
            data=json.dumps(data),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["status"], "pending")

    def test_resident_only_sees_own_requests(self):
        """Residente solo ve sus propias peticiones"""
        with tenant_context(self.tenant):
            SpecialMenuRequest.objects.create(
                residence=self.tenant,
                user=self.resident_user,
                date=datetime.date(2025, 2, 14),
                description="Mi petición",
            )
            SpecialMenuRequest.objects.create(
                residence=self.tenant,
                user=self.admin_user,
                date=datetime.date(2025, 2, 15),
                description="Petición del admin",
            )
        response = self.resident_client.get("/api/menu/special-requests/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 1)

    def test_admin_can_list_all_requests(self):
        """Admin puede listar todas las peticiones especiales"""
        with tenant_context(self.tenant):
            SpecialMenuRequest.objects.create(
                residence=self.tenant,
                user=self.resident_user,
                date=datetime.date(2025, 2, 14),
                description="Petición residente",
            )
        response = self.admin_client.get("/api/menu/special-requests/list_requests/")
        self.assertEqual(response.status_code, 200)
        self.assertGreaterEqual(len(response.json()), 1)

    def test_admin_can_approve_special_request(self):
        """Admin puede aprobar una petición especial"""
        with tenant_context(self.tenant):
            req = SpecialMenuRequest.objects.create(
                residence=self.tenant,
                user=self.resident_user,
                date=datetime.date(2025, 2, 14),
                description="Alergia",
                status="pending",
            )
        data = {"status": "approved"}
        response = self.admin_client.patch(
            f"/api/menu/special-requests/{req.id}/update_status/",
            data=json.dumps(data),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "approved")

    def test_admin_can_reject_special_request(self):
        """Admin puede rechazar una petición especial"""
        with tenant_context(self.tenant):
            req = SpecialMenuRequest.objects.create(
                residence=self.tenant,
                user=self.resident_user,
                date=datetime.date(2025, 2, 14),
                description="Vegano",
                status="pending",
            )
        data = {"status": "rejected"}
        response = self.admin_client.patch(
            f"/api/menu/special-requests/{req.id}/update_status/",
            data=json.dumps(data),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "rejected")

    def test_update_status_invalid_value(self):
        """Actualizar con un estado inválido devuelve error"""
        with tenant_context(self.tenant):
            req = SpecialMenuRequest.objects.create(
                residence=self.tenant,
                user=self.resident_user,
                date=datetime.date(2025, 2, 14),
                description="Test",
            )
        data = {"status": "invalido"}
        response = self.admin_client.patch(
            f"/api/menu/special-requests/{req.id}/update_status/",
            data=json.dumps(data),
            content_type="application/json",
        )
        self.assertIn(response.status_code, [400, 422])

    def test_resident_cannot_update_request_status(self):
        """Residente no puede cambiar el estado de una petición"""
        with tenant_context(self.tenant):
            req = SpecialMenuRequest.objects.create(
                residence=self.tenant,
                user=self.resident_user,
                date=datetime.date(2025, 2, 14),
                description="Test",
            )
        data = {"status": "approved"}
        response = self.resident_client.patch(
            f"/api/menu/special-requests/{req.id}/update_status/",
            data=json.dumps(data),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 403)

    def test_unauthenticated_cannot_create_special_request(self):
        """Usuario no autenticado no puede crear peticiones especiales"""
        data = {"date": "2025-02-14", "description": "Test"}
        response = self.anon_client.post(
            "/api/menu/special-requests/",
            data=json.dumps(data),
            content_type="application/json",
        )
        self.assertIn(response.status_code, [401, 403])