# 7-DP SonarQube Initial Setup (Local + SonarCloud)

## Objetivo
Este documento define la configuracion inicial para:
- Levantar SonarQube local con persistencia.
- Configurar cuenta, proyecto, token y Quality Gate.
- Conectar SonarCloud con GitHub para analisis automatico en Pull Requests.

Se apoya en estos archivos del repo:
- `docker-compose.sonarqube.yml`
- `sonar-project.properties`
- `run-sonar.sh`
- `.github/workflows/sonar.yml`

## 1) Prerrequisitos
- Docker + Docker Compose v2
- Acceso al repositorio en GitHub (admin o maintainer)
- Permiso para crear secrets/variables en GitHub Actions

## 2) Levantar SonarQube local
Desde la raiz del proyecto:

```bash
docker compose -f docker-compose.sonarqube.yml up -d
```

Verificar estado:

```bash
docker compose -f docker-compose.sonarqube.yml ps
```

Acceder a:
- `http://localhost:9000`

## 3) Primer login y seguridad basica (SonarQube local)
1. Entrar con credenciales por defecto:
- Usuario: `admin`
- Password: `admin`

2. Cambiar password cuando lo pida SonarQube.

3. Crear un token de usuario:
- Ir a `My Account` -> `Security` -> `Generate Tokens`.
- Nombre recomendado: `nexus-local-admin-token`.
- Guardar el valor una sola vez (no se puede volver a ver).

4. Exportar token en shell:

```bash
export SONAR_HOST_URL=http://localhost:9000
export SONAR_TOKEN=<tu_token>
```

## 4) Crear proyecto local en SonarQube
1. En SonarQube UI, crear proyecto manual:
- Project key: `nexus`
- Display name: `NexUS`

2. Confirmar que coincide con `sonar-project.properties`:
- `sonar.projectKey=nexus`

3. Ejecutar primer analisis:

```bash
./run-sonar.sh
```

## 5) Quality Gate oficial del equipo (manual en UI)
La documentacion actual del proyecto no fija umbrales numericos obligatorios, asi que se define baseline de industria para "New Code":

1. `Coverage on New Code >= 80%`
2. `Duplicated Lines on New Code <= 3%`
3. `New Bugs = 0`
4. `New Vulnerabilities = 0`
5. `Security Hotspots Reviewed on New Code = 100%`
6. `Maintainability Rating on New Code = A`
7. `Reliability Rating on New Code = A`
8. `Security Rating on New Code = A`

Pasos en SonarQube:
1. Ir a `Quality Gates` -> `Create`.
2. Nombre recomendado: `NexUS-Official-Gate`.
3. Anadir condiciones anteriores.
4. Ir a `Projects` -> `NexUS` -> `Project Settings` -> `Quality Gate`.
5. Asignar `NexUS-Official-Gate` al proyecto.

## 6) SonarCloud para PRs en GitHub (repositorio publico)
El workflow `.github/workflows/sonar.yml` ya esta preparado para ejecutarse en PR hacia `main`.

### 6.1 Crear/usar cuenta SonarCloud
1. Entrar en `https://sonarcloud.io`.
2. Login con GitHub.
3. Autorizar acceso al repo/organizacion donde esta NexUS.

### 6.2 Importar proyecto en SonarCloud
1. `+` -> `Analyze new project`.
2. Seleccionar repositorio `7-NexUS`.
3. Definir:
- Organization key (ejemplo): `nexus-org`
- Project key (ejemplo): `nexus`

### 6.3 Configurar GitHub Actions secrets y variables
En GitHub -> `Settings` -> `Secrets and variables` -> `Actions`:

Secrets:
- `SONAR_TOKEN`: token de SonarCloud (no el de SonarQube local).

Variables:
- `SONAR_PROJECT_KEY`: key del proyecto en SonarCloud.
- `SONAR_ORGANIZATION`: key de la organizacion en SonarCloud.

### 6.4 Validar integracion
1. Crear una rama de prueba.
2. Abrir PR a `main`.
3. Verificar en Actions que corre `SonarCloud`.
4. Verificar en el PR el estado de Quality Gate.

## 7) Comandos de operacion
Levantar SonarQube local:

```bash
docker compose -f docker-compose.sonarqube.yml up -d
```

Parar SonarQube local:

```bash
docker compose -f docker-compose.sonarqube.yml down
```

Analisis local:

```bash
SONAR_HOST_URL=http://localhost:9000 SONAR_TOKEN=<token> ./run-sonar.sh
```

## 8) Troubleshooting rapido
1. SonarQube no inicia:
- Revisar logs: `docker compose -f docker-compose.sonarqube.yml logs --tail=200 sonarqube`
- Esperar a que `sonarqube-db` este `healthy`.

2. Error `Not authorized` en scanner:
- Verificar `SONAR_TOKEN`.
- Verificar `SONAR_HOST_URL`.

3. En PR falla por `Project not found`:
- Revisar `SONAR_PROJECT_KEY` y `SONAR_ORGANIZATION` en GitHub variables.

4. Cobertura no aparece:
- Confirmar que existan reportes en:
  - `backend/coverage.xml`
  - `frontend/coverage/lcov.info`
