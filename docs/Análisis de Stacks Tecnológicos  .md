# **Análisis de Stacks Tecnológicos \- NexUS**

Este documento presenta un análisis de la competencia y una evaluación de los posibles stacks tecnológicos para el proyecto **NexUS**. El objetivo es seleccionar un conjunto de tecnologías frontend y backend óptimo que garantice la escalabilidad, mantenibilidad y rendimiento del producto final.

# **1\. Análisis de la Competencia**

El patrón observado tras comprobar los stacks de la competencia muestra una fuerte tendencia hacia frameworks de JavaScript en el frontend aunque hay gran diversidad en el backend, siendo notable la presencia de .NET. Para llevar a cabo el análisis se han tenido en cuenta datos publicados por los propios competidores en sus respectivas webs o en foros como [stackshare](https://stackshare.io/). En algunos casos se han usado datos inferidos proporcionados por plataformas fiables como [builtwith](https://builtwith.com/).

| Competidor | Modelo de Negocio | Stack Tecnológico (Frontend/Backend) | Notas Relevantes |
| :---- | :---- | :---- | :---- |
| Entrata | PaaS/ Suscripción B2B | React / PHP / AWS | Enfoque en Plataforma como Servicio.  Tiene una arquitectura orientada a microservicios que usa AWS Lambda. |
| StarRez | Suscripción B2B | React / .NET (C\#) / SQL Server | Usa Microsoft Power Automate, para mejorar el rendimiento de flujos complejos como roommate matching basado en afinidad.  |
| Yardi Student | Licencia Enterprise | Angular / .NET / SQL Server | Destaca por su integración nativa con Power BI,  permitiendo crear dashboards intuitivos a partir de datos que  optimizan por ejemplo las rentas de las habitaciones en tiempo real.  |
| Breezeway | SaaS por Propiedad/Unidad | React Native / Python  | Incluye herramientas de mensajería automatizada, inspecciones con IA para control de calidad y suministros mediante Computer Vision. |
| Convivo App | Freemium / Suscripción Community | Flutter / Node.js / Firebase | Orientada a la experiencia del residente. Notificaciones y chat en tiempo real muy optimizados. |
| ResiPlus | Suscripción Community | React Native/ .NET | Su arquitectura permite la generación de informes oficiales para la administración pública lo que le da ventaja en el sector  sociosanitario y residencias de mayores |

# **2\. Stacks propuestos**

Estas propuestas han sido diseñadas para equilibrar la rapidez en el desarrollo del MVP con la escalabilidad necesaria para gestionar residencias de gran escala. Cada stack representa un enfoque distinto: desde la especialización en IA hasta la robustez corporativa, asegurando que el equipo pueda seleccionar la ruta que mejor mitigue los riesgos técnicos identificados.

| Categoría | A. IA-First | B. Full-Stack Baterías | C. Tradicional Robusta | D. Agilidad JS | E. Potencia Empresarial |
| :---- | :---- | :---- | :---- | :---- | :---- |
| **Frontend (JS)** | React.js | React.js | Vue.js | React.js | React.js |
| **Gestor Dependencias Front** | npm | npm | npm | npm | npm |
| **Librerías Front (UI/UX)** | Tailwind \+ Radix UI | Mantine UI | PrimeVue | Flowbite \+ Lucide Icons | Shadcn/ui \+ Tailwind |
| **Backend** | Python (FastAPI) | Python (Django) | Java (Spring Boot) | Node.js (Express) | .NET 8 (C\#) |
| **Gestor Dependencias Back** | Poetry | pip | Maven | npm | NuGet |
| **Base de Datos** | PostgreSQL | PostgreSQL | MySQL | PostgreSQL (pgvector) \+ Redis | SQL Server / Azure SQL |
| **Lib. IA (Actas/NLP)** | LangChain \+ OpenAI | LlamaIndex \+ OpenAI | Spring AI / LangChain4j | OpenAI SDK (Node) | Semantic Kernel |
| **Testing (F/B)** | Jest / Pytest | React Testing Library (RTL) / Pytest | Playwright/ Vitest | Vitest | Playwright/ xUnit |
| **Despliegue (F/B/DB)** | Vercel / Railway / Supabase | Vercel / Koyeb  / Fly.io | Railway/ / Clever/ Cloud | Vercel / Fly.io / Supabase \+ Upstash  | Azure/      App/     Service |
| **Multi-tenant** | DB-Level (Logical Schemas) | App-Level (Django-Tenants) | App-Level (Hibernate Filter) | DB-Level (Shared Database RLS \+ Tenant- prefix en Redis) | DB-Level (SQL Server RLS) |
| **RBAC** | Custom JWT \+ Dec. | Django Auth built-in | Spring Security | Middleware custom | ASP.NET Identity \+ Policies |
| **Auditoría** | Logging estructurado | Django Auditlog | Spring Data Envers | Winston \+ Cloud logs | EF Audit \+ Serilog |
| **RGPD** | Field-Level Enc. (Fernet) | Django GDPR helpers | Spring Crypto (AES-GCM) | Field-level Encryption (GCM) | SQL Always Encrypted |
| **Inmutabilidad** | Append-only tables | Model versioning | JPA Immutable cols | Append-only tables \+ JSONB Hashing | Azure SQL Ledger |

### **Análisis de Alternativas**

#### **A. Alternativa IA-First (FastAPI \+ React)**

* **Enfoque:** Diseñada para maximizar el rendimiento del motor de IA y ofrecer una interfaz moderna y ligera.  
* **Pros:** FastAPI ofrece una de las latencias más bajas dentro del ecosistema Python.  Hay que entender que la” velocidad“ depende de muchos factores, la ventaja de FastAPI aquí no es la velocidad punta, sino su capacidad de no bloquear el servidor mientras espera a la IA.  
* **Contras:** Requiere configurar manualmente muchos servicios (seguridad, administración) que otros frameworks ya traen de serie.

#### **B. Alternativa Full-Stack Baterías (Django \+ React)**

* **Enfoque:** Prioriza la seguridad y la velocidad de entrega del panel de administración mediante el ecosistema "todo incluido" de Django.  
* **Pros:** El panel de administración automático facilita enormemente la gestión interna de datos y la depuración en fase MVP.  
* **Contras:** Django puede ser un poco más "pesado" y rígido en su estructura en comparación con micro-frameworks como FastAPI. Además al implementar *multi-tenancy* y permisos granulares (RBAC), el Admin de Django requiere un ajuste manual significativo.

#### **C. Alternativa Tradicional Robusta (Spring Boot \+ Vue)**

* **Enfoque:** Enfocada en la estabilidad empresarial y la facilidad de aprendizaje en el frontend.  
* **Pros:** Garantías de consistencia ACID en transacciones críticas de cuotas, herramientas de seguridad industrial (Spring Security) muy maduras y curva de aprendizaje suave en el frontend.  
* **Contras:** La curva de aprendizaje de Java es más alta y el desarrollo de la lógica de IA es más verboso y complejo que en Python.

#### **D. Alternativa Agilidad JS (Node.js \+ React)**

* **Enfoque:** Unificar el lenguaje en todo el stack (TypeScript) para facilitar la comunicación en tiempo real .  
* **Pros:** Permite compartir lógica de validación y tipado *end-to-end*, ofrece alta eficiencia en operaciones de E/S y combina robustez relacional con flexibilidad mediante mediante el uso híbrido de PostgreSQL y Redis.  
* **Contras:** Requiere una configuración rigurosa de políticas RLS para garantizar el aislamiento de datos además incrementa la complejidad de la infraestructura al gestionar dos sistemas de persistencia.

#### **E. Alternativa Potencia Empresarial**

* **Enfoque:** Orientada a la escalabilidad vertical y la seguridad de grado bancario, ideal para la gestión de finanzas y datos legales de residencias.  
* **Pros:** El rendimiento de .NET 8 es de los más altos del mercado; Entity Framework Core es un ORM potente para gestionar relaciones complejas entre habitaciones, finanzas y actas.  
* **Contras:** El coste de infraestructura en Azure puede ser superior a las opciones de "hobby" si no se gestiona bien; requiere un conocimiento sólido de programación orientada a objetos (C\#).

# **3\. Pros y Contras de las Tecnologías Propuestas**

A continuación, se analizan los pros y contras de las tecnologías de *frontend* y *backend* consideradas para el proyecto ISPP.

## **3.1. Tecnologías Frontend**

### **Opción 1: React**

| Pros | Contras |
| :---- | :---- |
| Amplia comunidad y ecosistema de librerías. | Curva de aprendizaje inicial ligeramente más alta que Vue. |
| Altamente escalable mediante técnicas como *lazy loading* y patrones de renderizado eficientes (SSR/ISR). | Dependencia de librerías externas para *routing* y gestión de estado. |
| Contratación sencilla de talento con experiencia. |  |

### **Opción 2: Angular**

| Pros | Contras |
| :---- | :---- |
| Solución completa (incluye *routing*, formularios, gestión de estado). | Marco de trabajo más prescriptivo y voluminoso. |
| Fuerte soporte de Google, ideal para aplicaciones empresariales. | Curva de aprendizaje más pronunciada (TypeScript, RxJS). |

### **Opción 3: Vue.js**

| Pros | Contras |
| :---- | :---- |
| Muy fácil de aprender y de integrar en proyectos existentes. | Comunidad ligeramente menor que React y Angular. |
| Rendimiento comparable al de React, sintaxis clara. | Menos adecuado para proyectos extremadamente grandes y complejos sin Vuex/Pinia. |

## **3.2. Tecnologías Backend**

Para el *backend*, se proponen dos stacks robustos que ofrecen diferentes enfoques en cuanto a rendimiento y modelo de desarrollo.

### **Opción 1: Node.js (Express)**

| Pros | Contras |
| :---- | :---- |
| Lenguaje unificado (*full-stack* JavaScript), reduce el cambio de contexto. | Naturaleza *single-threaded* puede requerir manejo de *clusters* para cargas extremas. |
| Excelente para aplicaciones de E/S intensiva (I/O Bound). | Ecosistema en constante cambio (dependencias). |
| Escalabilidad horizontal sencilla permite fácilmente desplegar múltiples instancias en contenedores para distribuir la carga de usuarios de forma eficiente. | Una mala gestión de la asincronía puede hacer que el código de reglas de negocio complejas sea muy difícil de seguir y depurar. |

### **Opción 2: Python (Django/Flask)**

| Pros | Contras |
| :---- | :---- |
| Desarrollo muy rápido (*batteries included* con Django). |  Requiere una configuración específica de servidores ASGI para competir en rendimiento bajo alta concurrencia pura. |
| Código limpio y legible, ideal para proyectos con mucha lógica de negocio. | La gestión de dependencias se puede complicar en proyectos de gran escala. |
| Amplio uso en Ciencia de Datos e IA, facilitando integraciones. |  |

### **Opción 3: .NET (ASP.NET Core)**

| Pros | Contras |
| :---- | :---- |
| C\# previene errores en tiempo de compilación, ideal para manejar cálculos de cuotas y presupuestos. | Requiere más líneas de código para tareas simples en comparación con Python o Node.js. |
| Integración de IA: Gracias a Semantic Kernel, la integración de modelos de lenguaje (LLMs) en C\# es ahora tan fluida como en Python. | Los servicios gestionados de nivel profesional suelen asociarse al ecosistema de pago de Azure. |

# 4. Desafíos tecnológicos y estrategias de mitigación

Desarrollar una aplicación de gestión para residencias universitarias implica manejar dos grandes retos: **optimizar los costes de IA** y garantizar la **estabilidad del sistema** ante cargas simultáneas de archivos.

## 4.1. El reto de la IA: ¿Cómo ahorrar en "Tokens"?
Cada palabra que la IA lee o escribe tiene un coste (tokens). Si enviamos reglamentos de 50 páginas enteros cada vez que alguien pregunta algo, el coste sería inviable.

* **Problema:** Indexar cientos de documentos masivos puede agotar el presupuesto en minutos y bloquear el acceso por exceso de peticiones.
* **Soluciones planteadas:**
    * **La Solución (RAG):** No le damos todo el libro a la IA. Dividimos el texto en "trozos" (*chunks*) y los guardamos en una base de datos especial (**PostgreSQL con pgvector**). Cuando el alumno pregunta, buscamos solo los 2 o 3 trozos relevantes y se los pasamos a la IA.
    * **La Estrategia de Trazabilidad:** Usamos un "DNI" para cada archivo (**Hash SHA-256**). Si el archivo no ha cambiado, no dejamos que la IA lo vuelva a leer. Esto ahorra un **95% del coste**.
    * **Persistencia:** Para cada documento, el sistema persistirá en PostgreSQL no solo los vectores, sino también un resumen automático, la versión del modelo utilizado y la fecha de indexación, garantizando la trazabilidad total.

### 4.1.1. Cuantificación y estimación de costes (Justificación del Riesgo)
Para que la residencia acepte el proyecto, usamos esta fórmula simple de presupuesto:

$$Total = (Páginas \times Tokens \times Precio) + (Consultas \times Tokens \times Precio)$$

Usando modelos económicos como **GPT-4o mini**, el coste de procesar 500 páginas baja de varios euros a apenas unos céntimos. Además, usamos **Redis** para guardar las respuestas de las preguntas más típicas, evitando llamar a la IA dos veces por lo mismo.

---

## 4.2. Almacenamiento eficiente y seguridad de datos sensibles
Guardar fotos de averías y contratos directamente en la base de datos es un error crítico que ralentiza el sistema.

* **Problema:** Si guardamos archivos binarios (PDF o imágenes) "dentro" de PostgreSQL, el tamaño de la base de datos crece exponencialmente, haciendo que las copias de seguridad tarden horas. Además, los enlaces públicos permanentes son una vulnerabilidad de seguridad.
* **Soluciones planteadas:**
    * **Object Storage:** Se utilizará un servicio especializado (**Supabase Storage o S3**). La base de datos sólo almacenará la "Object Key" (una referencia de ruta), manteniéndose ligera.
    * **URLs firmadas (Acceso bajo demanda):** El sistema generará una URL firmada temporal cada vez que un usuario autenticado solicite ver un documento. El enlace caduca en minutos (ej. 5 min).
    * **Políticas de acceso (RLS/Middleware):** Solo el residente propietario o el administrador pueden solicitar la generación de dicha URL.

---

## 4.3. El Reto del tiempo: Procesamiento asíncrono (Queue + Workers)
Las tareas pesadas como leer un PDF o hacer OCR no deben bloquear la conexión del usuario.

* **Problema:** Si el servidor intenta procesar archivos mientras el usuario espera la respuesta HTTP, la conexión se cortará por *timeout*.
* **Solución (Sistema de "Ticket de Pedido"):**
    1.  **Cajero (API):** Recibe el archivo, lo guarda y devuelve un ID de tarea ("Pedido recibido").
    2.  **Tablón de anuncios (Redis):** Cola donde se anotan los pedidos pendientes.
    3.  **Cocineros (Workers):** Procesos en segundo plano que ejecutan el OCR, generan miniaturas, crean los *chunks* y los *embeddings*.
    4.  **Pantalla de estado (Frontend):** El estudiante ve un estado de "Procesando" que se actualiza a "¡Listo!" vía **WebSockets** sin necesidad de refrescar.

---

# 5. Recomendación Preliminar
Tras el análisis detallado, se determina que la **Alternativa D: Agilidad JS (Node.js + React)** es la opción óptima para NexUS.

## 5.1. Justificación de la elección técnica
* **Agilidad en el Servidor (Node.js + Express):** Entorno orientado a eventos ideal para el Pipeline de IA. Permite atender peticiones mientras se espera a la API de OpenAI.
* **Robustez en el Frontend (TypeScript + React):** TypeScript actúa como un contrato que evita errores de tipado en componentes complejos como el "Modo Senior".
* **Reducción de carga cognitiva:** Mantener un lenguaje común (JS/TS) en todo el stack permite que el equipo sea polivalente y acelera la resolución de bugs.

## 5.2. Estrategia de infraestructura y despliegue (Coste Cero/Bajo)

| Componente | Proveedor Seleccionado | Modelo de Coste |
| :--- | :--- | :--- |
| Backend (Node.js) | **Azure App Service** | Créditos Azure for Students |
| Frontend (React) | **Cloudflare Pages** | Gratis (Tier ilimitado) |
| Archivos (Contratos) | **Cloudflare R2** | Gratis (hasta 10GB) |
| Base de datos | **Supabase** | Gratis (Shared Instance) |
| Cola de tareas | **Upstash** | Gratis (Serverless Tier) |

## 5.3. Matriz de decisión de stacks (Scores)

| Criterio de Evaluación | A. IA-First | B. Full-Stack | C. Tradicional | **D. Agilidad JS** | E. Potencia Ent. |
| :--- | :---: | :---: | :---: | :---: | :---: |
| Velocidad de Desarrollo | 3 | 5 | 2 | **5** | 3 |
| Curva de Aprendizaje | 3 | 4 | 2 | **5** | 1 |
| Integración de IA | 5 | 5 | 3 | **4** | 4 |
| Integración Diseño (Figma)| 2 | 3 | 2 | **5** | 3 |
| Consistencia de Datos | 4 | 5 | 5 | **4** | 5 |
| **TOTAL SCORE** | **17** | **22** | **14** | **23** | **16** |

## 5.4. Conclusión estratégica
La **Opción D** se consolida como la ganadora con **23 puntos**. Esta elección minimiza el riesgo financiero del MVP y maximiza la velocidad de entrega, permitiendo que NexUS crezca de forma estable y escalable.
