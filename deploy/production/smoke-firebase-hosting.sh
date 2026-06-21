#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
WEB_DIR="${REPO_ROOT}/apps/web"
HOST_PORT="${FIREBASE_HOSTING_EMULATOR_PORT:-5000}"
PROJECT="${FIREBASE_PROJECT:-split-rail}"
WORKSPACE_PATH="/venues/00000000-0000-0000-0000-000000000001/events/00000000-0000-0000-0000-000000000002"

if ! command -v firebase >/dev/null 2>&1; then
  echo "firebase CLI is required for hosting emulator smoke checks" >&2
  exit 1
fi

echo "Building web bundle..."
pushd "${WEB_DIR}" >/dev/null
npm ci
npm run build
popd >/dev/null

run_smoke_checks() {
  local base_url="http://127.0.0.1:${HOST_PORT}"

  echo "Asserting SPA shell at /..."
  curl -sf "${base_url}/" | grep -q 'id="root"'

  echo "Asserting deep link /settings/team..."
  curl -sf -o /dev/null -w '%{http_code}' "${base_url}/settings/team" | grep -q 200

  echo "Asserting workspace deep link..."
  curl -sf -o /dev/null -w '%{http_code}' "${base_url}${WORKSPACE_PATH}" | grep -q 200
}

echo "Running Firebase Hosting emulator smoke checks..."
pushd "${WEB_DIR}" >/dev/null
firebase emulators:exec --only hosting --project "${PROJECT}" "bash -c '$(declare -f run_smoke_checks); run_smoke_checks'"
popd >/dev/null

echo "Firebase hosting smoke checks passed for project ${PROJECT}"
