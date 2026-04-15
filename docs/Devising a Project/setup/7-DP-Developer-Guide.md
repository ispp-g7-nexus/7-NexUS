# 7-DP Developer Guide (Backend, Frontend, Tenants y Auth)

## Objetivo
Guia practica para desarrolladores del proyecto NexUS.
Incluye:
- Como crear nuevos modulos backend.
- Como desarrollar nuevas funcionalidades frontend.
- Como funciona el multitenant por dominio.
- Como funciona login/auth con JWT por cookie.

## 1) Mapa rapido de arquitectura
- Entrada web: `nginx` (`:80`) -> `tenant_gateway` (`:3000`)
- Frontend: Vite app cliente (`frontend:5173`)
- Backend: Django multitenant (`backend:8000`)
- Datos: PostgreSQL + Redis
- Async: Celery worker + Celery beat

Flujos clave:
1. `GET /` -> `tenant_gateway` inyecta `window.__NEXUS_DATA__` + branding (`favicon_url`, `custom_css`) en el HTML.
2. `GET/POST /api/*` -> `tenant_gateway` proxifica a backend.

## 2) Convenciones del proyecto
- Backend en `backend/apps/*`.
- Sin Django Admin funcional (ruta `/admin` no publicada por gateway).
- Autenticacion por JWT (cookie HttpOnly y opcion Bearer).
- Multitenant por cabecera `Host`.
- Comentarios/documentacion en espanol.

## 3) Crear un nuevo modulo backend
Nota: en este proyecto `backend` esta montado por volumen en Docker Compose, asi que los cambios locales se reflejan en el contenedor. Por eso los comandos pueden ejecutarse localmente (si tienes entorno Python listo) o dentro del contenedor.

### 3.1 Crear app
Desde raiz del repo:

```bash
cd backend
python manage.py startapp incidencias apps/incidencias
```

Alternativa en contenedor (si no tienes Python local preparado):

```bash
docker compose exec backend sh -lc "python manage.py startapp incidencias apps/incidencias"
```

Asegura estos archivos minimos en `backend/apps/incidencias/`:
- `__init__.py`
- `apps.py`
- `models.py`
- `views.py`
- `migrations/__init__.py`

Ajusta `apps.py` para usar path de paquete:

```python
from django.apps import AppConfig


class IncidenciasConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.incidencias"
```

### 3.2 Registrar app en settings
Editar `backend/config/settings/base.py`:
- Si el modulo es tenant-aware (normal en este proyecto): agregar a `TENANT_APPS`.
- Si es global/public schema: agregar a `SHARED_APPS`.

Regla practica:
- Dominio de negocio por residencia/usuarios -> `TENANT_APPS`.
- Datos globales de plataforma (tenants, dominios) -> `SHARED_APPS`.

### 3.3 Modelos y migraciones
Crear modelos en `models.py`, luego:

```bash
cd backend
python manage.py makemigrations incidencias
```

Alternativa en contenedor:

```bash
docker compose exec backend python manage.py makemigrations incidencias
```

Aplicar migraciones:
- Si cambiaste app de `SHARED_APPS`:

```bash
cd backend
python manage.py migrate_schemas --shared
```

Alternativa en contenedor:

```bash
docker compose exec backend python manage.py migrate_schemas --shared
```

- Si cambiaste app tenant (`TENANT_APPS`):

```bash
cd backend
python manage.py migrate_schemas
```

Alternativa en contenedor:

```bash
docker compose exec backend python manage.py migrate_schemas
```

### 3.4 Crear endpoints
Patron actual: vistas Django function-based en `views.py`.

Registrar rutas en `backend/config/urls.py` (o en `urls.py` propio + `include`).

Si el endpoint requiere contexto tenant:
- usar `@tenant_required` (`apps.common.decorators`).

Si requiere control por residencia/roles:
- usar `@residence_access_required(...)`.

### 3.5 Ejemplo minimo de endpoint tenant-aware
```python
from django.http import JsonResponse
from apps.common.decorators import tenant_required


@tenant_required
def incidencias_ping(request):
    return JsonResponse({
        "ok": True,
        "tenant": request.tenant.slug,
        "residence": getattr(getattr(request, "residence", None), "slug", None),
    })
```

## 4) Como funciona multitenant (Host -> Tenant -> Residence)
### 4.1 Resolucion tenant
1. `TenantMainMiddleware` (django-tenants) toma `Host`.
2. Busca `tenants.Domain` en schema `public`.
3. Si existe, fija `request.tenant` y schema activo.

### 4.2 Resolucion residencia
Luego `ResidenceByDomainMiddleware`:
1. Lee `Host`.
2. Busca `residences.ResidenceDomain` activo en schema tenant.
3. Fija `request.residence`.

### 4.3 Papel de `tenant_gateway`
- Si el host de entrada es `localhost`, usa `TENANT_CONTEXT_HOST` (fallback `DEMO_TENANT_DOMAIN`) para llamar backend con contexto tenant correcto.
- Inyecta bootstrap en HTML (`window.__NEXUS_DATA__`) para que frontend arranque con contexto.

## 5) Login y autenticacion
### 5.1 Endpoints
- `POST /api/auth/login/`
- `POST /api/auth/logout/`
- `GET /api/auth/me/`

### 5.2 Login request
Payload:

```json
{
  "email": "admin@demo.nexus.local",
  "password": "demo1234",
  "portal": "admin"
}
```

`portal` permitido: `student` o `admin`.

### 5.3 Validaciones de login
`auth_login` valida:
1. Credenciales usuario.
2. Que `portal` sea valido.
3. Membership y permisos para el portal/residencia actual:
- `student` -> rol `resident`
- `admin` -> `portfolio_admin` o `residence_admin`

### 5.4 Token y sesion
- Se emite JWT firmado (`HS256` por defecto).
- Se guarda en cookie HttpOnly (`JWT_ACCESS_COOKIE_NAME`).
- `auth_me` resuelve usuario desde cookie o Bearer token.

## 6) Crear nuevas funcionalidades frontend
Estado actual: frontend cliente Vite (sin SSR de React).

### 6.1 Estructura actual del frontend (la que usamos ahora)
Base actual en `frontend/src`:
- `main.tsx`: entrypoint de la app.
- `App.tsx`: componente raiz.
- `services/api.ts`: cliente base de llamadas HTTP.
- `components/`: componentes reutilizables.
- `pages/`: vistas/paginas.
- `styles/`: estilos compartidos.

Regla practica actual:
- Paginas nuevas -> `frontend/src/pages/`.
- Componentes reutilizables -> `frontend/src/components/`.
- Nuevos servicios HTTP -> `frontend/src/services/`.
- Estilos globales/compartidos -> `frontend/src/styles/` o `index.css`/`App.css` segun corresponda.

### 6.2 Consumo API
Usar siempre mismo origen (`/api`) via `frontend/src/services/api.ts`:

```ts
const API_URL = import.meta.env.VITE_API_URL || "/api"
```

Evitar URLs absolutas al backend desde navegador.

### 6.3 Contexto tenant en frontend
Fuentes posibles:
1. `window.__NEXUS_DATA__` (inyectado por gateway al cargar HTML).
2. `GET /api/public/tenant-context/`.

### 6.4 Login desde frontend
- Llamar `POST /api/auth/login/` con `portal` correcto.
- No manejar JWT manualmente en `localStorage`.
- Confiar en cookie HttpOnly + endpoint `GET /api/auth/me/`.

## 7) Flujos de trabajo recomendados
### 7.1 Backend feature
1. Crear app/modulo (o ampliar app existente).
2. Modelos + migraciones.
3. Vistas + decoradores tenant/roles.
4. Rutas.
5. Validacion por `curl` con host correcto.

### 7.2 Frontend feature
1. Crear pagina/componente/servicio siguiendo la estructura actual (`pages`, `components`, `services`).
2. Consumir `/api`.
3. Manejar estados loading/error.
4. Verificar contexto tenant visible (branding, datos tenant).

## 8) Comandos utiles
Arranque:

```bash
docker compose up -d --build
```

Logs:

```bash
docker compose logs backend --tail=200
docker compose logs tenant_gateway --tail=200
docker compose logs frontend --tail=200
docker compose logs nginx --tail=200
```

Re-aplicar seed demo:

```bash
cd backend
python manage.py seed_demo
```

Alternativa en contenedor:

```bash
docker compose exec backend python manage.py seed_demo
```

## 9) Checklist antes de PR
- Endpoint nuevo protegido con decoradores correctos (`tenant_required`/`residence_access_required`) cuando aplique.
- Migraciones creadas y aplicadas.
- Frontend consume `/api` (sin URL hardcodeada a backend).
- Probado con tenant esperado (`TENANT_CONTEXT_HOST` o dominio real).
- Documentacion actualizada si se anaden rutas/contratos.
