#!/usr/bin/env bash
set -euo pipefail

: "${GCP_PROJECT:?GCP_PROJECT required}"
: "${GCP_REGION:?GCP_REGION required}"
: "${RUN_ID:?RUN_ID required}"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

SERVICE_NAME="splitrail-preview-${RUN_ID}"
IMAGE_TAG="${RUN_ID}"
API_IMAGE="${GCP_REGION}-docker.pkg.dev/${GCP_PROJECT}/split-rail/api:${IMAGE_TAG}"
WEB_IMAGE="${GCP_REGION}-docker.pkg.dev/${GCP_PROJECT}/split-rail/web:${IMAGE_TAG}"
BUNDLE_PATH="${REPO_ROOT}/artifacts/efbundle"

echo "Building API image..."
docker build -t "${API_IMAGE}" -f apps/api/Dockerfile apps/api
docker push "${API_IMAGE}"

echo "Building web image..."
docker build -t "${WEB_IMAGE}" -f deploy/preview/Dockerfile.web .
docker push "${WEB_IMAGE}"

echo "Provisioning preview Cloud SQL..."
# shellcheck source=/dev/null
source "${REPO_ROOT}/deploy/lib/provision-preview-db.sh"

echo "Building migration bundle..."
dotnet ef migrations bundle \
  --project "${REPO_ROOT}/apps/api/split-rail-api.csproj" \
  --configuration Release \
  --output "${BUNDLE_PATH}" \
  --self-contained

echo "Applying migrations before Cloud Run deploy..."
export BUNDLE_PATH
"${REPO_ROOT}/deploy/lib/migrate-bundle.sh"

CONNECTION_STRING="Host=/cloudsql/${INSTANCE_CONNECTION_NAME};Database=split-rail-db;Username=postgres;Include Error Detail=false"

echo "Deploying Cloud Run service ${SERVICE_NAME}..."
gcloud run deploy "${SERVICE_NAME}" \
  --image "${API_IMAGE}" \
  --region "${GCP_REGION}" \
  --project "${GCP_PROJECT}" \
  --allow-unauthenticated \
  --add-cloudsql-instances="${INSTANCE_CONNECTION_NAME}" \
  --set-env-vars "ASPNETCORE_ENVIRONMENT=Preview,Preview__UseFakeQboConnector=true,Preview__EnableTestSeeding=true,ConnectionStrings__DefaultConnection=${CONNECTION_STRING},DB_PASSWORD=${DB_PASSWORD}" \
  --quiet

PREVIEW_BASE_URL="$(gcloud run services describe "${SERVICE_NAME}" \
  --region "${GCP_REGION}" \
  --project "${GCP_PROJECT}" \
  --format 'value(status.url)')"

echo "Seeding preview data..."
if ! curl -sf -X POST "${PREVIEW_BASE_URL}/api/test-seed/reset"; then
  echo "Preview seed failed — deploy incomplete" >&2
  exit 1
fi

echo "PREVIEW_BASE_URL=${PREVIEW_BASE_URL}"
echo "${PREVIEW_BASE_URL}" > preview-url.txt
