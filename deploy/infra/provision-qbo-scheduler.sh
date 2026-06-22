#!/usr/bin/env bash
set -euo pipefail

: "${GCP_PROJECT:?GCP_PROJECT required}"
: "${GCP_REGION:?GCP_REGION required}"
: "${ENV:?ENV required (dev|prod)}"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck source=deploy/lib/qbo-scheduler-names.sh
source "${REPO_ROOT}/deploy/lib/qbo-scheduler-names.sh"
resolve_qbo_scheduler_names

SERVICE_NAME="${SERVICE_NAME:-split-rail-api}"

if [[ -z "${CLOUD_RUN_URL:-}" ]]; then
  CLOUD_RUN_URL="$(gcloud run services describe "${SERVICE_NAME}" \
    --project="${GCP_PROJECT}" \
    --region="${GCP_REGION}" \
    --format='value(status.url)')"
fi

: "${CLOUD_RUN_URL:?CLOUD_RUN_URL required or resolvable from Cloud Run service}"

TARGET_URI="${CLOUD_RUN_URL%/}${SCHEDULER_TRIGGER_PATH}"

if ! gcloud iam service-accounts describe "${SCHEDULER_SA_EMAIL}" --project="${GCP_PROJECT}" >/dev/null 2>&1; then
  echo "Creating scheduler service account ${SCHEDULER_SA_EMAIL}..."
  gcloud iam service-accounts create "${SCHEDULER_SA_ID}" \
    --project="${GCP_PROJECT}" \
    --display-name="Split-Rail QBO Scheduler (${ENV})"
else
  echo "Scheduler service account ${SCHEDULER_SA_EMAIL} already exists"
fi

if gcloud scheduler jobs describe "${SCHEDULER_JOB_NAME}" \
  --location="${GCP_REGION}" \
  --project="${GCP_PROJECT}" >/dev/null 2>&1; then
  echo "Updating scheduler job ${SCHEDULER_JOB_NAME}..."
  gcloud scheduler jobs update http "${SCHEDULER_JOB_NAME}" \
    --location="${GCP_REGION}" \
    --project="${GCP_PROJECT}" \
    --schedule="${SCHEDULER_CRON}" \
    --time-zone="${SCHEDULER_TIME_ZONE}" \
    --uri="${TARGET_URI}" \
    --http-method="${SCHEDULER_HTTP_METHOD}" \
    --oidc-service-account-email="${SCHEDULER_SA_EMAIL}" \
    --oidc-token-audience="${CLOUD_RUN_URL}"
else
  echo "Creating scheduler job ${SCHEDULER_JOB_NAME}..."
  gcloud scheduler jobs create http "${SCHEDULER_JOB_NAME}" \
    --location="${GCP_REGION}" \
    --project="${GCP_PROJECT}" \
    --schedule="${SCHEDULER_CRON}" \
    --time-zone="${SCHEDULER_TIME_ZONE}" \
    --uri="${TARGET_URI}" \
    --http-method="${SCHEDULER_HTTP_METHOD}" \
    --oidc-service-account-email="${SCHEDULER_SA_EMAIL}" \
    --oidc-token-audience="${CLOUD_RUN_URL}"
fi

export CLOUD_RUN_URL
ENV="${ENV}" CLOUD_RUN_URL="${CLOUD_RUN_URL}" "${REPO_ROOT}/deploy/lib/validate-qbo-scheduler.sh"

echo "QBO scheduler provision complete for ENV=${ENV}"
