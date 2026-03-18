## 📄 Mini-Informe: Estrategia de Gestión de Migraciones en Django para Equipos Grandes

Cuando más de 20 personas trabajan sobre el mismo ORM, **el problema no es Git, es el árbol de migraciones de Django**. Git fusionará sin problemas dos archivos de migraciones nuevos creados por distintas personas, pero Django fallará al intentar aplicarlos porque no sabrá en qué orden hacerlo. 

Para solucionar esto, el equipo debe adoptar un flujo de trabajo basado en la **prevención automatizada** y la **resolución en la rama local**, nunca en producción.

### 1. La Red de Seguridad (Configuración obligatoria del repositorio)
Antes de pedirle al equipo que cambie su forma de trabajar, el sistema debe obligarles a hacerlo. Tenéis que configurar vuestro entorno (GitHub, GitLab, Bitbucket) con las siguientes reglas:

* **Protección de la rama `main`:** Nadie debe poder hacer *push* directo a `main`. Todo debe pasar por una Pull Request (PR).
* **Pipeline de Integración Continua (CI):** Cada vez que se abra o actualice una PR, el servidor debe ejecutar un pipeline que levante el proyecto y ejecute:
    ```bash
    python manage.py makemigrations --check --dry-run
    ```
* **La regla de oro:** Si el comando anterior falla (porque faltan migraciones por crear o porque hay ramas de migraciones divergentes), **la PR se bloquea y el botón de *Merge* se deshabilita**. 

### 2. El Flujo de Trabajo del Desarrollador (El "Día a Día")
Cada uno de los 21 desarrolladores debe interiorizar esta rutina al trabajar en su rama (`feature/nueva-funcionalidad`):

1.  **Escribir código:** Modifica los `models.py` según sea necesario.
2.  **Crear la migración con nombre:**
    * *MAL:* `python manage.py makemigrations`
    * *BIEN:* `python manage.py makemigrations -n add_status_to_order`
3.  **Aplicar en local:** `python manage.py migrate` para comprobar que funciona.
4.  **Subir la PR:** Subir los cambios a la plataforma de repositorios.

### 3. El Protocolo de Colisión (Resolviendo conflictos de migraciones)
Este es el escenario más común y el que os está causando problemas ahora mismo. 

**El Escenario:** El Desarrollador A y el Desarrollador B crean una migración en la app `users` al mismo tiempo partiendo de la migración `0010`. 
* A crea `0011_add_age`.
* B crea `0011_add_avatar`.
El Desarrollador A fusiona su PR en `main` primero. Ahora `main` está en la `0011_add_age`. Cuando el Desarrollador B intenta fusionar su PR, el pipeline falla indicando un conflicto de migraciones (árbol divergente).

**La Solución (Responsabilidad del Desarrollador B):**
El Desarrollador B no debe borrar su migración. Debe arreglar el conflicto en su propia rama antes de fusionar.

1.  Actualizar su rama local con los cambios de `main`:
    ```bash
    git pull origin main
    ```
2.  Generar la migración de fusión (*Merge Migration*):
    ```bash
    python manage.py makemigrations --merge
    ```
    *(Django detectará las dos migraciones `0011` y creará un nuevo archivo `0012_merge_...` que las une pacíficamente).*
3.  Hacer commit de esa nueva migración de fusión.
4.  Subir los cambios a su PR (`git push`). El pipeline de CI ahora pasará a verde.

### 4. Buenas Prácticas Innegociables del Equipo

* **Jamás modificar una migración que ya está en `main`:** Si una migración ya se ha fusionado y aplicado en producción, es sagrada. Si hay un error, se hace una *nueva* migración que corrija el error. Modificar el pasado corrompe el historial de todos los demás.
* **Migraciones de datos en archivos separados:** Si se necesita alterar datos usando `RunPython`, se debe hacer en un archivo de migración vacío (creado con `python manage.py makemigrations --empty mi_app`) que dependa de la migración que alteró el esquema. No mezcléis cambios de esquema (`AddField`) y lógica de datos en el mismo archivo.
* **Squashing trimestral (Avanzado):** Cada 3 o 4 meses, los *Tech Leads* deben usar la herramienta `squashmigrations` de Django para comprimir las decenas de migraciones acumuladas en una sola por cada aplicación, limpiando así el historial y acelerando los tests.