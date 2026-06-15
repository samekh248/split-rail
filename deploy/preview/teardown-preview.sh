#!/usr/bin/env bash
set -euo pipefail

: "${GCP_PROJECT:?GCP_PROJECT required}"
: "${GCP_REGION:?GCP_REGION required}"
: "${RUN_ID:?RUN_ID required}"

SERVICE_NAME="splitrail-preview-${RUN_ID}"

echo "Tearing down ${SERVICE_NAME}..."
gcloud run services delete "${SERVICE_NAME}" \
  --region "${GCP_REGION}" \
  --project "${GCP_PROJECT}" \
  --quiet 2>/dev/null || true

echo "Preview teardown complete for RUN_ID=${RUN_ID}"
