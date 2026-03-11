# Plan de Pruebas - NexUS

<p align="center">
  <img src="../../images/logo-app.png" alt="Logo NexUS" width="500">
</p>

<div align="center">

<p>
  <img src="https://img.shields.io/badge/Versión-1.0.0-blue?style=flat-square" alt="Versión">
  <img src="https://img.shields.io/badge/Estado-Completado-orange?style=flat-square" alt="Estado">
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
**Fecha:** 11/03/2026  

<p align="center">
  <img src="../../images/logo-etsii.jpe" alt="Logo ETSII" width="400">
</p>

---

## Historial de Versiones

| Versión | Fecha | Cambio principal |
|---------|-------|------------------|
| 1.0.0 | 11/03/2026 | Creación del documento de matriz de riesgos, problemas y contingencias del proyecto |

---

## Índice

1. [Introducción](#1-introducción)
2. [Matriz de riesgos, problemas y contingencias](#2-matriz-de-riesgos-problemas-y-contingencias)
3. [Conclusión](#3-conclusión)

---

## 1. Introducción

La **Matriz de Riesgos, Problemas y Contingencias** de NexUS constituye el pilar estratégico para la identificación, análisis y mitigación de cualquier amenaza que pueda comprometer el éxito del proyecto. Este documento no se limita a una enumeración de fallos, sino que define una hoja de ruta estructurada para actuar antes de que un riesgo se transforme en un bloqueo crítico para el desarrollo.

Dado que NexUS gestiona operativas diarias y datos sensibles en centros de referencia como **One Sevilla**, nuestra gestión de riesgos prioriza la continuidad del servicio y el estricto cumplimiento del RGPD. Para cuantificar la relevancia de cada riesgo, aplicamos una metodología de evaluación que pondera la probabilidad de ocurrencia frente al impacto real.

---

## 2. Matriz de riesgos, problemas y contingencias

En esta sección se describe el enfoque del equipo para identificar y mitigar posibles amenazas que puedan comprometer el éxito de 
NexUS. El objetivo no es solo listar problemas, sino establecer una hoja de ruta clara para actuar antes de que un riesgo se convierta en 
un bloqueo.
En la columna de impacto hemos puesto una escala del 1 al 5, siendo el 1 un impacto muy bajo y el 5 uno muy alto

| ID | CATEGORÍA | RIESGO | PRIORIDAD | IMPACTO | RESPONSABLE | PLAN DE MITIGACIÓN | PLAN DE CONTINGENCIA |
| :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- |
| 1 | Coordinación | Falta de coordinación en el equipo de trabajo | Alta | 5 | Scrum Master / PM | Reuniones de sincronización semanales (Weeklys) y definición estricta de roles desde el día 1. | Reestructuración jerárquica: división en subequipos con coordinadores, canal de solo lectura para comunicados oficiales y canales segmentados por subequipos. |
| 2 | Técnica | Dificultades con la estructura del proyecto | Alta | 4 | Desarrolladores | Revisar código automáticamente. | Descarte del código autogenerado por Figma y reconstrucción manual de la base del proyecto con arquitectura limpia y modular. |
| 3 | Coordinación | Desorganización al coordinar la documentación | Media | 3 | PM/Coordinadores | Centralizar todo en una única herramienta con una estructura de carpetas inamovible. | Creación de plantillas oficiales: documentos, actas de reuniones, issues en GitHub y diapositivas de presentación, todas alineadas con la imagen corporativa del equipo. |
| 4 | Coordinación | Inconsistencia visual en las presentaciones | Baja | 2 | PM/Coordinadores | Crear un pequeño manual de marca antes de elaborar los documentos. | Diseño y aprobación de una presentación base corporativa (colores, tipografías, formato, apoyo visual) de forma obligatoria. |
| 5 | Gestión | Desvinculación de los centros piloto | Alta | 4 | Product Owner | Mantener comunicación activa e involucrarlos en las pruebas del MVP. | Usar una base de datos simulada para las demos y buscar residencias locales más pequeñas como alternativa rápida. |
| 6 | Técnica | Deuda técnica por falta de revisiones de código | Media | 3 | Desarrolladores | Configurar Linters (ESLint, etc.) y hooks automatizados para que el código no suba si tiene errores de formato. | Establecer revisiones (Code Reviews) obligatorias en GitHub antes de unir cualquier cambio a la rama principal, asegurando la mantenibilidad del software. |
| 7 | Coordinación | Desviación del cronograma por mala estimación de tareas | Alta | 5 | PM/Scrum Master / Coordinadores | Dividir tareas complejas en subtareas (máximo 1-2 días) y añadir un margen de tiempo del 20% para imprevistos. | Reestimación de tareas en el tablero de GitHub Project tras cada Sprint. |
| 8 | Alcance | "Scope Creep" (Aumento constante y descontrolado de requisitos) | Alta | 5 | PM/PO | Definir y congelar claramente el alcance del MVP al inicio del proyecto. | Crear un "Backlog de futuras versiones". Negociar con el cliente/profesor mover las nuevas ideas allí para no bloquear la entrega actual. |
| 9 | Técnica | Conflictos graves al fusionar ramas en GitHub (Merge Conflicts) | Media | 4 | Desarrolladores | Trabajar en ramas pequeñas y hacer Pull (actualizar código) desde la rama principal varias veces al día. | Realizar la fusión del código en una llamada conjunta (Pair Programming) o revertir (Rollback) al último commit estable. |
| 10 | Recursos | Ausencia prolongada de un miembro clave del equipo (abandono, enfermedad) | Alta | 4 | Desarrolladores | Documentar el código constantemente y fomentar la rotación de tareas para evitar cuellos de botella de conocimiento. | Paralizar el desarrollo de features secundarias, redistribuir las tareas críticas entre el resto y ajustar plazos con los responsables. |
---

## 3. Conclusión

La implementación y el seguimiento constante de esta matriz permiten transformar la incertidumbre del desarrollo en un plan de acción controlado, ágil y transparente. Al haber analizado respuestas ante escenarios como la resistencia al cambio del personal operativo o fallos de infraestructura en el entorno de despliegue, el equipo garantiza una capacidad de respuesta que protege la confianza.

Con este enfoque, aseguramos que NexUS no solo sea una solución innovadora, sino también una plataforma robusta, fiable y preparada para su escalado en el mercado residencial.