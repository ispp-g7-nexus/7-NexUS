# Análisis de Competidores – NexUS

<p align="center">
  <img src="../images/logo-app.jpeg" alt="Portada" width="700">
</p>


**Grupo:** B-Tarde 
**Proyecto:** NexUS  
**Fecha:** 02/02/2026  
**Asignatura:** ISPP  
**Institución:** ETSII, Universidad de Sevilla


<p align="center">
  <img src="../images/logo-etsii.jpe" alt="Portada" width="400">
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
| **Inteligencia Artificial** | **Nula:** Procesos manuales y gestión de datos estática. | **IA Generativa:** Resumen automático de actas, extracción de tareas y votaciones asistidas. |
| **Enfoque de Gestión** | **Reactiva/Administrativa:** Contabilidad y registro de tickets. | **Proactiva/Preventiva:** Mantenimiento conectado a seguros y avisos automáticos. |
| **Experiencia de Usuario** | **Legacy/Web Wrapper:** Interfaz antigua, lenta y poco atractiva. | **Inclusiva:** UX moderna y **Modo Vecino Mayor** adaptado a la brecha digital. |
| **Paquetería** | No contemplado. | **Sistema P2P:** Red de vecinos receptores para solucionar el problema del e-commerce. |

#### 6. Puntos débiles explotables

Tras analizar su modelo y el feedback de sus usuarios, se identifican las siguientes áreas críticas donde NexUS tiene ventaja competitiva:

1.  **Tecnología Obsoleta (Deuda Técnica):** La competencia sufre de una arquitectura antigua y una app lenta. NexUS, con un stack moderno, ofrece una fluidez y estética superior.
2.  **Gestión de la Soledad vs. Comunidad:** VecinosEnRed trata a los vecinos como apuntes contables. NexUS ataca la necesidad emocional mediante *Afinidades* y *Red de Ayudas*.
3.  **Burocracia vs. Automatización (Factor IA):** Mientras ellos ofrecen un repositorio de PDFs (Actas), NexUS ofrece un asistente que lee y resume el contenido automáticamente, ahorrando tiempo real.
4.  **Exclusión Demográfica:** Su interfaz compleja ignora a la tercera edad. El *Modo Vecino Mayor* de NexUS asegura la inclusión digital de todo el edificio.

#### 7. Modelo de Negocio (Observado)

* **SaaS por Niveles (Tiered Pricing):** Tarifas escalonadas (Medium 90€/año, Enterprise 190€/año).
* **Upselling:** Cobro de suplementos por paquetes de propietarios adicionales.
* **Soporte:** Servicios de soporte telefónico o premium cobrados aparte.
---
### TusVecinos

**TusVecinos** es una plataforma para comunidades de propietarios que centraliza en una sola app la comunicación (avisos y tablón), la operativa diaria (incidencias y reservas), la toma de decisiones (votaciones/encuestas), la documentación y los pagos. Ofrece acceso móvil y web, con planes por vivienda y opciones de personalización según las necesidades de cada comunidad.

#### 1. Features (Funcionalidades Clave)

**A. Gestión de Incidencias y Operaciones**

* **Incidencias:** reporta problemas desde la app e incluye el seguimiento de su evolución mediante actualizaciones y notificaciones.
* **Reservas de zonas comunes:** disponibilidad en tiempo real y confirmación inmediata para evitar solapaminetos.
* **Reglas de reserva configurables:** límites por vivienda, horarios, condiciones de uso y restricciones definidas por la comunidad.
* **Control de morosidad vinculado a reservas (declarado):** se menciona el uso de pagos y restricciones para reducir impagos en el uso de instalaciones.
* **Gestión documental:** repositorio digital para actas y documentación de la comunidad, accesible desde cualquier lugar.
* **Acceso multiplataforma:** incluyen acceso desde móvil y opciones web para vecinos y para administradores (según su oferta comercial).

**B. Comunicación y Gobernanza**

* **Avisos y noticias:** canal de comunicación oficial con notificaciones al móvil para informar a toda la comunidad.
* **Tablón de anuncios:** espacio moderado para propuestas, dudas y comunicaciones entre vecinos, como alternativa a canales no oficiales.
* **Votaciones y encuestas:** votación telemática con recuento automatizado y resultados centralizados.
* **Trazabilidad del proceso de voto (declarada):** comunican verificabilidad y "validez legal", sin detallar el mecanismo técnico-jurídico.
* **Permisos y solicitudes:** contemplan flujos de solicitud de permisos al administrador/presidencia (p. ej., usos extraordinarios en el edificio).

**C. Integraciones, Accesos y Servicios Complementarios**

* **Pagos en la app:** módulo de pagos para cuotas, derramas y otros conceptos; lo presentan como funcionalidad transversal.
* **Pagos como módulo independiente (tarifas):** declaran que puede activarse o desactivarse sin alterar el plan contratado.
* **Domótica:** integración con sistemas domóticos mediante API.
* **Diferenciación de perfiles:** contemplan diferencias entre propietario e inquilino (especialmente para el acceso a documentación).
* **Onboarding guiado:** alta de vecinos mediante identificación por vivienda (p. ej., mecanismo QR indicado en su proceso de instalación).

#### 2. Mercado que atacan

1. **Presidentes y juntas de gobierno:** buscan reducir carga operativa (comunicaciones, incidencias, reservas) y disminuir conflictos por falta de información.
2. **Propietarios e inquilinos:** priorizan comodidad, transparencia y acceso a documentación y decisiones sin desplazamientos.
3. **Administradores de fincas:** aunque el discurso es "orientado al vecino", el producto incluye panel y flujos para gestión/operación de la comunidad.
4. **Segmento por tamaño:** planes estándar para comunidades pequeñas/medias y condiciones especiales para comunidades grandes (venta más consultiva).

#### 3. Análisis de UX/UI

* **Enfoque operativo y directo:** el discurso se centra en "hacer tareas" (reservar, reportar, consultar documentos, votar) con pocos pasos.
* **Notificaciones como elemento de control:** los avisos e incidencias se apoyan en notificaciones para reducir la necesidad de llamadas o insistencia.
* **Reducción de fricción en reservas:** la propuesta enfatiza disponibilidad en tiempo real y reglas explícitas para evitar conflictos.
* **Estrategia de adopción basada en puesta en marcha:** comunican instalación/configuración guiada y registro por vivienda, lo que reduce barrera inicial.
* **Accesibilidad declarada:** presentan la interfaz como sencilla, pero no hay evidencia pública de un modo "senior" específico comparable a NexUS.

#### 4. Tabla Comparativa y Oportunidades

* **Comparativa Estratégica: TusVecinos vs. NexUS**

| Característica                    | TusVecinos (Competencia)                                                                                          | NexUS                                                                                             |
| :-------------------------------- | :---------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------ |
| **Inteligencia Artificial**       | No se emplea un motor de IA para actas o decisiones; está enfocada en la digitalización y centralización.               | **IA de actas:** resumen automático y extracción de tareas/decisiones desde documentos.           |
| **Gestión de Incidencias**        | **Reactiva:** reporte y seguimiento con notificaciones; no incluye automatización hacia seguro o prevención. | **Proactiva:** mantenimiento preventivo + conexión directa a seguro y alertas automatizadas.      |
| **Finanzas y Pagos**              | Módulo de pagos integrado y "activable/desactivable" según tarifas; sin detalle de conciliación avanzada.         | Enfoque en transparencia y reducción de conflictos; posible evolución a integraciones y métricas. |
| **Logística Urbana (Paquetería)** | La incluyen en planes, pero no se detalla públicamente el flujo completo y responsabilidades.                     | **Paquetería P2P:** "vecino receptor" como gancho diario con trazabilidad y reglas comunitarias.  |
| **Cohesión Social**               | Tablón moderado y comunicación horizontal básica.                                                                 | **Red de ayudas gamificada (+1)** y mecanismos de convivencia para generar hábito de uso.         |
| **Inclusión Digital**             | Accesibilidad declarada; no se evidencia un modo senior explícito.                                                | **Modo Vecino Mayor:** interfaz adaptada a todos los usuarios, lenguaje humano.                      |
| **Conexión Vecinal**              | Comunidad organizada por tablón y comunicaciones; no se evidencia segmentación por intereses.                     | **Afinidades:** recomendación y segmentación por hobbies o intereses para conectar vecinos.         |
| **Reservas**                      | Potentes: reglas y disponibilidad en tiempo real; foco en evitar conflictos de uso.                               | Reservas con UX cuidada + capa social (afinidades) para elevar participación y convivencia.       |

#### 5. Puntos débiles explotables

Tras analizar su propuesta pública, estos son puntos donde NexUS puede ganar ventaja clara:

1.  **Diferenciación insuficiente en "comprensión" de documentos:** TusVecinos ofrece repositorio documental, pero no una automatización real para convertir actas en información accionable. NexUS, con la IA de actas, reduce tiempo de lectura y aumenta transparencia al convertir acuerdos en tareas y próximos pasos.
2.  **Incidencias sin automatización "end-to-end":** El valor está en reportar y seguir, pero no consta de un puente operativo hacia seguros o prevención del mantenimiento. NexUS automatiza avisos preventivos y conexión con seguro, reduciendo fricción y descargando al presidente/administrador.
3.  **Capa social limitada a comunicación genérica:** El tablón modera y ordena, pero no genera necesariamente hábitos diarios ni colaboración sostenida. NexUS, mediante afinidades y red de ayudas gamificada, construye convivencia y retención, atacando el "vacío vivencial" del mercado.
4.  **Accesibilidad como declaración, no como feature de producto:** La accesibilidad se comunica como "sencillez", pero no presenta un modo específico para mayores. El modo "Vecino Mayor" de NexUS permite adopción real en perfiles con brecha digital, clave para masa crítica.
5.  **Paquetería sin detalle público del flujo:** La funcionalidad existe, pero no se conoce el diseño operacional (responsabilidades, confirmaciones, incentivos). La paquetería P2P de NexUS con reglas y trazabilidad puede convertirse en el caso de uso diario que active la comunidad.

#### 6. Modelo de Negocio (Estimado)

* **SaaS por suscripción (por vivienda/mes):** tres planes (Básico, Medio y Premium) con precios escalonados publicados por vivienda.
* **Modelo "modular":** las tarifas se plantean como "paga por lo que necesitas", con posibilidad de adaptar funcionalidades en comunidades grandes.
* **Plan de prueba:** proponen un periodo DEMO de 1 mes para facilitar adopción inicial.
* **Sin permanencia (declarado):** enfoque comercial orientado a reducir barreras de entrada y facilitar cambio de plan.
* **Pagos como elemento transversal:** el módulo de pagos se presenta como independiente del plan, activable/desactivable.
* **Personalización y desarrollo a medida (plan superior):** indican posibilidad de personalizar funcionalidades, especialmente en escenarios complejos.

---

### TuComunidad (TucomunidApp)

#### 1. Features (Funcionalidades Clave)

**A. Comunicación y Organización Comunitaria**
* Comunicación en tiempo real con notificaciones. 
* Voto digital en juntas con envío desde el móvil. 
* Chat entre vecinos y comunidad social básica. 

**B. Gestión Operativa y Administrativa**
* Reporte y seguimiento de incidencias. 
* Reserva de espacios comunes desde la app. 
* Acceso a documentos y cuentas de la comunidad. 
* Consulta de recibos y pagos; cambio de domiciliación.
* Apertura digital de accesos comunitarios. 

**C. Integración de Servicios y Proveedores**
* Directorio de profesionales para servicios del hogar.
* Sincronización con software de administración de fincas.


#### 3. Mercado que atacan

* Propietarios y vecinos de comunidades. 
* Administradores de fincas como canal de adopción clave.
* Empresas de servicios integradas en el directorio.


#### 4. Análisis de UX/UI

* Interfaz móvil y web moderna con funcionalidades básicas de uso diario. 
* Enfoque en tareas directas (incidencias, reservas, comunicación).
* Accesibilidad general sin modo específico para perfiles con brecha digital.


#### 5. Tabla Comparativa y Oportunidades

| Característica | TuComunidad (Competencia) | NexUS (Nuestra Propuesta) |
| :--- | :--- | :--- |
| **Inteligencia Artificial** | No incorpora IA para el tratamiento de documentos ni apoyo a la toma de decisiones. | IA generativa para resumen de actas, extracción de acuerdos, tareas y apoyo a decisiones comunitarias. |
| **Gestión de incidencias** | Gestión reactiva: reporte, seguimiento y comunicación con el administrador. | Gestión proactiva: mantenimiento preventivo, automatización de avisos y conexión directa con seguros. |
| **Automatización de procesos** | Digitalización de procesos existentes sin automatización avanzada. | Automatización de flujos clave (actas, incidencias, avisos, mantenimiento). |
| **Reservas de zonas comunes** | Reservas funcionales con disponibilidad en tiempo real. | Reservas con UX optimizada y capa social para fomentar participación y convivencia. |
| **Comunicación vecinal** | Comunicación y chat entre vecinos, orientados a mensajes y avisos. | Comunicación estructurada con red de ayudas, afinidades e interacción recurrente. |
| **Cohesión social** | Comunidad basada en comunicación básica y utilitaria. | Construcción activa de comunidad mediante gamificación, afinidades y colaboración vecinal. |
| **Accesibilidad digital** | Interfaz sencilla de uso general, sin adaptación específica a mayores. | Modo Vecino Mayor con interfaz adaptada a usuarios con brecha digital. |
| **Paquetería y logística** | No se define un flujo específico de gestión de paquetería comunitaria. | Sistema de paquetería P2P con reglas, trazabilidad y responsabilidades claras. |
| **Rol del vecino** | Usuario principalmente informativo y operativo. | Usuario activo, colaborador y generador de valor comunitario. |
| **Diferenciación competitiva** | Centralización de servicios y comunicaciones. | Enfoque social, preventivo e inteligente orientado a la convivencia y al uso diario. |


#### 6. Puntos débiles explotables

1. **Sin IA para actas y decisiones automáticas:** La inteligencia artificial puede ser crucial a la hora de automatizar la creación de actas de las juntas..  
2. **Incidencias sin automatización preventiva.**  
3. **Comunidad social funcional pero poco retentiva.** : ofrecen comunicaciones vecinales, pero sin promover dicha comunicación, lo que puede generar que dicha funcionalidad sea intrascendente. 
4. **Accesibilidad no especializada para mayores.** : interfaz poco intuitiva y poco adaptada, provocando exclusión de personas mayores dentro de las comunidades.
5. **Flujos de servicios sin diseño de uso continuo.**

#### 7. Modelo de Negocio (Estimado)

* **SaaS por suscripción:** Cobro mensual o anual por comunidad de vecinos.
* **Lead Generation:** Posible monetización por módulos y servicios complementarios (servicios externos de fontanería, electricista...).

---

### Onzane
#### 1. Features (Funcionalidades Clave)

**A. Gestión de Incidencias y Operaciones**

* **Reporte de Incidencias:** Sistema completo con ciclo de gestión (apertura, seguimiento, asignación, resolución). Permite incluir fotos, vídeos y comentarios. Asignación a proveedores, empleados o aseguradoras. Opción de apertura anónima.
* **Gestión de Proveedores:** Onzane permite asignar incidencias directamente a proveedores desde el panel de control. La plataforma ofrece también un entorno digital que facilita a los proveedores gestionar los trabajos y actualizar la información de las incidencias que se les han asignado.
* **Repositorio de Documentos:** Acceso ilimitado a actas de juntas, presupuestos, estatutos, pólizas y facturas. Organización en carpetas personalizable. Documentos públicos y privados con permisos específicos.
* **Gestión Multipropiedad:** Cambio rápido entre comunidades para usuarios con varias propiedades. Sistema multicomunidad con único registro.
* **Mancomunidades:** Agrupación de propiedades funcionando organizativamente como mancomunidades pero con una única cuenta.

**B. Comunicación y Gobernanza**

* **Tablón de Anuncios Digital (Comunicados):** Envío de comunicados con notificaciones push instantáneas. Posibilidad de segmentación por grupos de propiedades. Adjuntos de imágenes y documentos.
* **Votaciones y Encuestas:** Toma de decisiones sobre asuntos comunitarios. Diferentes tipos de respuestas y alcance configurable entre vecinos.
* **Foro Comunitario:** Espacio de comunicación organizado que mantiene la privacidad sin revelar datos personales. Permite añadir imágenes y documentos.
* **Mensajería Completa:** Contacto directo con administrador o presidente. Mensajes con documentos adjuntos y notificaciones push.
* **Grupos de Vecinos:** Espacios privados para colaboración entre miembros (ej: Junta de Gobierno). Comunicación y compartición de documentos privados.

**C. Reservas y Pagos**

* **Reservas de Zonas Comunes:** Sistema altamente flexible con horarios y franjas definibles por día. Bloqueos de fechas, horas y días de la semana. Límites de reservas por propiedad y período. Pre-reservas automatizadas con diferentes algoritmos. Control de aforo. Pago por uso definible por franja horaria. Listas de espera. Fianzas y devoluciones automáticas. Servicios opcionales por reserva.
* **Pagos desde la App:** Monedero virtual para vecinos. Recarga con tarjeta de crédito o cargo a cuota de comunidad. Pagos directos a cuenta de la comunidad sin intermediarios. Devoluciones de saldo (ej: cancelación de reservas). Listado de transacciones en la app. Informes de recargas y pagos para contabilidad.
* **Información Financiera:** Visualización de la situación financiera de la comunidad y de cada propiedad individual. Importación de datos desde sistemas de gestión/ERP (recibos, facturas de consumos).

**D. Interacción Comunitaria**

* **Gestión de Paquetería:** Sistema centralizado donde empleados (conserjes) registran paquetes recibidos. Notificaciones push cuando llega el paquete y cuando se recoge. Opción de añadir foto del paquete.
* **Directorio de Contactos:** Acceso a todos los contactos de interés (teléfonos, direcciones, contratos, pólizas). Información actualizada y accesible desde el móvil.
* **Eventos y Recordatorios:** Creación de eventos comunitarios con avisos automáticos y notificaciones. Visualización en pantalla principal de la app.
* **Presupuestos Comunes:** Gestión del ciclo de compras comunitarias. Los vecinos pueden aportar ofertas y ver las demás, proceso transparente de toma de decisiones.
* **Trámites Habituales:** Gestión de trámites comunes (cambio de cuenta, solicitud de permisos, certificados). Seguimiento del estado con notificaciones de resolución.
* **Trámites Personalizados:** Creación de trámites a medida para necesidades específicas de cada comunidad.

**E. Domótica y Control de Accesos**

* **Control de Acceso:** Control de puertas comunitarias, garajes, zonas comunes y pistas deportivas desde la app. Utilización de tarjetas, llaveros o pulseras con lectores RFID/NFC. Gestión centralizada de todos los permisos. Reglas de acceso personalizadas. Llaves digitales compartibles. Permisos específicos para empleados y empresas de servicios. Integración con cámaras de lectura de matrículas para acceso automatizado a garajes.
* **Programas de Pases:** Creación de programas de pases o carnets para residentes con reglas personalizadas. Integración con sistemas de acceso electrónico para piscinas, clubs y salas de eventos.
* **Gestión de Vehículos:** Actualización autónoma por parte de vecinos de las matrículas de sus vehículos. Integración con sistemas de acceso con cámaras de lectura de matrículas.
* **Control de Llaves:** Control de la situación de llaves físicas de residentes y de la comunidad. Gestión de entregas a empresas o terceros por parte de empleados.

**F. Gestión de Personal y Roles**

* **Uso por Empleados:** Perfiles específicos para empleados (conserjes, personal de mantenimiento) con funcionalidades adaptadas. Acceso a gestión de paquetería, incidencias y bitácora.
* **Bitácora de Conserjería:** Control digital de la bitácora donde se anotan todos los sucesos del día a día de la comunidad.
* **Autogestión o Control:** Configuración de si los propietarios pueden asignar vecinos/inquilinos de manera autónoma o solo desde el panel de control. Tres perfiles diferenciados (propietarios, convivientes, inquilinos) con diferentes permisos.
* **Control de Inquilinos:** Definición global de permisos de inquilinos por parte de la comunidad. Asignación/desasignación autónoma por propietarios si así se configura.

#### 2. Mercado que atacan

* **Comunidades de Propietarios:** Todo tipo de comunidades, desde pequeñas hasta grandes (más de 450 comunidades activas, más 48,000 inmuebles gestionados).
* **Presidentes de Comunidad:** Usuarios que buscan digitalizar y automatizar la gestión comunitaria.
* **Propietarios/Inquilinos:** Residentes que desean transparencia, participación y comodidad en servicios.
* **Administradores de Fincas:** Producto complementario que añade valor a sus servicios. Disponen de software y app específica para administradores.
* **Empleados de Comunidades:** Conserjes y personal de mantenimiento que utilizan funcionalidades específicas.
* **Empresas de Servicios:** Proveedores de mantenimiento que pueden usar la app gratuitamente para gestión de incidencias.
* **Geografía:** Mercado principalmente español, adaptado a la Ley de Propiedad Horizontal (LPH). Soporte multi-idioma (8 idiomas) y zonas horarias.

#### 3. Análisis de UX/UI

* **Branding:** Estética corporativa y funcional, orientada principalmente a la gestión y el control administrativo. Enfoque en eficiencia operativa más que en interacción social.
* **Accesibilidad:** Interfaz clara y ordenada con temas claro y oscuro. Multi-idioma (español, inglés, francés, alemán, neerlandés, catalán, euskera, gallego). Sin embargo, carece de modos específicos para usuarios mayores o con baja alfabetización digital.
* **Personalización:** Alta capacidad de personalización (logo, colores, funcionalidades activables). Notificaciones personalizables por parte de cada usuario.
* **Plataforma:** Mobile-First disponible en iOS y Android, con panel de control web para administración. Pensada para notificaciones rápidas, gestión de incidencias y operaciones diarias.
* **Privacidad:** Diseño enfocado en máxima privacidad, sin exposición de datos personales. Modo anónimo disponible en ciertas funcionalidades, como abrir incidencias.

#### 4. Tabla Comparativa y Oportunidades

**Comparativa Estratégica: Onzane vs. NexUS:**

| Característica | Onzane (Competencia) | NexUS |
| :--- | :--- | :--- |
| **Inteligencia Artificial** | Ausente. Gestión manual de actas y decisiones. | **Inteligencia artificial para actas:** Resúmenes automáticos de actas y generación de listas de tareas pendientes. |
| **Gestión de Incidencias** | Sistema reactivo completo: los vecinos informan, se asigna a proveedores/empleados/aseguradoras, seguimiento y resolución. Sin alertas preventivas automáticas. | **Proactiva con IA:** Alerta automática al seguro y presidente, con notificaciones preventivas. |
| **Finanzas y Pagos** | Sistema completo: monedero virtual, recarga con tarjeta o cargo a cuota, pagos directos sin intermediarios, informes para contabilidad. | **Portal de pagos:** Visualización del estado de cuenta y pago de cuotas. Posible evolución a integraciones y métricas. |
| **Paquetería** | Gestión centralizada por conserjería con notificaciones push (llegada y recogida). Requiere personal. Opción de añadir foto. | **Gestión colaborativa P2P:** Sistema de "vecino receptor" con coordinación entre vecinos sin necesidad de portero. |
| **Gamificación Social** | Ausente. No hay sistema de recompensas ni incentivos por participación comunitaria. | **Red de ayudas con puntos:** Recompensas simbólicas por ayuda comunitaria y participación activa. |
| **Inclusión Digital** | Interfaz estándar con multi-idioma y temas claro/oscuro. Sin adaptación específica para usuarios mayores. | **Modo Vecino Mayor y Tutorial:** Lenguaje humano, botones grandes, guía interactiva paso a paso y accesibilidad avanzada. |
| **Conexión Vecinal** | Foro comunitario, grupos de vecinos, directorio de contactos. Enfoque funcional sin matching social. | **Matching de Afinidad:** Algoritmo para conectar vecinos con intereses comunes (hobbies, necesidades). |
| **Reservas de Espacios Comunes** | Sistema avanzado con horarios personalizables, pre-reservas automatizadas con algoritmos, control de aforo, pago por uso por franjas, fianzas, listas de espera, servicios opcionales. | **Reservas con integración social:** Funcionalidad estándar de reservas integrada con sistema de afinidades, permitiendo coordinar uso de instalaciones entre vecinos con intereses comunes. Valor en la conexión social |
| **Domótica y Control de Accesos** | Sistema completo IoT: control de puertas/garajes/zonas comunes, RFID/NFC, llaves digitales compartibles, integración con cámaras de matrículas, programas de pases. | Servicios de control de acceso no contemplados. |
| **Gestión de Proveedores** | App gratuita para proveedores. Marketplace existente con directorio de servicios. | **Base de datos de proveedores:** Directorio con contactos de distintos proveedores gestionado por los vecinos. |

#### 5. Puntos débiles explotables

Tras analizar Onzane y sus funcionalidades, se identifican varias oportunidades de ventaja competitiva:

1. **Uso diario variable:** Onzane ofrece funcionalidades de uso cotidiano (reservas con +500 instalaciones gestionadas, paquetería centralizada, foro comunitario, control de acceso), pero carece de elementos que incentiven el engagement social diario. La aplicación es principalmente utilitaria. La incorporación de gamificación, matching de afinidades y red de ayudas vecinales podría transformar el uso funcional en participación comunitaria activa.

2. **Ausencia total de Inteligencia Artificial:** Aunque Onzane digitaliza procesos operativos (notificaciones, reservas, control de accesos), carece completamente de IA para tareas cognitivas de alto valor. Las actas deben leerse manualmente, las decisiones extraerse a mano, los patrones de incidencias recurrentes no se detectan automáticamente, y no hay análisis predictivo de gastos ni sugerencias de mantenimiento preventivo. La IA podría facilitar la experiencia del presidente o administrador.

3. **Brecha digital:** La interfaz es funcional, pero no está específicamente adaptada a usuarios mayores o con baja alfabetización digital. No existe un "modo simplificado" con botones grandes, lenguaje más humano o tutoriales interactivos específicos. Diseños más inclusivos con modos de uso simplificados podrían ampliar significativamente el alcance de adopción en comunidades con población senior.

4. **Dimensión social limitada:** Onzane cuenta con foro comunitario, grupos de vecinos y directorio de contactos, pero el enfoque es puramente funcional. No existe gamificación, sistema de matching por afinidades, red de ayudas entre vecinos ni elementos que fomenten la construcción de comunidad más allá de la mera convivencia administrativa. La integración de elementos sociales y colaborativos podría aumentar el valor percibido y la retención de usuarios.

5. **Monetización tradicional:** El modelo se centra principalmente en suscripción SaaS (pago mensual/anual por comunidad). Aunque cuentan con marketplace de proveedores, no explotan plenamente la economía colaborativa, servicios premium diferenciados por funcionalidad, o la gamificación como driver de engagement y cross-selling de servicios adicionales.

#### 6. Modelo de Negocio (Estimado)

* **SaaS por suscripción:** Modelo de pago por comunidad. Operan con más de 450 comunidades activas. Se posicionan como una opción más económica que la competencia.

* **Servicios de Domótica:** Venta e instalación de hardware IoT (lectores RFID/NFC, controladores de puertas, cámaras de matrículas). Red de instaladores de confianza en toda España. Fuente adicional de ingresos recurrentes.

* **Marketplace de Proveedores:** App gratuita para empresas de servicios que permite gestionar incidencias asignadas. Modelo de monetización no público (posible lead generation o comisiones).

* **Valor añadido para Administradores:** Software y app específica para administraciones de fincas que complementa el ecosistema y genera ingresos adicionales.

* **Personalización y Desarrollo a Medida:** Posibilidad de crear trámites personalizados y funcionalidades específicas para comunidades con necesidades particulares. No se detalla si es servicio adicional de pago o incluido en planes superiores.

---
### ZiviApp

#### 1. Propósito y Visión
* **Propósito:** Digitalizar y centralizar la gestión de las comunidades de propietarios para eliminar la burocracia física, el uso de tablones de anuncios obsoletos y el caos de los grupos de WhatsApp.
* **Visión:** Convertirse en el "sistema operativo" de las comunidades en España, conectando a vecinos y presidentes en una plataforma que agilice la convivencia y la toma de decisiones.
* **Diferenciador Estratégico:** A diferencia de softwares contables para administradores, ZiviApp se posiciona como una herramienta **centrada en el vecino**, priorizando la usabilidad y la capa social.

#### 2. Features (Funcionalidades Clave)

**A. Gestión de Incidencias y Operaciones**
* **Reporte de Averías:** Sistema con fotos y descripción para notificar problemas en zonas comunes (ascensores, luces, humedades).
* **Seguimiento en Tiempo Real:** Los vecinos pueden ver el estado de la incidencia (pendiente, en proceso, resuelta) sin preguntar al presidente.
* **Repositorio de Documentos:** Acceso a actas de juntas, presupuestos, estatutos y pólizas de seguro desde el móvil.
* **Gestión Multipropiedad:** Cambio rápido entre diferentes comunidades para usuarios que poseen varias viviendas.

**B. Comunicación y Gobernanza**
* **Tablón de Anuncios Digital:** Notificaciones push para avisos oficiales, evitando que la información se pierda.
* **Votaciones y Encuestas:** Herramienta para tomar decisiones no críticas de forma telemática (ej. color de la pintura, fechas de apertura de piscina).
* **Alertas Críticas:** Sistema de avisos urgentes para situaciones de emergencia en el edificio.

**C. Cohesión Social ("La Aldea Digital")**
* **Marketplace de Vecinos:** Espacio para ofrecer/pedir favores, prestar herramientas o recomendar profesionales.
* **Objetos Perdidos:** Sección dedicada a reportar paquetes entregados por error o pertenencias encontradas.
* **Directorio Vecinal:** Registro de miembros para facilitar el contacto (respetando la RGPD).


#### 3. Mercado que atacan
1.  **Presidentes de Comunidad:** Usuarios que buscan reducir la carga de trabajo y las llamadas constantes de los vecinos.
2.  **Propietarios/Inquilinos:** Personas que desean transparencia y comodidad en la gestión de su hogar.
3.  **Administradores de Fincas (Partner):** Aunque su marketing es B2C, buscan que el administrador adopte la herramienta como valor añadido para sus clientes.
4.  **Geografía:** Mercado español exclusivamente, adaptado a la Ley de Propiedad Horizontal (LPH).

#### 4. Análisis de UX/UI
* **Branding:** Uso de colores vivos (verde "Zivi") y lenguaje cercano. Evitan la estética fría de los softwares de gestión tradicionales.
* **Accesibilidad:** Interfaz diseñada con jerarquías claras y botones grandes, pensada para usuarios de avanzada edad que no son nativos digitales.
* **Plataforma:** Enfoque *Mobile-First*, optimizado para el uso rápido "en el portal" o "en el ascensor".

#### 5. Tabla Comparativa y Oportunidades

**Comparativa Estratégica: ZiviApp vs. NexUS**

| Característica | ZiviApp | NexUS |
| :--- | :--- | :--- |
| **Inteligencia Artificial** | No se identifica en las fuentes públicas de ZiviApp el uso de inteligencia artificial para la automatización de actas, generación de tareas o análisis de incidencias. | **IA Engine:** Resúmenes automáticos de actas y generación de listas de tareas pendientes. |
| **Gestión de Incidencias** | Enfoque reactivo basado en el reporte manual por parte del vecino y posterior gestión humana del aviso. | **Proactiva:** Automatización de avisos a seguros y proveedores, junto con alertas preventivas. |
| **Finanzas y Pagos** | Acceso informativo a documentación económica sin integración visible de pagos o cobros en tiempo real. | **Portal de Pagos:** Pasarela integrada para cuotas, deudas y estado financiero actualizado. |
| **Logística Urbana** | No se identifican funcionalidades relacionadas con la gestión de paquetería o logística vecinal. | **Gestión de Paquetería:** Sistema de “vecino receptor” para evitar entregas fallidas. |
| **Gamificación Social** | Funcionalidades sociales básicas orientadas al intercambio puntual entre vecinos. | **Sistema +1:** Recompensas simbólicas por ayuda comunitaria y participación activa. |
| **Inclusión Digital** | Diseño accesible y simplificado, sin modos específicos adaptados a perfiles senior. | **Modo Senior & Tutorial:** Interfaz adaptada y guía interactiva para usuarios mayores. |
| **Conexión Vecinal** | Directorio de contactos y espacios de comunicación general. | **Matching de Afinidad:** Conexión de vecinos según intereses comunes. |
| **Reservas** | Funcionalidad básica de consulta o gestión simple. | **Gestión de Espacios:** Control de aforos, reservas y reglas de uso de zonas comunes. |


#### 6. Puntos débiles explotables
Las siguientes debilidades se formulan a partir del análisis funcional y comparativo de ZiviApp, considerando exclusivamente la información observable en sus fuentes públicas y su propuesta de valor comunicada. Estas hipótesis permiten identificar oportunidades de diferenciación para soluciones alternativas como NexUS.

1. **Hábito semanal frente a uso esporádico:**  
   ZiviApp parece orientarse a un uso puntual ligado a incidencias, avisos o juntas, sin mecanismos explícitos que fomenten una recurrencia diaria o semanal sostenida. La ausencia de funcionalidades operativas frecuentes limita la generación de hábito continuo en el usuario.

2. **Resolución operativa frente a gestión manual:**  
   El sistema de incidencias se presenta principalmente como un canal de comunicación, sin evidenciarse una automatización directa del contacto con aseguradoras o proveedores externos, manteniendo la carga administrativa en el presidente o administrador.

3. **Inteligencia en actas frente a proceso analógico:**  
   Aunque ZiviApp permite votaciones digitales, el proceso de redacción, resumen y seguimiento de acuerdos derivados de las juntas continúa siendo manual, lo que introduce fricción y lentitud en la ejecución de decisiones comunitarias.

4. **Accesibilidad como principio frente a funcionalidad específica:**  
   Si bien la interfaz es clara y sencilla, no se identifican modos o flujos específicamente diseñados para usuarios de mayor edad, un perfil con alto peso en la toma de decisiones dentro de las comunidades.

5. **Ecosistema de servicios frente a modelo SaaS limitado:**  
   La propuesta de ZiviApp no evidencia un marketplace estructurado de proveedores verificados ni mecanismos de intermediación que permitan monetizar servicios externos o mejorar las condiciones económicas para la comunidad.

6. **Transparencia financiera y gestión de cobros:**  
   El acceso a la información económica se limita a la consulta documental, sin integración de pasarelas de pago ni visualización dinámica de deudas o cuotas, lo que obliga a procesos externos y reduce la autonomía del vecino.

7. **Mantenimiento preventivo frente a enfoque reactivo:**  
   La gestión de incidencias depende de que el vecino detecte y comunique el problema, sin sistemas de avisos preventivos o recordatorios automáticos de mantenimiento que anticipen fallos en infraestructuras comunes.

8. **Cohesión social mediante incentivos estructurados:**  
   Las funcionalidades sociales se presentan como tablones de intercambio básicos, sin sistemas de incentivos, métricas de participación o mecanismos de refuerzo que fomenten una colaboración vecinal sostenida y medible.

9. **Otras debilidades identificadas:**  
   * **Fragmentación del flujo profesional:** La comunicación pierde trazabilidad cuando la incidencia pasa a manos de un proveedor externo, al no existir un panel que unifique el seguimiento del ciclo completo.  
   * **Dependencia del ecosistema B2C:** El enfoque centrado en el vecino puede generar fricción con administradores de fincas tradicionales si no se integra de forma natural en su flujo de trabajo profesional.  
   * **Escalabilidad de servicios limitada:** La ausencia de funcionalidades relacionadas con logística urbana reduce la capacidad de la plataforma para posicionarse como un nodo operativo clave en entornos urbanos densos.


#### 7. Modelo de Negocio (Estimado)

* **Uso gratuito para usuarios finales:**  En la web oficial de Zivi no se muestran precios, planes de suscripción ni opciones de pago para vecinos o comunidades, lo que indica que la app se ofrece gratuitamente para su adopción por parte de los usuarios finales.

* **Orientación B2B hacia administradores de fincas y servicios profesionales:**  Zivi se presenta como una plataforma también dirigida a administradores de fincas, operarios y proveedores de servicios, lo que sugiere un enfoque B2B donde el valor económico puede estar en la prestación de servicios profesionales asociados.  

* **Prestación de servicios asociados como posible vía de monetización:**  En el Aviso Legal se indica que la empresa ofrece servicios de gestión de comunidades y todos los servicios asociados al principal, lo que apunta a un modelo basado en servicios profesionales más que en pagos directos dentro de la app.  

* **Ausencia de monetización directa visible en la app o web:** No se identifican en las fuentes oficiales mecanismos de monetización directa como publicidad, compras in-app, comisiones o suscripciones premium, lo que refuerza la idea de un modelo centrado en servicios externos o acuerdos comerciales.  
---

### GestVecinos

#### 1. Propósito y Visión

* **Propósito:** Proveer una herramienta de escritorio (offline) para presidentes de comunidad que buscan digitalizar el "libro de cuentas" sin depender de gestores externos ni de conexión a internet constante. Su objetivo es la administración puramente funcional y local.
* **Visión:** Mantener el control total de los datos dentro del ordenador personal del usuario, bajo la premisa del software tradicional en propiedad, donde la gestión es una tarea solitaria del presidente frente a su PC.
* **Diferenciador Estratégico:** Se posicionan como la solución de **"Autogestión Local Gratuita"**. A diferencia de los SaaS modernos, eliminan la barrera de entrada del coste mensual y la desconfianza hacia la nube, apelando al usuario conservador.

#### 2. Features (Funcionalidades Clave)

##### A. Gestión Financiera y Administrativa (Core del negocio)

* **Contabilidad Manual:** Sistema de entrada de datos tradicional para registrar cuotas de propietarios y facturas de proveedores. No existe sincronización bancaria; todo movimiento debe picarse a mano.
* **Control de Morosidad:** Generación de listados básicos de deudores y estados de cuentas para imprimir.
* **Gestión de Proveedores:** Base de datos local ("agenda") con fichas de empleados y proveedores de la finca.

##### B. Operativa y Juntas

* **Documentación de Juntas:** Plantillas predefinidas para la redacción de convocatorias y actas.
* **Control de Asistencia:** Fichas digitales para registrar manualmente los asistentes presentes en la reunión.
* **Legislación Integrada:** Acceso offline a textos legales (LPH), aunque con alto riesgo de desactualización normativa debido a la falta de mantenimiento del software (última versión 2018).

##### C. Mantenimiento y Zonas Comunes

* **Inventario de Activos:** Módulo para listar elementos comunes (ascensores, extintores) y asignarles tareas de mantenimiento.
* **Gestión Estática:** El presidente anota las averías, pero el sistema no notifica al técnico ni permite al vecino reportar nada. Es un "cuaderno de bitácora" digital unidireccional.

#### 3. Mercado que atacan

* **Presidentes "Do it Yourself":** Usuarios de comunidades pequeñas (menos de 15 vecinos) que gestionan la finca en sus ratos libres para ahorrar costes.
* **Perfil Tecnológico Conservador:** Usuarios de PC Windows acostumbrados a software de la década de 2000, que desconfían de las apps móviles y prefieren tener el dato "en su disco duro".
* **Geografía:** España (adaptado a la estructura de la LPH, aunque no a sus últimas reformas).

#### 4. Análisis de UX/UI

* **Branding:** Estética funcional y obsoleta ("Windows Forms"), típica del software corporativo de hace 15 años. Transmite rigidez y burocracia.
* **Tecnología:** **Software Legacy (Abandonware).** Es un ejecutable (.EXE) instalable. Carece de versión web, nube o app móvil. La experiencia de usuario se limita al teclado y ratón en un escritorio fijo.
* **Usabilidad:** Curva de aprendizaje baja por simplicidad, pero operativa tediosa (introducción de datos campo a campo). No existe concepto de "experiencia de usuario" moderna.

#### 5. Tabla Comparativa y Oportunidades

**Comparativa Estratégica: GestVecinos vs. NexUS**

| Característica | GestVecinos (Competencia Legacy) | NexUS (Nuestra Propuesta) |
| --- | --- | --- |
| **Inteligencia Artificial** | **Nula:** Base de datos local simple y estática. | **IA Generativa:** Automatización de actas, lectura de facturas y predicción de gastos. |
| **Arquitectura** | **Local / Aislada:** Solo funciona en el PC del presidente. Si el PC falla, adiós datos. | **Cloud / Mobile-First:** Accesible 24/7 desde cualquier lugar y dispositivo con backups automáticos. |
| **Gestión Bancaria** | **Manual:** El usuario debe teclear cada movimiento del extracto. | **Open Banking:** Conciliación bancaria automática en tiempo real. |
| **Experiencia de Usuario** | **Obsolescente:** Interfaz gris de escritorio, sin app móvil. | **Moderna e Inclusiva:** Diseño fluido y **Modo Vecino Mayor** para romper la brecha digital. |
| **Cohesión Social** | **Inexistente:** El vecino es un sujeto pasivo (un apunte contable). | **Comunidad Activa:** Afinidades, Gamificación y Red de Ayudas P2P. |
| **Actualizaciones** | **Detenidas (2018):** Riesgo legal y de seguridad crítico. | **Continuas:** Siempre actualizado a la última normativa (LPH, RGPD). |

#### 6. Puntos débiles explotables

Tras analizar su estado actual de "abandonware", se identifican áreas críticas donde NexUS tiene una ventaja competitiva absoluta:

* **Deuda Técnica Insalvable:** Al ser un software de 2018 no mantenido, su uso en Windows 11 o superior puede generar inestabilidad. NexUS ofrece tecnología de vanguardia y seguridad garantizada.
* **Invisibilidad del Vecino:** En GestVecinos, el propietario no tiene acceso a nada; debe pedirle los papeles al presidente. NexUS ofrece transparencia total en el bolsillo del vecino, eliminando la desconfianza.
* **Ineficiencia Operativa (El "Picadatos"):** Obliga al presidente a trabajar para el software (introduciendo datos). NexUS hace que el software trabaje para el presidente (automatizando procesos).
* **Riesgo Legal y Fiscal:** No cumple con los estándares modernos de protección de datos (RGPD) ni facturación verificable (VeriFactu), exponiendo a la comunidad a sanciones.

#### 7. Modelo de Negocio (Observado)

* **Licencia / Freeware:** Modelo tradicional de descarga gratuita (posiblemente monetizaba con publicidad en web o servicios premium ya discontinuados).
* **Sin Recurrencia:** Al no ser SaaS, carece de músculo financiero para ofrecer soporte técnico o actualizaciones, lo que explica su estancamiento.
* **Soporte:** Inexistente. El usuario está solo ante cualquier error del programa.

---

### Plusvecinos (PropApp)

#### 1. Propósito y Visión

* **Propósito:** Democratizar la gestión de la comunidad devolviendo el "control de la información" a los propietarios. Buscan eliminar la dependencia total del Administrador de Fincas para acceder a datos básicos y acabar con la informalidad e invasión de privacidad de los grupos de WhatsApp.
* **Visión:** Ser el ecosistema digital integral (*PropTech*) donde conviven propietarios, inquilinos y proveedores, transformando la comunidad en una "Red Social Privada" con validez legal certificada en sus decisiones.
* **Diferenciador Estratégico:** Su fuerte alianza con certificadores legales (Evicertia) para otorgar validez jurídica a las votaciones online, posicionándose como la herramienta de "democracia digital" más segura frente a soluciones informales.

#### 2. Features (Funcionalidades Clave)

**A. Gobernanza y Legalidad (Punto Fuerte)**
* **Voto Telemático Certificado:** Integración con terceros certificadores para que las decisiones tomadas en la app tengan peso legal, permitiendo juntas híbridas o totalmente online con garantías.
* **Encuestas Vinculantes:** Herramientas de sondeo para decisiones operativas con resultados auditables.

**B. Operativa y Gestión**
* **Gestor de Incidencias con Trazabilidad:** Reporte de averías con fotos y seguimiento de estado visible para todos los vecinos (evitando duplicidades). Conexión directa con proveedores registrados.
* **Calendario de Reservas:** Gestión de zonas comunes (pádel, piscina, salas) con control de bloqueos, tiempos y aforos.
* **Gestor Documental en la Nube:** Repositorio que pertenece a la comunidad (no al administrador), garantizando que la información histórica se conserve aunque se cambie de gestor.

**C. Capa Social y Privacidad**
* **Privacidad (Anti-WhatsApp):** Sistema de comunicación interna (Muro y Mensajería) que oculta los datos personales como el teléfono o email, protegiendo la privacidad del vecino.
* **Módulo de Intereses:** Funcionalidad social que permite a los vecinos etiquetar sus aficiones para encontrar personas afines en el edificio.
* **Ahorro y Proveedores:** Herramientas para comparar servicios y buscar la bajada de la cuota comunitaria mediante la optimización de contratos.

#### 3. Mercado que atacan

* **Comunidades Autogestionadas:** Su mensaje de "toma el control" resuena en comunidades que sienten que su gestión actual es opaca.
* **Promotores Inmobiliarios (Obra Nueva):** Estrategia B2B para entregar edificios nuevos con la app preinstalada como un valor añadido de "Edificio Inteligente".
* **Administradores de Fincas:** Ofrecen la herramienta también al administrador para automatizar la recepción de incidencias, aunque el enfoque de marketing empodera más al vecino.

#### 4. Análisis de UX/UI

* **Branding:** Imagen moderna y tecnológica, utilizando terminología de red social ("Muro", "Perfil", "Intereses").
* **Usabilidad:** Interfaz limpia y funcional, aunque densa en opciones debido a la gran cantidad de módulos disponibles.
* **Enfoque:** Híbrido entre herramienta de trabajo y red social, lo cual a veces diluye la experiencia de usuario si este busca solo resolución operativa inmediata.

#### 5. Tabla Comparativa y Oportunidades

**Comparativa Estratégica: Plusvecinos vs. NexUS**

| Característica | Plusvecinos (Competencia) | NexUS (Nuestra Propuesta) |
| :--- | :--- | :--- |
| **Inteligencia Artificial** | **Limitada:** Digitalización de procesos manuales, pero sin IA generativa para contenidos. | **IA Generativa:** Resumen automático de actas, redacción de comunicados y asistentes de decisión. |
| **Gestión de Incidencias** | **Reactiva/Social:** Reporte manual y discusión en el muro sobre la avería. | **Proactiva/Preventiva:** Predicción de fallos, mantenimiento preventivo y conexión automática con seguros. |
| **Cohesión Social** | **Pasiva (Intereses):** Etiquetado de hobbies para que los vecinos se busquen por su cuenta. | **Activa (Gamificación):** Sistema de **Red de Ayudas y Puntos (+1)** que incentiva la interacción real y recurrente. |
| **Votaciones** | **Legalista:** Foco extremo en la certificación jurídica del voto (Evicertia). | **Facilitadora:** Foco en la participación y en la "digestión" de la propuesta mediante IA antes de votar. |
| **Inclusión Digital** | Interfaz estándar moderna. Puede resultar compleja para mayores por el exceso de funciones sociales. | **Modo Vecino Mayor:** UX radicalmente simplificada para garantizar que nadie se quede fuera por brecha digital. |
| **Logística (Paquetería)** | No destacan un flujo específico P2P, se centran más en proveedores externos. | **Logística P2P:** Solución específica para la "última milla" dentro del edificio con vecinos receptores. |

#### 6. Puntos débiles explotables

Tras analizar su modelo, se identifican las siguientes áreas críticas donde NexUS tiene ventaja competitiva:

1.  **Exceso de "Ruido Social":** Al intentar replicar dinámicas de redes sociales (muros, comentarios), pueden generar fatiga en usuarios que solo buscan utilidad. NexUS se centra en la **gamificación con propósito** (ayuda mutua), no en la socialización vacía.
2.  **IA Inexistente en Documentación:** Plusvecinos almacena documentos, pero no los "procesa". NexUS ofrece una ventaja clara al **leer y resumir** actas y contratos mediante IA, ahorrando tiempo real al usuario.
3.  **Brecha Generacional:** Su apuesta por una "SuperApp" llena de funciones deja de lado a la tercera edad. El **Modo Vecino Mayor** de NexUS es un diferenciador clave para la adopción total en el edificio.
4.  **Modelo de Negocio (Conflictos de Interés):** Su énfasis en el "ahorro" a menudo implica redirigir a proveedores patrocinados. NexUS ofrece un modelo más transparente centrado en la economía colaborativa interna (P2P).

#### 7. Modelo de Negocio (Observado)

* **Freemium:** Acceso gratuito a funcionalidades básicas para captar usuarios.
* **Pago por Uso (Legal):** Cobro por funcionalidades avanzadas como la certificación legal de juntas y votaciones.
* **Marketplace (Lead Generation):** Monetización a través de conectar a la comunidad con proveedores recomendados (seguros, alarmas, reformas).
* **Licencias B2B:** Acuerdos con promotoras inmobiliarias para implantación masiva en nuevas construcciones.
---

## Comparativa de Funcionalidades

Tabla comparativa de funcionalidades clave entre NexUS y las soluciones competidoras, destacando aquellas características diferenciales.


## Análisis

Evaluación crítica de los resultados obtenidos en la comparativa, considerando factores técnicos, funcionales y estratégicos.


## Conclusiones y estrategias

Conclusiones finales del análisis de competidores y definición de estrategias recomendadas para el desarrollo y posicionamiento del proyecto NexUS.

---
