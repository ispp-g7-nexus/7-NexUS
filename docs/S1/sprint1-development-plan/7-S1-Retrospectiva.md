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
**Fecha:** 04/03/2026  

<p align="center">
  <img src="../../images/logo-etsii.jpe" alt="Logo ETSII" width="400">
</p>

---


## Historial de Versiones

| Versión | Fecha | Cambio principal |
|---------|-------|------------------|
| 1.0.0 | 04/03/2026 | Creación del documento base |

---

## Índice
- [1. Resumen del Sprint](#1-resumen-del-sprint)
  - [1.1 Objetivo del Sprint](#11-objetivo-del-sprint)
  - [Tareas](#tareas)
  - [1.2 Principales logros](#12-principales-logros)
  - [1.3 Desafíos encontrados](#13-desafíos-encontrados)
- [2. Análisis de la Retrospectiva](#2-análisis-de-la-retrospectiva)
  - [2.1 Lo que salió bien](#21-lo-que-salió-bien)
  - [2.2 Lo que salió mal](#22-lo-que-salió-mal)
  - [2.3 Sugerencias de mejora](#23-sugerencias-de-mejora)

---

## 1. Resumen del Sprint

### 1.1 Objetivo del Sprint

### Tareas

El objetivo principal de este primer Sprint era establecer una base sólida para el proyecto NexUS, lo cual incluía la configuración completa del entorno de desarrollo y la elaboración de la documentación estratégica inicial, como el Plan de Usuarios Piloto y el marco de métricas de éxito. Se buscaba que todos los miembros del equipo tuvieran el proyecto funcionando localmente para ir teniendo finalizada la implementación de las primeras funcionalidades.

Los objetivos específicos definidos y su grado de cumplimiento han sido:
- Disponer de una **infraestructura técnica funcional**
- Permitir **autenticación y gestión básica de usuarios**
- Contar con un **panel administrativo inicial**
- Implementar un **sistema básico de incidencias**
- Definir una **base común de UX/UI y testing**
- Desplegar la aplicación en la nube

### 1.2 Principales logros

A pesar de los obstáculos, hemos logrado completar la fase de definición estratégica, cerrando un Plan de Pilotaje detallado con residencias reales como "One Sevilla". Técnicamente, hemos superado la barrera de configuración inicial, logrando la integración correcta con Docker Desktop y la instalación del proyecto, lo que nos permite tener un entorno de ejecución moderno y estandarizado para el equipo.

### 1.3 Desafíos encontrados

Este Sprint ha estado marcado por retos técnicos significativos, especialmente relacionados con la interoperabilidad entre Windows y Linux. Nos enfrentamos a fallos críticos al clonar el repositorio, errores de ejecución  y problemas de permisos tras movimientos incorrectos de carpetas. Estos problemas técnicos, sumados a una curva de aprendizaje inicial con Docker, consumieron mucho más tiempo del previsto.

## 2. Análisis de la Retrospectiva

### 2.1 Lo que salió bien
Para analizar los éxitos de este Sprint se ha acordado realizar una encuesta para conocer la opinión de todos los miembros del grupo. Tras el análisis de las valoraciones del equipo, se han identificado las siguientes fortalezas y éxitos clave durante este primer Sprint:

- **Eficacia en la Organización y Planificación**: El equipo destaca la definición exhaustiva del Backlog, que permitió tener una hoja de ruta clara desde el primer día. La estrategia de subdividir el grupo en subequipos de trabajo y el uso de herramientas colaborativas (como OneDrive) ha sido fundamental para mantener el orden, evitar la pérdida de documentos y repartir la carga de trabajo de forma equitativa.

- **Capacidad de Respuesta y Resiliencia**: A pesar de los retrasos iniciales (contando con el proyecto base solo desde la primera semana) y los duros inconvenientes técnicos, el equipo ha demostrado una capacidad extraordinaria para sacar adelante la gran mayoría de las tareas planificadas. La resolución de problemas ha sido especialmente eficiente, destacando la agilidad en momentos de estrés.

- **Alto Grado de Compromiso**: Existe un consenso sobre la implicación individual y colectiva. Los miembros del equipo han invertido tiempo y esfuerzo por encima de las expectativas iniciales, demostrando una fuerte motivación por alcanzar los objetivos del Sprint 1.

- **Mejora en la Comunicación Interna**: Se ha consolidado una dinámica de colaboración fluida entre los subequipos. La comunicación ha sido constante y efectiva, lo que ha facilitado la resolución de bloqueos técnicos y una mejor integración del trabajo realizado por cada grupo.

- **Progreso Técnico Sólido**: Se ha conseguido avanzar significativamente en las tareas de desarrollo a pesar de las barreras de configuración iniciales, logrando que el sistema de incidencias y la infraestructura base sean ya una realidad funcional.


### 2.2 Lo que salió mal

A pesar del éxito en la entrega de funcionalidades, el equipo ha identificado problemas críticos en los procesos internos que deben ser corregidos para los próximos Sprints:

- **Planificación y Gestión del Backlog**: Se ha detectado una falta de precisión en la definición y estimación de las tareas. Esto provocó el solapamiento de trabajo, donde varios miembros desarrollaron la misma funcionalidad sin saberlo (tareas duplicadas). Asimismo, la gestión de dependencias fue deficiente, generando bloqueos entre equipos.

- **Dependencia excesiva de los coordinadores y falta de un canal común**: La comunicación falló porque los coordinadores se convirtieron en los únicos "mensajeros" entre grupos. Esto causó que la información no fluyera de forma natural entre todos los miembros. Sin un lugar oficial donde hablar todo el equipo a la vez, se crearon grupos aislados que no sabían qué hacían los otros, provocando que algunos fueran por libre y otros estuvieran perdidos.

- **Gestión de Código y Flujo de Trabajo (Git/PR)**: El proceso de revisión de las Pull Requests (PR) fue caótico y tardío. Se acumularon demasiadas peticiones sin integrar, lo que sumado a la falta de disciplina en momentos críticos (como seguir subiendo código a la rama develop cuando se pidió congelarla para arreglar conflictos), generó un entorno técnico inestable y "roto" en varios momentos.

- **Decisiones Técnicas Costosas**: El uso de código generado automáticamente por Figma resultó ser una decisión ineficiente, consumiendo mucho tiempo de desarrollo en correcciones posteriores. Además, surgieron problemas técnicos graves con las migraciones de la base de datos y el retraso inicial en el proyecto base.

- **Distribución de Carga y Gestión del Tiempo**: Se ha percibido una distribución desigual del trabajo, con algunos miembros sobrecargados mientras otros esperaban instrucciones. La tendencia a dejar la integración para el último momento elevó innecesariamente los niveles de estrés y provocó errores evitables por las prisas.


### 2.3 Sugerencias de mejora

A partir del feedback recibido, el equipo se compromete a implementar las siguientes medidas para optimizar el rendimiento y la cohesión en el próximo sprint:
 
- **Actas de Reuniones**: Se realizarán actas de todas las reuniones de coordinadores, las cuales se compartirán inmediatamente en el canal general. El objetivo es que todos los integrantes conozcan las decisiones tomadas y no existan vacíos de información.

- **Definición de Tareas (DoR)**: Antes de empezar el desarrollo, se revisará el Sprint Backlog para asegurar que cada issue tenga una descripción detallada, eliminando dudas sobre su alcance y evitando que dos personas trabajen en lo mismo.

- **Mapeo de Dependencias**: Se identificarán y marcarán explícitamente las tareas que dependen de otras para evitar bloqueos y asegurar que el trabajo de un equipo no "pise" el de otro.

- **Estimación Anticipada**: Se dedicará tiempo al inicio del Sprint para estimar el esfuerzo de las tareas de forma más realista.

- **Política de Ramas Estricta**: Implementar el "Golden Flow" de forma rigurosa. Se definirá una política de ramas clara, se establecerá un tiempo máximo para revisar y mergear Pull Requests (PR) y se eliminarán las ramas obsoletas al finalizar el Sprint.

- **Gestión de Archivos Críticos**: Establecer reglas estrictas sobre qué archivos se suben al repositorio (especialmente para evitar conflictos en las migraciones de la base de datos) y unificar formatos para mantener un código homogéneo.

- **Fecha Límite Interna (Soft Deadline)**: Establecer un deadline propio para código y documentación varios días antes de la entrega oficial. Esto evitará la acumulación de tareas y el estrés del último minuto.

- **Política de Incumplimiento**: Se definirá un marco de normas internas con consecuencias claras ante la falta de compromiso o el incumplimiento de los plazos acordados, buscando proteger la carga de trabajo de los miembros más implicados.