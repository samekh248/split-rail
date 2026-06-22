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
# DB_PASSWORD must be available for migrate step (from env or gcloud secret access)
: "${DB_PASSWORD:?DB_PASSWORD required for migration step — fetch from Secret Manager before running}"

"${REPO_ROOT}/deploy/lib/migrate-bundle.sh"

SETTLEMENT_ENV="SettlementArchive__BucketName=split-rail-settlements-prod,SettlementArchive__StagingBucketName=split-rail-settlements-staging-prod,SettlementArchive__RetentionYears=7,SettlementArchive__EnforceRetentionValidation=true"

echo "Deploying Cloud Run API service ${SERVICE_NAME}..."
gcloud run deploy "${SERVICE_NAME}" \
  --image "${IMAGE}" \
  --region "${GCP_REGION}" \
  --project "${GCP_PROJECT}" \
  --add-cloudsql-instances="${PROD_INSTANCE}" \
  --set-secrets="DB_PASSWORD=db-password:latest" \
  --set-env-vars "ASPNETCORE_ENVIRONMENT=Production,${SETTLEMENT_ENV}" \
  --quiet

echo "Production API deploy complete."
