#!/usr/bin/env bash
# Apply EF Core migrations via migration bundle. Uses Cloud SQL Auth Proxy by default.
# Local smoke: SKIP_CLOUD_SQL_PROXY=true MIGRATE_CONNECTION_STRING="..." BUNDLE_PATH=... ./migrate-bundle.sh
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BUNDLE_PATH="${BUNDLE_PATH:-${REPO_ROOT}/artifacts/efbundle}"
PROXY_PORT="${CLOUDSQL_PROXY_PORT:-5432}"
PROXY_PID=""

cleanup() {
  if [ -n "${PROXY_PID}" ]; then
    kill "${PROXY_PID}" 2>/dev/null || true
    wait "${PROXY_PID}" 2>/dev/null || true
  fi
}
trap cleanup EXIT

build_bundle_if_missing() {
  if [ -f "${BUNDLE_PATH}" ]; then
    return 0
  fi
  echo "Building EF migration bundle..."
  dotnet restore "${REPO_ROOT}/apps/api/split-rail-api.csproj"
  dotnet ef migrations bundle \
    --project "${REPO_ROOT}/apps/api/split-rail-api.csproj" \
    --configuration Release \
    --output "${BUNDLE_PATH}" \
    --self-contained
}

run_bundle() {
  local connection_string="$1"
  local api_dir="${REPO_ROOT}/apps/api"
  local bundle_dir
  bundle_dir="$(cd "$(dirname "${BUNDLE_PATH}")" && pwd)"

  # Self-contained EF bundles look for appsettings beside the binary and/or in cwd.
  # CI runs from the repo root, so copy config next to the bundle and execute from apps/api.
  mkdir -p "${bundle_dir}"
  cp -f "${api_dir}/appsettings.json" "${bundle_dir}/appsettings.json"
  if [[ -f "${api_dir}/appsettings.Development.json" ]]; then
    cp -f "${api_dir}/appsettings.Development.json" "${bundle_dir}/appsettings.Development.json"
  fi

  echo "Applying migrations..."
  # Published bundles default ASPNETCORE_ENVIRONMENT to Production; force Development so
  # host bootstrap can load design-time config. --connection still overrides the database.
  (
    cd "${api_dir}"
    ASPNETCORE_ENVIRONMENT="${ASPNETCORE_ENVIRONMENT:-Development}" \
      "${BUNDLE_PATH}" --connection "${connection_string}"
  )
}

if [ "${SKIP_CLOUD_SQL_PROXY:-false}" = "true" ]; then
  : "${MIGRATE_CONNECTION_STRING:?MIGRATE_CONNECTION_STRING required when SKIP_CLOUD_SQL_PROXY=true}"
  build_bundle_if_missing
  run_bundle "${MIGRATE_CONNECTION_STRING}"
  exit 0
fi

: "${INSTANCE_CONNECTION_NAME:?INSTANCE_CONNECTION_NAME required}"
: "${DB_PASSWORD:?DB_PASSWORD required}"
: "${GCP_PROJECT:?GCP_PROJECT required}"

build_bundle_if_missing

if ! command -v cloud-sql-proxy >/dev/null 2>&1; then
  echo "cloud-sql-proxy is required. See https://cloud.google.com/sql/docs/mysql/sql-proxy" >&2
  exit 1
fi

echo "Starting Cloud SQL Auth Proxy on port ${PROXY_PORT}..."
cloud-sql-proxy "${INSTANCE_CONNECTION_NAME}" --port "${PROXY_PORT}" &
PROXY_PID=$!

for attempt in $(seq 1 60); do
  if (echo >/dev/tcp/127.0.0.1/"${PROXY_PORT}") >/dev/null 2>&1; then
    echo "Cloud SQL Auth Proxy ready after ${attempt} attempt(s)"
    break
  fi
  if [ "${attempt}" -eq 60 ]; then
    echo "Timed out waiting for Cloud SQL Auth Proxy on port ${PROXY_PORT}" >&2
    exit 1
  fi
  sleep 1
done

MIGRATE_CONNECTION_STRING="Host=127.0.0.1;Port=${PROXY_PORT};Database=split-rail-db;Username=postgres;Password=${DB_PASSWORD};Include Error Detail=false"
run_bundle "${MIGRATE_CONNECTION_STRING}"
