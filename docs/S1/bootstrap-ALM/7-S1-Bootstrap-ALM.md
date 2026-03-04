## Bootstrap ALM  – NexUS

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
- [Instalación con wsl](#instalación-con-wsl)
- [Cambios en backend](#cambios-en-backend)
- [Cambios en frontend](#cambios-en-frontend)

---

## Instalación con wsl
- Abrir cmd como administrador y ejecutar el siguiente comando: wsl --install 
- Esperar a que se instale y reiniciar cuando pida.
- Instalar Docker Desktop, esperar a que se instale y reiniciar sesión en el 
ordenador cuando pida.
- Instalar extensión WSL en VSCode 
- Ctrl + Shift + P: WSL: Connect to WSL 
- Una vez dentro, activar extensiones de VSCode en el WSL. En la pestaña de 
extensiones aparecen todas las que están instaladas en local, y con un click se 
instalan en WSL (necesario mínimo la de Python).
- Para poder clonar el proyecto y hacer cambios es necesario crear una clave ssh 
para el WSL y añadirla a la cuenta de GitHub personal.

#### Configurar SSH y clonar
Con el WSL funcionando, realizar los siguientes comandos:  
- sudo apt install git 
- git config --global user.name "<tu nombre y apellidos entrecomillados>"  
- git config --global user.email <tu email> 
- ssh-keygen -t rsa -b 4096 (enter a todo)  
Para obtener la clave:  
- cd ~/.ssh 
- cat id_rsa.pub (copiar el contenido) 

#### Activar clave
GitHub -> Settings -> SSH and GPG keys -> New SSH key -> Pegar clave pública copiada previamente en el paso anterior (id_rsa.pub).

#### Clonar
- git clone git@github.com:ispp-g7-nexus/7-NexUS.git (en caso de que aparezca 
un aviso con una pregunta, escribir yes y pulsar enter)

#### Arrancar proyecto
-Ir a la raíz del proyecto, copiar el .env.example al .env (cp .env.example .env):
  - Añadir variables secretas no compartidas en github como correo de ecuperación de contraseña. 
- Borrar volúmenes, contenedores e imágenes posibles que puedan existir de versiones anteriores del proyecto. Si no deja por falta de permisos, ejecutar el 
siguiente comando desde la raíz del proyecto: “sudo chown -R $USER:$USER .” 
(si aun asi no os deja por permisos, desde docker desktop: docker system prune -a --volumes) 
- docker compose up -–build 
- Despliegue en http://localhost  
- Para acceder a la base de datos, se sugiere el uso de DBeaver. Al abrirlo, crear nueva conexión con PostgreSQL. Rellenar campos: 
  - host:localhost 
  - database:nexus 
  - puerto:5432 
  - username y contraseñas: las del .env 
- Para parar: docker compose down (-v para eliminar los volumenes) 
**Nota:** para comandos de docker, siempre con docker desktop en funcionamiento. 


## Cambios en backend
Por uniformidad, trabajaremos con comandos de Docker. 
Recomendación: crear un entorno virtual de Python y hacer pip install -r requirements.txt (en el caso de que lo creeis desde la carpeta del backend), así no se peta de fallos el visual por no tener los paquetes necesarios. 
- Si se empieza un nuevo módulo, docker compose exec backend python manage.py startapp nombremodulo. Recordad que tiene que estar dentro de la carpeta apps, lo podéis mover después o crearla ahí directamente, ajustando la ruta del comando si hace falta. 
- Dentro del módulo, trabajas con los models y las views, definiendo las urls en el archivo urls.py. Lo único que varía del flujo normal de Django es la necesidad de los decorators por el multi-tenants, el uso de helpers ya definidos y otros detalles. 
- Multi-tenant: No hay una base de datos por cliente, hay un único PostgreSQL con un esquema por tenant. El middleware resuelve automáticamente el tenant (y la residencia) a partir del dominio HTTP del request, así que las vistas leen request.tenant y request.residence. Hay que usar migrate_schemas en vez de migrate para aplicar migraciones en los esquemas tenant. 
- Auth por cookie JWT, no hay sesiones Django. En apps/common/decorators.py hay dos decoradores listos: @tenant_required (exige tenant activo, úsalo en casi todo) y @residence_access_required (valida además el rol del usuario en esa residencia). Para leer el usuario actual desde una vista usar resolve_user_from_request(request) de apps/common/utils/jwt_auth.py. Hay otros utils en ese archivo que conviene mirar. 
- Crear y aplicar migraciones si es necesario, especialmente en el contenedor que es donde está lanzada.


## Cambios en frontend
Recomendación, desde la carpeta frontend: npm install 
- App.tsx: Donde se mete el react router y demás, igual que react normal  
- src/assets: Imágenes que se vayan a meter en la app  
- src/components: Componentes reutilizables en varias pantallas (Navbar por 
ejemplo)  
- src/pages: Las pantallas principales, aquí hay que meter el groso de 
funcionalidad  
- src/services: Comunicación con el backend, los típicos fetchs pero ahora se 
definen aquí para separar la lógica y reutilizar (se puede quitar perfectamente y 
trabajar con fetchs directamente desde las páginas)  
- src/styles: Archivos css. 