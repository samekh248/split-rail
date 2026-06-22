#!/usr/bin/env bash
set -euo pipefail

: "${GCP_PROJECT:?GCP_PROJECT required}"
: "${GCP_REGION:?GCP_REGION required}"
: "${IMAGE:?IMAGE required}"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SERVICE_NAME="${SERVICE_NAME:-split-rail-api}"
BUNDLE_PATH="${REPO_ROOT}/artifacts/efbundle"
PROD_INSTANCE="split-rail:us-central1:split-rail-db-prod"

echo "Validating settlement archive buckets before deploy..."
export ENV=prod
"${REPO_ROOT}/deploy/lib/validate-settlement-buckets.sh"

echo "Validating QBO scheduler job before deploy..."
export ENV=prod
CLOUD_RUN_URL="${CLOUD_RUN_URL:-$(gcloud run services describe "${SERVICE_NAME}" --project="${GCP_PROJECT}" --region="${GCP_REGION}" --format='value(status.url)')}"
export CLOUD_RUN_URL
"${REPO_ROOT}/deploy/lib/validate-qbo-scheduler.sh"

echo "Building migration bundle..."
dotnet ef migrations bundle \
  --project "${REPO_ROOT}/apps/api/split-rail-api.csproj" \
  --configuration Release \
  --output "${BUNDLE_PATH}" \
  --self-contained

echo "Applying migrations to production database..."
export INSTANCE_CONNECTION_NAME="${PROD_INSTANCE}"
export GCP_PROJECT
export BUNDLE_PATH
# DB_PASSWORD for the migration step must be fetched before running this script, e.g.:
#   export DB_PASSWORD="$(gcloud secrets versions access latest --secret=db-password --project="${GCP_PROJECT}")"
# Never embed cleartext passwords in this script (Constitution VIII).
: "${DB_PASSWORD:?DB_PASSWORD required for migration step — fetch from Secret Manager before running}"

"${REPO_ROOT}/deploy/lib/migrate-bundle.sh"

SETTLEMENT_ENV="SettlementArchive__BucketName=split-rail-settlements-prod,SettlementArchive__StagingBucketName=split-rail-settlements-staging-prod,SettlementArchive__RetentionYears=7,SettlementArchive__EnforceRetentionValidation=true"
SCHEDULER_SA_EMAIL="split-rail-qbo-scheduler-prod@${GCP_PROJECT}.iam.gserviceaccount.com"
QBO_SCHEDULER_ENV="QboSync__SchedulerServiceAccountEmail=${SCHEDULER_SA_EMAIL},QboSync__SchedulerTokenAudience=${CLOUD_RUN_URL}"

echo "Deploying Cloud Run API service ${SERVICE_NAME}..."
gcloud run deploy "${SERVICE_NAME}" \
  --image "${IMAGE}" \
  --region "${GCP_REGION}" \
  --project "${GCP_PROJECT}" \
  --add-cloudsql-instances="${PROD_INSTANCE}" \
  --set-secrets="DB_PASSWORD=db-password:latest,Jwt__Secret=jwt-signing-key:latest,QBO_CLIENT_ID=qbo-client-id:latest,QBO_CLIENT_SECRET=qbo-client-secret:latest" \
  --set-env-vars "ASPNETCORE_ENVIRONMENT=Production,${SETTLEMENT_ENV},${QBO_SCHEDULER_ENV}" \
  --quiet

echo "Production API deploy complete."
