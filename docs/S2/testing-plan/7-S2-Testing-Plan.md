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
**Fecha:** 10/03/2026  

<p align="center">
  <img src="../../images/logo-etsii.jpe" alt="Logo ETSII" width="400">
</p>

---

## Historial de Versiones

| Versión | Fecha | Cambio principal |
|---------|-------|------------------|
| 1.0.0 | 10/03/2026 | Creación del documento de plan de pruebas general del proyecto |

---

## Índice

1. [Introducción](#1-introducción)
2. [Objetivos del Plan de Pruebas](#2-objetivos-del-plan-de-pruebas)
3. [Alcance y Principios de Testing](#3-alcance-y-principios-de-testing)
4. [Estrategia de Pruebas](#4-estrategia-de-pruebas)
5. [Plan de Ejecución](#5-plan-de-ejecución)
6. [Métricas de Calidad y Cobertura](#6-métricas-de-calidad-y-cobertura)
7. [Conclusión](#7-conclusión)

---

## 1. Introducción

Este documento define el plan de pruebas general para el proyecto **NexUS**, aplicable a todos los sprints del desarrollo. Establece la estrategia de testing, herramientas, métricas y procedimientos que garantizarán la calidad de la plataforma integral de gestión y convivencia para residencias universitarias.

El plan abarca todas las funcionalidades del sistema: autenticación, gestión de residencias, reservas de espacios y objetos, sistema de incidencias, comunicación institucional, onboarding digital, matching de compañeros, vida social y módulos administrativos.

---

## 2. Objetivos del Plan de Pruebas

### 2.1 Objetivos Principales

- **Garantizar la funcionalidad** de todas las características en cada sprint
- **Validar la integración** entre todos los módulos del sistema
- **Asegurar el rendimiento** para soportar múltiples residencias y usuarios
- **Verificar la seguridad** y cumplimiento GDPR/RGPD en toda la plataforma
- **Mantener la calidad** del código mediante cobertura continua
- **Facilitar el mantenimiento** con tests como documentación viva

### 2.2 Objetivos Específicos

- Alcanzar al menos un **80% de cobertura de código** en cada módulo funcional
- Reducir a 0 los **errores críticos en producción**
- Garantizar **compatibilidad** con navegadores modernos y dispositivos móviles
- Verificar que el sistema pueda soportar **múltiples residencias y usuarios concurrentes**

---

## 3. Alcance y Principios de Testing

### 3.1 Principio de Cobertura de Pruebas

Todos los módulos funcionales del sistema NexUS deben incluir pruebas automatizadas que validen su comportamiento. Esto incluye tanto componentes de backend como de frontend.

El objetivo es garantizar que cada funcionalidad relevante del sistema disponga de pruebas que permitan detectar errores durante el desarrollo y facilitar el mantenimiento del código.

Las pruebas deben cubrir:

- Lógica de negocio
- Validación de datos
- Interacciones entre módulos
- Manejo de errores y casos límite

### 3.2 Categorización por Criticidad

#### 3.2.1 Módulos Críticos
**Cobertura requerida: Mínimo 80%**

Todos los módulos que gestionen:
- **Autenticación y autorización** de usuarios
- **Datos personales** y perfiles de residentes
- **Transacciones** y operaciones críticas del negocio
- **Configuración base** del sistema
- **Seguridad** y cumplimiento legal (GDPR/RGPD)

#### 3.2.2 Módulos de Funcionalidad Principal  
**Cobertura requerida: Mínimo 80%**

Todos los módulos que implementen las funcionalidades principales de la aplicación, entre ellos:
- **Reservas** de cualquier tipo (espacios y objetos)
- Gestión de **incidencias** y comunicaciones
- **Algoritmos de negocio** (matching, recomendaciones)
- **Interfaces de usuario** principales
- **Eventos** de cualquier tipo
- **Chats** de residentes y administradores
- Gestión y visualización de **menús**
- Control de acceso

#### 3.2.3 Módulos de Soporte y Utilidades
**Cobertura requerida: Mínimo 75%**

Todos los módulos que proporcionen:
- **Servicios auxiliares** y utilidades
- **Funcionalidades administrativas** secundarias
- **Integraciones** con sistemas externos
- **Componentes de UI** reutilizables

### 3.3 Enfoque Agnóstico a la Arquitectura

#### 3.3.1 Backend (Django/Python)

Principios aplicables a cualquier módulo:

| Componente | Sujeto a Testing |
|------------|--------------------|
| **Models** | Métodos públicos, validaciones, relaciones |
| **Views** | Todas las operaciones CRUD, permisos, serialización |
| **Services** | Lógica de negocio, algoritmos, procesamientos complejos |
| **Serializers** | Validación, transformación, campos calculados |
| **Utils/Helpers** | Funciones de utilidad, transformadores, validadores |

#### 3.3.2 Frontend (React/TypeScript)  

Principios aplicables a cualquier componente:

| Tipo de Componente | Sujeto a Testing |
|--------------------|--------------------|
| **Páginas principales** | Renderizado, navegación, estado, integración |
| **Componentes de UI** | Props, eventos, estados, accesibilidad |
| **Hooks custom** | Lógica de estado, efectos, performance |
| **Servicios/APIs** | Llamadas, manejo de errores, cache |
| **Utilities** | Funciones puras, transformadores, validadores |

### 3.4 Criterios de Aplicación Universal

Independientemente de la funcionalidad específica, todo módulo debe cumplir:

- **Tests unitarios** para toda funcionalidad
- **Tests de integración** para interacciones con otros módulos  
- **Validación de entrada** para todos los inputs
- **Manejo de errores** y casos límite

### 3.5 Exclusiones Específicas

Los siguientes elementos **NO requieren testing exhaustivo**:
- Archivos de configuración estática
- Migraciones de base de datos
- Dependencias de terceros (se asume que están probadas)

---

## 4. Estrategia de Pruebas

### 4.1 Tipos de Pruebas

#### 4.1.1 Pruebas Unitarias

**Backend (pytest y pytest-django)**
- **Modelos**: Validación de datos, relaciones entre entidades y métodos personalizados
- **Vistas**: Lógica asociada a cada endpoint, permisos y códigos de respuesta
- **Servicios**: Lógica de negocio y operaciones del dominio
- **Serializers**: Validación y transformación de datos entre API y modelo

**Frontend (Jest)**
- **Componentes**: Renderizado, props, eventos y cambios de estado
- **Hooks**: Gestión del estado y efectos secundarios
- **Servicios**: Llamadas a la API y gestión de errores
- **Utilidades**: Funciones auxiliares y transformación de datos

#### 4.1.2 Pruebas de Integración

**Backend (pytest y pytest-django)**

Se verificarán flujos completos de interacción con la API:

- **APIs**: Peticiones HTTP completas y verificación de respuestas
- **Autenticación**: Flujos de login, logout y gestión de sesión
- **Permisos**: Acceso a recursos según roles de usuario

También se validará que los principales endpoints funcionen correctamente cuando interactúan con la base de datos y otros servicios internos.

#### 4.1.3 Pruebas de Rendimiento

Las pruebas de carga se realizarán utilizando **k6** para evaluar el comportamiento del sistema bajo distintos niveles de uso.

Se evaluarán principalmente:

- **Carga normal**: simulación de usuarios concurrentes representativos del uso esperado
- **Pruebas de estrés**: incremento progresivo de usuarios hasta identificar los límites del sistema
- **Endpoints críticos**: autenticación, reservas y listados principales
- **Tiempo de respuesta** de las APIs más utilizadas
- **Estabilidad del sistema** ante múltiples peticiones simultáneas

---

## 5. Plan de Ejecución

### 5.1 Cronograma de Desarrollo de Tests

**En paralelo con desarrollo de funcionalidad:**
- **Testing unitario**: Tests durante el desarrollo
- **Testing de integración**: Tests después de integrar módulos
- **Testing de rendimiento**: Tests al final del sprint


### 5.2 Criterios de Priorización

#### 5.2.1 Priorización por Riesgo
1. **Módulos con datos sensibles** (autenticación, perfiles personales)
2. **Módulos con lógica compleja** (algoritmos complejos)
3. **Módulos con alta frecuencia de uso** (dashboard, navegación)
4. **Módulos con integraciones externas** (APIs, servicios)
5. **Módulos nuevos o modificados** recientemente

#### 5.2.2 Adaptación por Feedback

**Ajuste semanal basado en:**
- **Bugs encontrados** en producción por módulo
- **Complejidad descubierta** durante implementación  
- **Feedback de QA** y testing informal
- **Rendimiento** observado en entorno real

---

## 6. Métricas de Calidad y Cobertura

### 6.1 Objetivos de Cobertura

| Categoría | Cobertura mínima | Herramienta |
|-----------|-----------------|-------------|
| **Backend (módulos críticos)** | 80% | pytest y pytest-cov |
| **Backend (módulos de soporte)** | 75% | pytest y pytest-cov |
| **Frontend (componentes principales)** | 80% | Jest |
| **Frontend (componentes de soporte)** | 70% | Jest |

### 6.2 Criterios de Calidad

#### 6.2.1 Funcionales
- **0 bugs críticos** en features principales
- **Menos de 5 bugs menores** por módulo
- **Validación completa** de inputs y outputs

#### 6.2.2 No Funcionales  
- **Respuesta rápida** de páginas principales (tras una carga inicial)
- **Navegación fluida** entre vistas
- **0 errores de seguridad** en endpoints

### 6.3 Métricas de Seguimiento

| Métrica | Objetivo | Herramienta |
|---------|---------|-------------|
| **Cobertura de código** | 80% promedio | pytest-cov, Jest |
| **Errores críticos detectados en producción** | Ausencia de errores críticos | Feedback de usuarios piloto |

---

## 7. Conclusión

Este plan de pruebas establece las bases para mantener un nivel adecuado de calidad en el desarrollo del proyecto NexUS.

La estrategia definida combina pruebas unitarias, de integración y de rendimiento con el objetivo de detectar errores durante el desarrollo y reducir su impacto en producción.

El uso de herramientas automatizadas permitirá ejecutar las pruebas de forma continua durante el ciclo de desarrollo, facilitando el mantenimiento del sistema y la evolución futura del proyecto.