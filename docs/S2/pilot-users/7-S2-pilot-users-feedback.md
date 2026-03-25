## Feedback Usuarios Piloto – NexUS

<p align="center">
  <img src="../../images/logo-app.png" alt="Logo NexUS" width="500">
</p>

<div align="center">

<p>
  <img src="https://img.shields.io/badge/Versión-1.0.0-blue?style=flat-square" alt="Versión">
  <img src="https://img.shields.io/badge/Estado-En_revisión-yellow?style=flat-square" alt="Estado">
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

---

## Historial de Versiones

| Versión | Fecha       | Cambio principal                                      |
|---------|-------------|-------------------------------------------------------|
| 1.0.0   | 25/03/2026  | Creación del documento base                           |


---

# **Índice**

- [1. Obtención del Feedback](#obtención-del-feedback)
- [2. Semana 12/03](#semana-1203)
  - [2.1 Visión general](#visión-general)
  - [2.2 Gestión de reservas y espacios](#gestión-de-reservas-y-espacios)
  - [2.3 Gestión de incidencias y avisos](#gestión-de-incidencias-y-avisos)
  - [2.4 Gestión de roles y personal](#gestión-de-roles-y-personal)
  - [2.5 Gestión de estudiantes y habitaciones](#gestión-de-estudiantes-y-habitaciones)
- [3. Semana 19/03](#semana-1903)
  - [3.1 Visión general](#visión-general-1)
  - [3.2 Gestión de reservas y espacios](#gestión-de-reservas-y-espacios-1)
  - [3.3 Gestión de incidencias y avisos](#gestión-de-incidencias-y-avisos-1)
  - [3.4 Gestión de roles y personal](#gestión-de-roles-y-personal-1)
  - [3.5 Gestión de estudiantes y habitaciones](#gestión-de-estudiantes-y-habitaciones-1)
  - [3.6 Paquetería](#paquetería)
  - [3.7 Gestión de menús](#gestión-de-menús)
  - [3.8 Chats](#chats)
  - [3.9 Gestión de invitados](#gestión-de-invitados)
- [4. Viabilidad y Disposición de Pago](#viabilidad-y-disposición-de-pago-wtp)

---

# **1. Obtención del Feedback**

Para garantizar que NexUS responde a las necesidades reales de su entorno, hemos implementado un sistema riguroso de recogida de información basado en la experiencia directa de nuestros usuarios piloto. Este proceso es fundamental para validar nuestras hipótesis de diseño y priorizar el desarrollo de funcionalidades.

La obtención del feedback se realiza principalmente a través de formularios estructurados que se distribuyen periódicamente tras cada sesión de pruebas. Estos formularios han sido cuidadosamente diseñados para:

*   **Recoger impresiones cualitativas:** Permitimos a los usuarios expresar con sus propias palabras qué les parece la interfaz, el flujo de navegación y la utilidad general de la herramienta.
*   **Identificar puntos de fricción:** Preguntamos específicamente por dificultades encontradas, errores técnicos o comportamientos inesperados del sistema.
*   **Detectar oportunidades de mejora:** Invitamos a los usuarios a sugerir nuevas funcionalidades o cambios que facilitarían su día a día.

Es importante destacar que este proceso es inclusivo y transversal:
*   **Personal de gestión:** Aportan una visión crítica sobre la eficiencia operativa, la gestión de incidencias y el control de accesos.
*   **Estudiantes:** Valoran la usabilidad móvil, la facilidad para reservar espacios y la utilidad de las herramientas de convivencia.

Esta dualidad nos permite equilibrar las necesidades de gestión con la experiencia de usuario final, asegurando que NexUS aporte valor a todos los actores involucrados en la vida residencial.

---

# **2. Semana 12/03**

### Visión general
* **Feedback general:** La interfaz de usuario es limpia y moderna, facilitando la navegación inicial para los nuevos usuarios.
* **Fallo:** El botón de "Mantener sesión" no funciona; la sesión permanece abierta se marque o no.
* **Fallo:** La recuperación de contraseñas muestra un mensaje de éxito aunque el correo no esté registrado en el sistema, y los correos reales no reciben instrucciones.
* **Fallo:** En la edición de perfil, los cambios no persisten al salir y volver a entrar, y se permite guardar el perfil completamente en blanco sin validación.
* **Fallo:** El campo "Intereses personalizados" del estudiante no tiene límite de caracteres, lo que desmaqueta la interfaz si se introduce un texto muy largo.

### Gestión de reservas y espacios
* **Feedback general:** La funcionalidad de reserva de objetos es muy valorada por facilitar la organización de recursos compartidos.
* **Fallo:** Las reservas finalizadas no se liberan automáticamente en el sistema.
* **Fallo:** Se permite crear varias reservas del mismo objeto en exactamente el mismo intervalo de tiempo.
* **Fallo:** Existe una inconsistencia visual grave: un objeto puede aparecer como "no disponible" para el residente, pero mostrarse "disponible" en la vista del administrador.
* **Problema crítico:** Los eventos creados por administradores no aparecen en la vista de los residentes, impidiendo su visualización e inscripción.

### Gestión de incidencias y avisos
* **Feedback general:** La creación de incidencias funciona correctamente y valida los campos obligatorios.
* **Fallo:** En la vista de administrador, el campo para asignar un técnico es de texto libre y no verifica que el usuario exista en el sistema.
* **Fallo:** La lista de incidencias para el residente no aclara si muestra sus incidencias propias o las globales, y carece de un filtro para separarlas.
* **Mejora:** Los avisos pasados se oscurecen correctamente, pero se sugiere que desaparezcan del tablón para no saturar la interfaz.

### Gestión de roles y personal
* **Feedback general:** La separación de permisos funciona correctamente: un residente no puede acceder como administrador y viceversa.
* **Error crítico:** Un administrador puede crear un usuario de personal, iniciar sesión con él y borrar su propia cuenta activa, lo que colapsa la aplicación.
* **Fallo:** El perfil de administrador permite la introducción de letras en el campo de "Teléfono de contacto".

### Gestión de estudiantes y habitaciones
* **Feedback general:** La estructura de datos de estudiantes es completa y útil para la gestión administrativa.
* **Fallo:** El formulario de alta de residentes presenta múltiples fallos de validación: permite registrar correos inválidos que no cumplen el estándar, nombres con números o símbolos (ej. "22" o "@"), y fechas de check-in en el pasado.
* **Fallo:** El sistema permite la creación de usuarios duplicados con los mismos datos.
* **Fallo:** Aunque el sistema indica que el residente se ha creado correctamente, este luego no aparece en el listado.

---

# **3. Semana 19/03**

### Visión general
* **Feedback general:** Los administradores perciben una mejora significativa en la estabilidad general tras la corrección de errores críticos de la semana anterior. Los estudiantes valoran muy positivamente tener toda la información centralizada en su móvil.

### Gestión de reservas y espacios
* **Feedback general:** Estudiantes muy satisfechos con la visibilidad en tiempo real de espacios como lavadoras y salas de estudio. 

### Gestión de incidencias y avisos
* **Feedback general:** El flujo de cambio de estados (Abierta -> En proceso -> Resuelta) ha reducido enormemente las llamadas y quejas en recepción.

### Gestión de roles y personal
* **Feedback general:** El sistema de permisos es robusto y cumple su función de aislar vistas.
* **Mejora:** Se demanda mayor granularidad en el personal. Un "Conserje" no debería tener los mismos permisos para editar perfiles que el "Director" o "Administración contable". Piden un sub-rol de personal de solo lectura o gestión limitada a su turno.

### Gestión de estudiantes y habitaciones
* **Feedback general:** La asignación visual de habitaciones ayuda mucho en la organización inicial del curso.

### Paquetería
* **Feedback general:** Funcionalidad altamente valorada por recepción. El desorden de cajas es un problema diario en las residencias.
* **Mejora Estudiantes:** Quieren recibir un aviso automático en la app en el momento en el que el paquete se registra en conserjería, con un código de recogida.
* **Mejora Administración:** Integrar un lector a través de la cámara del móvil del conserje o de una tablet para registrar la llegada del paquete en 2 segundos, escaneando directamente la etiqueta del transportista.

### Chats
* **Feedback general:** Útil para la comunicación formal, pero se queda corto frente a alternativas comerciales como WhatsApp o Telegram.
* **Mejora Estudiantes:** Quieren poder crear canales temporales o de temáticas muy específicas sin necesidad de que los apruebe administración.

### Gestión de invitados
* **Feedback general:** Dirección lo considera vital para controlar los accesos y mantener la seguridad del edificio por las noches.

---

# **4. Viabilidad y Disposición de Pago**

Según el modelo de Pago que presentamos a los usuarios piloto, donde ofrecíamos un plan base con lo necesario para gestionar la residencia cómodamente, frente a otro plan premium con funcionalidades avanzadas y personalización propia, creando no solo una aplicación de gestión, sino que fomentan mucho más la vida social, los resultados han sido los siguientes.

**Conclusiones de la Disposición a Pagar:**

1.  **Plan Base:** Las residencias pequeñas e independientes ven esto como el sustituto directo de su actual caos operativo. Están dispuestas a pagar entre **1,50 € y 2,00 € por cama/mes**. Valoran sobre todo la gestión de incidencias básica y las reservas.
2.  **Plan Premium:** Las cadenas de residencias y los colegios mayores con mayor presupuesto muestran interés en este nivel. Ven un inmenso valor en la **Marca blanca** y la **Vida social** (esencial para el marketing y la retención del residente). Su disposición de pago oscila entre **4,00 € y 5,00 € por cama/mes**.

*Nota comercial:* El factor decisivo para que las residencias paguen la cuota Premium es el módulo de Onboarding Completo (importaciones masivas) y el soporte técnico prioritario durante el mes de septiembre, que es su pico máximo de estrés operativo.