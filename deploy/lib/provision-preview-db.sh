#!/usr/bin/env bash
# Provision ephemeral Cloud SQL PostgreSQL for a preview run (db-f1-micro, PostgreSQL 16).
# Exports INSTANCE_CONNECTION_NAME and DB_PASSWORD for callers. Never logs password.
set -euo pipefail

: "${GCP_PROJECT:?GCP_PROJECT required}"
: "${GCP_REGION:?GCP_REGION required}"
: "${RUN_ID:?RUN_ID required}"

sanitize_run_id() {
  echo "$1" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9-]/-/g' | sed 's/^-\+//' | cut -c1-40
}

SANITIZED_RUN_ID="$(sanitize_run_id "${RUN_ID}")"
INSTANCE_NAME="splitrail-preview-${SANITIZED_RUN_ID}"
INSTANCE_CONNECTION_NAME="${GCP_PROJECT}:${GCP_REGION}:${INSTANCE_NAME}"
DATABASE_NAME="split-rail-db"

if [ -z "${DB_PASSWORD:-}" ]; then
  if command -v openssl >/dev/null 2>&1; then
    DB_PASSWORD="$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 24)"
  else
    DB_PASSWORD="$(date +%s | sha256sum | head -c 24)"
  fi
fi

echo "Provisioning preview Cloud SQL instance ${INSTANCE_NAME}..."

if ! gcloud sql instances describe "${INSTANCE_NAME}" \
  --project="${GCP_PROJECT}" >/dev/null 2>&1; then
  gcloud sql instances create "${INSTANCE_NAME}" \
    --database-version=POSTGRES_16 \
    --tier=db-f1-micro \
    --region="${GCP_REGION}" \
    --project="${GCP_PROJECT}" \
    --storage-auto-increase \
    --quiet
fi

echo "Waiting for instance ${INSTANCE_NAME} to become RUNNABLE..."
for attempt in $(seq 1 120); do
  STATE="$(gcloud sql instances describe "${INSTANCE_NAME}" \
    --project="${GCP_PROJECT}" \
    --format='value(state)' 2>/dev/null || echo "UNKNOWN")"
  if [ "${STATE}" = "RUNNABLE" ]; then
    echo "Instance ${INSTANCE_NAME} is RUNNABLE after ${attempt} attempt(s)"
    break
  fi
  if [ "${attempt}" -eq 120 ]; then
    echo "Timed out waiting for Cloud SQL instance ${INSTANCE_NAME} (state=${STATE})" >&2
    exit 1
  fi
  sleep 5
done

if ! gcloud sql databases describe "${DATABASE_NAME}" \
  --instance="${INSTANCE_NAME}" \
  --project="${GCP_PROJECT}" >/dev/null 2>&1; then
  gcloud sql databases create "${DATABASE_NAME}" \
    --instance="${INSTANCE_NAME}" \
    --project="${GCP_PROJECT}" \
    --quiet
fi

gcloud sql users set-password postgres \
  --instance="${INSTANCE_NAME}" \
  --project="${GCP_PROJECT}" \
  --password="${DB_PASSWORD}" \
  --quiet

export INSTANCE_CONNECTION_NAME
export DB_PASSWORD
export PREVIEW_INSTANCE_NAME="${INSTANCE_NAME}"

echo "Preview database ready: ${INSTANCE_CONNECTION_NAME}"
