<div align="center">

<table width="100%" style="border: none; background: none;">
  <tr>
    <td align="center" width="50%" style="border: none;">
      <img src="../images/logo-app.jpeg" alt="Logo NexUS" width="250">
    </td>
    <td align="center" width="50%" style="border: none;">
      <img src="../images/logo-etsii.jpe" alt="Logo ETSII" width="300">
    </td>
  </tr>
</table>

<h1>Estructura de equipo – NexUS</h1>

<p>
  <img src="https://img.shields.io/badge/Versión-1.4.0-blue?style=flat-square" alt="Versión">
  <img src="https://img.shields.io/badge/Estado-En_Desarrollo-yellow?style=flat-square" alt="Estado">
  <img src="https://img.shields.io/badge/Grupo-7--NexUS-green?style=flat-square" alt="Grupo">
  <img src="https://img.shields.io/badge/Asignatura-ISPP-red?style=flat-square" alt="Asignatura">
</p>

<p>
  <strong>Plataforma integral de gestión y convivencia para residencias universitarias.</strong>
  <br>
  Universidad de Sevilla - Curso 2025/2026
</p>

</div>

---

## 📋 Ficha Técnica del Proyecto

| Campo | Detalle |
| :--- | :--- |
| **Proyecto** | **NexUS** |
| **Organización** | Grupo 7-NexUS (21 integrantes) |
| **Institución** | ETSII, Universidad de Sevilla |
| **Asignatura** | Ingeniería de Software y Práctica Profesional (ISPP) |
| **Fecha de actualización** | 16/02/2026 |
| **Documento** | Organización y estructura de equipo |

---

## Historial de Versiones

| Versión | Fecha       | Cambio principal                                                                 |
|---------|-------------|----------------------------------------------------------------------------------|
| 1.0.0   | 16/02/2026  | Creación y desarrollo del documento                                              |
| 1.1.0   | 17/02/2026  | Asignación de roles nominales (SM/PO)                                            |

---

## 🚀 Enlaces Rápidos

| Recurso | Descripción | Enlace |
| :--- | :--- | :--- |
| **Tablero Ágil** | Seguimiento de tareas (GitHub Projects) | [Ver Tablero](https://github.com/orgs/ispp-g11/projects/2) |
| **Diseño UX/UI** | Prototipos y Mockups en Figma | [Ver Diseños](#) |
| **Despliegue** | Entorno de producción  | [Ir a la App](#) |
| **Wiki** | Documentación técnica detallada | [Ver Wiki](#) |

---

## Índice

1. [Estructura organizativa del equipo](#1-estructura-organizativa-del-equipo)
    - 1.1 [Roles Definidos](#11-roles-definidos)
2. [Definición](#2-definición)
    - 2.1 [Leyenda de Responsabilidades](#21-leyenda-de-responsabilidades)
    - 2.2 [Justificación de la Lógica de Asignación](#22-justificación-de-la-lógica-de-asignación)
3. [Matriz RACI (Sprints 1, 2 y 3)](#3-matriz-raci-sprints-1-2-y-3)
4. [Normas de Uso y Conexión con el Definition of Done (DoD)](#4-normas-de-uso-y-conexión-con-el-definition-of-done-dod)
    - 4.1 [Protocolo de Actualización](#41-protocolo-de-actualización)
    - 4.2 [Vinculación con la Calidad](#42-vinculación-con-la-calidad)
    - 4.3 [Plan de Comunicación](#43-plan-de-comunicación)
    - 4.4 [Composición de equipos](#44-composición-de-equipos)

---

## 1. Estructura organizativa del equipo

El equipo de NexUS está compuesto por un total de 21 personas, organizadas en 4 equipos multidisciplinares (Equipos A, B, C y D).

Cada equipo funciona de manera autónoma y completa, integrando capacidades de backend, frontend, UX, testing y documentación para minimizar dependencias y maximizar la velocidad de entrega.

### 1.1 Roles Definidos

Para asegurar el flujo de trabajo, se han establecido los siguientes roles:

- _Scrum Master_: Responsable de la facilitación, eliminación de impedimentos y gestión de riesgos.

- _Product Owner_: Encargado de la priorización del backlog y la validación de los criterios de aceptación.

- _Coordinador Técnico_: Responsable de la arquitectura y la revisión de código dentro de cada equipo.

- _Desarrollador Full-stack_: Encargado de la implementación técnica y ejecución de las historias de usuario.



## 2. Definición

### 2.1 Leyenda de Responsabilidades

- _Responsable (R)_: Es la persona encargada de ejecutar la tarea. En NexUS, la mayoría de las tareas técnicas recaen sobre el Desarrollador.

- _Aprobador (A)_: Es el perfil que rinde cuentas sobre la calidad del entregable y tiene la última palabra.

- _Consultado (C)_: Personas cuya opinión o conocimiento especializado es requerido antes o durante la ejecución de la tarea.

- _Informado (I)_: Personas que deben ser notificadas sobre el progreso o la finalización de la actividad.

### 2.2 Justificación de la Lógica de Asignación

La distribución de roles en la matriz responde a las siguientes premisas estratégicas:

- _Coordinador Técnico como Aprobador (A)_: Dado que es el encargado de las decisiones de arquitectura y la revisión de código, actúa como el filtro final de calidad técnica antes de considerar una tarea como finalizada.

- _Product Owner en Diseño y Onboarding_: El PO asume la responsabilidad (R) o aprobación (A) en tareas de UX/UI y flujos de usuario (como el onboarding), ya que es quien garantiza que el producto cumpla con la visión del negocio y las necesidades del usuario.

- _Scrum Master en Temas Legales_: Debido a que el cumplimiento de la GDPR y la privacidad se han identificado como riesgos de alto impacto, el SM actúa como Aprobador (A) para asegurar que se cumplan las normativas de mitigación de riesgos del proyecto.



## 3. Matriz RACI (Sprints 1, 2 y 3)

La siguiente matriz detalla la asignación de responsabilidades para los tres hitos del proyecto.

| ID | Actividad / Paquete de Trabajo | Scrum Master | Desarrollador | Coordinador Técnico | Product Owner |
|----|--------------------------------|--------------|---------------|---------------------|---------------|
| **S1** | **INFRAESTRUCTURA Y BASE TÉCNICA** | | | | |
| 1.1 | Repositorios, Ramas y CI/CD | I | R | A | I |
| 1.2 | Configuración Stack y DB | I | R | A | C |
| 1.3 | Despliegue en entornos (Cloud) | I | R | A | I |
| 1.4 | Documentación técnica inicial | I | C | A | I |
| 1.5 | Registro, Log-in y Recuperación | I | R | A | C |
| 1.6 | Gestión de roles y Perfil básico | I | R | A | A |
| 1.7 | Dashboard Admin y CRUD Habitaciones | I | R | A | C |
| 1.8 | Creación y gestión de incidencias (Base) | I | R | A | C |
| 1.9 | Paleta, Tipografía y Wireframes | I | I | C | R/A |
| 1.10 | Casos de prueba y Testing integración | I | C | A | C |
| **S2** | **MVP v1 (Reservas, Comms, Legal)** | | | | |
| 2.1 | Reservas de espacios y objetos comunes | I | R | A | C |
| 2.2 | Avisos oficiales y Comunicación | I | R | A | C |
| 2.3 | Onboarding digital (Check-in, Firma) | I | R | A | R |
| 2.4 | Buzón Dirección-Estudiante | I | R | A | C |
| 2.5 | Legal: GDPR, Privacidad y Portabilidad | A | C | I | R |
| **S3** | **MVP v2 (Social, IA, Multi-residencia)** | | | | |
| 3.1 | Matching social entre estudiantes (IA) | I | R | A | C |
| 3.2 | Gestión de eventos y actividades | I | R | A | C |
| 3.3 | Gestión de Comedor y Menús | I | R | A | C |
| 3.4 | Panel Multi-Residencia (Vista NexUS) | I | R | A | C |
| 3.5 | Marca blanca (Logos y Colores corp.) | I | R | A | C |
| 3.6 | Testing de seguridad y Navegadores | I | C | A | I |



## 4. Normas de Uso y Conexión con el Definition of Done (DoD)

### 4.1 Protocolo de Actualización

Esta matriz es un documento vivo. Se revisará y detallará al inicio de cada ciclo durante el Sprint Planning. En caso de conflicto entre un "Responsable" y un "Aprobador", el Scrum Master actuará como mediador para asegurar el cumplimiento de los plazos.

### 4.2 Vinculación con la Calidad

La matriz RACI es la base operativa de nuestra Definition of Done (DoD). Ninguna tarea marcada con una R se considerará "Terminada" si el perfil asignado con la A no ha realizado la correspondiente Revisión de Código (Code Review) y validado que el pipeline de CI/CD esté aprobado (en verde).

### 4.3 Plan de Comunicación

- _Consultas (C)_: Se realizarán de manera asíncrona mediante los canales de comunicación interna.

- _Información (I)_: El estado de las tareas se comunicará automáticamente a través de las herramientas de gestión de repositorio y durante las reuniones de sincronización semanal.


### 4.4 Composición de equipos

| Equipo | Nombre del integrante | Rol en el Proyecto |
|--------|------------------------|-------------------|
| **A** | Javier Castilla Rodríguez | Desarrollador |
| **A** | Javier Gutiérrez Pastor | Desarrollador |
| **A** | Nuno José del Pino Escalante | Desarrollador |
| **A** | Alejandro de los Reyes Pérez | **Desarrollador, Coordinador** |
| **A** | Javier Soria Blanco | Desarrollador |
| | | |
| **B** | Juan José Cardesa Sosa | Desarrollador |
| **B** | Nicolás Gómez Claraco | Desarrollador |
| **B** | Ignacio Martínez Díaz | **Desarrollador, Coordinador**  |
| **B** | Manuel Jesús Niza Cobo | **Desarrollador, Scrum Master** |
| **B** | Miguel Regidor García | **Desarrollador, Product Owner** |
| | | |
| **C** | Olga Cantalejo Gómez | Desarrolladora |
| **C** | Carolina Murillo Gómez | Desarrolladora |
| **C** | Marta Recio Gil | **Desarrolladora, Coordinadora** |
| **C** | Celia Suárez Coronel | Desarrolladora |
| **C** | Paula María Suárez Linares | Desarrolladora |
| | | |
| **D** | Francisco de Castro Mañas | Desarrollador |
| **D** | Carlos Gallero Rodríguez | **Desarrollador, Coordinador** |
| **D** | Jesús García Pérez | Desarrollador |
| **D** | Alberto García Sanz | Desarrollador |
| **D** | Ángel Mateos Marín | Desarrollador |
| **D** | Pablo Pérez Gaspar | Desarrollador |
