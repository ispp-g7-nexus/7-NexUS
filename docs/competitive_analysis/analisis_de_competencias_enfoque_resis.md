# Análisis Competitivo – NexUS (Enfoque Residencias)

<p align="center">
  <img src="../images/logo-app.jpeg" alt="Portada" width="700">
</p>


**Grupo:** B-Tarde  
**Proyecto:** NexUS - Plataforma de Gestión Integral para Residencias Estudiantiles  
**Fecha:** 10/02/2026  
**Asignatura:** ISPP  
**Institución:** ETSII, Universidad de Sevilla


<p align="center">
  <img src="../images/logo-etsii.jpe" alt="Portada" width="400">
</p>

---

## Historial de Versiones

| Versión | Fecha       | Cambio principal                                      |
|---------|-------------|-------------------------------------------------------|
| 1.0.0   | 08/02/2026  | Creación del documento base                           |
| 1.1.0   | 08/02/2026  | Añadido análisis de funcionalidades core              |
| 1.2.0   | 08/02/2026  | Añadido curiado y filtrado de competidores            |
| 1.3.0   | 09/02/2026  | Añadido análisis profundo por segmento                |
| 1.4.0   | 09/02/2026  | Añadida matriz comparativa consolidada                |
| 1.5.0   | 09/02/2026  | Añadido modelo de negocio detallado                   |
| 1.6.0   | 10/02/2026  | Reestructuración con formato profesional              |

---

## Índice

- [Análisis Competitivo – NexUS (Enfoque Residencias)](#análisis-competitivo--nexus-enfoque-residencias)
  - [Historial de Versiones](#historial-de-versiones)
  - [Índice](#índice)
  - [1. Resumen Ejecutivo](#1-resumen-ejecutivo)
    - [1.1. Contexto del Análisis](#11-contexto-del-análisis)
    - [1.2. Hallazgos Principales](#12-hallazgos-principales)
  - [2. Funcionalidades Core Sin Competencia Directa](#2-funcionalidades-core-sin-competencia-directa)
    - [2.1. Sistema de IA para Convivencia Post-Asignación](#21-sistema-de-ia-para-convivencia-post-asignación)
    - [2.2. Transparencia Bidireccional en Gestión de Incidencias](#22-transparencia-bidireccional-en-gestión-de-incidencias)
    - [2.3. Reserva de Objetos Comunes (No Solo Espacios)](#23-reserva-de-objetos-comunes-no-solo-espacios)
    - [2.4. Analítica de Clima Social y Bienestar](#24-analítica-de-clima-social-y-bienestar)
    - [2.5. Control de Acceso para Invitados mediante QR](#25-control-de-acceso-para-invitados-mediante-qr)
    - [2.6. Marca Blanca Profunda (Dominio + Email + Flujos Personalizados)](#26-marca-blanca-profunda-dominio--email--flujos-personalizados)
    - [2.7. Sistema de Gestión de Comedor/Menús](#27-sistema-de-gestión-de-comedormenús)
    - [2.8. Panel de Control Multi-Residencia (Vista Nexus)](#28-panel-de-control-multi-residencia-vista-nexus)
    - [2.9. Resumen de Funcionalidades Únicas](#29-resumen-de-funcionalidades-únicas)
  - [3. Curiado y Filtrado de Competidores](#3-curiado-y-filtrado-de-competidores)
    - [3.1 Competidores Descartados (Falsos Competidores)](#31-competidores-descartados-falsos-competidores)
    - [3.2. Competidores Relevantes Identificados](#32-competidores-relevantes-identificados)
  - [4. Análisis Profundo por Segmento](#4-análisis-profundo-por-segmento)
    - [4.1. Bloque Operativo: Gestión de Incidencias y Procesos](#41-bloque-operativo-gestión-de-incidencias-y-procesos)
      - [Arthur Online](#arthur-online)
      - [Housing.Cloud](#housingcloud)
      - [Crib](#crib)
      - [Witco](#witco)
    - [4.2. Bloque Social: Matching y Convivencia](#42-bloque-social-matching-y-convivencia)
      - [RoomSync](#roomsync)
      - [Roompact](#roompact)
      - [COHO](#coho)
      - [Spaceflow](#spaceflow)
    - [4.3. Bloque Legacy: Gigantes del Mercado](#43-bloque-legacy-gigantes-del-mercado)
      - [StarRez](#starrez)
  - [**Oportunidad:** StarRez es muy fuerte en entornos de gran escala, pero su propuesta parece menos adecuada para el mercado medio. Su UX y complejidad de implantación son un punto claro para diferenciación.](#oportunidad-starrez-es-muy-fuerte-en-entornos-de-gran-escala-pero-su-propuesta-parece-menos-adecuada-para-el-mercado-medio-su-ux-y-complejidad-de-implantación-son-un-punto-claro-para-diferenciación)
      - [RentCafe Student Housing (Yardi)](#rentcafe-student-housing-yardi)
    - [4.4. Bloque Multi-Propiedad](#44-bloque-multi-propiedad)
      - [TheHouseMonk](#thehousemonk)
  - [**Oportunidad:** Su principal punto débil parece estar en la experiencia del residente en móvil; existe margen para diferenciarnos con una app más completa y orientada al estudiante.](#oportunidad-su-principal-punto-débil-parece-estar-en-la-experiencia-del-residente-en-móvil-existe-margen-para-diferenciarnos-con-una-app-más-completa-y-orientada-al-estudiante)
  - [5. Matriz Comparativa Consolidada](#5-matriz-comparativa-consolidada)
    - [5.1. Comparativa de Funcionalidades Core](#51-comparativa-de-funcionalidades-core)
    - [5.2. Análisis de Cobertura](#52-análisis-de-cobertura)
  - [6. Oportunidades de Mercado](#6-oportunidades-de-mercado)
    - [6.1. Gaps Estructurales Identificados](#61-gaps-estructurales-identificados)
      - [Gap 1: Integración vertical completa](#gap-1-integración-vertical-completa)
      - [Gap 2: Mercado hispanohablante](#gap-2-mercado-hispanohablante)
      - [Gap 3: Segmento medio desatendido](#gap-3-segmento-medio-desatendido)
    - [6.2. Recomendaciones de posicionamiento](#62-recomendaciones-de-posicionamiento)
    - [6.3. Matriz de riesgos](#63-matriz-de-riesgos)
  - [7. Modelo de negocio](#7-modelo-de-negocio)
    - [7.1. Estrategia de monetización](#71-estrategia-de-monetización)
    - [7.2. Matriz de Suscripción](#72-matriz-de-suscripción)
    - [7.3. Propuesta de valor económica](#73-propuesta-de-valor-económica)
  - [8. Conclusiones y recomendaciones](#8-conclusiones-y-recomendaciones)
    - [8.1. Síntesis del análisis](#81-síntesis-del-análisis)
    - [8.2. Ventajas competitivas defendibles](#82-ventajas-competitivas-defendibles)
    - [8.3. Recomendaciones finales](#83-recomendaciones-finales)

---

## 1. Resumen Ejecutivo

### 1.1. Contexto del Análisis

Este análisis revisa el panorama competitivo del software orientado a la gestión de residencias estudiantiles. Se han evaluado más de 50 soluciones y se han seleccionado 22 por su relevancia estratégica directa para nuestra propuesta de valor.

### 1.2. Hallazgos Principales

**Hallazgo principal:** El mercado está claramente fragmentado: la mayoría de competidores cubren solo capas concretas (gestión operativa, *matching* social o experiencia de comunidad), pero no se observa una solución verticalmente integrada que combine gestión profesional con una experiencia estudiantil mejorada mediante inteligencia artificial.

**Diferenciación crítica identificada:** Del contraste realizado se desprende que existen seis funcionalidades *core* sin equivalente directo en las soluciones analizadas, lo que podría traducirse en ventajas competitivas defendibles.

---

## 2. Funcionalidades Core Sin Competencia Directa

Tras un análisis exhaustivo, contrastando nuestras funcionalidades propuestas con las 22 soluciones relevantes del mercado, se identifican las siguientes capacidades únicas:

---

### 2.1. Sistema de IA para Convivencia Post-Asignación

| Aspecto | Estado del Mercado | Nuestra Propuesta |
|---------|-------------------|-------------------|
| **Competidor más cercano** | RoomSync (matching pre-arrival) | — |
| **Brecha identificada** | RoomSync finaliza su función al asignar habitación; no existe seguimiento posterior. | Sistema de IA que monitoriza indicadores de convivencia durante toda la estancia. |
| **Valor diferencial** | — | Detección proactiva de posibles conflictos, sugerencias de mediación y aprendizaje a partir de resoluciones exitosas. |

**Conclusión técnica:** Esta funcionalidad se plantea como un “océano azul”. El mercado suele asumir que el *matching* termina con la asignación de habitación; nuestra propuesta amplía ese ciclo y lo mantiene activo de forma continua durante la convivencia.

**Nivel de competencia:** `INEXISTENTE` — Ningún competidor ofrece IA de convivencia post-matching.

---

### 2.2. Transparencia Bidireccional en Gestión de Incidencias

| Aspecto | Estado del Mercado | Nuestra Propuesta |
|---------|-------------------|-------------------|
| **Competidor más cercano** | Arthur Online | — |
| **Brecha identificada** | Arthur Online ofrece una gestión sólida para el administrador, pero el residente no tiene visibilidad sobre el estado de su incidencia. | Flujo tipo “seguimiento de pedido”, donde el estudiante puede ver cada etapa del proceso de resolución. |
| **Valor diferencial** | — | Comunicación bidireccional, notificaciones de avance y estimaciones de tiempo de resolución visibles para el residente. |

**Conclusión técnica:** Las soluciones actuales tienden a priorizar al gestor frente al usuario final. Reorientar el proceso hacia la transparencia para el residente puede mejorar la experiencia y reducir las consultas de seguimiento.

**Nivel de competencia:** `INEXISTENTE` — Ningún competidor ofrece transparencia bidireccional completa al residente.

---

### 2.3. Reserva de Objetos Comunes (No Solo Espacios)

| Aspecto | Estado del Mercado | Nuestra Propuesta |
|---------|-------------------|-------------------|
| **Competidor más cercano** | Witco, Spaceflow | — |
| **Brecha identificada** | Las soluciones existentes suelen cubrir la reserva de salas y espacios (gimnasio, sala de estudio), pero no contemplan la gestión de objetos prestables. | Sistema de inventario con reserva de objetos (p. ej., proyectores, material deportivo, planchas, utensilios de cocina). |
| **Valor diferencial** | — | Control de disponibilidad, gestión de préstamos, historial de uso y alertas de devolución. |

**Conclusión técnica:** En muchas residencias, la gestión de objetos compartidos se realiza de forma manual. Digitalizar este proceso puede reducir fricciones, extravíos y malentendidos.

**Nivel de competencia:** `INEXISTENTE` — Ningún competidor ofrece reserva de objetos (se limitan a espacios físicos).

---

### 2.4. Analítica de Clima Social y Bienestar

| Aspecto | Estado del Mercado | Nuestra Propuesta |
|---------|-------------------|-------------------|
| **Competidor más cercano** | Roompact (learning outcomes), StarRez (métricas operativas) | — |
| **Brecha identificada** | Roompact mide el “éxito académico” sin incorporar indicadores de convivencia. StarRez se centra en métricas financieras y operativas. | *Dashboard* con índice de convivencia, detección de grupos socialmente aislados y métricas agregadas de bienestar. |
| **Valor diferencial** | — | Encuestas de clima automatizadas, alertas de riesgo social y recomendaciones de intervención para el equipo de la residencia. |

**Conclusión técnica:** Esta capacidad orienta la plataforma hacia la **gestión del bienestar estudiantil**, y no solo hacia la administración de infraestructura. Se alinea con el foco creciente en responsabilidad social y atención al estudiante en educación superior.

**Nivel de competencia:** `INEXISTENTE` — No se observa en el mercado una analítica específicamente orientada al clima social.

---

### 2.5. Control de Acceso para Invitados mediante QR

| Aspecto | Estado del Mercado | Nuestra Propuesta |
|---------|-------------------|-------------------|
| **Competidor más cercano** | Crib (check-in digital) | — |
| **Brecha identificada** | Crib digitaliza el check-in del residente, pero no cubre la gestión de invitados externos. En la práctica, el control de visitas suele mantenerse como un proceso manual. | Generación de QR temporal para invitados, registro de entradas y salidas, y límites configurables según normativa. |
| **Valor diferencial** | — | Sustitución de registros en papel, trazabilidad completa e integración con la comunicación a recepción. |

**Conclusión técnica:** El control de invitados suele ser una fuente recurrente de fricción operativa en residencias. Digitalizarlo mediante QR temporales puede mejorar la seguridad y facilitar el cumplimiento normativo de forma simultánea.

**Nivel de competencia:** `INEXISTENTE` en el contexto de residencias estudiantiles.

---

### 2.6. Marca Blanca Profunda (Dominio + Email + Flujos Personalizados)

| Aspecto | Estado del Mercado | Nuestra Propuesta |
|---------|-------------------|-------------------|
| **Competidor más cercano** | Student Experience Resident App | — |
| **Brecha identificada** | La mayoría de competidores se limita a una personalización superficial (logo, colores) y no ofrece dominio propio ni comunicaciones desde un email corporativo de la residencia. | App publicada con el nombre de la residencia, dominio propio, comunicaciones desde el email de la residencia y personalización de flujos operativos. |
| **Valor diferencial** | — | La residencia refuerza su marca en cada interacción, y el estudiante percibe la herramienta como “de su residencia”, no como un producto de un tercero. |

**Conclusión técnica:** Una marca blanca “profunda” puede aumentar la percepción de valor por parte de la residencia y mejorar la adopción por parte del estudiante, además de suponer una barrera competitiva relevante.

**Nivel de competencia:** `PARCIALMENTE CUBIERTO` — Se observa marca blanca superficial, pero no una implementación profunda.

---

### 2.7. Sistema de Gestión de Comedor/Menús 

| Aspecto | Estado del Mercado | Nuestra Propuesta |
|---------|-------------------|-------------------|
| **Competidor más cercano** | Campus Laude, Convivo App | — |
| **Brecha identificada** | Las soluciones actuales suelen funcionar como tablones de anuncios estáticos (por ejemplo, PDFs) y no conectan el perfil del residente con la logística real de cocina. | Planificación nutricional dinámica con desglose de ingredientes y alérgenos, integrada con un sistema de autorizaciones cruzadas para delegar la recogida del menú de forma oficial, digital y trazable. |
| **Valor diferencial** | — | Trazabilidad completa de entregas, optimización de raciones a partir de la previsión de asistencia y mayor seguridad en la gestión de alérgenos. |

**Conclusión técnica:** Esta funcionalidad profesionaliza el servicio de restauración al convertir el menú en un recurso operativo. Al incorporar la delegación de recogida autorizada, se reducen fricciones y se garantiza que cocina o conserjería dispongan de un registro actualizado de quién retira cada ración. Además, estimar la asistencia puede ayudar a reducir el desperdicio alimentario y mejorar la eficiencia del servicio.

**Nivel de competencia:** `PARCIALMENTE CUBIERTO` — Aunque existen aplicaciones que muestran el menú, no se observa un flujo logístico completo que incluya autorizaciones entre residentes, control de raciones por perfil y analítica de desperdicio.

---

### 2.8. Panel de Control Multi-Residencia (Vista Nexus)

| Aspecto | Estado del Mercado | Nuestra Propuesta |
|---------|-------------------|-------------------|
| **Competidor más cercano** | TheHouseMonk | — |
| **Brecha identificada** | Las soluciones actuales suelen obligar a gestionar cada sede como una cuenta independiente y no incorporan una capa de inteligencia agregada para gestoras con varias residencias. | Interfaz de mando centralizado (Vista Nexus) para supervisar múltiples residencias con analítica comparativa en tiempo real. |
| **Valor diferencial** | — | Visibilidad global del porfolio, estandarización de procesos entre sedes y detección de desviaciones operativas mediante IA. |

**Conclusión técnica:** Esta capacidad eleva el producto de una “app de residencia” a una herramienta de gestión a nivel de grupo. Permite comparar el rendimiento social y operativo entre centros y apoyar la toma de decisiones en un nivel corporativo.

**Nivel de competencia:** `BAJO` — Muy limitado en el mercado medio; suele encontrarse únicamente en ERPs de coste elevado.

---

### 2.9. Resumen de Funcionalidades Únicas

| Funcionalidad | Nivel de Competencia | Complejidad de Implementación | Valor Estratégico |
|---------------|---------------------|------------------------------|-------------------|
| IA Convivencia Post-Matching | Inexistente | Alta | Crítico |
| Transparencia Bidireccional de Incidencias | Inexistente | Media | Alto |
| Reserva de Objetos Comunes | Inexistente | Baja | Medio |
| Analítica de Clima Social | Inexistente | Alta | Alto |
| Control de Invitados por QR | Inexistente | Media | Medio |
| Marca Blanca Profunda | Parcial | Media-Alta | Alto |
| Gestión de Comedor y Dieta | Parcial | Media | Alto |
| Vista NexUS | Bajo | Alta | Crítico |


---

## 3. Curiado y Filtrado de Competidores

### 3.1 Competidores Descartados (Falsos Competidores)

Del listado inicial de 50+ aplicaciones, se descartan las siguientes por no representar competencia relevante:

| Categoría | Apps Descartadas | Justificación |
|-----------|------------------|---------------|
| **Property Management Genérico** | Landlord Vision, RentPro, Buildium, RentManager, Innago, Rentroom, DoorLoop | Herramientas orientadas a gestión contable para *landlords* individuales, sin especialización en residencias estudiantiles ni componentes de convivencia. |
| **Marketplaces de Alojamiento** | University Living, Amberstudent, StudentTenant.com, Haletale | Portales de búsqueda y reserva que no cubren la operativa posterior a la ocupación. |
| **Coliving para Nómadas Digitales** | ColivHQ, MangoBeds, Res:harmonics | Modelos con alta rotación (mensual) que no encajan con el ciclo académico semestral o anual. |
| **Coworking/Comercial** | Chainels, Spacebring, Powerhouse | Soluciones enfocadas a espacios de trabajo, no a entornos residenciales. |
| **Soluciones Regionales Específicas** | NSFAS Student Housing (Sudáfrica) | Producto vinculado a un mercado geográfico no relevante para este análisis. |
| **Productos Descontinuados** | Cozy (adquirido por Apartments.com) | Ya no opera como producto independiente. |
| **ERPs Enterprise Fuera de Scope** | MRI Living, OneSite Student (RealPage), Ellucian Housing | Requieren un ecosistema completo o una escala de implantación muy alta (por encima de 1.000 camas). |

**Total descartados:** 29 aplicaciones (58% del listado inicial)

---

### 3.2. Competidores Relevantes Identificados

Se identifican **22 soluciones relevantes**, organizadas en cinco bloques estratégicos:

| Bloque | Competidores | Relevancia Principal |
|--------|--------------|---------------------|
| **A. Operativa y Gestión** | Arthur Online, Kinetic, Housing.Cloud, Crib, Witco | Referencias para módulos de incidencias, reservas y procesos operativos. |
| **B. Social y Matching** | Roompact, RoomSync, COHO, Spaceflow, BeRoomie | Comparativa directa frente a propuestas centradas en comunidad y diferenciación social (incluido el componente de IA social). |
| **C. Experiencia del Residente** | Student Experience App, Every Student (StuRents), Lavanda | Referentes para marca blanca y experiencia móvil orientada al estudiante. |
| **D. Legacy Enterprise** | StarRez, eRezLife, RentCafe (Yardi), RoomChoice | Validación de mercado y “benchmark negativo” sobre qué evitar (UX, complejidad e implantaciones largas). |
| **E. Referentes Multi-Propiedad** | TheHouseMonk, Studentpad, Erasmus Play | Referentes para la “Vista Nexus” (gestión multi-residencia) y procesos de *onboarding*. |

---

## 4. Análisis Profundo por Segmento

### 4.1. Bloque Operativo: Gestión de Incidencias y Procesos

#### Arthur Online

| Dimensión | Evaluación |
|-----------|------------|
| **Propuesta de Valor Declarada** | *Property management* simplificado para gestores en Reino Unido |
| **Propuesta de Valor Real** | Sistema de *ticketing* sólido, con asignación a proveedores externos y seguimiento de tiempos. |
| **Justificación Estratégica** | Benchmark directo para nuestro módulo de incidencias y referencia técnica para diseñar un flujo de gestión y seguimiento sólido, especialmente en la asignación a proveedores y el control de tiempos. |
| **Feature Gap (vs Nosotros)** | ✅ Incluye integración con contratistas, automatización de órdenes e historial de costes. ❌ No incorpora priorización con IA, comunicación bidireccional ni gamificación del reporte. |
| **Análisis Técnico** | Stack moderno (React + Node.js) y API REST documentada. UX funcional, pero enfocada al gestor y no al residente; enfoque *desktop-first* y móvil secundario. |
| **Pricing Estimado** | £45-150/mes según propiedades |

**Oportunidad:** Arthur cubre bien la operativa para el gestor, pero deja fuera al estudiante. La diferenciación pasa por ofrecer transparencia y comunicación bidireccional al residente.

---

#### Housing.Cloud

| Dimensión | Evaluación |
|-----------|------------|
| **Propuesta de Valor Declarada** | Gestión *all-in-one* para residencias estudiantiles. |
| **Propuesta de Valor Real** | Plataforma *cloud* que centraliza gestión básica de contratos, pagos y comunicación. |
| **Justificación Estratégica** | **Amenaza directa más relevante**, por cercanía de posicionamiento. Requiere diferenciación clara. |
| **Feature Gap (vs Nosotros)** | ✅ Ofrece onboarding digital, gestión de contratos, portal de pagos y app móvil. ❌ No incluye matching con IA (solo manual), incidencias avanzadas ni marca blanca profunda. |
| **Análisis Técnico** | Arquitectura moderna (AWS, microservicios). UX aceptable pero genérica. App móvil con 3,8★ en App Store, con críticas relacionadas con bugs y rendimiento. |
| **Pricing Estimado** | $8-12/cama/mes |

**Oportunidad:** Si la ejecución móvil es mejorable, hay margen para competir con una UX superior y un diferencial claro en IA social.

---

#### Crib

| Dimensión | Evaluación |
|-----------|------------|
| **Propuesta de Valor Declarada** | Automatización del ciclo de vida del inquilino |
| **Propuesta de Valor Real** | Flujo de *check-in/check-out* digital con firma electrónica y verificación de identidad |
| **Justificación Estratégica** | Referente para procesos de *onboarding/offboarding*; solución *best-in-class* en un flujo muy concreto. |
| **Feature Gap (vs Nosotros)** | ✅ Incluye verificación de identidad (KYC), firma electrónica e inventario digital con fotos. ❌ No cubre comunidad post check-in, incidencias ni componente social. |
| **Análisis Técnico** | Producto muy pulido dentro de un alcance acotado, con integraciones (p. ej., Stripe, DocuSign) y enfoque mobile-first. |
| **Pricing Estimado** | £15-25 por transacción |

**Oportunidad:** Igualar su estándar alto de UX en el *onboarding*, integrándolo dentro de una plataforma completa.

---

#### Witco

| Dimensión | Evaluación |
|-----------|------------|
| **Propuesta de Valor Declarada** | Plataforma de experiencia *workplace* adaptada a edificios residenciales. |
| **Propuesta de Valor Real** | Gestión de amenities, reservas de espacios y comunicación push |
| **Justificación Estratégica** | *Benchmark* para reservas de espacios comunes y referencia en UX de booking. |
| **Feature Gap (vs Nosotros)** | ✅ Incluye reservas con control de aforo en tiempo real, integración con control de accesos y analítica de uso. ❌ No está orientado al contexto estudiantil (exámenes, horarios), ni incorpora gestión de comedor o reserva de objetos. |
| **Análisis Técnico** | Stack moderno (React Native), UX limpia y API documentada para integraciones. |
| **Pricing Estimado** | €3-8/usuario/mes |

**Oportunidad:** Witco es una solución generalista. La ventaja está en especializarse en residencias estudiantiles y ampliar el alcance con reserva de objetos compartidos.

---

### 4.2. Bloque Social: Matching y Convivencia

#### RoomSync

| Dimensión | Evaluación |
|-----------|------------|
| **Propuesta de Valor Declarada** | Plataforma de *roommate matching* mediante perfil social |
| **Propuesta de Valor Real** | Algoritmo de emparejamiento *pre-arrival* con integración de redes sociales |
| **Justificación Estratégica** | **Competidor directo** en el diferencial de *matching*; referente actual en este nicho. |
| **Feature Gap (vs Nosotros)** | ✅ Dispone de algoritmo consolidado (afirma un 95% de satisfacción), integración con Facebook/Instagram y proceso *pre-arrival*. ❌ No ofrece funcionalidades más allá del emparejamiento inicial: es una solución puntual *(point-solution)*, no una plataforma integral. |
| **Análisis Técnico** | Enfoque *mobile-first*, con UX tipo *dating app* (swipe, chat). |
| **Pricing Estimado** | $2-5/estudiante por ciclo |

**Oportunidad:** RoomSync es un benchmark a superar. Nuestra ventaja es integrar el *matching* dentro de una plataforma completa y ampliar el valor con IA que aprende y actúa ante conflictos *post-matching*.

---

#### Roompact

| Dimensión | Evaluación |
|-----------|------------|
| **Propuesta de Valor Declarada** | Student success through intentional residential experiences |
| **Propuesta de Valor Real** | Herramientas para equipos de *ResLife* (principalmente en EE. UU.) enfocadas en *learning outcomes*. |
| **Justificación Estratégica** | **Competidor más alineado a nivel conceptual:** valida que existe mercado para vender “experiencia residencial”, no solo gestión de plazas. |
| **Feature Gap (vs Nosotros)** | ✅ Incluye seguimiento de learning outcomes, herramientas de construcción de comunidad y evaluación de bienestar. ❌ No cubre operativa de residencia (incidencias, mantenimiento), ni matching con IA, ni marca blanca. |
| **Análisis Técnico** |UX funcional pero de estilo “institucional”, orientada al *staff* más que al uso voluntario por parte del estudiante. |
| **Pricing Estimado** | $10-20k/año (enterprise) |

**Oportunidad:** Roompact sugiere que las universidades pagan por “éxito del residente”. La oportunidad es combinar esa filosofía con operativa real y una UX más atractiva para el estudiante.

---

#### COHO

| Dimensión | Evaluación |
|-----------|------------|
| **Propuesta de Valor Declarada** | Operating system for shared living |
| **Propuesta de Valor Real** | Gestión de vida compartida: cocina, limpieza, objetos comunes y reparto de gastos |
| **Justificación Estratégica** | Referente para dinámicas de convivencia y gestión de espacios compartidos. |
| **Feature Gap (vs Nosotros)** | ✅ Ofrece calendario de uso de cocina, rotación de limpieza con gamificación, inventario básico y reparto de gastos. ❌ No está pensado para gestión institucional, ni para escalar a residencias grandes, ni incorpora matching con IA. |
| **Análisis Técnico** | App móvil pulida y de diseño moderno, orientada a coliving pequeño (5–20 personas). |
| **Pricing Estimado** | €3-5/usuario/mes |

**Oportunidad:** COHO resuelve “la vida del piso”, pero no escala a una residencia con estructura y procesos. Se pueden trasladar aprendizajes puntuales al contexto de mayor escala.

---

#### Spaceflow

| Dimensión | Evaluación |
|-----------|------------|
| **Propuesta de Valor Declarada** | Tenant experience platform |
| **Propuesta de Valor Real** | Construcción de comunidad mediante eventos, social feed y servicios compartidos. |
| **Justificación Estratégica** | **Mejor ejemplo de dinamización y gamificación de comunidad**; referente para aumentar *engagement*. |
| **Feature Gap (vs Nosotros)** | ✅ Incluye eventos con RSVP/*waitlist*, social feed tipo red social interna y *marketplace* de servicios. ❌ No está especializado en residencias estudiantiles, ni cubre operativa, ni incorpora *matching*. |
| **Análisis Técnico** | UX muy cuidada y enfoque “consumer app”. React Native, arquitectura moderna y analítica sólida para *community managers*. |
| **Pricing Estimado** | €4-10/unidad/mes |

**Oportunidad:** Spaceflow es un buen modelo para *engagement* social. El reto es adaptar ese enfoque al contexto estudiantil y conectarlo con la operativa de residencia.

---

### 4.3. Bloque Legacy: Gigantes del Mercado

#### StarRez

| Dimensión | Evaluación |
|-----------|------------|
| **Propuesta de Valor** | Complete student housing management |
| **Realidad** | Líder global en grandes universidades (se indica >2M camas gestionadas). |
| **Justificación Estratégica** | **Principal benchmark negativo:** las debilidades percibidas en su enfoque abren espacio para una alternativa más moderna y ágil. |
| **Feature Gap (vs Nosotros)** | ✅ Destaca en escalabilidad, integraciones con sistemas académicos (SIS) y compliance. ❌ No ofrece una UX moderna, una experiencia móvil sólida, componentes sociales, ni flexibilidad orientada al segmento medio. |
| **Análisis Técnico** | Monolito *legacy* en .NET. Implantaciones típicas de 6–12 meses y costes estimados de $100k–500k, con una curva de aprendizaje elevada. |
| **Pricing Estimado** | >$50k/año |

**Oportunidad:** StarRez es muy fuerte en entornos de gran escala, pero su propuesta parece menos adecuada para el mercado medio. Su UX y complejidad de implantación son un punto claro para diferenciación.
---

#### RentCafe Student Housing (Yardi)

| Dimensión | Evaluación |
|-----------|------------|
| **Propuesta de Valor** | Módulo de Yardi Voyager adaptado a *student housing* |
| **Realidad** | Solución con foco financiero-contable, a la que se le añade una capa para alojamiento de estudiantes. |
| **Justificación Estratégica** | Referencia de lo que conviene evitar: un “ERP adaptado” puede terminar priorizando necesidades financieras frente a la experiencia del residente. |
| **Feature Gap (vs Nosotros)** | ✅ Aporta alta robustez financiera y reporting corporativo. ❌ No incorpora elementos orientados a la experiencia estudiantil. |
| **Análisis Técnico** | Stack propietario *legacy*. Implantaciones estimadas de 6–18 meses. UX enfocada a perfiles financieros (p. ej., CFO). |
| **Pricing Estimado** | $50-200k/año |

**Oportunidad:** Por su enfoque, Yardi no compite en UX ni en experiencia de residente. El posicionamiento natural es una alternativa moderna para residencias que no necesitan un ERP financiero completo.

---

### 4.4. Bloque Multi-Propiedad

#### TheHouseMonk

| Dimensión | Evaluación |
|-----------|------------|
| **Propuesta de Valor** | Property management for co-living and student housing |
| **Realidad** | *Dashboard* multi-propiedad orientado a gestoras, con visión agregada por sede. |
| **Justificación Estratégica** | Referente para la “Vista Nexus”: un panel similar a lo que buscamos para la supervisión centralizada a nivel corporativo. |
| **Feature Gap (vs Nosotros)** | ✅ Incluye *dashboard* multi-propiedad, métricas agregadas y gestión centralizada. ❌ No destaca por una app de estudiante completa, ni por **matching* con IA, ni por un componente de comunidad social. |
| **Análisis Técnico** | Interfaz de administración correcta. App móvil para residentes básica (3,5★). Enfoque *cloud-native*. |
| **Pricing Estimado** | $5-15/cama/mes |

**Oportunidad:** Su principal punto débil parece estar en la experiencia del residente en móvil; existe margen para diferenciarnos con una app más completa y orientada al estudiante.
---

## 5. Matriz Comparativa Consolidada

### 5.1. Comparativa de Funcionalidades Core

| Competidor | Incidencias Avanzadas | Matching IA | Marca Blanca | Reservas Espacios | Reservas Objetos | Comunidad Social | Analítica Social | UX Mobile |
|------------|:---------------------:|:-----------:|:------------:|:-----------------:|:----------------:|:----------------:|:----------------:|:---------:|
| **Nuestra Propuesta** | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 |
| Arthur Online | 🟢 | 🔴 | 🔴 | 🔴 | 🔴 | 🔴 | 🔴 | 🟡 |
| Housing.Cloud | 🟡 | 🔴 | 🟡 | 🟡 | 🔴 | 🟡 | 🔴 | 🟡 |
| Crib | 🔴 | 🔴 | 🟡 | 🔴 | 🔴 | 🔴 | 🔴 | 🟢 |
| Witco | 🟡 | 🔴 | 🟡 | 🟢 | 🔴 | 🟡 | 🔴 | 🟢 |
| Roompact | 🔴 | 🟡 | 🔴 | 🔴 | 🔴 | 🟢 | 🟡 | 🟡 |
| RoomSync | 🔴 | 🟢 | 🔴 | 🔴 | 🔴 | 🟡 | 🔴 | 🟢 |
| COHO | 🔴 | 🔴 | 🔴 | 🟢 | 🟡 | 🟢 | 🔴 | 🟢 |
| Spaceflow | 🔴 | 🔴 | 🟡 | 🟢 | 🔴 | 🟢 | 🔴 | 🟢 |
| Student Exp. App | 🟡 | 🔴 | 🟢 | 🟡 | 🔴 | 🟡 | 🔴 | 🟡 |
| StarRez | 🟢 | 🟡 | 🔴 | 🟡 | 🔴 | 🔴 | 🔴 | 🔴 |
| Yardi Student | 🟢 | 🔴 | 🔴 | 🔴 | 🔴 | 🔴 | 🔴 | 🔴 |
| TheHouseMonk | 🟡 | 🔴 | 🟡 | 🟡 | 🔴 | 🔴 | 🔴 | 🟡 |

**Leyenda:** 🟢 Completo/Diferencial | 🟡 Básico/Limitado | 🔴 Inexistente/Deficiente

---

### 5.2. Análisis de Cobertura

| Funcionalidad | Competidores que la ofrecen | Gap de Mercado |
|---------------|:---------------------------:|----------------|
| Incidencias básicas | 8/13 (62%) | Bajo |
| Incidencias con IA/transparencia | 0/13 (0%) | **Crítico** |
| Matching pre-arrival | 2/13 (15%) | Medio |
| Matching + seguimiento post | 0/13 (0%) | **Crítico** |
| Reserva de espacios | 5/13 (38%) | Bajo |
| Reserva de objetos | 0/13 (0%) | **Alto** |
| Comunidad/eventos | 4/13 (31%) | Medio |
| Analítica social | 0/13 (0%) | **Crítico** |
| Marca blanca profunda | 1/13 (8%) parcial | **Alto** |
| UX Gen-Z optimizada | 4/13 (31%) | Medio |

---

## 6. Oportunidades de Mercado

### 6.1. Gaps Estructurales Identificados

#### Gap 1: Integración vertical completa

**Situación actual:** La mayoría de competidores se especializa en capas concretas (Arthur en incidencias, RoomSync en *matching*, Spaceflow en comunidad). No se observa una solución que integre en un único producto la gestión operativa, la experiencia social y el uso de inteligencia artificial.

**Oportunidad:** Posicionarse como la primera plataforma verticalmente integrada para residencias estudiantiles.

**Validación:** Housing.Cloud apunta a una integración similar, pero presenta limitaciones en varias capas (app 3,8★, sin IA y marca blanca limitada).

---

#### Gap 2: Mercado hispanohablante

**Situación actual:** La mayoría de competidores analizados opera principalmente en mercados anglosajones (UK/US). En España, se identifica presencia de Convivo App y Platuni, con funcionalidades más limitadas.

**Oportunidad:** Desarrollar una solución integral diseñada desde España para el mercado hispanohablante (España y Latinoamérica).

**Validación:** Se estima que existen aproximadamente 500 residencias universitarias en España, y que muchas operan con herramientas poco integradas como WhatsApp y hojas de cálculo.

---

#### Gap 3: Segmento medio desatendido

**Situación actual:**

* **StarRez/Yardi:** orientados a grandes operadores (>500–1.000 camas), con precios *enterprise* (>$50k/año).
* **Soluciones básicas:** enfocadas en *landlords* individuales o escalas muy pequeñas (5–20 camas).

**Oportunidad:** Residencias privadas de 100–400 camas sin una solución claramente ajustada a su escala.

**Validación:** Kinetic sugiere que existe demanda en el mercado medio, pero su UX anticuada deja margen para una propuesta más moderna.

---

### 6.2. Recomendaciones de posicionamiento

| Dimensión                            | Recomendación                                                                                                   |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| **Nicho inicial**                    | Residencias privadas de 100–400 camas en España.                                                                |
| **Feature MVP diferencial**          | *Matching* con IA + transparencia en incidencias (los *gaps* más claros).                                       |
| **Pricing sugerido**                 | €8–12 por cama/mes (plan base), por debajo de Housing.Cloud.                                                    |
| **Go-to-market**                     | Piloto con 3–5 residencias → caso de éxito documentado → expansión a gestoras multi-residencia → salto a Latam. |
| **Diferenciación vs. Housing.Cloud** | “Ellos digitalizan la gestión; nosotros mejoramos la convivencia”.                                              |

---

### 6.3. Matriz de riesgos

| Riesgo                                            | Probabilidad | Impacto | Mitigación                                                 |
| ------------------------------------------------- | :----------: | :-----: | ---------------------------------------------------------- |
| Housing.Cloud mejora su producto                  |     Media    |   Alto  | Acelerar la ejecución en IA y UX.                          |
| RoomSync evoluciona hacia una plataforma completa |     Baja     |   Alto  | Reforzar la integración vertical, más difícil de replicar. |
| Entrada de un nuevo actor bien financiado         |     Media    |   Alto  | Consolidar primero el mercado hispanohablante.             |
| Resistencia al cambio en residencias              |     Alta     |  Medio  | Onboarding asistido y migración sin fricción.              |
| Complejidad técnica de la IA de convivencia       |     Media    |   Alto  | Desarrollo incremental y validación temprana.              |


---

## 7. Modelo de negocio

NexUS se plantea como una solución **SaaS (Software as a Service) B2B**. El cliente principal —quien financia el servicio— es la entidad gestora de la residencia. Los usuarios finales (estudiantes y personal) acceden a la plataforma sin coste directo, centralizando la operativa en un único ecosistema digital.

---

### 7.1. Estrategia de monetización

El modelo de ingresos se basa en un pago recurrente por parte de la residencia, escalado según el número de estudiantes, de forma que el coste se mantiene proporcional al tamaño del centro. Se estructura en dos niveles:

**A. Plan Base (operativo):**
Incluye las funcionalidades mínimas e imprescindibles para digitalizar la gestión diaria de la residencia.

* **Gestión de inventario:** control de estudiantes y habitaciones.
* **Seguridad:** roles y permisos.
* **Operativa básica:** incidencias simples, reservas básicas de espacios y comunicación institucional.
* **Infraestructura:** despliegue en la nube y mantenimiento incluido.

**B. Plan Premium (estratégico):**
Dirigido a residencias que buscan diferenciarse mediante automatización avanzada, analítica y personalización de marca.

* **Diferenciación:** módulos de vida social, convivencia y *matching* con IA.
* **Profesionalización:** *onboarding* digital completo, marca blanca y soporte prioritario.
* **Inteligencia de negocio:** analítica avanzada e informes exportables para apoyar la toma de decisiones.


---

### 7.2. Matriz de Suscripción

| Categoría | Plan Base (Operativo) | Plan Premium (Estratégico) |
|---------|-------------------|-------------------|
| Gestión de estudiantes y habitaciones | 🟢 Incluido | 🟢 Incluido |
| Roles y permisos | 🟢 Incluido | 🟢 Incluido |
| Gestión de incidencias | 🟡 Básica | 🟢 Avanzada |
| Panel de administración | 🟢 Incluido | 🟢 Incluido |
| Reservas de espacios | 🟡 Básicas | 🟢 Avanzadas |
| Comunicación institucional | Avisos oficiales | Avisos, FAQ y Buzón privado |
| Vida social y convivencia | 🔴 No incluido | 🟢 Incluido  |
| Onboarding / Offboarding | 🟡 Básico | 🟢 Completo |
| Analítica y Reportes | 🟡 Básica | 🟢 Avanzada + Exportación |
| Marca blanca (Personalización) | 🔴 No incluido | 🟢 Incluido |
| Soporte técnico | Estándar | Prioritario |

---

### 7.3. Propuesta de valor económica

**Escalabilidad:** El modelo de cobro por plaza/estudiante permite que el software sea viable tanto para Colegios Mayores pequeños como para grandes residencias privadas.

**Reducción de costes indirectos:** La automatización de flujos operativos (incidencias, reservas y comedor) reduce la carga administrativa del personal y facilita una gestión más eficiente con menos recursos.

**Retención del residente:** El foco en convivencia y bienestar (Plan Premium) puede actuar como barrera de salida y favorecer una mayor tasa de renovación anual.

---

## 8. Conclusiones y recomendaciones

### 8.1. Síntesis del análisis

El mercado de software para residencias estudiantiles presenta, de forma general, los siguientes rasgos:

1. **Fragmentación significativa:** los competidores tienden a cubrir capas aisladas, sin una solución integral.
2. **Predominio de soluciones *legacy*:** los líderes (StarRez, Yardi) combinan una UX anticuada con precios *enterprise* que dejan fuera al mercado medio.
3. **Gaps críticos sin cobertura directa:** no se observa competencia directa en IA de convivencia *post-matching*, transparencia bidireccional de incidencias, reserva de objetos y analítica social.
4. **Mercado hispanohablante poco atendido:** existe margen para un posicionamiento geográfico con competencia limitada.

---

### 8.2. Ventajas competitivas defendibles

| Ventaja                           | Defensibilidad | Tiempo de replicación estimado                |
| --------------------------------- | :------------: | --------------------------------------------- |
| IA de convivencia *post-matching* |      Alta      | 18–24 meses (requiere datos de entrenamiento) |
| Integración vertical completa     |   Media-alta   | 12–18 meses                                   |
| Especialización hispanohablante   |      Media     | 6–12 meses                                    |
| UX optimizada para Gen Z          |      Media     | 6–12 meses                                    |
| Marca blanca profunda             |      Media     | 6–9 meses                                     |

---

### 8.3. Recomendaciones finales

1. **Priorizar un MVP con funcionalidades realmente diferenciales:** centrar el desarrollo inicial en IA de convivencia y transparencia de incidencias (los *gaps* más claros).
2. **Acelerar la entrada en el mercado hispanohablante:** aprovechar la ventana de oportunidad antes de una posible expansión de competidores anglosajones.
3. **Construir un caso de éxito temprano:** un piloto con 3–5 residencias puede aportar evidencia y credibilidad para escalar.
4. **Monitorizar Housing.Cloud de forma continua:** es el competidor más cercano en propuesta general.
5. **No competir en funcionalidades comoditizadas:** evitar invertir de forma desproporcionada en incidencias básicas o reservas de espacios, donde ya existen alternativas sólidas.

---

**Clasificación del documento:** uso interno — planificación estratégica
**Próxima revisión recomendada:** trimestral o ante cambios significativos en el mercado


---
