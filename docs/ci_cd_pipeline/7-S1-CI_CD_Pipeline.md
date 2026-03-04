<h1>CI/CD – NexUS</h1>

<p align="center">
  <img src="../images/logo-app.png" alt="Logo NexUS" width="500">
</p>

<div align="center">

<p>
  <img src="https://img.shields.io/badge/Versión-1.0.0-blue?style=flat-square" alt="Versión">
  <img src="https://img.shields.io/badge/Estado-Completado-yellow?style=flat-square" alt="Estado">
  <img src="https://img.shields.io/badge/Grupo-7--NexUS-green?style=flat-square" alt="Grupo">
  <img src="https://img.shields.io/badge/Asignatura-ISPP-red?style=flat-square" alt="Asignatura">
</p>

<p>
  <strong>Plataforma integral de gestión y convivencia para residencias universitarias</strong>
</p>

</div>

---

**Proyecto:** NexUS  
**Grupo:** 7 - NexUS  
**Asignatura:** Ingeniería del Software y Práctica Profesional (ISPP)  
**Fecha:** 01/03/2026

---

## Historial de Versiones

| Versión | Fecha      | Cambio principal |
|---------|------------|------------------|
| 1.0.0   | 01/03/2026 | Creación del documento |
| 1.0.1   | 02/03/2026 | Documentación de SonarCLoud |

---

## Índice
- [Introducción](#introducción)
- [Resumen del pipeline](#resumen-del-pipeline)
- [Workflows principales](#workflows-principales)
  - [CI Backend](#ci-backend)
  - [CI Frontend](#ci-frontend)
  - [CI Compose (validación)](#ci-compose-validación)
  - [Tagged Release (build & publish)](#tagged-release-build--publish)
  - [Release Pleas](#release-please-automatización-de-releases)
  - [Promote Tag](#promote-tag-promoción-manual-por-entorno)
- [Imágenes y naming](#imágenes-y-naming)
- [SonarQube en Pull Requests](#sonarqube-en-pull-requests)
- [Protecciones y checks requeridos](#protecciones-y-checks-requeridos)
- [Cómo contribuir / Hooks locales](#cómo-contribuir--hooks-locales)

---

### Introducción

Este documento describe el flujo de CI/CD usado en el repositorio NexUS, las responsabilidades principales de cada workflow, el esquema de publicación de imágenes y la integración con SonarQube para el análisis de calidad en Pull Requests.

---

### Resumen del pipeline

- Los workflows de GitHub Actions realizan validaciones en `push` y `pull_request` sobre ramas principales (`main`, `develop`, `sprint/**`, `release/**`, `hotfix/**`).
- Separamos las comprobaciones en 3 workflows de CI para mejorar legibilidad y tiempos de ejecución: `CI Backend`, `CI Frontend` y `CI Compose`.
- El pipeline de releases por tag (`Tagged Release Pipeline`) construye y publica imágenes a GitHub Container Registry (GHCR) y opcionalmente dispara webhooks de despliegue.
- Existe una automatización (`release-please`) que genera PRs de release con changelogs automáticamente.
- Hay un workflow manual (`promote-tag`) para promocionar versiones a entornos (dev/stg/pre/prod) mediante tags estandarizados.
- SonarQube integrado directamente con GitHub para realizar análisis automáticos sobre los Pull Requests.

---

### Workflows principales

#### CI Backend

- Archivo: `.github/workflows/ci-backend.yml`
- Trigger: `push` / `pull_request` sobre ramas principales.
- Tareas principales:
  - Checkout del código.
  - Setup de Python (`3.12`).
  - Instalación de dependencias (`pip install -r backend/requirements/local.txt`).
  - `python manage.py check` y compilación (`python -m compileall backend`).
  
Estas comprobaciones garantizan que los cambios en el código Python no rompen comprobaciones básicas del proyecto (migrations, imports, errores sintácticos...). Ejecutarlas automáticamente evita que un commit llegue a `main` o `develop` con errores obvios que podrían bloquear despliegues o pruebas locales.

#### CI Frontend

- Archivo: `.github/workflows/ci-frontend.yml`
- Trigger: `push` / `pull_request` sobre ramas principales.
- Tareas principales:
  - Checkout del código.
  - Setup de Node (`node 22`).
  - `npm ci` y `npm run build` en `frontend/`.

Construir el frontend en CI asegura que los cambios en TypeScript/React no introducen errores de compilación o cambios en las dependencias que rompan la aplicación en producción. Sirve además para detectar fallos de bundling o problemas con tipos antes de integrar los cambios.

#### CI Compose (validación)

- Archivo: `.github/workflows/ci-compose.yml`
- Trigger: `push` / `pull_request` sobre ramas principales.
- Tareas principales:
  - Valida que exista plantilla `.env.local.example` o `.env.example` (copia a `.env`).
  - Ejecuta `docker compose -f docker-compose.yml config` y `docker compose -f docker-compose.prod.yml config` para validar sintaxis y consistencia de los ficheros compose.

La configuración de Docker Compose agrupa servicios y variables de entorno utilizados en desarrollo y producción. Validar los ficheros evita merges que dejen manifiestos inválidos, lo que reduce riesgos al levantar entornos o automatizar despliegues locales/CI.

#### Tagged Release (build & publish)

- Archivo: `.github/workflows/tagged-release.yml`
- Trigger: `push` con tags que cumplan los patrones `dev-v*`, `stg-v*`, `pre-v*`, `v*`.
- Tareas principales:
  - Resuelve metadatos del tag (como entorno o versión).
  - Configura Buildx y hace login en GHCR.
  - Construye y publica imágenes: backend, worker y frontend.
  - Publica las imágenes usando el naming estándar (ver sección siguiente).
  - Opcionalmente dispara webhooks de despliegue por entorno si los secretos `DEPLOY_WEBHOOK_*` están configurados.


#### Release Please (automatización de releases)

- Archivo: `.github/workflows/release-please.yml`
- Trigger: `push` sobre `develop` y `workflow_dispatch`.
- Tareas principales:
  - Ejecuta la acción `googleapis/release-please-action` para generar automáticamente una Pull Request de release que contiene la versión nueva y el changelog.
  - Si no está configurado el `RELEASE_PLEASE_TOKEN`, muestra un aviso en el resumen del workflow explicando cómo configurarlo.

Automatizar la creación de la PR de release reduce trabajo manual y errores humanos al preparar versiones. La herramienta extrae cambios del historial, genera notas de release y propone una PR que un responsable puede revisar y fusionar cuando esté listo.

#### Promote Tag (promoción de tags manual por entorno)

- Archivo: `.github/workflows/promote-tag.yml`
- Trigger: `workflow_dispatch` (ejecución manual) con entradas: `target_environment`, `version`, `source_ref`.
- Tareas principales:
  - Valida formato semántico de la versión y construye el nombre del tag según el entorno (`dev-vX.Y.Z`, `stg-vX.Y.Z`, `pre-vX.Y.Z` o `vX.Y.Z` para producción).
  - Crea un tag anotado y lo empuja al repositorio si no existe aún, y registra un resumen en el paso del workflow.

Este workflow da una interfaz controlada para promocionar un commit o rama a un entorno concreto mediante tags estandarizados. Evita errores al crear tags manuales y garantiza trazabilidad entre versión, entorno y commit asociado.

---

### Imágenes y nombrado

- Repositorios publicados:
  - Backend: `${{ env.REGISTRY }}/${{ github.repository_owner }}/nexus-backend`
  - Worker: `${{ env.REGISTRY }}/${{ github.repository_owner }}/nexus-worker`
  - Frontend: `${{ env.REGISTRY }}/${{ github.repository_owner }}/nexus-frontend`

- Tags publicados por release pipeline:
  - `...:vX.Y.Z` (producción)
  - `...:stg-vX.Y.Z`, `...:dev-vX.Y.Z`, `...:pre-vX.Y.Z` según entorno
  - `...:sha-<commit>` como referencia inmutable

---

### SonarQube en Pull Requests

La calidad de código se valida con SonarCloud mediante un workflow dedicado:

- Archivo: `.github/workflows/sonar.yml`
- Trigger: `pull_request` hacia `main`
- Job principal: `SonarCloud analysis`

**Funcionamiento actual del workflow:**
1. Checkout con historial completo (`fetch-depth: 0`).
2. Setup de Python (`3.12`) y Node (`22`).
3. Instalación de dependencias backend/frontend.
4. Generación de cobertura backend si existen tests Python (`backend/coverage.xml`).
5. Generación de cobertura frontend si existe script de tests/cobertura (`frontend/coverage/lcov.info`).
6. Ejecución del escaneo SonarCloud y comprobación de Quality Gate.

**Archivos de soporte:**
- `sonar-project.properties`: rutas de fuentes, exclusiones y reportes de cobertura.
- `run-sonar.sh`: ejecución local del scanner en Docker (zero-install).
- `docker-compose.sonarqube.yml`: SonarQube Community + PostgreSQL para validación local.

**Configuración requerida en GitHub (Settings -> Secrets and variables -> Actions):**
- Secret: `SONAR_TOKEN`
- Variables: `SONAR_PROJECT_KEY`, `SONAR_ORGANIZATION`

**Notas operativas:**
- En plan gratuito de SonarCloud se usa normalmente el gate por defecto (`Sonar way`) para el proyecto.
- Si no hay tests para un módulo, el workflow no fuerza generación de cobertura para ese módulo y continúa el análisis estático.
- El estado final del gate aparece como check en el Pull Request y se usa para decidir el merge.

---

### Hooks locales

- Se proporciona un hook de commit para garantizar Conventional Commits en el directorio `.githooks/commit-msg`. Se instala localmente ejecutando:

```bash
./scripts/install-hooks.sh
```

- El hook acepta mensajes de merge (mensajes creados por `git merge`/`GitHub`) o mensajes que cumplan Conventional Commits (`feat(scope): descripción`).
