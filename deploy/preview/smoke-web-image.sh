#!/usr/bin/env bash
set -euo pipefail

IMAGE_TAG="${SMOKE_IMAGE_TAG:-splitrail-web-smoke:local}"
CONTAINER_NAME="${SMOKE_CONTAINER_NAME:-splitrail-web-smoke}"
HOST_PORT="${SMOKE_HOST_PORT:-18080}"

cleanup() {
  docker rm -f "${CONTAINER_NAME}" >/dev/null 2>&1 || true
}

trap cleanup EXIT

echo "Building web image ${IMAGE_TAG}..."
docker build -t "${IMAGE_TAG}" -f deploy/preview/Dockerfile.web .

cleanup
echo "Starting container on port ${HOST_PORT}..."
docker run -d --name "${CONTAINER_NAME}" -p "${HOST_PORT}:8080" "${IMAGE_TAG}"

for attempt in $(seq 1 30); do
  if curl -sf "http://127.0.0.1:${HOST_PORT}/" >/dev/null; then
    echo "Web container ready after ${attempt} attempt(s)"
    break
  fi
  if [ "${attempt}" -eq 30 ]; then
    echo "Timed out waiting for web container" >&2
    docker logs "${CONTAINER_NAME}" >&2 || true
    exit 1
  fi
  sleep 1
done

echo "Asserting SPA shell at / (C1)..."
curl -sf "http://127.0.0.1:${HOST_PORT}/" | grep -q 'id="root"'

echo "Asserting deep link /settings/team (C2)..."
curl -sf -o /dev/null -w '%{http_code}' "http://127.0.0.1:${HOST_PORT}/settings/team" | grep -q 200

echo "Asserting workspace deep link (C3)..."
curl -sf -o /dev/null -w '%{http_code}' \
  "http://127.0.0.1:${HOST_PORT}/venues/00000000-0000-0000-0000-000000000001/events/00000000-0000-0000-0000-000000000002" \
  | grep -q 200

echo "Smoke checks passed for ${IMAGE_TAG}"
