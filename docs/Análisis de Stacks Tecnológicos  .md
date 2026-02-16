# **Análisis de stacks tecnológicos - NexUS**

Este documento presenta un análisis de la competencia y una evaluación de los posibles stacks tecnológicos para el proyecto **NexUS**. El objetivo es seleccionar un conjunto de tecnologías frontend y backend óptimo que garantice la escalabilidad, mantenibilidad y rendimiento del producto final.

---

# **1. Análisis de la competencia**

El patrón observado tras comprobar los stacks de la competencia muestra una fuerte tendencia hacia frameworks de JavaScript en el frontend aunque hay gran diversidad en el backend, siendo notable la presencia de .NET. Para llevar a cabo el análisis se han tenido en cuenta datos publicados por los propios competidores en sus respectivas webs o en foros como [stackshare](https://stackshare.io/). En algunos casos se han usado datos inferidos proporcionados por plataformas fiables como [builtwith](https://builtwith.com/).

| Competidor    | Modelo de Negocio                | Stack Tecnológico (Frontend/Backend) | Notas Relevantes                                                                                                                                                                   |
| :------------ | :------------------------------- | :----------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Entrata       | PaaS/ Suscripción B2B            | React / PHP / AWS                    | Enfoque en Plataforma como Servicio. Tiene una arquitectura orientada a microservicios que usa AWS Lambda.                                                                         |
| StarRez       | Suscripción B2B                  | React / .NET (C#) / SQL Server       | Usa Microsoft Power Automate, para mejorar el rendimiento de flujos complejos como roommate matching basado en afinidad.                                                           |
| Yardi Student | Licencia Enterprise              | Angular / .NET / SQL Server          | Destaca por su integración nativa con Power BI, permitiendo crear dashboards intuitivos a partir de datos que optimizan por ejemplo las rentas de las habitaciones en tiempo real. |
| Breezeway     | SaaS por Propiedad/Unidad        | React Native / Python                | Incluye herramientas de mensajería automatizada, inspecciones con IA para control de calidad y suministros mediante Computer Vision.                                               |
| Convivo App   | Freemium / Suscripción Community | Flutter / Node.js / Firebase         | Orientada a la experiencia del residente. Notificaciones y chat en tiempo real muy optimizados.                                                                                    |
| ResiPlus      | Suscripción Community            | React Native / .NET                  | Su arquitectura permite la generación de informes oficiales para la administración pública, ventaja en el sector sociosanitario y residencias de mayores.                          |

---

# **2. Stacks propuestos**

Estas propuestas han sido diseñadas para equilibrar la rapidez en el desarrollo del MVP con la escalabilidad necesaria para gestionar residencias de gran escala. Cada stack representa un enfoque distinto: desde la especialización en IA hasta la robustez corporativa.

> Nota clave (actualización): Para NexUS se prioriza **React con TypeScript** como estándar de frontend (con **Vite + SSR**) y se fija como solución ganadora un backend **Django** por su “baterías incluidas”, seguridad y velocidad de entrega.

| Categoría                     | A. IA-First                     | **B. Full-Stack Baterías (GANADORA)**                    | C. Tradicional Robusta       | D. Agilidad JS                       | E. Potencia Empresarial         |
| :---------------------------- | :------------------------------ | :------------------------------------------------------- | :--------------------------- | :----------------------------------- | :------------------------------ |
| **Frontend**                  | React + TypeScript (Vite + SSR) | React + TypeScript (Vite + SSR)                          | Vue.js                       | React + TypeScript (Vite + SSR)      | React + TypeScript (Vite + SSR) |
| **Gestor Dependencias Front** | npm                             | npm                                                      | npm                          | npm                                  | npm                             |
| **Librerías Front (UI/UX)**   | Tailwind + Radix UI             | Shadcn/ui + Tailwind                                     | PrimeVue                     | Flowbite + Lucide Icons              | Shadcn/ui + Tailwind            |
| **Backend**                   | Python (FastAPI)                | **Python (Django + DRF)**                                | Java (Spring Boot)           | Node.js (Express)                    | .NET 8 (C#)                     |
| **Gestor Dependencias Back**  | Poetry                          | pip / Poetry                                             | Maven                        | npm                                  | NuGet                           |
| **Base de Datos**             | PostgreSQL                      | PostgreSQL                                               | MySQL                        | PostgreSQL + Redis                   | SQL Server / Azure SQL          |
| **Lib. IA (Actas/NLP)**       | LangChain + OpenAI              | LlamaIndex/LangChain + OpenAI                            | Spring AI / LangChain4j      | OpenAI SDK (Node)                    | Semantic Kernel                 |
| **Testing (F/B)**             | Jest / Pytest                   | RTL / Pytest                                             | Playwright / Vitest          | Vitest                               | Playwright / xUnit              |
| **Despliegue (F/B/DB)**       | Vercel / Railway / Supabase     | **Cloudflare Pages / Azure App Service / Supabase**      | Railway / Clever Cloud       | Vercel / Fly.io / Supabase + Upstash | Azure App Service               |
| **Multi-tenant**              | DB-Level (Logical Schemas)      | **App-Level (django-tenants)**                           | App-Level (Hibernate Filter) | DB-Level (RLS + Redis tenant-prefix) | DB-Level (SQL Server RLS)       |
| **RBAC**                      | Custom JWT + Decorators         | **Django Auth + DRF Permissions**                        | Spring Security              | Middleware custom                    | ASP.NET Identity + Policies     |
| **Auditoría**                 | Logging estructurado            | **Django Auditlog + Admin**                              | Spring Data Envers           | Winston + Cloud logs                 | EF Audit + Serilog              |
| **RGPD**                      | Field-Level Enc. (Fernet)       | **Field-level encryption + políticas + trazabilidad**    | Spring Crypto (AES-GCM)      | Field-level Encryption (GCM)         | SQL Always Encrypted            |
| **Inmutabilidad**             | Append-only tables              | **Model versioning + append-only en entidades críticas** | JPA Immutable cols           | Append-only + JSONB hashing          | Azure SQL Ledger                |

---

## **Análisis de Alternativas**

### **A. Alternativa IA-First (FastAPI + React TypeScript)**

* **Enfoque:** maximizar rendimiento y flexibilidad para el motor de IA.
* **Pros:** latencia baja, muy adecuada para endpoints orientados a E/S y servicios asíncronos.
* **Contras:** muchas piezas críticas (admin, permisos, auditoría, gestión de usuarios) requieren montaje manual.

### **B. Alternativa Full-Stack Baterías (Django + React TypeScript) — GANADORA**

* **Enfoque:** prioriza seguridad, mantenibilidad y velocidad de entrega del MVP con un core robusto.
* **Pros:**

  * Django Admin acelera la operativa interna (gestión de usuarios, incidencias, contratos, reglas).
  * Modelo de permisos maduro (Django Auth + DRF Permissions) para RBAC granular.
  * Ecosistema ideal para IA/documentos (Python) y para colas de trabajo (Celery/RQ).
  * Frontend escalable con React + TypeScript y renderizado SSR con Vite para mejorar TTFB, SEO y experiencia percibida.
* **Contras:**

  * Django puede sentirse más estructurado que micro-frameworks.
  * El multi-tenant y permisos avanzados requieren diseño (pero con librerías como django-tenants se reduce el riesgo).

### **C. Alternativa Tradicional Robusta (Spring Boot + Vue)**

* **Enfoque:** estabilidad empresarial y transacciones críticas.
* **Pros:** seguridad muy madura y consistencia transaccional fuerte.
* **Contras:** más fricción para IA en comparación con Python; mayor verbosidad.

### **D. Alternativa Agilidad JS (Node.js + React TypeScript)**

* **Enfoque:** unificar stack en TypeScript end-to-end.
* **Pros:** velocidad de iteración y E/S eficiente.
* **Contras:** mayor disciplina necesaria en arquitectura, aislamiento multi-tenant (RLS), y consistencia de reglas de negocio complejas.

### **E. Alternativa Potencia Empresarial (.NET + React TypeScript)**

* **Enfoque:** escalabilidad vertical y seguridad de grado enterprise.
* **Pros:** rendimiento alto y ecosistema corporativo potente.
* **Contras:** coste y lock-in (frecuentemente Azure) si no se controla; más peso en desarrollo para el MVP.

---

# **3. Pros y Contras de las Tecnologías Propuestas**

## **3.1. Tecnologías Frontend**

### **Opción: React + TypeScript (Vite + SSR como estándar)**

| Pros                                                                                      | Contras                                                                             |
| :---------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------- |
| Ecosistema enorme y contratación sencilla.                                                | Requiere decidir librerías (routing/estado) y buenas convenciones.                  |
| TypeScript reduce errores y define “contratos” claros entre pantallas y API.              | Si no se gobierna bien, los tipos pueden crecer en complejidad.                     |
| SSR con Vite mejora el tiempo hasta primer render y la indexabilidad de páginas públicas. | SSR introduce complejidad (hydration, caché, despliegue) si no se parametriza bien. |
| Escalable (lazy loading, patrones de composición, testing sólido).                        |                                                                                     |

## **3.2. Tecnologías Backend (contexto)**

Se mantienen las opciones comparadas (Node, Python, .NET), pero la recomendación final se fija en Django.

### **Opción recomendada: Python (Django + DRF)**

| Pros                                                  | Contras                                                           |
| :---------------------------------------------------- | :---------------------------------------------------------------- |
| Velocidad de entrega (batteries included).            | Necesita buena configuración ASGI/Workers para alta concurrencia. |
| Seguridad y autenticación maduras.                    | Si no se diseña bien, el monolito puede crecer desordenado.       |
| Perfecto para integraciones IA y pipeline documental. |                                                                   |

---

# **4. Desafíos tecnológicos y estrategias de mitigación**

## **4.1. El reto de la IA: ¿Cómo ahorrar en "Tokens"?**

* **Solución (RAG):** chunks + embeddings en PostgreSQL con pgvector.
* **Trazabilidad:** Hash SHA-256 por archivo para evitar reindexado innecesario.
* **Persistencia:** vectores + resumen + versión de modelo + fecha de indexación para auditoría técnica.

## **4.2. Almacenamiento eficiente y seguridad de datos sensibles**

* **Object Storage:** Supabase Storage / S3 / Cloudflare R2.
* **URLs firmadas:** acceso temporal bajo demanda.
* **Políticas de acceso:** validación en backend (Django/DRF) + reglas de negocio.

## **4.3. Procesamiento asíncrono (Queue + Workers)**

* **API (Django/DRF):** recibe archivo, lo guarda y devuelve un task_id.
* **Cola:** Redis (broker) en plan free/low-cost.
* **Workers:** Celery (o Django-RQ) procesa OCR/thumbnails/chunking/embeddings/resumen.
* **Tiempo real:** Django Channels (WebSockets) para actualizar estado en frontend.

---

# **5. Recomendación preliminar (ACTUALIZADA)**

Tras el análisis detallado de los stacks y la evaluación de las capacidades del equipo, se determina que la alternativa ganadora para NexUS es la **Alternativa B: React + TypeScript (Vite + SSR) en frontend, y Django + DRF en backend**.

## **5.1. Justificación de la elección técnica (actualizada)**

* **Django como base estable para el MVP y escalado:**
  Reduce riesgo por incluir autenticación, administración, ORM, validaciones y un ecosistema probado para permisos y auditoría. Acelera módulos críticos: residentes, roles, incidencias, contratos, habitaciones, facturación.

* **IA y pipeline documental integrados de forma natural en Python:**
  Integración directa con librerías de NLP/RAG. El trabajo pesado se externaliza a workers con Celery, evitando bloqueos y timeouts.

* **React + TypeScript con Vite + SSR como estándar de interfaz:**
  TypeScript actúa como contrato API/UI y reduce bugs. SSR con Vite mejora rendimiento percibido (TTFB/First Paint) e indexación en páginas públicas (marketing, accesos informativos), manteniendo una base de código moderna.

* **Menor riesgo arquitectónico que “todo custom”:**
  Frente a stacks donde hay que montar permisos, admin, auditoría y multi-tenant desde cero, Django reduce superficie de fallo y permite concentrarse en el producto.

## **5.2. Estrategia de infraestructura y despliegue (Coste Cero/Bajo)**

| Componente                       | Proveedor Seleccionado           | Modelo de Coste                |
| :------------------------------- | :------------------------------- | :----------------------------- |
| Backend (Django + DRF)           | Azure App Service                | Créditos Azure for Students    |
| Frontend (React TS + Vite SSR)   | Cloudflare Pages                 | Gratis                         |
| Archivos (Contratos/Incidencias) | Cloudflare R2                    | Gratis (hasta ciertos límites) |
| Base de datos                    | Supabase (PostgreSQL + pgvector) | Gratis (Shared Instance)       |
| Cola de tareas                   | Upstash Redis                    | Gratis (Serverless Tier)       |
| Workers                          | App Service / Fly.io / Railway   | Bajo coste / créditos          |

## **5.3. Matriz de decisión de stacks (Scores)**

| Criterio de Evaluación     | A. IA-First | **B. Full-Stack (GANADORA)** | C. Tradicional | D. Agilidad JS | E. Potencia Ent. |
| :------------------------- | :---------: | :--------------------------: | :------------: | :------------: | :--------------: |
| Velocidad de Desarrollo    |      3      |             **5**            |        2       |        5       |         3        |
| Curva de Aprendizaje       |      3      |             **4**            |        2       |        5       |         1        |
| Integración de IA          |      5      |             **5**            |        3       |        4       |         4        |
| Integración Diseño (Figma) |      2      |             **5**            |        2       |        5       |         3        |
| Consistencia de Datos      |      4      |             **5**            |        5       |        4       |         5        |
| **TOTAL SCORE**            |    **17**   |            **24**            |     **14**     |     **23**     |      **16**      |

## **5.4. Conclusión estratégica**

La **Opción B** se consolida como la ganadora con **24 puntos**. Esta elección maximiza la velocidad de entrega del MVP sin sacrificar seguridad ni mantenibilidad, y encaja especialmente bien con los retos del proyecto: multi-tenant, RBAC, auditoría, gestión documental y pipeline de IA con procesamiento asíncrono.
