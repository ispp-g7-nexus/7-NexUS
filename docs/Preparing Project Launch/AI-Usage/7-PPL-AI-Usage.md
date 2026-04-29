## AI-Usage – NexUS (PPL)

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
**Fecha:** 28/04/2026  

<p align="center">
  <img src="../../images/logo-etsii.jpe" alt="Logo ETSII" width="400">
</p>

---


## Historial de Versiones

| Versión | Fecha       | Cambio principal                                      |
|---------|-------------|-------------------------------------------------------|
| 1.0.0   | 28/04/2026  | Creación del documento base para PPL                  |


---


## Índice
  - [1. Introducción](#1-introducción)
  - [2. Alcance del Uso de la IA](#2-alcance-del-uso-de-la-ia)
    - [2.1. Claude](#21-claude)
    - [2.2. GitHub Copilot](#22-github-copilot)
    - [2.3. ChatGPT](#23-chatgpt)
    - [2.4. Figma](#24-figma)
    - [2.5. CodeRabbit](#25-coderabbit)
    - [2.6. Gemini](#26-gemini)
  - [3. Limitaciones y Supervisión Humana](#3-limitaciones-y-supervisión-humana)
  - [4. Contribución Intelectual del Equipo](#4-contribución-intelectual-del-equipo)
---

## 1. Introducción

En el marco del PPL, así como del proyecto en general, el equipo de NexUS ha empleado herramientas de inteligencia artificial como apoyo en diversas actividades: generación y revisión de código, revisión y redacción de documentos, creación de mockups, revisiones automáticas de pull requests y generación de imágenes para presentaciones y storyboards. Este documento detalla qué herramientas se han usado, dónde y para qué propósito, y documenta las prácticas de supervisión aplicadas.

El objetivo es garantizar transparencia, reproducibilidad y cumplimiento legal y ético en el uso de IA dentro del proyecto.

---

## 2. Alcance del Uso de la IA

A continuación se listan las herramientas concretas utilizadas y su propósito en el proyecto.

### 2.1. Claude

- Uso: generación y revisión de propuestas documentales y apoyo en redacción técnica. Ayuda en la generación y corrección de código, especialmente para el repositorio de análisis de métricas.
- Ámbito: documentación del proyecto, resúmenes ejecutivos y revisión de contenidos técnicos antes de su publicación.

### 2.2. GitHub Copilot

- Uso: asistencia en generación de fragmentos de código, sugerencias de tests y patrones de implementación desde el IDE. Algunos miembros lo emplean de manera ocasional para solicitar una revisión inicial automática de pull requests.
- Ámbito: desarrollo frontend/backend y soporte en tareas repetitivas de implementación.

### 2.3. ChatGPT

- Uso: generación y revisión de código, redacción y revisión de documentos y, junto con `Gemini`, apoyo en la generación de imágenes para storyboards.
- Ámbito: desarrollo, documentación y planificación.

### 2.4. Figma

- Uso: creación de mockups y prototipos de interfaz.
- Ámbito: diseño de pantallas, flujos de interacción y entrega de assets visuales. Al comienzo se tomó el código generado por Figma como base para el frontend pero se descartó por ser insostenible.

### 2.5. CodeRabbit

- Uso: revisiones automáticas de pull requests (análisis de código, alertas y recomendaciones).
- Ámbito: flujo de PRs en GitHub; genera comentarios automáticos que los desarrolladores deben revisar y solventar en caso de ser necesario.

### 2.6. Gemini

- Uso: generación de imágenes destinadas a diapositivas de presentaciones y a los storyboards de los anuncios.
- Ámbito: creación de assets gráficos conceptuales que posteriormente son revisados y adaptados por el equipo de diseño.

---

## 3. Limitaciones y Supervisión Humana

El equipo reconoce las limitaciones inherentes a las IA:
- Posibles inexactitudes, sesgos o contenido obsoleto o erróneo.
- Código con posibles fallos de seguridad o ineficiencias si no se supervisa.
- Poca fiabilidad y coherencia en las imágenes generadas respecto a la visión del equipo.

Por ello, todas las aportaciones de IA se someten a revisión humana antes de su integración:
- Código: revisión por al menos un revisor humano y ejecución de pruebas (local/CI). Adaptación al contexto específico de nuestro proyecto (NexUS).
- Documentos: revisión por el equipo antes de su publicación, contrastando la información con fuentes fiables.
- Imágenes: verificación de idoneidad visual.

---

## 4. Contribución Intelectual del Equipo

El diseño conceptual, las decisiones estratégicas, el análisis de mercado, la definición de funcionalidades, la arquitectura técnica del software y el enfoque del producto han sido desarrollados y decididos por el equipo. De igual forma, la implementación del código, el diseño visual y la generación de contenido multimedia han sido desarrollados, supervisados y validados por los miembros del equipo, con ayuda de la IA en tareas específicas de desarrollo o documentación.

La inteligencia artificial se ha utilizado únicamente como herramienta de apoyo en tareas específicas como: generación de fragmentos de código y sugerencias de optimización, revisión inicial de pull requests, redacción y revisión de documentos, creación de borradores y propuestas iniciales, análisis técnico preliminar, y generación de imágenes para presentaciones y storyboards. En todos los casos, el equipo realizó una revisión crítica, adaptación contextual y validación exhaustiva de todas las aportaciones de IA antes de su incorporación al proyecto, asegurando que las decisiones finales permanecen bajo control del equipo.