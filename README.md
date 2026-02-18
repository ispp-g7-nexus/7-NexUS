# NexUS

<p align="center">
  <img src="docs/images/logo-app.png" alt="Logo NexUS" width="500">
</p>

<div align="center">

<p>
  <img src="https://img.shields.io/badge/Versión-1.0.0-blue?style=flat-square" alt="Versión">
  <img src="https://img.shields.io/badge/Estado-En_Desarrollo-yellow?style=flat-square" alt="Estado">
  <img src="https://img.shields.io/badge/Grupo-7--NexUS-green?style=flat-square" alt="Grupo">
  <img src="https://img.shields.io/badge/Asignatura-ISPP-red?style=flat-square" alt="Asignatura">
</p>

<p>
  <strong>Plataforma integral de gestión y convivencia para residencias universitarias</strong>
</p>

</div>

---

**Proyecto:** NexUS<br>
**Grupo:** 7 - NexUS<br>
**Asignatura:** Ingeniería del Software y Práctica Profesional (ISPP)<br>
**Institución:** ETSII – Universidad de Sevilla<br>
**Curso académico:** 2025/2026

<p align="center">
  <img src="docs/images/logo-etsii.jpe" alt="Logo ETSII" width="400">
</p>

---

## Funcionalidades

Desde el panel de administración se gestionan habitaciones, ocupación, incidencias, reservas de espacios y objetos, menús del comedor y comunicados. Los estudiantes pueden reportar incidencias, hacer reservas y recibir notificaciones directamente desde la app.

El sistema de matching basado en IA empareja a estudiantes por compatibilidad y hace seguimiento continuo del clima de convivencia. Para grupos con varias residencias, Vista NexUS ofrece un panel centralizado de control.

## Por qué NexUS

Ninguno de los más de veinte competidores analizados cubre bien el segmento medio de residencias (100-400 camas). NexUS está diseñado para ese hueco con características sin competencia directa: matching con seguimiento de convivencia, transparencia bidireccional en incidencias, reserva de objetos, analíticas de bienestar, control de visitas por QR, white-label, gestión de comedor y panel multi-residencia.

Modelo SaaS B2B con planes base y premium, precio de referencia entre 8 y 12 euros por cama al mes.

## Stack técnico

| Capa | Tecnologías | Descripción |
|---|---|---|
| **Frontend** | ![React](https://img.shields.io/badge/React-20232A?style=flat-square&logo=react&logoColor=61DAFB) ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white) ![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white) | Interfaz de usuario con tipado estático y bundling optimizado |
| **Backend** | ![Django](https://img.shields.io/badge/Django-092E20?style=flat-square&logo=django&logoColor=white) ![DRF](https://img.shields.io/badge/DRF-ff1709?style=flat-square&logo=django&logoColor=white) | API REST con autenticación, permisos y ORM integrados |
| **Base de datos** | ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white) ![pgvector](https://img.shields.io/badge/pgvector-4169E1?style=flat-square&logo=postgresql&logoColor=white) | Base de datos relacional con soporte de vectores para IA |
| **Tareas asíncronas** | ![Redis](https://img.shields.io/badge/Redis-DC382D?style=flat-square&logo=redis&logoColor=white) ![Celery](https://img.shields.io/badge/Celery-37814A?style=flat-square&logo=celery&logoColor=white) | Procesamiento en segundo plano para matching y notificaciones |
| **Infraestructura** | ![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white) ![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088FF?style=flat-square&logo=github-actions&logoColor=white) | Contenedorización del entorno y pipeline de CI/CD |
| **Despliegue** | ![Cloudflare](https://img.shields.io/badge/Cloudflare-F38020?style=flat-square&logo=cloudflare&logoColor=white) ![Azure](https://img.shields.io/badge/Azure-0078D4?style=flat-square&logo=microsoft-azure&logoColor=white) | Frontend en Cloudflare Pages, backend y base de datos en Azure App Service |

## Equipo

21 personas organizadas en cuatro equipos multidisciplinares trabajando con Scrum y sprints de dos semanas.

| | Equipo A | Equipo B | Equipo C | Equipo D |
|---|---|---|---|---|
| **Coordinador/a** | Alejandro de los Reyes Pérez | Ignacio Martínez Díaz | Marta Recio Gil | Carlos Gallero Rodríguez |
| | Javier Castilla Rodríguez | Juan José Cardesa Sosa | Olga Cantalejo Gómez | Francisco de Castro Mañas |
| | Javier Gutiérrez Pastor | Nicolás Gómez Claraco | Carolina Murillo Gómez | Jesús García Pérez |
| | Nuno José del Pino Escalante | Manuel Jesús Niza Cobo | Celia Suárez Coronel | Alberto García Sanz |
| | Javier Soria Blanco | Miguel Regidor García | Paula María Suárez Linares | Ángel Mateos Marín |
| | | | | Pablo Pérez Gaspar |

**Scrum Master:** Manuel Jesús Niza Cobo · **Product Owner:** Miguel Regidor García

