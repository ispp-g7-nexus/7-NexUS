# Plan de Pruebas General - NexUS

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
- **Cero bugs críticos** en producción
- **Compatibilidad** con navegadores modernos y dispositivos móviles
- Asegurar **Escalabilidad** del sistema

---

## 3. Alcance y Principios de Testing

### 3.1 Filosofía de Cobertura Universal

**Todos los módulos funcionales del sistema NexUS están sujetos a pruebas exhaustivas**, independientemente de su nombre, estructura final o implementación específica. Esta estrategia universal garantiza que cualquier componente que contribuya a la funcionalidad del sistema mantenga los estándares de calidad establecidos.

### 3.2 Categorización por Criticidad

#### 3.2.1 Módulos de Criticidad Máxima
**Cobertura requerida: Mínimo 80%**

Todos los módulos que gestionen:
- **Autenticación y autorización** de usuarios
- **Datos personales** y perfiles de residentes
- **Transacciones** y operaciones críticas del negocio
- **Configuración base** del sistema
- **Seguridad** y cumplimiento legal (GDPR/RGPD)

#### 3.2.2 Módulos de Funcionalidad Principal  
**Cobertura requerida: Mínimo 80%**

Todos los módulos que implementen:
- **Reservas** de cualquier tipo (espacios, objetos, servicios)
- **Gestión de incidencias** y comunicaciones
- **Algoritmos de negocio** (matching, recomendaciones)
- **Interfaces de usuario** principales
- **APIs públicas** y endpoints críticos

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
- **Test de seguridad** para endpoints que manejen datos sensibles

### 3.5 Exclusiones Específicas

Los siguientes elementos **NO requieren testing exhaustivo**:
- Archivos de configuración estática
- Migraciones de base de datos
- Dependencias de terceros (se asume que están probadas)

---

## 4. Estrategia de Pruebas

### 4.1 Tipos de Pruebas

#### 4.1.1 Pruebas Unitarias

**Backend (pytest)**
- **Modelos**: Validación de datos, relaciones, métodos custom
- **Vistas**: Lógica de negocio, permisos, responses
- **Servicios**: Algoritmos de negocio, procesamientos
- **Serializers**: Validación y transformación de datos

**Frontend (Jest)**
- **Componentes**: Renderizado, props, eventos, estado
- **Hooks**: Lógica de estado y efectos
- **Servicios**: Llamadas API, manejo de errores
- **Utilidades**: Funciones helper, formatters

#### 4.1.2 Pruebas de Integración

**Backend (Django Test Framework)**
- **APIs**: Request/Response completos
- **Autenticación**: Flujos de login/logout
- **Permisos**: Autorización por roles

#### 4.1.3 Pruebas de Rendimiento

**Grafana k6 con Mocks**
- **Carga normal**: Usuarios concurrentes representativos del uso real
- **Tests de estrés**: Carga pico para validar límites del sistema
- **Endpoints críticos**: Reservas, autenticación, listados principales
- **Tiempo de respuesta**: Objetivo de performance según SLA definido

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

| Categoría | Objetivo Mínimo | Objetivo Ideal | Medición |
|-----------|-----------------|----------------|----------|
| **Backend Crítico** | 80% | 95% | pytest-cov |
| **Backend Soporte** | 75% | 85% | pytest-cov |
| **Frontend Crítico** | 80% | 90% | Jest coverage |
| **Frontend Soporte** | 70% | 80% | Jest coverage |
| **Integración** | 90% | 95% | Django TestCase |

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

| Métrica | KPI | Herramienta |
|---------|-----|-------------|
| **Cobertura de código** | >80% promedio | pytest-cov, Jest |
| **Bugs encontrados** | 0 bugs críticos | pytest, Jest, Grafana k6 |

---

## 7. Conclusión

Este **Plan de Pruebas** para NexUS establece una **metodología robusta y escalable** que garantiza la calidad del software independientemente de la evolución futura del proyecto.

### 7.1 Garantías de Calidad

Con este plan aseguramos que **todos los módulos funcionales** mantengan:
- **Mínimo 80% cobertura** en componentes críticos y funcionalidades principales
- **Mínimo 75% cobertura** en módulos de soporte y utilidades
- **Testing continuo** durante todo el ciclo de desarrollo
- **Adaptabilidad** a cambios de arquitectura y nuevos requerimientos

### 7.2 Sostenibilidad a Largo Plazo

La **metodología de testing evolutiva** establecida garantiza que:
- Cualquier **nuevo módulo** hereda automáticamente los estándares de su categoría
- Los **criterios de calidad** se mantienen sin intervención manual
- La **eficiencia** mejora con la experiencia del equipo
- La **deuda técnica** se minimiza mediante testing proactivo