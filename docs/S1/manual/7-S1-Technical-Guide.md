<h1>Manual Técnico – NexUS</h1>

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

| Versión | Fecha       | Cambio principal                                      |
|---------|-------------|-------------------------------------------------------|
| 1.0.0   | 04/03/2026  | Creación del documento base                           |


---

## Índice

- [1. Introducción y objetivos](#1-introducción-y-objetivos)
  - [1.1. Contexto y Problemática](#11-contexto-y-problemática)
  - [1.2. Propuesta de Valor: NexUS](#12-propuesta-de-valor-nexus)
  - [1.3. Modelo de Negocio (B2B2C)](#13-modelo-de-negocio-b2b2c)
- [2. Arquitectura del sistema](#2-arquitectura-del-sistema)
- [3. Diseño de la base de datos (ERD)](#3-diseño-de-la-base-de-datos-erd)
  - [3.1. Núcleo de Usuarios y Matching](#31-núcleo-de-usuarios-y-matching)
  - [3.2. Gestión Operativa e Incidencias](#32-gestión-operativa-e-incidencias)
  - [3.3. Servicios y Convivencia](#33-servicios-y-convivencia)
- [4. Módulo de matching: algoritmo NexUS](#4-módulo-de-matching-algoritmo-nexus)
  - [4.1. Lógica del Algoritmo](#41-lógica-del-algoritmo)
  - [4.2. Implementación Técnica (Worker)](#42-implementación-técnica-worker)
- [5. Guía de instalación y despliegue (ALM)](#5-guía-de-instalación-y-despliegue-alm)
  - [5.1. Preparación del entorno](#51-preparación-del-entorno)
  - [5.2. Comandos de inicialización](#52-comandos-de-inicialización)
- [6. Interfaz de usuario](#6-interfaz-de-usuario)

---

## 1. Introducción 
### 1.1. Contexto y Problemática

Actualmente, la gestión de residencias de estudiantes (especialmente en el sector privado y de tamaño medio) padece una fuerte fragmentación operativa. Los procesos
cotidianos dependen de herramientas no integradas como:
- Hojas de cálculo y correos electrónicos
- Grupos de mensajería instantánea (WhatsApp/Telegram).
- Llamadas telefónicas y avisos verbales.

Esta falta de centralización deriva en una nula trazabilidad, ineficiencias en la resolución de incidencias y una sobrecarga administrativa que perjudica la experiencia del
residente.

### 1.2. Propuesta de Valor: NexUS

NexUS se define como una plataforma digital integral diseñada específicamente para profesionalizar el día a día de una residencia. A diferencia de un ERP genérico, NexUS se
adapta a las necesidades reales de convivencia y gestión de recursos comunes.

### 1.3.  Modelo de Negocio (B2B2C)
El sistema opera bajo un modelo B2B2C:
- **Cliente (B2B)**: Entidades gestoras de residencias que buscan optimizar sus procesos internos.
- **Usuarios Finales (C)**: Estudiantes y personal operativo que demandan una experiencia digital unificada y eficiente.

## 2. Arquitectura del sistema

NexUS se basa en un stack tecnológico moderno y escalable:
- **Frontend**: React.js con Vite y Tailwind CSS.
- **Backend**: Django REST Framework (Python 3.12).
- **Base de Datos**: PostgreSQL + pgvector.
- **Asincronía**: Celery + Redis

---

## 3. Diseño de la base de datos (ERD)

El modelo de datos de NexUS está diseñado para centralizar la gestión de la residencia en tres bloques principales:

### 3.1 Núcleo de Usuarios y Matching
- **User**: Tabla base para autenticación y roles (Administrador, Personal,
Estudiante).
- **StudentProfile**: Almacena la "biografía" y los hábitos (ruido, limpieza, horarios).
- **Interests/Tags**: Relación de etiquetas (Gaming, Deporte, etc.) para el algoritmo.
- **Compatibility**: Tabla donde el Worker guarda los resultados del algoritmo:
  - user_source: El estudiante logueado.
  - user_target: El candidato comparado.
  - score: Porcentaje de afinidad calculado

### 3.2 Gestión Operativa e Incidencias
- **Room**: Gestión de habitaciones y ocupacones por estudiantes.
- **Incidence**: Reportes de fallos técnicos. Incluye descripción, localización y estados (Abierta, En proceso, Resuelta).
- **Facility**: Espacios comunes (Gimnasio, Lavandería, Cocina…) vinculados a la tabla de Reservas.

### 3.3 Servicios y Convivencia

- **Reservation**: Control de horarios y aforo de zonas comunes.
- **Menu & Orders**: Gestión de comidas y la funcionalidad de autorización de recogida por otros compañeros.

---
## 4. Módulo de matching: algoritmo NexUS

En lugar de depender de servicios externos, NexUS implementa un algoritmo de Similitud de Coseno (o Jaccard, según prefiráis) para calcular la afinidad entre residentes.

### 4.1. Lógica del Algoritmo

El algoritmo procesa tres capas de datos del estudiante:

### 4.2 Implementación Técnica (Worker)

El algoritmo de emparejamiento se sigue ejecutando de forma asíncrona mediante Celery para no afectar el rendimiento de la plataforma.
Flujo de cálculo:
- **Entrada**: UserPreferences del Usuario A y Usuario B.
- **Proceso**: El Worker ejecuta la función matemática de comparación.
- **Salida**: Un valor normalizado entre 0.0 y 100.0 que se almacena en la tabla Compatibility

---

## 5. Guía de instalación y despliegue (ALM)

Para que NexUS funcione, el sistema necesita ser preparado en el ordenador o servidor.
Este proceso se divide en tres fases: **Preparación, Configuración (Base de Datos) y Encendido.**

### 5.1 Preparación del entorno

1.  **Descarga del Proyecto**: 
    Copiamos todos los archivos del código fuente desde el repositorio oficial a una carpeta local. Para ello se debe abrir una terminal dentro de la carpeta donde queramos guardar el proyecto y ejecutar:
    ```bash
    git clone [https://github.com/ispp-g7-nexus/7-NexUS](https://github.com/ispp-g7-nexus/7-NexUS)
    ```

2.  **Instalación de Dependencias**: 
    Ejecutamos un comando dentro de la terminal de la herramienta de desarrollo usada que instala automáticamente todas las piezas de software necesarias (como el motor de Python o los conectores de base de datos)
    ```bash
    pip install -r backend/requirements/local.txt
    ```

3.  **Configurar**: 
    Se debe crear el archivo de configuración a partir del ejemplo proporcionado. Copia el archivo `.env.local.example` y renómbralo a `.env` para editar tus credenciales locales:
    ```bash
    cp .env.local.example .env
    ```

### 5.2. Configuración 

Dentro de la terminal de la herramienta de desarrollo seleccionada ejecutar los siguientes comandos:

```bash
  python3.12 manage.py migrate
  python3.12 manage.py seed_users 
  python3.12 manage.py runserver 
  celery -A nexus_project worker 
  ```

---

## 6. Interfaz de usuario

El diseño sigue principios de B2B2C con una interfaz limpia para estudiantes:
- Componentes: Uso de botones dinámicos para intereses y Sliders táctiles para hábitos.
- Accesibilidad: Contraste de texto oscuro sobre fondos claros y botones de acción de gran tamaño.