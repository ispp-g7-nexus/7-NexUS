<h1>Rendimiento y métricas de éxito – NexUS</h1>

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
- [1. Introducción](#1-introducción)
- [2. Métricas sobre el trabajo en equipo](#2-métricas-sobre-el-trabajo-en-equipo)
- [3. Calidad de lo que estamos construyendo](#3-calidad-de-lo-que-estamos-construyendo)
- [4. Metas para el usuario](#4-metas-para-el-usuario)
- [5. Protocolo de Seguimiento y Control de Calidad](#5-protocolo-de-seguimiento-y-control-de-calidad)

---

## 1. Introducción 
Aunque todavía estamos en la fase de construcción de NexUS, es fundamental decidir cómo vamos a medir si nuestro trabajo es bueno o no. No queremos simplemente escribir código, queremos que cuando la aplicación esté terminada, sea útil, rápida de usar y no dé errores.
Este informe sirve para explicar qué puntos vamos a vigilar durante el desarrollo y qué metas queremos alcanzar para decir que el proyecto ha sido un éxito.

## 2. Métricas sobre el trabajo en equipo 
Como estamos trabajando por Sprints, necesitamos medir si el equipo está siendo 
eficiente o no. Para ello, algunas de las métricas a evaluar serán:

1. **Participación y asistencia en las reuniones**: No basta con estar presente, sino con estar involucrado. Mediremos el porcentaje de asistencia a las reuniones de 
planificación (Sprints). El éxito aquí es que todos los miembros asistan al menos al 80% de las reuniones excepto causa justificada (ya sea reuniones de 
coordinadores o de equipos), para estar en todo momento al día con el avance del proyecto. 
2. **Reparto equitativo de la carga de trabajo**: Para evitar que unos miembros del equipo se saturen mientras otros tienen poco que hacer, controlaremos la distribución de tareas. Utilizaremos nuestro tablero de trabajo (GitHub Projects) para ver que el número de tareas y su talla equilibrado para que todos estén implicados por igual en el proyecto. El éxito es que no haya mucha diferencia de carga entre los miembros del equipo, ni entre un equipo y otro. 
3. **Calidad de las revisiones entre compañeros**: Cuando un miembro del equipo termina una funcionalidad, e/la coordinador/a responsable equipo cuyo miembro ha subido la suba la PR, deben revisarla antes de darla por buena y mergearla a la rama de preproducción y el coordinador del equipo A debe estar involucrado en las PRs que vayan a main. Mediremos cuántos comentarios útiles y constructivos se hacen en estas revisiones. Un éxito sería que cada revisión incluya al menos una sugerencia de mejora o una felicitación por el buen código, fomentando un ambiente de aprendizaje en lugar de solo buscar fallos. 
4. **Resolución de conflictos y toma de decisiones**: En todo equipo hay diferencias de opinión, por ello mediremos el éxito por nuestra capacidad de llegar a acuerdos rápidos mediante votaciones o debates. El objetivo es no pasar más de una reunión discutiendo el mismo punto sin llegar a una solución definitiva. 
5. **Puntualidad en las entregas internas**: Antes de la entrega final, nos ponemos "fechas tope" internas y mediremos cuántas de estas fechas se cumplen. El éxito es que más de un 80% de las tareas estén listas dentro de las fechas que acordamos, para tener un margen de maniobra ante imprevistos de última hora. 

## 3. Calidad de lo que estamos construyendo 
No queremos una aplicación que sea difícil de entender, sino que sea intuitiva y fácil de usar. Vamos a medir la calidad en base a los siguientes apartados:
1. **Modularización**: La calidad del software estará vinculada a la estructura modular del proyecto. El código debe residir en su directorio correspondiente, 
asegurando una arquitectura limpia. Esta organización facilitará la escalabilidad del sistema y reducirá el riesgo de regresiones al implementar futuras 
funcionalidades.
2. **Comentarios y notas explicativas**: Dentro del código, vamos a escribir pequeños comentarios explicativos en lo estrictamente necesario. El éxito aquí es que, si tenemos que cambiar o entender algo, no perdamos horas intentando descifrar qué hace cada línea de código.
3. **Testing**: Validaremos el correcto funcionamiento de las funcionalidades core mediante la implementación de tests, con el objetivo de alcanzar una cobertura de entre el 75% y el 90%. Para el resto de las funcionalidades, se mantendrá un rango de cobertura que oscile entre el 65% y el 90%, asegurando así la estabilidad y calidad de todo el sistema.
4. **Coherencia visual y de diseño**: No queremos que NexUS parezca un conjunto de piezas sueltas, sino una sola aplicación profesional. Mediremos el éxito según lo bien que encajen las distintas partes: que los botones, los colores, los tipos de letra y los espacios sean iguales en todas las pantallas. Si un estudiante entra en "Incidencias" y siente que está en la misma app que cuando hizo el "Login", habremos logrado un diseño coherente y de calidad.
5. **Principio DRY (don’t repeat yourself)**: Mediante este principio de diseño evitamos la duplicación de código, para asegurar su cumplimiento utilizaremos la métrica de Sonarqube llamada Duplicated Lines (>15%). De esta forma mejoramos la mantenibilidad, legibilidad y reducimos la probabilidad de errores al actualizar el código.
6. **Feedback implementado**: Es fundamental que el feedback de nuestros usuarios pilotos sea tenido en cuenta en el desarrollo, por tanto, se considerará como éxito tener más de un 90% de las mejoras solicitadas y que han sido aprobadas implementadas al final de cada Sprint

## 4. Metas para el usuario 
Aquí definimos qué queremos que pase cuando los estudiantes y los administradores de las residencias empiecen a usar NexUS.
1. **Rapidez para hacer gestiones**: Consideramos necesaria una buena navegabilidad para que el usuario en un máximo de 5 clics pueda acceder a cualquier módulo.
2. **Transparencia total**: Queremos que el 100% de los problemas reportados tengan una respuesta. El éxito será que ningún estudiante se quede con la duda de si han leído su mensaje o si alguien va a ir a arreglar su problema. 
3. **Abandono del papel**: Una métrica de éxito muy clara será que la residencia deje de usar papeles, archivos Excel o grupos de WhatsApp caóticos para usar solo NexUS. Queremos centralizar todo el movimiento de la residencia. 
4. **Sensación de seguridad y privacidad**: Al usar NexUS, queremos que el estudiante tenga la tranquilidad de que sus datos personales y sus reportes solo los ve quien tiene que verlos. El éxito será que los alumnos prefieran usar la app antes que otros medios públicos (como grupos de chat grupales) porque confían en que NexUS es un entorno privado y seguro para ellos.

## 5. Protocolo de Seguimiento y Control de Calidad 
Para comprobar que se están siguiendo estas métricas, usaremos las siguientes herramientas:
1. **Reuniones de revisión**: Al final de cada etapa del proyecto, nos reuniremos a ver qué hemos cumplido y qué no el grupo de desarrollo y también con los usuarios piloto. 
2. **Herramientas de control de código**: Recurriremos a herramientas como GitHub Actions que notifican automáticamente si el código que acabamos de subir tiene fallos. 
3. **Pruebas con personas reales**: En cuanto tengamos algo funcional, lo mostraremos a los usuarios piloto para comprobar si comprenden el uso de la aplicación, es decir, si consideran la interfaz intuitiva. 