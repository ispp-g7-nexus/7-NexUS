## Informe de Retrospectiva del Sprint 3 - NexUS

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
**Fecha:** 15/04/2026  

<p align="center">
  <img src="../../images/logo-etsii.jpe" alt="Logo ETSII" width="400">
</p>

---


## Historial de Versiones

| Versión | Fecha | Cambio principal |
|---------|-------|------------------|
| 1.0.0 | 15/04/2026 | Creación del documento |

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

El objetivo principal de este tercer Sprint era acelerar la implementación de las funcionalidades centrales del ecosistema NexUS, pasando de la base estructural a módulos de valor directo para el usuario final. Se buscaba consolidar el grueso del código final, integrando lógicas de negocio complejas en áreas críticas como la gestión de servicios y la interacción social, todo ello bajo un nuevo modelo de estimación manual para optimizar la carga de trabajo.

Los objetivos específicos definidos han sido:
- **Gestión de Comedor y Acceso de Visitantes**: Implementar sistemas de solicitudes de menús, autorizaciones de recogida y generación de códigos QR para invitados.
- **Sistema de Inventario y Préstamo de Objetos**: Desarrollar el flujo completo desde la solicitud del residente hasta la gestión de stock y devoluciones por parte del administrador. 
- **Analíticas Avanzadas y Reporting**: Crear paneles de visualización de métricas sobre el estado de la residencia y habilitar la exportación de informes en formatos PDF y Excel.
- **Herramientas de Convivencia e Interacción**: Finalizar la lógica de chats, recomendaciones de eventos y el sistema de matching entre residentes. 
- **Calidad y Portabilidad (QA)**: Ejecutar planes de testing de seguridad, verificar la instalación como PWA y corregir fallos de experiencia de usuario (UX). 
- **Tratamiento de Errores (Failure Conditions)**: Implementar las validaciones y mensajes ante estados de fallo en los formularios y procesos. 

### 1.2 Principales logros

A nivel técnico, este ha sido el sprint de mayor rendimiento. El equipo ha demostrado una alta capacidad de desarrollo, logrando un avance significativo en el código final sin que las nuevas implementaciones generaran errores críticos o bloqueos técnicos. Se ha validado que el abandono de herramientas automáticas en favor de una estimación manual ha permitido una mejor organización de la carga de trabajo, logrando que el grueso de las tareas técnicas se completara satisfactoriamente.

### 1.3 Desafíos encontrados

A pesar del éxito técnico, el ritmo de este sprint se vio condicionado por el parón vacacional, lo que provocó una relajación inicial y una acumulación de trabajo crítica al final. El mayor reto no ha sido técnico, sino organizativo y humano: se ha detectado una ruptura en la comunicación entre subgrupos y un deterioro del clima laboral, manifestado en tensiones personales, falta de compromiso con las métricas y una desconexión de ciertos miembros respecto al progreso global del equipo.

## 2. Análisis de la Retrospectiva

### 2.1 Lo que salió bien
Para analizar los éxitos de este Sprint se ha acordado realizar una encuesta para conocer la opinión de todos los miembros del grupo. Tras el análisis de las valoraciones del equipo, se han identificado las siguientes fortalezas y éxitos clave durante este tercer Sprint:

- **Eficiencia en el Desarrollo Técnico**: Las tareas implementadas han sido robustas y no han generado fallos graves. El flujo de código ha sido fluido y se ha avanzado a gran velocidad en las funcionalidades finales.

- **Eficacia de la Planificación Manual**: La decisión de realizar estimaciones "a mano" y con más antelación ha funcionado mejor que el uso de software externo, permitiendo un reparto de tareas más lógico y equilibrado.

- **Estabilidad del Repositorio**: Se ha corregido el problema del sprint anterior; en esta ocasión no ha habido conflictos graves con las migraciones ni PRs que comprometieran la estabilidad de las ramas principales.


### 2.2 Lo que salió mal

A pesar de la solvencia técnica, se han identificado puntos críticos que ponen en riesgo la cohesión del proyecto:

- **Deterioro del Clima y Comunicación**: Se ha reportado falta de respeto entre compañeros y una comunicación deficiente entre subgrupos. La información no fluye de manera transversal y el ambiente se ha vuelto tenso.

- **Efecto de las Vacaciones**: El parón de Semana Santa derivó en un exceso de confianza, dejando una carga excesiva de trabajo y documentos para las últimas horas del sprint.

- **Falta de Compromiso y Desconexión**: Se percibe que algunos miembros no están asumiendo su responsabilidad, desconocen el estado del proyecto o incluso reportan horas de trabajo que no se corresponden con el valor aportado.

- **Bloqueos en la Integración**: El proceso de aceptación de Pull Requests (PRs) sigue siendo lento, y las condiciones de error (failure conditions) se han estancado durante el proceso de desarrollo.


### 2.3 Sugerencias de mejora

Para el próximo Sprint, es imperativo realizar un ajuste no solo en la gestión de tareas, sino en la ética de trabajo del grupo:
 
- **Protocolo de Respeto y Comunicación**: Es prioritario restablecer un tono profesional y constructivo. Se deben resolver las dudas de forma activa y evitar la pasividad ante las consultas de los compañeros.

- **Asignación Total Temprana**: No limitar la planificación a las tareas de código; todos los documentos y entregables deben estar asignados desde el primer día del sprint para evitar quejas de último momento.

- **Control de Plazos Internos Estrictos**: Establecer fechas límite inamovibles para tareas y revisión de PRs, evitando el embudo de entregas en las últimas 48 horas.

- **Evaluaciones de Progreso Frecuentes**: Realizar breves puestas en común para evaluar el estado real del desarrollo y asegurar que ningún miembro se desconecte del avance general.

- **Sinceridad en el Reporte de Horas**: Fomentar la honestidad en el registro de métricas para que la planificación del siguiente sprint sea realista y basada en el esfuerzo real.