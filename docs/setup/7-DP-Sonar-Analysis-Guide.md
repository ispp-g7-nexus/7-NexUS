# 7-DP Sonar Analysis Guide (Equipo)

## Objetivo
Guia corta para que cualquier compañero ejecute analisis Sonar sin instalar nada extra.

## 1) Lo minimo que necesitas
- Tener Docker funcionando.
- Tener el repo actualizado.
- Tener un `SONAR_TOKEN` personal (cada miembro crea el suyo).
- La generacion del token personal esta explicada en `docs/setup/7-DP-SonarQube-Initial-Setup.md` (seccion "Primer login y seguridad basica").

## 1.1) Politica de tokens (equipo)
- Cada desarrollador usa su token personal para analisis local.
- No compartir tokens por chat/correo ni subirlos al repositorio.
- El token de CI es independiente y solo vive en GitHub Secrets (`SONAR_TOKEN`).
- Si un token se expone, revocarlo y generar uno nuevo.

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

## 2.1) Configuracion minima para `run-sonar.sh`
No necesitas configurar nada mas para el caso normal local, solo:
1. SonarQube levantado en Docker (`docker-compose.sonarqube.yml`).
2. `SONAR_TOKEN` exportado.
3. Ejecutar desde la raiz del repo.

Opcional:
- `SONAR_HOST_URL` (si no usas el valor por defecto).
- `SONAR_PROJECT_KEY` (si quieres sobreescribir temporalmente).
- `SONAR_ORGANIZATION` (solo si aplica para SonarCloud/local multi-org).

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

Si falla por configuracion, avisar al equipo B para revisar:
- Secret `SONAR_TOKEN`
- Variables `SONAR_PROJECT_KEY` y `SONAR_ORGANIZATION`
