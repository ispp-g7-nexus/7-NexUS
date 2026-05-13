# Análisis de Costes CAPEX/OPEX - NexUS

<p align="center">  
  <img src="../../images/logo-app.png" alt="Logo NexUS" width="500">
</p>

<div align="center">

<p>
  <img src="https://img.shields.io/badge/Versión-1.0.0-blue?style=flat-square" alt="Versión">
  <img src="https://img.shields.io/badge/Estado-En%20preparación-orange?style=flat-square" alt="Estado">
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
**Fecha:** 13/05/2026  

<p align="center">
  <img src="../../images/logo-etsii.jpe" alt="Logo ETSII" width="400">
</p>



## Historial de Versiones

| Versión | Fecha | Cambio principal |
|---------|-------|------------------|
| 1.0.0 | 13/05/2026 | Creación del documento de Análisis de Costes CAPEX/OPEX |

---



## Índice

- [1. Introducción](#1-introducción)
- [2. Marco conceptual: CAPEX vs OPEX](#2-marco-conceptual-capex-vs-opex)
- [3. Criterios de clasificación aplicados a NexUS](#3-criterios-de-clasificación-aplicados-a-nexus)
- [4. Estructura de costes del proyecto](#4-estructura-de-costes-del-proyecto)
- [5. Proyección CAPEX/OPEX post-lanzamiento](#5-proyección-capexopex-post-lanzamiento)
- [6. Política de amortización del CAPEX](#6-política-de-amortización-del-capex)
- [7. Impacto en el modelo de negocio y rentabilidad](#7-impacto-en-el-modelo-de-negocio-y-rentabilidad)
- [8. Riesgos, sensibilidad y palancas de optimización](#8-riesgos-sensibilidad-y-palancas-de-optimización)
- [9. Conclusiones](#9-conclusiones)
- [Glosario de Siglas Utilizadas](#glosario-de-siglas-utilizadas)

---


## 1. Introducción

El presente documento complementa al **Business Model** y al **Plan de Marketing** de NexUS aportando una visión específicamente financiera del producto: la separación de su estructura de costes entre **CAPEX (Capital Expenditure)** y **OPEX (Operating Expenditure)**.

Esta distinción es relevante por tres razones:

- **Trazabilidad contable**: permite identificar qué euros de inversión generan un activo amortizable y cuáles se consumen íntegramente en el periodo.
- **Planificación de tesorería**: los gastos OPEX condicionan el *runway* del proyecto, mientras que el CAPEX se distribuye en varios ejercicios mediante amortización.
- **Comunicación con inversores y dirección**: la fotografía CAPEX/OPEX es el lenguaje habitual de los análisis de viabilidad en proyectos SaaS B2B.

El objetivo es ofrecer una clasificación coherente de todas las partidas de coste de NexUS, una proyección razonable para la fase post-lanzamiento y una política de amortización aplicable a los activos del proyecto.


## 2. Marco conceptual: CAPEX vs OPEX

| Concepto | CAPEX | OPEX |
|---|---|---|
| **Definición** | Inversión en activos cuya vida útil supera el ejercicio contable | Gasto necesario para mantener la operativa diaria del negocio |
| **Tratamiento contable** | Se activa en balance y se amortiza a lo largo de su vida útil | Se imputa íntegramente a la cuenta de resultados del periodo |
| **Ejemplos en software** | Servidores propios, licencias perpetuas, equipos de desarrollo, desarrollo capitalizable | Sueldos recurrentes, suscripciones SaaS, cloud por uso, marketing, soporte |
| **Impacto en caja** | Salida puntual (alta) | Salida recurrente (estable) |
| **Riesgo asociado** | Obsolescencia, infrautilización | Inflación de coste por uso, dependencia de terceros |
| **Ventaja estratégica** | Activo propio, control total | Flexibilidad, escalado pago-por-uso |

En el sector SaaS moderno la tendencia es **deslizar partidas tradicionalmente CAPEX hacia OPEX** (cloud frente a servidores propios, suscripciones frente a licencias perpetuas), lo que aporta flexibilidad pero exige una vigilancia continua del consumo. NexUS sigue esta lógica salvo en aquellas partidas donde la inversión inicial es inevitable (estaciones de trabajo del equipo y hardware específico de despliegue).


## 3. Criterios de clasificación aplicados a NexUS

Para clasificar cada partida del proyecto se han aplicado los siguientes criterios:

**Se clasifica como CAPEX cuando:**
- El bien o servicio tiene una **vida útil superior a 12 meses**.
- Genera un **activo identificable** (físico o intangible) atribuible a NexUS.
- Su valor se recupera por **amortización**, no por consumo inmediato.
- *Ejemplos en NexUS*: hardware específico, estaciones de trabajo, licencias perpetuas de servidor, desarrollo capitalizable del *core* del producto.

**Se clasifica como OPEX cuando:**
- Se consume **íntegramente durante el periodo** (mes o ciclo de facturación).
- Está vinculado a **personal, suministros o servicios recurrentes**.
- No produce un activo amortizable.
- *Ejemplos en NexUS*: salarios y SS, suscripciones cloud (Render, Supabase), dominios, herramientas de gestión (Jira, GitHub), pilotos, marketing, formación.

Nota: en esta fase de construcción del producto, el coste de desarrollo del *core* se imputa como OPEX (gasto de mano de obra del periodo) y **no se capitaliza**, en aplicación del criterio prudente. La capitalización de desarrollo sólo se planteará para nuevos módulos amortizables a futuro, una vez el producto sea estable comercialmente.


## 4. Estructura de costes del proyecto

### 4.1. Inventario de partidas

El siguiente cuadro resume las principales partidas que componen el coste de NexUS en su fase actual, clasificadas según su naturaleza:

| Categoría | Partida | Naturaleza |
|---|---|---|
| Personal | Sueldos brutos + Seguridad Social a cargo de la empresa | OPEX |
| Personal | Formación recurrente del equipo | OPEX |
| Infraestructura | Suscripciones cloud (cómputo, base de datos, almacenamiento) | OPEX |
| Infraestructura | Dominios, certificados, correo profesional | OPEX |
| Infraestructura | Hardware específico (estaciones de trabajo, periféricos, equipos de desarrollo) | CAPEX |
| Herramientas | Licencias SaaS de gestión (Jira, GitHub, Slack, Sentry) | OPEX |
| Comercial | Captura digital de leads y CRM | OPEX |
| Comercial | Visitas físicas, material de onboarding, demos | OPEX |
| Comercial | Campañas de marketing y publicidad | OPEX |
| Estructura | Seguros (RC profesional, accidentes) | OPEX |
| Estructura | Costes indirectos (oficina, luz, internet) | OPEX |
| Estructura | Costes financieros (líneas de crédito, comisiones bancarias) | OPEX |

### 4.2. Reparto CAPEX/OPEX esperado en fase de construcción

En la fase de construcción del producto, la estructura de gasto está fuertemente dominada por el coste de personal, lo que produce un perfil OPEX muy alto:

| Naturaleza | Peso esperado | Comentario |
|---|---|---|
| **CAPEX** | **~2-3%** | Únicamente hardware específico y equipamiento del equipo |
| **OPEX** | **~97-98%** | Personal, suscripciones cloud, herramientas, comercial y estructura |

Este reparto es característico de cualquier producto SaaS *cloud-native* durante su construcción, en el que:

- No se invierte en infraestructura propia (todo se contrata como servicio).
- Las licencias de software son suscripciones, no compras perpetuas.
- El desarrollo se imputa como gasto del periodo, no como activo intangible.

### 4.3. Lectura del reparto

- La estructura es la **típica de un SaaS en construcción**: prácticamente todo el gasto es OPEX, con una capa muy fina de CAPEX.
- La **palanca principal de control del *burn rate*** es el dimensionamiento del equipo, no el ahorro en activos.
- El CAPEX se concentra en hardware del equipo de desarrollo, sin licencias perpetuas ni infraestructura propia: NexUS opera *cloud-native* y consume infraestructura como OPEX.


## 5. Proyección CAPEX/OPEX post-lanzamiento

Una vez finalizada la fase de construcción intensiva, la estructura de costes cambia. Se modelan dos escenarios coherentes con los planteados en el Business Model:

### 5.1. Escenario A - Operación *Lean* (mantenimiento)

Equipo *core* reducido (3 desarrolladores + 1 responsable de producto/soporte), centrado en mantener la plataforma estable y atender a los clientes existentes.

| Partida | Naturaleza | Importe mensual estimado |
|---|---|---|
| Salarios y SS equipo *core* | OPEX | 9.500 € |
| Cloud (cómputo, base de datos, almacenamiento, backups) | OPEX | 600 € |
| Dominios, correo, herramientas (Jira, GitHub, Sentry) | OPEX | 250 € |
| Soporte y guardias | OPEX | 200 € |
| Seguros, oficina virtual, gestoría | OPEX | 350 € |
| Hardware (renovación prorrateada de equipos) | CAPEX | 150 € |
| **TOTAL mensual** | | **~11.050 €** |
| **% CAPEX / OPEX** | | **~1,4% / 98,6%** |

En este escenario el punto de equilibrio se alcanza con un número reducido de residencias medianas, en línea con lo recogido en el Business Model.

### 5.2. Escenario B - Crecimiento comercial

Equipo de 8-10 personas (desarrollo + ventas + soporte) para acompañar la captación hasta superar el *break-even* fijado en el Business Model.

| Partida | Naturaleza | Importe mensual estimado |
|---|---|---|
| Salarios y SS (8-10 personas) | OPEX | 22.000 € |
| Cloud y escalado | OPEX | 1.200 € |
| Marketing y ventas (campañas, eventos, demos) | OPEX | 2.500 € |
| Herramientas (CRM, gestión, soporte) | OPEX | 500 € |
| Hardware y renovación equipos | CAPEX | 400 € |
| Inversión en mejoras del producto capitalizables (módulos analítica, marca blanca) | CAPEX | 1.200 € |
| **TOTAL mensual** | | **~27.800 €** |
| **% CAPEX / OPEX** | | **~5,8% / 94,2%** |

En este escenario aparece por primera vez **CAPEX significativo de naturaleza intangible**: desarrollo de módulos que pasan a formar parte del activo a largo plazo (analítica avanzada, marca blanca para grupos de residencias). Esto sólo es defendible cuando el producto es estable y el desarrollo deja de ser "construcción del MVP" para ser "inversión en nueva funcionalidad amortizable".


## 6. Política de amortización del CAPEX

Las partidas clasificadas como CAPEX se amortizan según los siguientes plazos, consistentes con la práctica habitual del sector tecnológico:

| Tipo de activo | Vida útil | Método | Comentario |
|---|---|---|---|
| Equipos informáticos (portátiles, estaciones de trabajo) | 4 años | Lineal | Compatible con tablas fiscales habituales |
| Servidores y hardware específico de red | 5 años | Lineal | Aplica sólo si hay infraestructura propia |
| Licencias perpetuas de software | 3-5 años | Lineal | Según contrato |
| Desarrollo intangible capitalizable (módulos *core*) | 5 años | Lineal | Sólo cuando supera el test de activación: identificable, controlable y con beneficios futuros |

Implicación práctica: una partida de hardware de 14.400 €/año amortizada a 4 años supone un **gasto de amortización anual de ~3.600 €** en la cuenta de resultados, frente a los 14.400 € que sí impactan caja. Esta diferencia es la principal razón financiera para distinguir CAPEX y OPEX.


## 7. Impacto en el modelo de negocio y rentabilidad

Conectando este análisis con el Business Model:

- **Margen bruto unitario**: con un coste marginal cloud por cama estimado en ~0,30 €/mes y un precio medio de 9-10 €/cama/mes, el **margen bruto por cama supera el 95%**, característico de un SaaS escalable.
- **Cobertura del OPEX**: la rentabilidad depende fundamentalmente de la capacidad de absorber el OPEX fijo mediante ingresos recurrentes (MRR). El reto no es la rentabilidad unitaria, sino el volumen.
- **Coste marginal por cliente**: añadir una nueva residencia implica un coste marginal muy bajo (cloud + soporte), lo que refuerza la lógica de invertir en captación.

Conclusión financiera: el problema de NexUS **no es de margen unitario, es de absorción de OPEX fijo**. La transición CAPEX/OPEX correcta es:

1. Mantener el CAPEX bajo (cloud-first, no inversión en infraestructura propia).
2. Reducir el OPEX fijo de personal en cuanto el producto sea estable.
3. Reservar nuevo CAPEX intangible sólo cuando se demuestre tracción comercial y los módulos sean amortizables con ingresos recurrentes.


## 8. Riesgos, sensibilidad y palancas de optimización

| Riesgo | Naturaleza | Mitigación |
|---|---|---|
| **Inflación de coste cloud** al crecer en clientes | OPEX | Monitorización por residencia, optimización de queries, reserva de instancias |
| **Sobrecapitalización** de desarrollo no amortizable | CAPEX | Activar solo módulos con beneficios futuros demostrables |
| **Obsolescencia de hardware** | CAPEX | Renovación escalonada cada 4 años, leasing si procede |
| **Dependencia de proveedores SaaS** (cloud, herramientas) | OPEX | Contratos plurianuales con descuento, plan B de portabilidad |
| **Inflación salarial del equipo** | OPEX | Mix junior/senior, retribución variable ligada a hitos |

**Palancas de optimización a corto plazo** (alineadas con los escenarios del Business Model):

- Pasar de cobro mensual a **pago anual anticipado** con descuento del 15-20% → inyección de liquidez sin alterar la estructura CAPEX/OPEX.
- Ajustar el equipo a un tamaño *Lean* → recorte significativo del OPEX de personal.
- Renegociar pólizas y oficina → ahorro estimado del 30% en costes indirectos.
- Centralizar herramientas SaaS y eliminar suscripciones duplicadas.


## 9. Conclusiones

1. NexUS presenta una estructura de costes fuertemente **OPEX (~97-98%)** frente a un **CAPEX (~2-3%)**, propia de un SaaS *cloud-native* en fase de construcción.
2. La fotografía es **financieramente saludable en estructura** (margen unitario >95%, CAPEX contenido), pero está condicionada por el peso del OPEX de personal mientras el producto no genere ingresos recurrentes suficientes.
3. La política CAPEX/OPEX recomendada es **mantener el CAPEX mínimo en fase MVP** y abrir partidas de CAPEX intangible (módulos capitalizables) **sólo cuando se demuestre tracción comercial sostenida**.
4. Junto con la **amortización ordenada** del hardware (4 años, lineal), esto permite presentar a dirección y posibles inversores una cuenta de resultados más fiel a la realidad operativa, separando consumo de inversión.
5. Si se aplican las palancas descritas (escenario *Lean* o cobro anual anticipado), NexUS puede llevar su estructura financiera a un equilibrio sostenible y convertir su modelo CAPEX/OPEX en una ventaja competitiva frente a competidores con infraestructura propia más pesada.


## Glosario de Siglas Utilizadas

- **CAPEX (Capital Expenditure)**: Inversión en activos fijos (hardware, software perpetuo, desarrollo capitalizable) cuya vida útil supera el ejercicio y se recupera por amortización.
- **OPEX (Operating Expenditure)**: Gasto necesario para mantener la operativa diaria (salarios, suministros, suscripciones, marketing).
- **MRR (Monthly Recurring Revenue)**: Ingreso recurrente mensual generado por las suscripciones activas.
- **ARPA (Average Revenue Per Account)**: Ingreso medio por cuenta cliente.
- **LTV (Lifetime Value)**: Valor económico total esperado de un cliente durante su ciclo de vida.
- **CAC (Customer Acquisition Cost)**: Coste medio de adquisición de un cliente.
- **EBITDA**: Beneficio antes de intereses, impuestos, depreciaciones y amortizaciones.
- **MVP (Minimum Viable Product)**: Versión mínima del producto que aporta valor al cliente y permite validar hipótesis de negocio.
- **SaaS (Software as a Service)**: Modelo de distribución de software basado en suscripción y consumo bajo demanda.
- **B2B (Business to Business)**: Modelo comercial entre empresas.
