#!/usr/bin/env bash
set -euo pipefail

: "${GCP_PROJECT:?GCP_PROJECT required}"
: "${GCP_REGION:?GCP_REGION required}"
: "${ENV:?ENV required (dev|preview|prod)}"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck source=deploy/lib/settlement-bucket-names.sh
source "${REPO_ROOT}/deploy/lib/settlement-bucket-names.sh"
resolve_settlement_bucket_names

RUNTIME_SA_EMAIL="${RUNTIME_SA_EMAIL:-${GCP_PROJECT_NUMBER:+${GCP_PROJECT_NUMBER}-compute@developer.gserviceaccount.com}}"

create_or_update_bucket() {
  local name="$1"
  if gcloud storage buckets describe "gs://${name}" --project="${GCP_PROJECT}" >/dev/null 2>&1; then
    echo "Bucket gs://${name} already exists — updating settings"
  else
    gcloud storage buckets create "gs://${name}" \
      --project="${GCP_PROJECT}" \
      --location="${GCP_REGION}" \
      --default-storage-class=STANDARD \
      --uniform-bucket-level-access \
      --public-access-prevention
  fi
}

ensure_archive_retention() {
  local current_json
  current_json="$(gcloud storage buckets describe "gs://${ARCHIVE_BUCKET}" --project="${GCP_PROJECT}" --format=json)"

  if echo "${current_json}" | grep -q '"retentionPolicyLocked": true'; then
    local current_period
    current_period="$(echo "${current_json}" | grep -o '"retentionPeriod": "[0-9]*s"' | head -1 | grep -o '[0-9]*' || true)"
    local min_seconds=$((2555 * 86400))
    if [[ -n "${current_period}" && "${current_period}" -lt "${min_seconds}" ]]; then
      echo "ERROR: archive bucket ${ARCHIVE_BUCKET} is retention-locked with insufficient period (${current_period}s). Bucket Lock is irreversible — manual ops review required." >&2
      exit 1
    fi
    echo "Archive bucket ${ARCHIVE_BUCKET} already retention-locked — skipping retention downgrade"
    return 0
  fi

  gcloud storage buckets update "gs://${ARCHIVE_BUCKET}" \
    --project="${GCP_PROJECT}" \
    --retention-period=2555d
}

lock_archive_retention() {
  if [[ "${ENV}" != "prod" ]]; then
    return 0
  fi
  if [[ "${CONFIRM_BUCKET_LOCK:-}" != "true" ]]; then
    echo "Skipping prod bucket lock — set CONFIRM_BUCKET_LOCK=true to apply irreversible Bucket Lock on ${ARCHIVE_BUCKET}"
    return 0
  fi
  local current_json
  current_json="$(gcloud storage buckets describe "gs://${ARCHIVE_BUCKET}" --project="${GCP_PROJECT}" --format=json)"
  if echo "${current_json}" | grep -q '"retentionPolicyLocked": true'; then
    echo "Archive bucket ${ARCHIVE_BUCKET} already locked"
    return 0
  fi
  echo "Applying irreversible Bucket Lock on ${ARCHIVE_BUCKET}..."
  gcloud storage buckets update "gs://${ARCHIVE_BUCKET}" \
    --project="${GCP_PROJECT}" \
    --lock-retention-period
}

bind_iam() {
  local bucket="$1"
  if [[ -z "${RUNTIME_SA_EMAIL:-}" ]]; then
    echo "WARN: RUNTIME_SA_EMAIL not set — skipping IAM bind for gs://${bucket}" >&2
    return 0
  fi
  gcloud storage buckets add-iam-policy-binding "gs://${bucket}" \
    --project="${GCP_PROJECT}" \
    --member="serviceAccount:${RUNTIME_SA_EMAIL}" \
    --role="roles/storage.objectAdmin" \
    --quiet >/dev/null
  echo "IAM bound ${RUNTIME_SA_EMAIL} → gs://${bucket}"
}

echo "Provisioning settlement buckets for ENV=${ENV}..."
echo "  Archive: gs://${ARCHIVE_BUCKET}"
echo "  Staging: gs://${STAGING_BUCKET}"

create_or_update_bucket "${ARCHIVE_BUCKET}"
ensure_archive_retention
lock_archive_retention

create_or_update_bucket "${STAGING_BUCKET}"
# Staging bucket: no retention-period or lock-retention-period flags (deletable for orphan cleanup)

bind_iam "${ARCHIVE_BUCKET}"
bind_iam "${STAGING_BUCKET}"

export ENV GCP_PROJECT
"${REPO_ROOT}/deploy/lib/validate-settlement-buckets.sh"

echo "Settlement bucket provisioning complete for ENV=${ENV}"
