# Análisis de Competidores – NexUS

<p align="center">
  <img src="../images/logo-app.jpeg" alt="Portada" width="700">
</p>


**Grupo:** 11  
**Proyecto:** NexUS  
**Fecha:** 02/02/2026  
**Asignatura:** ISPP  
**Institución:** ETSII, Universidad de Sevilla


<p align="center">
  <img src="../images/logo-etsii.jpe" alt="Portada" width="300">
</p>


## Índice

1. [Resumen y Propuesta](#resumen-y-propuesta)
2. [Análisis de la Competencia](#análisis-de-la-competencia)
3. [Comparativa de Funcionalidades](#comparativa-de-funcionalidades)
4. [Análisis](#análisis)
5. [Conclusiones y estrategias](#conclusiones-y-estrategias)

---

## Resumen y Propuesta

En este apartado se presenta una visión general del proyecto **NexUS**, junto con la propuesta de valor principal frente a las soluciones competidoras existentes en el mercado.


## Análisis de la Competencia

Se analizan los principales competidores de NexUS, identificando sus puntos fuertes, debilidades y el posicionamiento que ocupan actualmente.

### VecinosEnRed

#### 1. Propósito y Visión

* **Propósito:** Proveer una herramienta SaaS (*Software as a Service*) enfocada casi exclusivamente en la gestión administrativa y contable de las fincas. Su objetivo principal es digitalizar la burocracia del Administrador de Fincas, relegando al propietario a un rol pasivo.
* **Visión:** Convertirse en la herramienta de trabajo esencial para el despacho del administrador (ERP), permitiendo llevar la contabilidad, el control de morosos y la gestión documental desde la nube.
* **Diferenciador Estratégico:** Se posicionan como un software de "Dato Duro" (cuentas, remesas, balances) frente a las soluciones de comunidad social.

#### 2. Features (Funcionalidades Clave)

**A. Gestión Administrativa y Contable (Core del negocio)**
* **Control Financiero Robusto:** Gestión avanzada de múltiples cuentas bancarias, cajas, control de ingresos/gastos y generación de informes de estados financieros.
* **Gestión de Cobros:** Automatización de cuotas, seguimiento de morosidad y generación de adeudos bancarios.
* **Gestión Documental Estática:** Repositorio centralizado donde el administrador sube facturas, actas y pólizas en PDF para descarga.

**B. Operativa y Mantenimiento**
* **Ticket de Incidencias:** Sistema básico de alta de incidencias donde el usuario reporta y visualiza el historial, pero la gestión resolutiva es manual.
* **Reserva de Instalaciones:** Calendario de ocupación para zonas comunes (pistas de tenis, salas) con gestión de costes si aplica.

**C. Comunicación y Comunidad**
* **Tablón de Anuncios Unidireccional:** Canal vertical (Admin $\to$ Vecino) para noticias oficiales. No fomenta la conversación horizontal.
* **Portal del Propietario:** Espacio web y móvil de consulta de datos (no de interacción social).

#### 3. Mercado que atacan

* **Administradores de Fincas (B2B):** Es su cliente principal y quien toma la decisión de compra. La herramienta optimiza el despacho, no el hogar.
* **Comunidades Medianas/Grandes:** Su modelo de precios por volumen de propiedades las orienta a comunidades con presupuesto para software de gestión.
* **Geografía:** Exclusivamente España, adaptado a la Ley de Propiedad Horizontal y normativas contables locales.

#### 4. Análisis de UX/UI

* **Branding:** Institucional y sobrio. Transmite seriedad burocrática pero carece de cercanía o modernidad.
* **Tecnología:** Percibida como "Software Legacy". Las aplicaciones móviles son *Web Views* (encapsulados del navegador), ofreciendo una experiencia de navegación lenta y poco fluida.
* **Usabilidad:** Interfaz densa basada en tablas de datos. Criticada por usuarios finales por ser "básica, poco atractiva" y no estar diseñada bajo el paradigma *mobile-first*.

#### 5. Tabla Comparativa y Oportunidades

* **Comparativa Estratégica: VecinosEnRed vs. NexUS**

| Característica | VecinosEnRed (Competencia) | NexUS (Nuestra Propuesta) |
| :--- | :--- | :--- |
| **Modelo de Negocio** | **Freemium Limitado:** Gratis solo hasta 5 vecinos (inviable). Pago por tramos de propiedades. | **100% Gratuito:** Sin límite de usuarios, eliminando la barrera económica de entrada. |
| **Inteligencia Artificial** | **Nula:** Procesos manuales y gestión de datos estática. | **IA Generativa:** Resumen automático de actas, extracción de tareas y votaciones asistidas. |
| **Enfoque de Gestión** | **Reactiva/Administrativa:** Contabilidad y registro de tickets. | **Proactiva/Preventiva:** Mantenimiento conectado a seguros y avisos automáticos. |
| **Experiencia de Usuario** | **Legacy/Web Wrapper:** Interfaz antigua, lenta y poco atractiva. | **Nativa & Inclusiva:** UX moderna y **Modo Vecino Mayor** adaptado a la brecha digital. |
| **Paquetería** | No contemplado. | **Sistema P2P:** Red de vecinos receptores para solucionar el problema del e-commerce. |

#### 6. Puntos débiles explotables

Tras analizar su modelo y el feedback de sus usuarios, se identifican las siguientes áreas críticas donde NexUS tiene ventaja competitiva:

1.  **La "Trampa" del Precio:** VecinosEnRed utiliza un modelo *Freemium* engañoso con un límite de 5 propietarios, haciendo inviable su uso gratuito en comunidades reales. NexUS, al ser 100% gratuito, elimina la barrera de entrada económica.
2.  **Tecnología Obsoleta (Deuda Técnica):** La competencia sufre de una arquitectura antigua y una app lenta. NexUS, con un stack moderno, ofrece una fluidez y estética superior.
3.  **Gestión de la Soledad vs. Comunidad:** VecinosEnRed trata a los vecinos como apuntes contables. NexUS ataca la necesidad emocional mediante *Afinidades* y *Red de Ayudas*.
4.  **Burocracia vs. Automatización (Factor IA):** Mientras ellos ofrecen un repositorio de PDFs (Actas), NexUS ofrece un asistente que lee y resume el contenido automáticamente, ahorrando tiempo real.
5.  **Exclusión Demográfica:** Su interfaz compleja ignora a la tercera edad. El *Modo Vecino Mayor* de NexUS asegura la inclusión digital de todo el edificio.

#### 7. Modelo de Negocio (Observado)

* **SaaS por Niveles (Tiered Pricing):** Tarifas escalonadas (Medium 90€/año, Enterprise 190€/año).
* **Upselling:** Cobro de suplementos por paquetes de propietarios adicionales.
* **Soporte:** Servicios de soporte telefónico o premium cobrados aparte.


## Comparativa de Funcionalidades

Tabla comparativa de funcionalidades clave entre NexUS y las soluciones competidoras, destacando aquellas características diferenciales.


## Análisis

Evaluación crítica de los resultados obtenidos en la comparativa, considerando factores técnicos, funcionales y estratégicos.


## Conclusiones y estrategias

Conclusiones finales del análisis de competidores y definición de estrategias recomendadas para el desarrollo y posicionamiento del proyecto NexUS.

---
