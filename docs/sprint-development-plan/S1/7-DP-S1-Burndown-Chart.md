<h1>Burndown Chart — Sprint 1 – NexUS</h1>

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

</div>

---

**Proyecto:** NexUS
**Grupo:** 7 - NexUS
**Asignatura:** Ingeniería del Software y Práctica Profesional (ISPP)
**Institución:** ETSII – Universidad de Sevilla
**Curso académico:** 2025/2026
**Sprint:** S1 — 19/02/2026 al 05/03/2026

<p align="center">
  <img src="../../images/logo-etsii.jpe" alt="Logo ETSII" width="400">
</p>

---

## Historial de Versiones

| Versión | Fecha | Cambio principal |
|---------|-------|------------------|
| 1.0.0 | 19/02/2026 | Creación del documento |
| 1.1.0 | 05/03/2026 | Datos finales del sprint |

---

## Índice

1. [Datos del Sprint](#1-datos-del-sprint)
2. [Tabla de Progreso](#2-tabla-de-progreso)
3. [Gráfico ASCII](#3-gráfico-ascii)
4. [Análisis](#4-análisis)

---

## 1. Datos del Sprint

| Campo | Valor |
|-------|-------|
| Sprint | S1 — Funcionalidades Core del MVP |
| Fecha inicio | 19/02/2026 |
| Fecha fin | 05/03/2026 |
| Story Points totales | 80 SP |
| Días laborables | 10 |
| Velocidad ideal diaria | 8 SP/día |
| Story Points completados | 74 SP |
| Story Points diferidos | 6 SP |

**Historias comprometidas (26 en total):**
- Must Have: 16 historias — 52 SP
- Should Have: 8 historias — 22 SP
- Could Have: 2 historias — 6 SP

---

## 2. Tabla de Progreso

| Día | Fecha | Día semana | SP Ideal Restantes | SP Real Restantes | Diferencia |
|-----|-------|------------|-------------------|-------------------|------------|
| 0 | 19/02 | Jueves | 80 | 80 | 0 |
| 1 | 20/02 | Viernes | 72 | 74 | +2 |
| 2 | 23/02 | Lunes | 64 | 65 | +1 |
| 3 | 24/02 | Martes | 56 | 57 | +1 |
| 4 | 25/02 | Miércoles | 48 | 48 | 0 |
| 5 | 26/02 | Jueves | 40 | 40 | 0 |
| 6 | 27/02 | Viernes | 32 | 33 | +1 |
| 7 | 02/03 | Lunes | 24 | 23 | -1 |
| 8 | 03/03 | Martes | 16 | 15 | -1 |
| 9 | 04/03 | Miércoles | 8 | 8 | 0 |
| 10 | 05/03 | Jueves | 0 | 6 | +6 |

> **Nota:** Diferencia positiva = equipo por detrás del ideal. Diferencia negativa = equipo por delante.

---

## 3. Gráfico ASCII

```
SP
80 |*●
   | *
   |  *●
72 |   ●
   |    *●
64 |     ●
   |      *●
56 |       ●
   |        *●
48 |         ●*
   |           *●
40 |            ●*
   |              *
32 |               * ●
   |                *●
24 |                 *●
   |                   ●*
16 |                    ●*
   |                      ●*
 8 |                       ●*
   |                          ●
 6 |                           ●  ← 6 SP diferidos
 0 +--+--+--+--+--+--+--+--+--+--+-- Día
   D0 D1 D2 D3 D4 D5 D6 D7 D8 D9 D10
   19 20 23 24 25 26 27 02 03 04 05
   Feb                       Mar
```

> Leyenda: `*` = línea ideal | `●` = progreso real

---

## 4. Análisis

**Tendencia general:** El equipo comenzó ligeramente por detrás del ritmo ideal durante los primeros 3 días (Sem 1, fase de infraestructura). A partir del día 4 (25/02) el progreso se igualó con el ideal y en la segunda semana el equipo recuperó el ritmo, cerrando el sprint con 6 SP no completados (7.5% del total).

**Causas de la desviación inicial (Días 1-3):**
- La configuración de Docker Compose y el entorno de desarrollo fue más compleja de lo esperado (BLQ-001, BLQ-002)
- El bloqueo por el puerto 5432 ocupado retrasó el arranque del backend en los equipos de desarrollo
- Tiempo de setup del entorno en WSL2 no estimado correctamente

**Recuperación (Días 4-9):**
- Una vez resueltos los bloqueos de infraestructura, el desarrollo de funcionalidades avanzó a buen ritmo
- La segunda semana (26 Feb - 5 Mar) fue especialmente productiva con las cuatro semanas trabajando en paralelo

**Historias diferidas al backlog (6 SP):**
- S1-09 (Recuperación de contraseña) — 5 SP — Prioridad Should Have, depende de configuración de servidor de email pendiente
- S1-16 (Visualización ocupación residencia - gráfico avanzado) — 1 SP — La vista básica está integrada en el dashboard

**Conclusión:** Sprint completado con un 92.5% de los SP planificados. Las 2 historias diferidas son ambas de prioridad Should Have, con las 16 historias Must Have completadas al 100%.
