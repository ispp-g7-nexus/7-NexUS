# 7-DP Sonar Analysis Guide (Equipo)

## Objetivo
Guia corta para que cualquier companero ejecute analisis Sonar sin instalar nada extra.

## 1) Lo minimo que necesitas
- Tener Docker funcionando.
- Tener el repo actualizado.
- Tener `SONAR_TOKEN` (te lo da el lider o cada persona usa su token).

## 2) Analisis local en 3 pasos
1. Levantar SonarQube local (si no esta levantado):

```bash
docker compose -f docker-compose.sonarqube.yml up -d
```

2. Exportar variables:

```bash
export SONAR_HOST_URL=http://localhost:9000
export SONAR_TOKEN=<tu_token>
```

3. Lanzar analisis:

```bash
./run-sonar.sh
```

Con eso, el analisis usa `sonar-project.properties` y escanea backend (`backend/`) + frontend (`frontend/`).

## 3) Si quieres pasar opciones extra al scanner
Puedes enviar argumentos al script:

```bash
./run-sonar.sh -Dsonar.verbose=true
```

Ejemplo para sobreescribir project key temporalmente:

```bash
SONAR_PROJECT_KEY=nexus-dev-juan ./run-sonar.sh
```

## 4) Flujo recomendado antes de abrir PR
1. Sincronizar rama con `main/develop`.
2. Ejecutar tests/linters locales del modulo que tocaste.
3. Ejecutar `./run-sonar.sh`.
4. Revisar issues en Sonar (bugs, vulnerabilidades, code smells).
5. Corregir bloqueantes antes de abrir PR.

## 5) Que analiza exactamente el proyecto
Configurado en `sonar-project.properties`:
- Fuentes: `backend,frontend`
- Cobertura Python: `backend/coverage.xml`
- Cobertura TS/JS: `frontend/coverage/lcov.info`
- Excluye: `migrations`, `node_modules`, `venv`, `dist`, `build`, `docs`, `volumes`, tests y artefactos generados.

## 6) CI automatico en Pull Request
No tienes que lanzar nada manual en CI:
- Al abrir PR a `main`, GitHub ejecuta `.github/workflows/sonar.yml`.
- SonarCloud publica resultado y Quality Gate en el PR.

Si falla por configuracion, avisar al lider para revisar:
- Secret `SONAR_TOKEN`
- Variables `SONAR_PROJECT_KEY` y `SONAR_ORGANIZATION`

## 7) Errores comunes y solucion
1. `docker: command not found`
- Instalar/arrancar Docker y reintentar.

2. `No se encontro sonar-project.properties`
- Ejecutar comando desde la raiz del repo.

3. `Not authorized. Please check the user token`
- Regenerar token en Sonar y volver a exportarlo.

4. `Project not found`
- Revisar `sonar.projectKey` o exportar `SONAR_PROJECT_KEY` correcto.

5. No aparece cobertura en dashboard
- Generar reportes antes de correr Sonar:

```bash
# Backend (ejemplo)
pytest backend --cov=backend --cov-report=xml:backend/coverage.xml

# Frontend (ejemplo, segun scripts disponibles)
npm --prefix frontend run test -- --coverage
```

## 8) Checklist rapido (copiar y pegar en PR)
- [ ] He ejecutado `./run-sonar.sh` en mi rama.
- [ ] No dejo bugs/vulnerabilidades nuevos.
- [ ] Si toque logica, he actualizado tests.
- [ ] La cobertura de nuevo codigo cumple el gate del equipo.
