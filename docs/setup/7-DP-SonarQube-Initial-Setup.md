# 7-DP SonarQube Initial Setup (Local)

## Objetivo
Este documento define la configuracion inicial para:
- Levantar SonarQube local con persistencia.
- Configurar cuenta, proyecto, token y Quality Gate.

Se apoya en estos archivos del repo:
- `docker-compose.sonarqube.yml`
- `sonar-project.properties`
- `run-sonar.sh`

## 1) Prerrequisitos
- Docker + Docker Compose v2

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
- Nombre recomendado: `nexus-local-<tu_usuario>`.
- Guardar el valor una sola vez (no se puede volver a ver).
- Cada desarrollador debe generar su propio token (no compartir tokens personales).

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

## 5) Quality Gate del equipo (por defecto)
Para este proyecto usamos la quality gate por defecto de Sonar (`Sonar way`), que coincide con el enfoque usado en SonarCloud para código nuevo.

Condiciones esperadas en "New Code":
1. `Coverage >= 80%`
2. `Duplicated Lines (%) <= 3%`
3. `Maintainability Rating = A`
4. `Reliability Rating = A`
5. `Security Hotspots Reviewed = 100%`
6. `Security Rating = A`

No es necesario crear una quality gate personalizada en local para el uso normal del equipo.
Solo haria falta una gate custom si el equipo decide cambiar politicas de calidad en el futuro.

## 6) Comandos de operacion
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

## 7) Troubleshooting rapido
1. SonarQube no inicia:
- Revisar logs: `docker compose -f docker-compose.sonarqube.yml logs --tail=200 sonarqube`
- Esperar a que `sonarqube-db` este `healthy`.

2. Error `Not authorized` en scanner:
- Verificar `SONAR_TOKEN`.
- Verificar `SONAR_HOST_URL`.
- Si el token fue compartido/revocado, generar un token personal nuevo.

3. Cobertura no aparece:
- Confirmar que existan reportes en:
  - `backend/coverage.xml`
  - `frontend/coverage/lcov.info`
