#!/usr/bin/env bash
# Local smoke: EF migration bundle against Docker Postgres (quickstart Scenario 2).
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../" && pwd)"
CONTAINER_NAME="splitrail-migrate-smoke"
BUNDLE_PATH="${REPO_ROOT}/artifacts/efbundle"
DB_PASSWORD="postgres"

cleanup() {
  docker rm -f "${CONTAINER_NAME}" >/dev/null 2>&1 || true
}
trap cleanup EXIT

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required for smoke-migrate-bundle.sh" >&2
  exit 1
fi

echo "Starting local Postgres container..."
docker run -d --name "${CONTAINER_NAME}" \
  -e POSTGRES_PASSWORD="${DB_PASSWORD}" \
  -e POSTGRES_DB=split-rail-db \
  -p 5432:5432 \
  postgres:16

for attempt in $(seq 1 30); do
  if docker exec "${CONTAINER_NAME}" pg_isready -U postgres >/dev/null 2>&1; then
    echo "Postgres ready after ${attempt} attempt(s)"
    break
  fi
  if [ "${attempt}" -eq 30 ]; then
    echo "Timed out waiting for Postgres" >&2
    exit 1
  fi
  sleep 1
done

echo "Building EF migration bundle..."
dotnet ef migrations bundle \
  --project "${REPO_ROOT}/apps/api/split-rail-api.csproj" \
  --configuration Release \
  --output "${BUNDLE_PATH}" \
  --self-contained

MIGRATE_CONNECTION_STRING="Host=127.0.0.1;Port=5432;Database=split-rail-db;Username=postgres;Password=${DB_PASSWORD};Include Error Detail=false"

export SKIP_CLOUD_SQL_PROXY=true
export MIGRATE_CONNECTION_STRING
export BUNDLE_PATH

"${REPO_ROOT}/deploy/lib/migrate-bundle.sh"

echo "Verifying application tables exist..."
docker exec "${CONTAINER_NAME}" psql -U postgres -d split-rail-db -tAc \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='organizations'" \
  | grep -q '^1$'

echo "smoke-migrate-bundle: PASS"
