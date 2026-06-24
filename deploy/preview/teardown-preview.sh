#!/usr/bin/env bash
set -euo pipefail

: "${GCP_PROJECT:?GCP_PROJECT required}"
: "${GCP_REGION:?GCP_REGION required}"
: "${RUN_ID:?RUN_ID required}"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

sanitize_run_id() {
  echo "$1" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9-]/-/g' | sed 's/^-\+//' | cut -c1-40
}

SANITIZED_RUN_ID="$(sanitize_run_id "${RUN_ID}")"
SERVICE_NAME="splitrail-preview-${RUN_ID}"
INSTANCE_NAME="splitrail-preview-${SANITIZED_RUN_ID}"

echo "Tearing down ${SERVICE_NAME}..."
gcloud run services delete "${SERVICE_NAME}" \
  --region "${GCP_REGION}" \
  --project "${GCP_PROJECT}" \
  --quiet 2>/dev/null || true

echo "Deleting preview Cloud SQL instance ${INSTANCE_NAME}..."
gcloud sql instances delete "${INSTANCE_NAME}" \
  --project="${GCP_PROJECT}" \
  --quiet 2>/dev/null || true

echo "Preview teardown complete for RUN_ID=${RUN_ID}"
