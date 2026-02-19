# NexUS

<p align="center">
  <img src="docs/images/logo-app.png" alt="Logo NexUS" width="500">
</p>

<div align="center">

<p>
  <img src="https://img.shields.io/badge/Version-1.0.0-blue?style=flat-square" alt="Version">
  <img src="https://img.shields.io/badge/Estado-En_Desarrollo-yellow?style=flat-square" alt="Estado">
  <img src="https://img.shields.io/badge/Grupo-7--NexUS-green?style=flat-square" alt="Grupo">
  <img src="https://img.shields.io/badge/Asignatura-ISPP-red?style=flat-square" alt="Asignatura">
</p>

<p>
  <strong>Plataforma integral de gestion y convivencia para residencias universitarias</strong>
</p>

</div>

---

**Proyecto:** NexUS  
**Grupo:** 7 - NexUS  
**Asignatura:** Ingenieria del Software y Practica Profesional (ISPP)  
**Institucion:** ETSII - Universidad de Sevilla  
**Curso academico:** 2025/2026

<p align="center">
  <img src="docs/images/logo-etsii.jpe" alt="Logo ETSII" width="400">
</p>

---

## Funcionalidades

Desde el panel de administracion se gestionan habitaciones, ocupacion, incidencias, reservas de espacios y objetos, menus del comedor y comunicados. Los estudiantes pueden reportar incidencias, hacer reservas y recibir notificaciones desde la app.

El sistema de matching basado en IA empareja a estudiantes por compatibilidad y hace seguimiento continuo del clima de convivencia. Para grupos con varias residencias, Vista NexUS ofrece un panel centralizado de control.

## Por que NexUS

NexUS esta enfocado en residencias de tamano medio (100-400 camas) con capacidades diferenciales: matching con seguimiento de convivencia, transparencia bidireccional en incidencias, reserva de objetos, analiticas de bienestar, control de visitas por QR, white-label, gestion de comedor y panel multi-residencia.

## Stack tecnico

| Capa | Tecnologias | Descripcion |
|---|---|---|
| Frontend | React, TypeScript, Vite SSR, React Router | Interfaz web SSR con hidratacion y enrutado cliente/servidor |
| Backend | Django 5, django-tenants | API multitenant con aislamiento por esquema |
| Base de datos | PostgreSQL 16 + pgvector | Persistencia relacional y soporte vectorial |
| Asincronia | Redis + Celery | Cola de tareas y procesos en segundo plano |
| Infraestructura | Docker Compose + Nginx | Orquestacion local y reverse proxy por dominio |

## Desarrollo rapido

Arranque base para desarrollo:

```bash
docker compose up -d
```

### Prerequisitos minimos

1. Tener `.env` (copiado desde `.env.local.example`).
2. Anadir en hosts: `127.0.0.1 demo.nexus.local`.
3. Primera vez recomendable: `docker compose up -d --build`.

Comando recomendado:

```bash
cp .env.local.example .env
```

## Validacion realizada en desarrollo

Se levanto el stack y se valido:

- `GET /` por Nginx responde `200`.
- `GET /api/public/tenant-context/` con host `demo.nexus.local` responde `200`.
- Login admin y estudiante demo responden `200`.

## Seed demo automatico al arrancar backend

En desarrollo (`SEED_DEMO_ON_STARTUP=1`) se crea automaticamente:

- Tenant: `demo.nexus.local`
- Admin: `admin@demo.nexus.local / demo1234`
- Estudiante: `estudiante@demo.nexus.local / demo1234`

## Nota sobre autoreload del backend

- El backend usa `runserver` con volumen `./backend:/app`.
- Al cambiar codigo Python, Django recarga automaticamente.
- No se recrea el contenedor por cada cambio.
- Migraciones y seed corren al arrancar backend, no en cada guardado.

## Produccion

Se incluye `docker-compose.prod.yml`.

Arranque:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Variables recomendadas para prod:

```bash
cp .env.prod.example .env
```

Detalles de produccion:

- Backend con `gunicorn` y `config.settings.production`.
- Seed demo desactivado (`SEED_DEMO_ON_STARTUP=0`).
- Frontend SSR en modo `production` (`npm run build` + `npm run preview:ssr`).
- Nginx expuesto en `:80`.

## Documentacion

Toda la documentacion del proyecto se mantiene en `docs/`.

## Golden Flow (Git + CI/CD)

Se implementaron workflows base en `.github/workflows/`:

- `ci.yml`: checks de backend, frontend y validacion de compose.
- `pr-title.yml`: obliga Conventional Commits en titulo de PR.
- `release-please.yml`: prepara release PR sobre `develop`.
- `promote-tag.yml`: workflow manual para crear tags de promocion.
- `tagged-release.yml`: pipeline por tag (`dev-v*`, `stg-v*`, `pre-v*`, `v*`) y publicacion en GHCR.

Ramas recomendadas:

- `main` -> produccion
- `develop` -> staging
- `sprint/*` -> desarrollo por sprint
- `release/*` -> pre-produccion
- `hotfix/*` -> fixes urgentes desde prod

Tags por entorno:

- `dev-vX.Y.Z`
- `stg-vX.Y.Z`
- `pre-vX.Y.Z`
- `vX.Y.Z`

### Configuracion manual necesaria en GitHub

1. Activar branch protection en `main`, `develop`, `release/*`.
2. Exigir checks obligatorios:
   - `Backend checks`
   - `Frontend checks`
   - `Docker Compose validate`
   - `Validate conventional PR title`
3. Desactivar push directo a ramas protegidas.
4. Configurar `RELEASE_PLEASE_TOKEN` (PAT con permisos de `contents` y `pull requests`) para activar `release-please`.
5. Configurar secretos opcionales de deploy webhook:
   - `DEPLOY_WEBHOOK_DEV`
   - `DEPLOY_WEBHOOK_STG`
   - `DEPLOY_WEBHOOK_PRE`
   - `DEPLOY_WEBHOOK_PROD`
