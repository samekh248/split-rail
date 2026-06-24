#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
WEB_DIR="${REPO_ROOT}/apps/web"
PROJECT="${FIREBASE_PROJECT:-split-rail}"
SITE="${FIREBASE_HOSTING_SITE:-}"

if ! command -v firebase >/dev/null 2>&1; then
  echo "firebase CLI is required. Install with: npm install -g firebase-tools" >&2
  exit 1
fi

pushd "${WEB_DIR}" >/dev/null

if [ ! -f dist/index.html ]; then
  echo "dist/index.html missing — building web bundle..."
  npm ci
  npm run build
fi

if [ ! -f dist/index.html ]; then
  echo "Web build failed: dist/index.html still missing" >&2
  exit 1
fi

DEPLOY_ARGS=(deploy --only hosting --project "${PROJECT}")
if [ -n "${SITE}" ]; then
  DEPLOY_ARGS+=(--site "${SITE}")
fi

echo "Deploying to Firebase Hosting (project=${PROJECT}${SITE:+, site=${SITE}})..."
firebase "${DEPLOY_ARGS[@]}"

popd >/dev/null

echo "Firebase Hosting deploy complete."
