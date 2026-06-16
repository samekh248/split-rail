#!/usr/bin/env bash
set -euo pipefail

: "${GCP_PROJECT:?GCP_PROJECT required}"
: "${GCP_REGION:?GCP_REGION required}"
: "${RUN_ID:?RUN_ID required}"

SERVICE_NAME="splitrail-preview-${RUN_ID}"
IMAGE_TAG="${RUN_ID}"
API_IMAGE="${GCP_REGION}-docker.pkg.dev/${GCP_PROJECT}/split-rail/api:${IMAGE_TAG}"
WEB_IMAGE="${GCP_REGION}-docker.pkg.dev/${GCP_PROJECT}/split-rail/web:${IMAGE_TAG}"

echo "Building API image..."
docker build -t "${API_IMAGE}" -f apps/api/Dockerfile apps/api
docker push "${API_IMAGE}"

echo "Building web bundle..."
pushd apps/web
npm ci
npm run build
popd

docker build -t "${WEB_IMAGE}" -f deploy/preview/Dockerfile.web apps/web
docker push "${WEB_IMAGE}"

echo "Deploying Cloud Run service ${SERVICE_NAME}..."
gcloud run deploy "${SERVICE_NAME}" \
  --image "${API_IMAGE}" \
  --region "${GCP_REGION}" \
  --project "${GCP_PROJECT}" \
  --allow-unauthenticated \
  --set-env-vars "ASPNETCORE_ENVIRONMENT=Preview,Preview__UseFakeQboConnector=true,Preview__EnableTestSeeding=true" \
  --quiet

PREVIEW_BASE_URL="$(gcloud run services describe "${SERVICE_NAME}" \
  --region "${GCP_REGION}" \
  --project "${GCP_PROJECT}" \
  --format 'value(status.url)')"

echo "Seeding preview data..."
curl -sf -X POST "${PREVIEW_BASE_URL}/api/test-seed/reset" || true

echo "PREVIEW_BASE_URL=${PREVIEW_BASE_URL}"
echo "${PREVIEW_BASE_URL}" > preview-url.txt
