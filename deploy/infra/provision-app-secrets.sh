#!/usr/bin/env bash
set -euo pipefail

: "${GCP_PROJECT:?GCP_PROJECT required}"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# Application boot secrets for Cloud Run (SPLR-48). Values are added separately via:
#   gcloud secrets versions add SECRET_ID --data-file=-
# Never commit or echo secret values (Constitution VIII).

APP_SECRETS=(
  jwt-signing-key
  qbo-client-id
  qbo-client-secret
  qbo-internal-trigger-key
)

ensure_secret_resource() {
  local secret_id="$1"
  if gcloud secrets describe "${secret_id}" --project="${GCP_PROJECT}" >/dev/null 2>&1; then
    echo "Secret ${secret_id} already exists in project ${GCP_PROJECT}"
  else
    echo "Creating secret ${secret_id} in project ${GCP_PROJECT}..."
    gcloud secrets create "${secret_id}" \
      --project="${GCP_PROJECT}" \
      --replication-policy="automatic"
  fi
}

echo "Provisioning application Secret Manager resources (no values written)..."
for secret_id in "${APP_SECRETS[@]}"; do
  ensure_secret_resource "${secret_id}"
done

if gcloud secrets describe db-password --project="${GCP_PROJECT}" >/dev/null 2>&1; then
  echo "Secret db-password already exists (Cloud SQL deploy prerequisite)."
else
  echo "NOTE: db-password not found — create and populate before production deploy (spec 053)."
fi

echo "Done. Add secret versions with gcloud secrets versions add (see specs/055-gcp-secret-manager-qbo-jwt/quickstart.md)."
