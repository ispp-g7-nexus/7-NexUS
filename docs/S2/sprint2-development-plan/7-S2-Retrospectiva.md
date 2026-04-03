## Informe de Retrospectiva del Sprint 1 - NexUS

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
</p>

</div>

---

**Proyecto:** NexUS  
**Grupo:** 7 - NexUS  
**Asignatura:** Ingeniería del Software y Práctica Profesional (ISPP)  
**Institución:** ETSII – Universidad de Sevilla  
**Curso académico:** 2025/2026  
**Fecha:** 25/03/2026  

<p align="center">
  <img src="../../images/logo-etsii.jpe" alt="Logo ETSII" width="400">
</p>

---


## Historial de Versiones

| Versión | Fecha | Cambio principal |
|---------|-------|------------------|
| 1.0.0 | 25/03/2026 | Creación del documento |

---

## Índice
- [1. Resumen del Sprint](#1-resumen-del-sprint)
  - [1.1 Objetivo del Sprint](#11-objetivo-del-sprint)
  - [1.2 Principales logros](#12-principales-logros)
  - [1.3 Desafíos encontrados](#13-desafíos-encontrados)
- [2. Análisis de la Retrospectiva](#2-análisis-de-la-retrospectiva)
  - [2.1 Lo que salió bien](#21-lo-que-salió-bien)
  - [2.2 Lo que salió mal](#22-lo-que-salió-mal)
  - [2.3 Sugerencias de mejora](#23-sugerencias-de-mejora)

---

## 1. Resumen del Sprint

### 1.1 Objetivo del Sprint

El objetivo principal de este segundo Sprint era establecer una base sólida para el proyecto NexUS, lo cual incluía la configuración completa del entorno de desarrollo y la elaboración de la continuación de la documentación estratégica, como la Matriz de Riesgos y el Desglose de Presupuestos. Se buscaba que todos los miembros del equipo desarrollaran correctamente las tareas asignadas para este sprint, continuando las primeras funcionalidades ya implementadas.

Los objetivos específicos definidos y su grado de cumplimiento han sido:
- Mejorar **autenticación y gestión básica de usuarios**
- Unificar estéticamente **panel administrativo inicial**
- Implementar las relaciones del **sistema de incidencias**
- Desarrollar **testing**
- Implementar la personalización **tenant**
- Desplegar la aplicación en la nube

### 1.2 Principales logros

A pesar de los obstáculos, hemos logrado completar la fase de desarrollo. Técnicamente se ha conseguido mantener la integración correcta con Docker Desktop, lo que nos permite seguir trabajando en el proyecto de forma continua y estandarizada, desarrollando correctamente las tareas propuestas. Además Se ha añadido la personalización de la aplicación.

### 1.3 Desafíos encontrados

Este Sprint ha estado marcado por retos organizativos significativos que impactaron directamente en el ritmo de desarrollo. El principal obstáculo fue el bloqueo operativo derivado del uso de ZenHub. A esto se sumó el desconocimiento de los límites de la versión gratuita de la herramienta, lo que la invalidó como recurso de gestión. Estos problemas de planificación, junto con fallos recurrentes en las migraciones de la base de datos y la falta de seguimiento de los estándares de estructura de código, generaron cuellos de botella técnicos que obligaron a concentrar gran parte del esfuerzo.

## 2. Análisis de la Retrospectiva

### 2.1 Lo que salió bien
Para analizar los éxitos de este Sprint se ha acordado realizar una encuesta para conocer la opinión de todos los miembros del grupo. Tras el análisis de las valoraciones del equipo, se han identificado las siguientes fortalezas y éxitos clave durante este segundo Sprint:

- **Optimización de la Organización y Reparto**:Existe un consenso generalizado en que la organización ha sido mucho más estructurada y equilibrada que en el sprint anterior. Las tareas se asignaron con mayor anticipación y lógica, reduciendo significativamente la duplicidad de esfuerzos.

- **Cumplimiento de Plazos y Objetivos**: El equipo logró completar la gran mayoría de las tareas planteadas a tiempo, terminando incluso con mayor margen respecto a la fecha de entrega en comparación con el Sprint 1.

- **Mejora en la Comunicación Interna**: Se reconoce un avance en el flujo de información entre subgrupos de trabajo, facilitado por cambios en el sistema de comunicación que permitieron que las decisiones llegaran mejor a todos los miembros.

- **Ambiente de Colaboración**:Se destaca un buen clima de trabajo y colaboración entre grupos, permitiendo un desarrollo menos "apurado" y con menos agobios que en etapas anteriores.

### 2.2 Lo que salió mal

A pesar del éxito en la entrega de funcionalidades, el equipo ha identificado problemas críticos en los procesos internos que deben ser corregidos para los próximos Sprints:

- **Fracaso de Herramientas de Gestión (Zenhub)**: El intento de implementar Zenhub para la estimación grupal fue considerado un fracaso, ya que paralizó el trabajo y no se tuvieron en cuenta las limitaciones de la versión gratuita.

- **Inconsistencias en la Revisión de Código (PR)**: El proceso de revisión de Pull Requests sigue siendo deficiente; se dejan pasar demasiados fallos de estructura y se mantienen PRs abiertas durante demasiado tiempo, lo que en ocasiones afecta la estabilidad de la rama principal.

- **Conflictos Técnicos Recurrentes**: Persisten problemas con las migraciones de la base de datos y la falta de adherencia a las pautas de estructura de código propuestas, lo que dificulta futuras implementaciones.

- **Planificación Deficiente de Tareas Específicas**: Aunque la distribución general mejoró, algunas tareas volvieron a solaparse entre personas y la priorización no fue percibida como óptima por todos los integrantes.


### 2.3 Sugerencias de mejora

A partir del feedback recibido, el equipo se compromete a implementar las siguientes medidas para optimizar el rendimiento y la cohesión en el próximo sprint:
 
- **Simplificación de la Planificación**: Abandonar la estimación grupal masiva y permitir que cada subgrupo estime sus propias tareas para ganar agilidad.

- **Rigor en el Control de Calidad**: Ser mucho más estrictos en la revisión de PRs, asegurando que el código cumpla con la estructura definida y prestando especial atención a archivos sensibles como las migraciones.

- **Establecimiento de Deadlines Internos**: Implementar hitos intermedios obligatorios para evitar que tareas como los tests o la integración final se acumulen en las últimas 48 horas.

- **Seguimiento Activo de los Coordinadores**: Los responsables de cada grupo deberán estar más al tanto del progreso diario de sus miembros para realizar replanificaciones con mayor holgura si fuera necesario.

- **Mejora de la Comunicación de Decisiones**: Asegurar que lo que se acuerda verbalmente se desarrolle y cumpla, evitando que la información se pierda en el proceso.