## Bootstrap ALM  – NexUS

<p align="center">
  <img src="../../images/logo-app.png" alt="Logo NexUS" width="500">
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


### Propósito
Documento de referencia para la gestión del ciclo de vida del desarrollo (ALM): estructura de ramas, gestión del código, esquema general de CI/CD y reglas de Project Management.

---

**Estructura de ramas (branching)**

- `main`: rama de producción. Cada commit en `main` debe ser desplegable.
- `develop`: rama de integración para la siguiente entrega. Todas las funcionalidades listas se integran aquí.
- `feature/<NX>-<S(numero del sprint al que corresponda)>.<numero de task>`: ramas de desarrollo para nuevas funcionalidades o mejoras. Se crean desde `develop` y se mergean mediante Pull Request a `develop`.
- `release/<version>`: rama temporal para preparar una release (tests finales, correcciones menores). Se crea desde `develop`; al finalizar se hace merge a `main` y a `develop`.
- `hotfix/<descripcion>`: corrección urgente creada desde `main`, al terminar se mergea a `main` y `develop`.
- `sprint(numero del sprint)`: codigo final del sprint que corresponda

Buenas prácticas:
- Usar PRs para integrar cambios, incluir descripción, issue/ticket relacionado y reviewers asignados.
- Ramas protegidas: `main` y `develop` con requisitos de revisión, checks de CI aprobados y reglas de push (no FF).
- Commits atómicos y mensajes claros (tipo: `feat(auth): añadir login SSO` o `fix(api): corregir null pointer`).

---

**Gestión del código y revisiones**

- Pull Requests: deben incluir descripción del cambio, pruebas realizadas y referencias a la tarjeta del tablero.
- Revisiones: al menos 1 reviewer del equipo y, cuando afecte áreas críticas, 2 reviewers incluyendo un responsable de arquitectura.
- Merge strategy: Squash merge en `develop` y `main` para mantener historial legible; conservar referencias a issues en el mensaje final.
- Código debe pasar linters y tests automatizados antes de permitir merge.

---

**CI / CD (visión general)**

Pipeline típico (por cada push / PR):

- Lint: comprobación de estilo (ESLint, flake8, etc.).
- Build: construcción de artefactos (imagen docker frontend/backend, bundles JS).
- Test: ejecución de tests unitarios y test básicos de integración.
- Security scan: análisis estático/dep-check.
- Deploy (CD): despliegue automático desde `main` a entornos de producción o manual desde `release/*` con gating.

Reglas de activación:
- PRs a `develop`: ejecutan Lint, Build y Test; resultado debe ser OK para permitir merge.
- Push a `main`: pipeline completo y despliegue automático a staging/producción según configuración de infra.
- Releases: tags semánticos y registros de versión; el pipeline de release puede generar imágenes etiquetadas y artefactos almacenados en registry.

---

**Project Management — Tablero KANBAN**

Trabajamos con un tablero KANBAN que sigue este flujo y reglas:

- Columnas (orden):
  - `Backlog`: ideas y tareas futuras sin preparar.
  - `Ready`: tareas priorizadas y con criterios de aceptación definidos; listas para comenzar.
  - `In Progress`: tareas en desarrollo activas.
  - `Under Review`: tareas que esperan revisión de código, QA o validación funcional.
  - `Done`: tareas completadas y desplegadas/localmente verificadas.

- Cada tarjeta/tarea contiene:
  - Asignado(s).
  - Talla (estimación): `XS`, `S`, `M`, `L`, `XL`.
    - XS: cambios triviales (< 1h).
    - S: pequeñas tareas (1–4h).
    - M: tarea estándar (1–3 días).
    - L: trabajo grande (varios días / coordinación entre equipos).
    - XL: iniciativas épicas (se deberían dividir en varias tarjetas).
  - Tags del/los equipos responsables.
  - Tags de funcionalidad o dominio (p.ej. `auth`, `matching`, `documentación`...)
  - Milestone: asociado a `S1`, `S2` o `S3` según la iteración/entrega planificada.

Reglas de uso del tablero:
- Sólo pasar a `In Progress` si la tarjeta está en `Ready` y tiene definición de terminado (DoD) y criterios de aceptación claros.
- Revisiones: mover a `Under Review` cuando exista un PR abierto y se haya solicitado revisión.
- Definición de hecho: pruebas unitarias si aplica, documentación mínima (si aplica), PR aprobado, build verde y despliegue/validación en entorno de integración si procede.
- Prioridad y milestones: el Product Owner prioriza el `Backlog` y asigna milestones `S1`/`S2`/`S3` para agrupar entregas.

---

**Trazabilidad y vinculación**

- Todas las PRs deben referenciar la tarjeta del tablero y el milestone correspondiente (`S1`/`S2`/`S3`).

---


