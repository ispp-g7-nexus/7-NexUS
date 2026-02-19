---
name: nexus-project-engineering
description: Guia de implementacion en el proyecto NexUS (Django multitenant + React SSR). Usar cuando haya que crear o modificar backend, frontend SSR, rutas, componentes, integraciones frontend-backend, tenancy por dominio, auth JWT, Docker Compose dev/prod o documentacion tecnica del repo.
---

# NexUS Project Skill

## 1) Contexto del producto

NexUS es una plataforma SaaS B2B2C para residencias de estudiantes.
Objetivo: profesionalizar operativa, mejorar experiencia de convivencia y habilitar gestion multi-residencia.

Segun `docs/competitive_analysis/7-DP-Competitive_Analysis.md`, los cores diferenciales del producto son:

1. IA para convivencia post-asignacion (seguimiento continuo, no solo matching inicial).
2. Transparencia bidireccional de incidencias para residente y staff.
3. Reserva de objetos comunes (no solo espacios).
4. Analitica de clima social y bienestar.
5. Control de invitados por QR.
6. White-label profundo (dominio, marca, flujos).
7. Gestion de comedor/menus con alergeno y logistica.
8. Vista NexUS multi-residencia para grupos.

## 2) Stack y decisiones tecnicas

Basado en `docs/stack-analysis/7-DP-stack-technology-analysis.md`:

- Frontend: React + TypeScript + Vite SSR.
- Backend: Django + DRF + django-tenants.
- DB: PostgreSQL + pgvector.
- Asincronia: Redis + Celery.
- Infra local: Docker Compose.
- Entrada HTTP: Nginx (solo reverse proxy hacia frontend SSR).

Regla de tenancy:
- No hay una base de datos por tenant.
- Se usa una sola base PostgreSQL con aislamiento por esquemas (`django-tenants`).

## 3) Arquitectura de carpetas

### Raiz

- `backend/`: API y logica multitenant.
- `frontend/`: app SSR React + Vite.
- `nginx/`: reverse proxy.
- `docs/`: documentacion de negocio y tecnica.
- `docker-compose.yml`: dev.
- `docker-compose.prod.yml`: prod.

### Backend

- `backend/config/settings/base.py`: apps, middleware, tenancy, redis, celery, jwt.
- `backend/config/urls.py`: rutas publicas de API.
- `backend/apps/tenants/`: modelos `Plan`, `Client`, `Domain`.
- `backend/apps/residences/`: `Residence`, `ResidenceDomain`, `ResidenceBranding`, `Membership`.
- `backend/apps/common/`: decorators, helpers redis/celery/jwt, vistas auth/context.
- `backend/apps/tenants/management/commands/seed_demo.py`: seed demo idempotente.

### Frontend

- `frontend/server.ts`: servidor SSR Express + Vite middleware + proxy API.
- `frontend/src/entry-server.tsx`: render SSR con `StaticRouter`.
- `frontend/src/entry-client.tsx`: hidratacion con `BrowserRouter`.
- `frontend/src/providers/AppDataProvider.tsx`: estado inicial SSR (`tenantContext`, `userContext`).
- `frontend/src/server/`: fetch interno server-side a backend.
- `frontend/src/hooks/`: `useTenant`, `useUser`.
- `frontend/src/app/`: app principal y vistas/pantallas reales.
- `frontend/src/app/components/ui/`: libreria de componentes UI.

## 4) Flujo frontend-backend-tenancy

Flujo request:

1. Cliente entra por dominio a Nginx (`nginx/default.conf`).
2. Nginx reenvia todo a `frontend:5173` preservando `Host`.
3. `frontend/server.ts`:
   - resuelve host real (en dev usa `DEV_DEFAULT_HOST` para localhost),
   - consulta backend interno (`INTERNAL_API_BASE_URL`, por defecto `http://backend:8000`),
   - inyecta bootstrap SSR (`__NEXUS_DATA__`) con tenant + user.
4. Backend Django:
   - `TenantMainMiddleware` resuelve tenant por `tenants.Domain` (schema public),
   - `ResidenceByDomainMiddleware` resuelve residencia por `residences.ResidenceDomain` en el schema tenant.
5. App hidrata en cliente y usa `/api/public/*` y `/api/auth/*` proxificados por SSR server.

Endpoints base actuales:
- `GET /health/`
- `GET /api/public/tenant-context/`
- `GET /api/auth/me/`
- `POST /api/auth/login/`
- `POST /api/auth/logout/`

## 5) Reglas para crear paginas SSR en este proyecto

No usar patrones de Next.js App Router ni React Server Components. Este proyecto usa SSR clasico con React Router.

### Paso a paso para nueva pagina/ruta

1. Crear componente de pagina en `frontend/src/app/components/...` o `frontend/src/pages/...`.
2. Registrar ruta en `frontend/src/app/App.tsx` (o rutas anidadas en `StudentView`/`AdminView`).
3. Si necesita datos iniciales SSR:
   - crear fetch en `frontend/src/server/*`,
   - pasar datos por bootstrap (`AppDataProvider`) o consumir via hooks existentes.
4. Si necesita datos cliente:
   - usar `fetch` a rutas proxificadas (`/api/...`), no llamar backend directo desde navegador.

### Restricciones SSR importantes

- No usar `window`, `document`, `localStorage` durante render inicial.
- Mover acceso browser-only a `useEffect`.
- No renderizar `<Navigate>` en primer render bajo `StaticRouter`.
- Para redirecciones iniciales usar patron tipo `ClientRedirect` con `useEffect` + `useNavigate`.

## 6) Reglas para crear componentes React

### Componentes presentacionales

- Sin fetch.
- Reciben props tipadas.
- Sin dependencias de router si no hace falta.

### Componentes interactivos

- Usar `useState/useEffect`.
- Encapsular logica de datos en hooks (`useTenant`, `useUser`, o hooks nuevos).
- Mantener contratos tipados en `frontend/src/types`.

### Estilos y theming

- El theming por tenant/white-label se inyecta en `App.tsx` con CSS vars (`--primary`, `--accent`, etc.).
- Componentes nuevos deben usar variables de tema cuando aplique.

## 7) Reglas backend para nuevas features

1. Modelar en app de dominio (`tenants`, `residences`, o nueva app).
2. Asegurar aislamiento por tenant:
   - aplicar `tenant_required` en vistas tenant-aware.
   - usar `residence_access_required` o validaciones de `Membership` para permisos finos.
3. Exponer endpoint en `backend/config/urls.py`.
4. Mantener compatibilidad de payload con `frontend/src/types/*`.
5. Comentar en espanol (convencion del proyecto).

Notas:
- Django admin no es canal funcional del producto.
- Auth actual es JWT por cookie HttpOnly y/o Authorization header.

## 8) Auth y roles

Login:
- Endpoint: `POST /api/auth/login/`
- Payload: `{ email, password, portal }`, donde `portal` es `student` o `admin`.

Roles en `Membership`:
- `portfolio_admin`
- `residence_admin`
- `resident`

El backend valida acceso por portal y residencia antes de emitir token.

## 9) Docker y entornos

### Dev

- Archivo: `docker-compose.yml`
- Hot reload:
  - backend por `runserver` + volumen `./backend:/app`
  - frontend por Vite SSR + polling/HMR
- Seed demo automatico al arrancar backend (si `SEED_DEMO_ON_STARTUP=1`).

### Prod

- Archivo: `docker-compose.prod.yml`
- Backend con `gunicorn` y settings de produccion.
- Frontend en `NODE_ENV=production` (`npm run build` + `npm run preview:ssr`).
- Seed demo desactivado por defecto.

## 10) Checklist antes de cerrar una tarea

1. Verificar que no se rompe tenancy por dominio.
2. Verificar que rutas SSR no usan `Navigate` en primer render server.
3. Verificar consistencia de tipos frontend/backend.
4. Verificar compose y arranque (`docker compose up -d`) cuando la tarea lo requiera.
5. Actualizar docs si cambian flujos o contratos.

## 11) Referencias internas que debe consultar

- `docs/competitive_analysis/7-DP-Competitive_Analysis.md`
- `docs/stack-analysis/7-DP-stack-technology-analysis.md`
- `docs/sprint-development-plan/7-DP-Sprint_Development_Plan.md`
- `backend/config/settings/base.py`
- `backend/apps/common/views.py`
- `backend/apps/residences/middleware.py`
- `frontend/server.ts`
- `frontend/src/entry-server.tsx`
- `frontend/src/entry-client.tsx`
- `frontend/src/app/App.tsx`
