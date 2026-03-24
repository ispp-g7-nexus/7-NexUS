#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCANNER_IMAGE="${SONAR_SCANNER_IMAGE:-sonarsource/sonar-scanner-cli:latest}"
SONAR_HOST_URL="${SONAR_HOST_URL:-http://localhost:9000}"
SONAR_TOKEN="${SONAR_TOKEN:-}"
SONAR_DOCKER_NETWORK="${SONAR_DOCKER_NETWORK:-}"
SONAR_DOCKER_USER="${SONAR_DOCKER_USER:-}"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker no esta disponible en PATH."
  exit 1
fi

if [ ! -f "${ROOT_DIR}/sonar-project.properties" ]; then
  echo "No se encontro sonar-project.properties en ${ROOT_DIR}."
  exit 1
fi

if [ -z "${SONAR_TOKEN}" ]; then
  echo "Aviso: SONAR_TOKEN no esta definido. El analisis puede fallar si el servidor requiere autenticacion."
fi

mkdir -p "${ROOT_DIR}/.sonar/cache"

SCANNER_ARGS=("$@")

if [ -n "${SONAR_PROJECT_KEY:-}" ]; then
  SCANNER_ARGS+=("-Dsonar.projectKey=${SONAR_PROJECT_KEY}")
fi

if [ -n "${SONAR_ORGANIZATION:-}" ]; then
  SCANNER_ARGS+=("-Dsonar.organization=${SONAR_ORGANIZATION}")
fi

DOCKER_ARGS=(
  --rm
  -w /usr/src
  -v "${ROOT_DIR}:/usr/src"
  -v "${ROOT_DIR}/.sonar/cache:/opt/sonar-scanner/.sonar/cache"
)

# El scanner se ejecuta en Docker: "localhost" dentro del contenedor no apunta al host.
# Si no se define SONAR_HOST_URL, usamos host.docker.internal para llegar al SonarQube local.
if [ "${SONAR_HOST_URL}" = "http://localhost:9000" ]; then
  SONAR_HOST_URL="http://host.docker.internal:9000"
  DOCKER_ARGS+=(--add-host "host.docker.internal:host-gateway")
fi

if [ -n "${SONAR_DOCKER_NETWORK}" ]; then
  DOCKER_ARGS+=(--network "${SONAR_DOCKER_NETWORK}")
fi

if [ -n "${SONAR_DOCKER_USER}" ]; then
  DOCKER_ARGS+=(--user "${SONAR_DOCKER_USER}")
fi

# coverage.py dentro del contenedor backend suele generar <source>/app</source>.
# El scanner corre en /usr/src, así que normalizamos para que Sonar pueda mapear rutas.
if [ -f "${ROOT_DIR}/backend/coverage.xml" ]; then
  sed -i 's#<source>/app</source>#<source>/usr/src/backend</source>#g' "${ROOT_DIR}/backend/coverage.xml"
fi

echo "Ejecutando scanner contra ${SONAR_HOST_URL}"

docker run \
  "${DOCKER_ARGS[@]}" \
  -e SONAR_HOST_URL="${SONAR_HOST_URL}" \
  -e SONAR_TOKEN="${SONAR_TOKEN}" \
  "${SCANNER_IMAGE}" \
  "${SCANNER_ARGS[@]}"
