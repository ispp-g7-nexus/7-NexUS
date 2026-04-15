## SPRINT 2
---

### Módulo: Revisiones

* **[Revisiones_Grupo1] Hacer revisión en profundidad de la aplicación del grupo 1.** (`NX-S2.01`)
    > Desc: Esta tarea se asignará a 3 personas estas personas deberán dividirse las distintas partes de la aplicación y hacer una revisión durante 1h a fondo de lo que tienen hehco generanod cada uno un informe de incidencias que vean. (Revisión muy en profundidad buscando todos los detalles)

* **[Revisiones_Grupo10] Hacer revisión en profundidad de la aplicación del grupo 10.** (`NX-S2.02`)
    > Desc: Esta tarea se asignará a 3 personas estas personas deberán dividirse las distintas partes de la aplicación y hacer una revisión durante 1h a fondo de lo que tienen hehco generanod cada uno un informe de incidencias que vean. (Revisión muy en profundidad buscando todos los detalles)

### Módulo: Panel Residencias

* **[Admin/Room] Ver detalle de una habitación.** (`NX-S2.03`)
    > Desc: Desde el menú de habitaciones del administrador debería ser posible acceder a los detalles de la habitación al hacer click en cualquiera de ellas(Esto implica tanto frontend como backend, para entender mejor mirar los mockups).

* **[Admin/Residentes] Lógica de asignación de estudiantes a habitaciones.** (`NX-S2.04`)
    > Desc: Al dar de alta en la residencia a un nuevo estudiante debe poder asignarsele una habitación.

* **[Refactor] [Admin/Room/UX/UI] Detalle descripción habitaciones en listado general** (`NX-S2.05`)
    > Descripción: En la tarjeta del listado de una habitación debe de poderse ver los el residente/ residentes que viven en la misma sin necesidad de abrir el detalle (Para entender mejor mirar los mockups).

* **[Refactor] [Admin/Room/UX/UI] Refactorización vista de los botones de las habitaciones** (`NX-S2.06`)
    > Descr: Dejar en la zona de listado de habitaciones un único botón para ver los detalles e introducir las opciones de edición y eliminación de la misma dentro de los detalles (Para entender mejor mirar los mockups). [Deps --> NX-S2.03]

* **[Refactor] [Admin/Room] Filtrado de habitaciones** (`NX-S2.07`)
    > Descripción: Darle una vuelta a los filtros que ya existen añadiendo alguno más que pueda proporcionar una mejor experiencia de usuario(mirar en los mockups pero no centrarse solo en esos sino pensar en algunos útiles)

* **[Refactor] [Admin/MenuDesplegble] Vista de usuario activo en el menú lateral.** (`NX-S2.08`)
    > Desc: Al abrir el menú lateral encima de Cerrar sesión se debe mostrar el usuario con el que se está logueado.

### Módulo: Incidencias

* **[Admin/Incidencias] Poder crear una nueva incidencia.** (`NX-S2.09`)
    > Desc: Poder crear desde el panel de administración una nueva incidencia, para ver los campos de creación basarrse un poco de como se hace en la interfaz de residente, añadiendole los campos que se ven en la edición de incidencias como admin, al crear una incidencia además tener en cuenta que te permita asignarla a un miembro del staff y que cuando aparezca el dropdown para seleccionar dicho miembro puedas filtrar por rol. (Si hay alguna duda preguntar PO) [Similitud --> NX-S2.10]

* **[Admin/Incidencias] Asignación de staff al gestionar incidencias.** (`NX-S2.10`)
    > Desc: Modificar el campo de asignar técnico a incidencia para que aparezca como un dropdown en el que se pueda filtrar por rol del staff. [Similitud --> NX-S2.09]

* **[Residente/Incidencias] Funcionalidad para adjuntar imágenes a incidencias.** (`NX-S2.11`)
    > Desc: Como residente poder adjuntar una imagen a la hora de enviar el reporte de una nueva incidencia (Campo opcional). [Similitud --> NX-S2.12]

* **[Admin/Incidencias] Funcionalidad para adjuntar imágenes a incidencias como administrador.** (`NX-S2.12`)
    > Desc: Como administrador poder adjuntar una imagen a la hora de una nueva incidencia (Campo opcional). [Deps --> NX-S2.09] [Similitud --> NX-S2.11]

* **[Admin/Incidencias] Interfaz de gestión de incidencias añadir pipeline.** (`NX-S2.13`)
    > Descripcion: Primero cambiar el nombre del botón de gestionar actual para que se llame editar incidencia. Crear un nuevo botón de gestionar una incidencia donde se genere un pipeline con un único puntito de pipeline y un cuadro de texto y abajo en la vista dos botones uno de actualizar estado y otro de cerrar incidencia.
    > Para actualizar un estado habria que añadir un texto descriptivo del nuevo estado en el cuadro de texto y al pulsar en actualizar estado se generaría un nuevo punto que estaría visualmente en PENDING con esa descripción pasando el anterior a done, cuando ya no haya más estados se pulsaría en Cerrar incidencia lo cual dejaría en Done el punto actual y generaría al final del todo un nuevo punto con Status END que indicaría el fin de la incidencia. (Pedir a equipo de Mockups que haga el mock de esto)

* **[Residente/Incidencias] Eliminar doble botón de X de la interfaz.** (`NX-S2.14`)
    > Desc: Aparecen en la interfaz de incidencias de residentes 2 botones para salir de la pantalla.

### Módulo: Reservas Espacios Comunes

* **[Refactor] [Residente/EspaciosComunes] Mejorar sistema de horas de reserva.** (`NX-S2.15`)
    > Descr: Hacer que se asemeje un poco más al de los mockups, ya que dando total libertad con el scroll de horas y minutos, es muy complicada la gestión de reservas coincidentes. A la hora de reservar poder escoger fecha que sea como en los mocks(aunque en un futuro podría ser tipo calendario)

* **[Residente/Espacioscomunes] Visualización de disponibilidad en tiempo real.** (`NX-S2.16`)
    > Descr: Antes de reservar una hora en concreto poder ver que horas ya están reservadas y que no deje al usuario reservar en esa franja horaria. [Deps --> NX-S2.15]

### Módulo: Comunicación

* **[Admin/Chats] Poder acceder desde el panel de admin a los chats.** (`NX-S2.17`)
    > Desc: Generar entrada en el panel de admin que lleve a la interfaz de los chats, donde esten los chats para poder hablar y los botones de creación, eliminación, adición de miembros... En la creación el admin debe de poder marcar con un checkbox un chat como básico y de ese chat nadie se puede salir.

* **[Admin/Chats] CRUD de chats.** (`NX-S2.18`)
    > Desc: Poder crear, editar, elimar o ver un chat y listar todos en pestañas, solo los administradores pueden crear los chats que quieran(por ej. avisos, general,....). En esta versión a la hora de crear un chat adición de miembros muy básica. [Deps --> NX-S2.17]

* **[Residente/Chat] Poder acceder desde la vista de residente a los chats.** (`NX-S2.19`)
    > Desc: Crear la entrada en la UI que esté conectada al backend de chats para gestionar los chats como residente.
    > [deps --> NX-S2.18]

* **[User/Chats] Como usuario poder abandonar un chat.** (`NX-S2.20`)
    > Desc: Botón de salida de chat al entrar en el detalle de loos miembros tipo whatsapp o algo así. En caso de chats básicos de la residencia que estén marcados no se pueede. [Deps--> NX-S2.18]

* **[User/Chats] Como administrador de chat(NO ADMIN DE RESI).** (`NX-S2.21`)
    > Desc: Poder eliminar personas del chat y hacer admin a personas del chat, y siendo admin de la residencia siempre eres admin de los chats. [Deps--> NX-S2.18]

### Módulo: Paquetería

* **[Admin/Paqueteria] Hacer CRUD de paqueteria** (`NX-S2.22`)
    > Desc: Como administrador poder registrar nuevos paquetes asignandolos a un residente(que se envíe al form los residentes no un campo de texto), poder editar los paquetes ya registrados o eliminar el registro.

* **[Admin/Paqueteria] Marcar paquete entregado** (`NX-S2.23`)
    > Desc: Como administrador poder marcar la entrega de un paquete.
    > [Deps --> NX-S2.24]

* **[Admin/Paqueteria] Crear vista de paquetería (Frontend).** (`NX-S2.24`)
    > Desc: Crear la sección de paquetería del panel de administración y que al acceder a ella tenga entradas para marcar como entregado paquetes, dar de alta llegada de paquetes, editar, eliminar o ver el detalle de un paquete.
    > [Deps --> NX-S2.22]

* **[Residente/Paqueteria] Crear vista de paquetería.** (`NX-S2.25`)
    > Desc: Crear la sección de paquetería de la sección de residentes y que al acceder a ella se puedan ver paquetes pendientes de recoger del usuario y su historial de paquetes. Sin QR, fijarse en mockups.
    > [Deps --> NX-S2.22]

* **[Residente] Notificación de llegada.** (`NX-S2.26`)
    > Desc: Como residente quiero que se me notifique cuando se me asigne un paquete.
    > [Deps -> NX-S2.22]

### Módulo: Residentes

* **[Refactor] [Admin/Residentes] Edición de residentes.** (`NX-S2.27`)
    > Desc: No poder cambiarle la contraseña a un residente desde la edición de residentes.

### Módulo: Social

* **[Refactor] [Residente/Social] Cambiar visiualización perfil.** (`NX-S2.28`)
    > Desc: Poner pestaña de visión de perfil más accesible (en el menú de debajo de la vista de residente) está demasiado escondido.

### Módulo: Gestión de Roles

* **[Admin/Roles] Gestión de menús** (`NX-S2.29`)
    > Desc: Como administrador me gustaría al crear un rol poder indicar a que pantallas del panel de administrador tiene acceso ese rol, al editar también poder cambiarlo.
    > (Sería necesario tener seedeados los menús en base de datos en una tabla menús por defecto ya que es algo que no cambia)

* **[Admin/Roles] Gestión de permisos adheridos a menú** (`NX-S2.30`)
    > Desc: Como administrador me gustaría al acceder al menú de opciones de un rol que haya una pestaña permisos donde de cada menú asignado al rol poder asignarle distintos permisos, creación, edición, visión o eliminación eligiendo cuales puede hacer, si se pone cualquier permiso de edición, creación o eliminación el de visión debe estar activo.
    > [Deps --> NX-S2.29]

### Módulo: Premium

* **[Admin/Premium] Interfaz de customización de la imagen de marca de la residencia** (`NX-S2.31`)
    > Desc: Como admin me gustaría tener una ventana donde poder personalizar la interfaz de mis residentes al usar la aplicación

* **[Admin/Premium] Modificar el banner e icono en el header de la aplicación** (`NX-S2.32`)
    > Desc: Como admin me gustaria que los residentes pudiesen ver un banner personalizado, cambiando el icono de NexUS por el logo de la residencia.
    > [Deps --> NX-S2.31]

* **[Admin/Premium] Añadir colores dinámicos según la customización del administrador** (`NX-S2.33`)
    > Desc: Como admin me gustaría personalizar la paleta de colores de las pantallas en específico. Que se pueda modificar el color de los titulos, de los subtitulos, descripcines, scroll laterales.
    > [Deps --> NX-S2.31]

### Módulo: Comedor

* **[Admin/Comedor] CRUD de menú semanal.** (`NX-S2.34`)
    > Desc: Como administrador quiero poder crear el menú de la semana, ver el listado dividido por días, poder editar dicho menú planificar próximas semanas... (Fijarse en los mockups)

* **[Residente/Comedor] Vista comedor y cocina.** (`NX-S2.35`)
    > Desc: Como residente quiero poder ver el menú de la semana, el de las próximas semanas y ver las solicitudes especiales. 
    > [Deps--> NX-S2.34]

* **[Residente/Comedor] Vista menú** (`NX-S2.36`)
    > Desc: Como residente quiero poder ver el menú de la semana, donde se vea que platos son parte del almuerzo y cena, junto con detalles como la descripción, sin gluten, vegano... 
    > (Ver mockups de admin para más detalle).
    > [Deps--> NX-S2.35]

* **[Residente/Comedor] Ver menús ya planificados para próximas semanas** (`NX-S2.37`)
    > Desc: Como residente quiero poder ver los menus ya planificados de las próximas semanas, donde se vea que platos son parte del almuerzo y cena, junto con detalles como la descripción, sin gluten, vegano... 
    > Que aparezca un selector de semana para mostrar el menu de esa semana en concreto, si es que hay registrado para las próximas semanas (No está en los mockups).
    > [Deps--> NX-S2.35]

### Módulo: Legal

* **[Admin/Legal] Eliminación usuario residente** (`NX-S2.38`)
    > Desc: Como administrador quiero que se bloquee/cierre la cuenta de un residente que está logueado una vez su cuenta se elimine/inhabilite.

### Módulo: Visitante

* **[Admin/Visitante] Listado de invitados** (`NX-S2.39`)
    > Desc: Como administrador quiero poder ver historial/lista de visitantes de la residencia (pasados y actuales).

* **[Admin/Visitante] Visualizar detalles de invitados** (`NX-S2.40`)
    > Desc: Como administrador quiero poder ver los detalles de cada visitante.
    > [Deps --> NX-S2.39]

* **[Admin/Visitante] Total de invitados** (`NX-S2.41`)
    > Desc: Como administrador quiero poder ver el nº total de invitados que hay actualmente en mi residencia.
    > [Deps --> NX-S2.39]

* **[Residente/Visitante] Listado de pases activos** (`NX-S2.42`)
    > Desc: Como residente quiero ver lista de pases de invitados activos.

* **[Residente/Visitante] Historial de pases** (`NX-S2.43`)
    > Desc: Como residente quiero ver el historial de pases expirados.

* **[Residente/Visitante] Crear nuevo pase invitado** (`NX-S2.44`)
    > Desc: Como residente quiero poder crear un nuevo pase para un invitado.

### Módulo: Notificaciones

* **[Refactor] [Residentes/Notificaciones] Coherencia notificaciones** (`NX-S2.45`)
    > Desc: Como residente quiero que cuando clico en icono notificaciones (en cualquier módulo) aparezca las notificaciones recientes.

* **[Refactor] [Residentes/Notificaciones] Coherencia notificaciones** (`NX-S2.46`)
    > Desc: Como residente quiero que si he visualizado previamente las notificaciones y no hay nuevas, no me aparezca el puntito rojo simulando notificacion.

* **[Refactor] [Admin/Notificaciones] Coherencia notificaciones** (`NX-S2.47`)
    > Desc: Como admin quiero que cuando clico en icono notificaciones (en cualquier módulo) aparezca las notificaciones recientes.

* **[Refactor] [Admin/Notificaciones] Icono notificaciones** (`NX-S2.48`)
    > Desc: Como admin quiero que si he visualizado previamente las notificaciones y no hay nuevas, no me aparezca el puntito rojo simulando notificacion.

### Módulo: Panel de Control

* **[Admin/PanelControl] Botón MiPerfil** (`NX-S2.49`)
    > Desc: Como admin quiero que en el Panel de control se muestre un botón para el módulo Perfil que me redirija directamente.

* **[Admin/PanelControl] Botón Cerrar Sesión** (`NX-S2.50`)
    > Desc: Como admin quiero que en el Panel de control se muestre un botón "Cerrar Sesión" visual.

* **[Residente/PanelControl] Botón MiPerfil** (`NX-S2.51`)
    > Desc: Como residente quiero que en el Panel de control se muestre (a la izquierda) en el footer el botón del módulo Perfil que me redirija a ese módulo directamente.

* **[Residente/PanelControl] Icono MiPerfil** (`NX-S2.52`)
    > Desc: Como residente quiero que el icono de social sea el icono del botón Mi Perfil y se cambie el icono social a otro más intuitivo.
    > [Deps --> NX-S2.51]

### Módulo: Perfil

* **[Admin/Perfil] Botón Cerrar Sesión** (`NX-S2.53`)
    > Desc: Como admin quiero que en MiPerfil se muestre un botón "Cerrar Sesión" visual.

* **[Residente/Perfil] Botón Cerrar Sesión** (`NX-S2.54`)
    > Desc: Como residente quiero que en MiPerfil se muestre un botón "Cerrar Sesión" visual.

### Módulo: Todos

* **[Residente/Todos] Navegación Atrás** (`NX-S2.55`)
    > Desc: Como residente quiero poder navegar de forma intuitiva con un "Botón hacia atrás" que me lleve a la pantalla anterior.

* **[Admin/Todos] Navegación Atrás** (`NX-S2.56`)
    > Desc: Como admin quiero poder navegar de forma intuitiva con un "Botón hacia atrás" que me lleve a la pantalla anterior para evitar usar la barra de navegación lateral.

### Módulo: Matching

* **[Residente/Matching]: Rediseño de matches** (`NX-S2.57`)
    > Desc: Como residente quiero un diseño del listado de matches más descriptivo y visual

<br>

## SPRINT 3
---

### Módulo: Panel Residencias

* **[Admin/Room] Ver perfil de estudiante desde su habitación.** (`NX-S3.01`)
    > Desc: Al acceder al detalle de una habitación se muestran sus estudiantes asociados junto con un botón de perfil, al clicar encima del estudiante o del botón debe abrirte el perfil del estudiante en cuestión (Para entender mejor mirar los mockups).

* **[Admin/Room] Ver historial de acciones efectuadas sobre una habitación.** (`NX-S3.02`)
    > Desc: En el detalle de una habitación aparece un botón abajo de ver historial al clickar debe de mandar a un pop-up de historial en el que aparezca un registro de eventos de la habitación (Para poder entender mirar los mockups de figma).

* **[Technical_debt] [Admin/Room] Formulario de edición de habitaciones** (`NX-S3.03`)
    > Desc: Comprobar en los mockups los campos que necesita el formulario(el de descripción) y corregirlo para que se asemeje a lo esperado.

* **[Admin/Room] Vista en forma de mapa de las habitaciones.** (`NX-S3.04`)
    > Descripción Se necesita que las habitaciones aparezcan en forma de mapa dividido por edificios y plantas, y que esta vista esté asociado al CRUD ya existente para ver el detalle de cada una al clicar en ella(mirar en los mockups)

* **[Admin/PanelControl] Ver analíticas rápidas al scrollear en el panel.** (`NX-S3.05`)
    > Desc: Muestro de analíticas de actividad reciente y ocupación del edificio en la zona baja del menú de administrador(mirar en los mockups para entender mejor)

### Módulo: Incidencias

* **[Residente/Incidencia] Notificaciones push/email sobre cambios en incidencias propias.** (`NX-S3.06`)
    > Desc: Cada vez que haya una nueva nota o un cambio de estado en una incidencia propia que llegue una notificación en la app/un_correo_al_email, hacer plantilla de mensaje para ello que incluya el nombre de la incidencia y de que estado a que estado ha pasado o si se ha añadido alguna nota(sin especificar que pone).

* **[Admin/Incidencias] Lógica de priorización automática de incidencias.** (`NX-S3.07`)
    > Desc: Comprobar si actualmente muestra el listado por orden de urgencia y prioridad, si no lo hace que lo haga.

### Módulo: Reservas Espacios Comunes

* **[Admin/EspaciosComunes] Poder añadir imagen al crear o editar un espacio.** (`NX-S3.08`)
    > Desc: Que el formulario de edición y creación de espacios contemple la adición de una imagen y hacer la gestión correspondiente en el backend. (no hay mockups)

* **[Backend] Sistema de recordatorios automáticos de reservas.** (`NX-S3.09`)
    > Descr: Cuando se aproxime la hora de inicio de la reserva que llegue una notificación en la app al residente avisándole de que pronto iniciará su reserva del espacio.

### Módulo: Comunicación

* **[Admin/Chats] Adición de miembros al chat.** (`NX-S3.10`)
    > Desc: A la hora de crear un nuevo chat o a la hora de añadir miembros a uno existente, que tenga atajos de adición rápida, tipo select all que permita meter a todos los residentes, o select condicionales que por ejemplo permitan incluir a todas las personas apuntadas a un evento concreto para crear el chat del evento(caso de uso mencionado por usuario piloto).

* **[Admin/Eventos] Creación rápida de chat.** (`NX-S3.11`)
    > Desc: A través de un botón de bocadillo de texto que salga en la tarjeta del evento creado por el admin, sea un atajo para crear el chat del evento que incluye automáticamente a su owner y a todos los participantes.
    > [Sim --> NX-S3.12]

* **[Residente/Eventos] Creación rápida de chat.** (`NX-S3.12`)
    > Desc: A través de un botón de bocadillo de texto que salga en la tarjeta del evento creado por el admin, sea un atajo para crear el chat del evento que incluye automáticamente a su owner y a todos los participantes.
    > [Sim --> NX-S3.11]

* **[Admin/Chats] Poder borrar mensajes ajenos de chats.** (`NX-S3.13`)
    > Desc: como administrador de la residencia(que no del grupo) puedes moderar todos los chats borrando cualquier mensaje que veas oportuno

### Módulo: Comunicación (Chats Recomendados)

> {No sabemos si hacer que cualquier persona pueda hablarle a cualqier otra en chat privado a traves de la app hay que debatirlo}

* **[Backend] Chats recomendados.** (`NX-S3.14`)
    > Desc: A través del sistema de matching que te muestre arriba de la sección de chats, posibles personas con las que podría gustarte hablar aunque no hayais dado a conectar tipo recomendación(Tipo top 5 personas con las que podria gustarte hablar y que sea un scroll lateral o algo por el estilo). Y otra sección de conexiones que sea un acceso rápido al chat con las personas con las que has conectado previamente.

### Módulo: Comedor

* **[Residente/Comedor] Ver estado de MIS solicitudes** (`NX-S3.15`)
    > Desc: Como residente quiero poder ver en el menu de solicitudes una lista con MIS solicitudes pendientes y aprobadas.
    > (Ver mockups de admin para más detalle, sería sin los botones de rechazar y aprobar, solo mostraría el estado).

* **[Residente/Comedor] Crear solicitudes** (`NX-S3.16`)
    > Desc: Como residente quiero a través de un botón acceder a una vista para crear una solicitud especial.
    > (Esto no está en los mockups).
    > [Deps --> NX-S3.15]

* **[Residente/Comedor] Sistema de autorización de recogida por otro residente eligiendo menú** (`NX-S3.17`)
    > Desc: Como residente me gustaría poder seleccionar a través del menú del día / o el de esa semana el menú que quiero ese día y la persona que me lo puede recoger.
    > Esta opción es solo por si quieres que alquien te recoja el menú. Al realizar esta selección le aparecería a esa persona una solicitud especial o de picnic (aún por decidir) para rechazar o aprobar la solicitud.
    > (Esto no está en los mockups).

* **[Residente/Comedor] Gestionar solicitudes de recogida.** (`NX-S3.18`)
    > Desc: Como residente quiero poder acceder a una sección de solicitudes donde poder ver solicitudes recibidas pudiendo aprobar o rechazar las solicitudes de recogida de comida que me lleguen.

* **[Admin/Comedor]: Sección picnics( ver si meterlo en nueva seccion o en solicitudes especiales) --> Al no poderse aceptar o rechazar plantear si cuanod pasa la comida en la que esta planificada se borre auto de la vista** (`NX-S3.19`)
    > Desc: Como administrador me gustaría poder ver las personas que han solicitado que se le recoja la comida y quien se la va a recoger y que al clicar en la solicitud poder ver el menu escogido 
    > e incluir filtro de búsqueda.(No hacerlo como en los mockups que está dentro de solicitudes especiales)

### Módulo: Legal

* **[Admin/Legal] Modificación términos legales** (`NX-S3.20`)
    > Desc: Como administrador quiero poder modificar los términos legales de la residencia.

### Módulo: Visitante

* **[Admin/Visitante] Filtrado de invitado** (`NX-S3.21`)
    > Desc: Como administrador quiero poder filtrar los invitados de la residencia por nombre y estado (todos, en residencia y salida).

* **[Admin/Visitante] Introducir hora salida residencia** (`NX-S3.22`)
    > Desc: Como administrador quiero poder introducir una hora de salida por defecto de mi residencia (no está en figma).

* **[Admin/Visitante] Cambio de color a rojo el panel contador de visitantes** (`NX-S3.23`)
    > Desc: Como administrador quiero poder ver como el panel contador de visitantes cambia a rojo alertandome que nº visitantes hay fuera de horario dentro de la residencia.
    > [Deps --> NX-S3.22]

* **[Admin/Visitante] Notificación al administrador** (`NX-S3.24`)
    > Desc: Como administrador quiero que me notifique que quedan visitantes dentro de la residencia fuera de horario (pasada la hora de salida).
    > [Deps --> NX-S3.22]

* **[Admin/Visitante] Añadir visitante** (`NX-S3.25`)
    > Desc: Como administrador quiero poder añadir visitantes a un residente.

* **[Residente/Visitante] Compartir pase** (`NX-S3.26`)
    > Desc: Como residente quiero compartir mi pase con el invitado.

* **[Residente/Visitante] Generación qr/código numérico** (`NX-S3.27`)
    > Desc: Como residente quiero que se autogenere un código qr/código numérico para el pase de invitado.

* **[Residente/Visitante] Notificación pre-aviso hora salida** (`NX-S3.28`)
    > Desc: Como residente quiero que me notifiquen que quedan 10 min para la hora de salida del invitado.
    > [Deps --> NX-S3.22]

### Módulo: Notificaciones

* **[Residentes/Notificaciones] Descartar notificaciones** (`NX-S3.29`)
    > Desc: Como residente quiero poder descartar las notificaciones del desplegable de notificaciones (Con una X por ej.)

* **[Admin/Notificaciones] Descartar notificaciones** (`NX-S3.30`)
    > Desc: Como administrador quiero poder descartar las notificaciones del desplegable de notificaciones (Con una X por ej.)

### Módulo: Matching

* **[Residente/Matching]: Like de matches** (`NX-S3.31`)
    > Desc: Como residente quiero poder darle like a los matches que me aparezcan listados. Si la otra persona devuelve el like, abrir un chat entre ambos.  [Deps--> chats]

* **[Residente/Matching]: Notificación de like** (`NX-S3.32`)
    > Desc: Como residente quiero recibir una notificación sin algún match me da like. [Deps--> NX-S3.31]

### Módulo: Eventos

* **[Residente/Eventos]: Recomendación de eventos** (`NX-S3.33`)
    > Desc: Como residente quiero que me aparezcan eventos afines a los datos de mi perfil.

* **[Admin/Eventos]: Análisis de eventos** (`NX-S3.34`)
    > Desc: Como administrador quiero saber cuales son los eventos que más le interesan a mis residentes a través de datos cuantitativos.

### Módulo: Analíticas 

* **[Admin/Personal] Generación de analíticas de habitaciones, incidencias, objetos y espacios.** (`NX-S3.35`)
    > - Añadir a barra lateral.
    > - Poder exportar reportes en pdf, incluso reportes excel mas concretos (usando filtros etc...)


# Reordenar 

### Módulo: Multi-sede 

* **[Admin/Multi-sede] Selección y enrutamiento de residencias.** (`NX-S3.36`)
    > Desc: Como administrador, quiero visualizar el número de residencias que gestiono para poder seleccionarlas. En caso de tener solo una, quiero que el sistema me redirija automáticamente al panel de esa residencia.

* **[Admin/Multi-sede] Perfil de residencia en barra lateral.** (`NX-S3.37`)
    > Desc: Como administrador, quiero tener una nueva sección en la barra lateral que me muestre los datos de la residencia en la que estoy trabajando a modo de perfil.

* **[Admin/Multi-sede] Navegación a selección de residencias.** (`NX-S3.38`)
    > Desc: Como administrador, quiero tener un botón accesible que me permita volver rápidamente a la pantalla de selección de residencias.

* **[Admin/Multi-sede] Pantalla de análisis y comparativa.** (`NX-S3.39`)
    > Desc: Como administrador, quiero acceder a una pantalla de análisis donde pueda ver porcentajes y comparar los datos y métricas de todas mis residencias.

---

### Módulo: Objetos 

> **Nota de revisión:** El sistema actual no está hecho como se pensaba (tipo préstamo con solicitudes), hay que darle una vuelta a la ejecución. El CRUD está bien, pero faltaría añadir el control de stock y la opción de adjuntar imagen.

* **[Backend/Objetos] Envío de recordatorios automáticos de devolución.** (`NX-S3.40`)
    > Desc: Como administrador, quiero que el sistema envíe recordatorios automáticos mediante avisos a los residentes cuando se acerque o venza la fecha de devolución de un objeto prestado, para asegurar su retorno a tiempo.

* **[Residente/Objetos] Listado de MIS reservas activas.** (`NX-S3.41`)
    > Desc: Como residente, quiero tener una pestaña específica llamada "Mis Reservas" en el navbar (navbar: Espacios - Objetos - Mis Reservas - Reservas). En este apartado solo quiero ver el listado de mis propios préstamos en curso para gestionarlos, separándolos visualmente del listado general donde aparecen los objetos disponibles y los reservados por otros.

* **[Residente/Objetos] Mapeo de fechas disponibles de objetos.** (`NX-S3.42`)
    > Desc: Como residente, quiero poder visualizar un mapeo o calendario con las fechas disponibles de los objetos para saber exactamente cuándo puedo solicitarlos.
    > **Nota:** Actualmente el sistema permite escoger cualquier fecha libremente y no marca de forma visual qué días están ya ocupados.

* **[Admin/Objetos] Categorización y stock al registrar objetos.** (`NX-S3.43`)
    > Desc: Como administrador, quiero que al registrar (crear) un nuevo objeto sea obligatorio asignarle una categoría con su icono correspondiente (según Figma). 
    > 
    > Las categorías permitidas son un listado cerrado:
    > * ENTRETENIMIENTO
    > * LIMPIEZA
    > * LAVANDERIA
    > * UTILIDADES
    > * COCINA
    > * DEPORTE
    >
    > **Definición de Stock (Opcional):** Se requiere definir la cantidad de objetos disponibles. Hay dos formas de implementarlo a debatir:
    > 1. Crear un registro de "tipo de objeto" e incluir un contador numérico de stock general.
    > 2. No usar contadores y que cada objeto pase a ser único (ej. si hay 3 escobas, se crean 3 registros individuales).

* **[Admin/Residente/Objetos] Barra de filtrado de objetos.** (`NX-S3.44`)
    > Desc: Como administrador y como residente, quiero disponer de una barra de filtros en el listado de objetos que incluya un buscador de texto y dropdowns de selección múltiple (por categoría, etc.) para poder buscar y encontrar objetos rápidamente.

* **[Admin/Objetos] Ver detalles y editar objetos.** (`NX-S3.45`)
    > Desc: Como administrador, quiero poder acceder a la vista de detalle de un objeto y editar su información. 
    > 🔗 **Dependencia:** Requiere la tarea de Categorización de objetos (`NX-S3.43`).

* **[Admin/Objetos] Marcar como devuelto un objeto.** (`NX-S3.46`)
    > Desc: Como administrador, quiero tener la opción de marcar un objeto prestado como "devuelto" para que su stock vuelva a estar disponible.

* **[Backend/Objetos] Vinculación lógica de reserva de espacio con préstamo de objetos.** (`NX-S3.47`)
    > Desc: Como sistema, quiero vincular lógicamente la reserva de un espacio común con el préstamo de objetos core, de manera que funcionen de forma integrada.

* **[Admin/Objetos] Acceso al módulo desde el Panel de Control.** (`NX-S3.48`)
    > Desc: Como administrador, quiero tener un acceso directo (botón o tarjeta) en el Panel de Control principal que me lleve al módulo de Objetos y Reservas, para no depender únicamente del menú desplegable lateral.

* **[Admin/Objetos] Poder editar un objeto desde reservas.** (`NX-S3.49`)
    > Desc: Como administrador, quiero tener un botón en la pantalla de reservas que despliegue un formulario para la edición rápida del objeto. 
    >
    > **Edición de Stock:** Deberá adaptarse a la decisión técnica tomada en la historia `NX-S3.43` (es decir, permitir modificar el contador numérico si se opta por stock general, o gestionar el estado del registro individual si se opta por objetos únicos). 
    >
    > **Representación visual:** El sistema debe permitir dos opciones: adjuntar una imagen personalizada, o bien asignar automáticamente el icono correspondiente de Figma basándose en la categoría del objeto. 
    > *Nota: Si no están gestionados los updates en el backend, es necesario implementarlo.*

* **[Residente/Objetos] Consulta de disponibilidad y solicitud de préstamo.** (`NX-S3.50`)
    > Desc: Como residente, quiero poder consultar la disponibilidad de un objeto en tiempo real desde la pestaña general y enviar una solicitud formal de préstamo.

* **[Residente/Objetos] Visualización de objetos reservados por otros.** (`NX-S3.51`)
    > Desc: Como residente, quiero poder ver en la pestaña de "Objetos" qué elementos están actualmente reservados de forma activa por otras personas, para saber al instante que no están disponibles.

* **[Admin/Objetos] Interfaz de gestión de solicitudes de préstamo.** (`NX-S3.52`)
    > Desc: Como administrador, quiero tener una interfaz dedicada donde pueda aceptar o rechazar las solicitudes de préstamo de objetos que hacen los residentes.

* **[Admin/Objetos] Historial de uso y préstamos por objeto.** (`NX-S3.53`)
    > Desc: Como administrador, quiero poder consultar un historial detallado de uso y préstamos asociados a cada objeto y a cada residente.

---

### Módulo: Analíticas

* **[Admin/Analíticas] Acceso y visualización de métricas.** (`NX-S3.54`)
    > Desc: Como administrador, quiero tener una nueva sección accesible desde la barra lateral dedicada a las analíticas, donde pueda visualizar gráficas y datos clave sobre el estado y uso de las habitaciones, incidencias, objetos y espacios.

* **[Admin/Analíticas] Exportación de reportes visuales en PDF.** (`NX-S3.55`)
    > Desc: Como administrador, quiero poder exportar las analíticas que estoy visualizando en pantalla a un formato PDF, para poder guardar o compartir rápidamente un reporte visual del estado de la residencia.

* **[Admin/Analíticas] Exportación detallada de datos en Excel.** (`NX-S3.56`)
    > Desc: Como administrador, quiero poder aplicar filtros específicos a los datos (por fechas, categorías, etc.) y exportar un reporte detallado en formato Excel, para poder cruzar datos y hacer un análisis más exhaustivo.

---

### Módulo: Calidad & Cierre

* **[QA/Seguridad] Testing de seguridad pre-lanzamiento.** (`NX-S3.57`)
    > Desc: Como responsable del producto (o administrador), quiero que se ejecuten pruebas de seguridad exhaustivas antes de salir a producción, para garantizar que los datos personales de los residentes y de la residencia estén totalmente protegidos contra vulnerabilidades.

* **[QA/Front] Verificación de la instalación y uso como PWA.** (`NX-S3.58`)
    > Desc: Como usuario (residente o administrador), quiero poder instalar y usar la plataforma como una aplicación móvil (PWA) en mi teléfono sin fallos, para disfrutar de un acceso rápido y una experiencia fluida, similar a una app nativa.

* **[QA/UX] Corrección de bugs críticos de experiencia de usuario.** (`NX-S3.59`)
    > Desc: Como usuario final, quiero navegar por la aplicación con una interfaz pulida y libre de bloqueos o errores visuales graves (bugs críticos de UX), para poder realizar todas mis gestiones sin frustraciones.