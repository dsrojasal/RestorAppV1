#!/bin/bash
#
# RestorApp API - instalación inicial
#
# Este script prepara el backend en un equipo nuevo:
#   1. Comprueba Node, npm, Docker y Docker Compose.
#   2. Crea .env a partir de .env.example solo si no existe.
#   3. Instala dependencias.
#   4. Levanta PostgreSQL.
#   5. Aplica las migraciones versionadas.
#
# No usa `schema:sync`: el esquema se versiona únicamente con migraciones.
# No sobrescribe .env ni borra archivos del repositorio.

set -u

# STDERR log function
err() {
  echo -e "\n[$(date +'%Y-%m-%dT%H:%M:%S%z')]: ${*}\n" >&2
  exit 1
}

# STDOUT log function
log() {
  echo -e "\n[$(date +'%Y-%m-%dT%H:%M:%S%z')]: ${*}\n"
}

# Check if Docker is installed
if ! type "docker" >/dev/null 2>&1; then
  err "⛔️ Docker no está instalado"
fi

# Check if Docker Compose is installed
if ! docker compose version >/dev/null 2>&1; then
  err "⛔️ Docker Compose v2 no está instalado"
fi
log "🍀 Docker y Docker Compose están disponibles."

# Check if NodeJS is installed
if ! type "node" >/dev/null 2>&1; then
  err "⛔️ Node.js no está instalado"
fi

# Check if NPM is installed
if ! type "npm" >/dev/null 2>&1; then
  err "⛔️ npm no está instalado"
fi

# .env: crear solo si no existe, para no sobrescribir configuración real.
if [ -f .env ]; then
  log "ℹ️  .env ya existe; se conserva sin cambios."
else
  log "↪ Copiando .env.example -> .env"
  cp .env.example .env || err "⛔️ No se pudo crear .env"
  chmod 600 .env
  log "⚠️  Revisa .env y genera las claves RSA antes de arrancar."
fi

log "👐 Instalando dependencias"
npm install --ignore-scripts || err "⛔️ Falló npm install"

# Husky es opcional: si no hay repositorio git o falla, no bloquea el setup.
if [ -d .git ]; then
  npx husky install >/dev/null 2>&1 || log "⚠️  Husky no se inicializó; se continúa."
fi

log "🐳 Levantando PostgreSQL"
docker compose up -d database || err "⛔️ No se pudo levantar la base de datos"

log "⏳ Esperando a que PostgreSQL acepte conexiones..."
DB_READY=0
for _ in $(seq 1 30); do
  if docker compose exec -T database pg_isready -U "${POSTGRES_USER:-postgres}" >/dev/null 2>&1; then
    DB_READY=1
    break
  fi
  sleep 2
done
if [ "$DB_READY" -ne 1 ]; then
  err "⛔️ PostgreSQL no respondió a tiempo. Revisa: docker compose logs database"
fi

log "🔄 Aplicando migraciones"
npm run migration:run || err "⛔️ Fallaron las migraciones"

log "✅ Instalación completada."
log "   Siguiente paso: revisa .env, genera las claves RSA si hace falta y ejecuta 'npm run start:dev'."
