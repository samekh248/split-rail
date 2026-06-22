#!/usr/bin/env bash
set -euo pipefail

: "${GCP_PROJECT:?GCP_PROJECT required}"
: "${ENV:?ENV required (dev|preview|prod)}"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck source=deploy/lib/settlement-bucket-names.sh
source "${REPO_ROOT}/deploy/lib/settlement-bucket-names.sh"
resolve_settlement_bucket_names

MIN_RETENTION_SECONDS=$((2555 * 86400))

describe_bucket() {
  gcloud storage buckets describe "gs://${1}" --project="${GCP_PROJECT}" --format=json 2>/dev/null
}

check_public_access_prevention() {
  local json="$1"
  local bucket_name="$2"
  if ! echo "${json}" | grep -q '"publicAccessPrevention": "enforced"'; then
    echo "FAIL: bucket ${bucket_name} does not enforce public access prevention" >&2
    return 1
  fi
  echo "public_access_ok: ${bucket_name}"
}

check_archive_retention() {
  local json="$1"
  local retention
  retention="$(echo "${json}" | grep -o '"retentionPeriod": "[0-9]*s"' | head -1 | grep -o '[0-9]*' || true)"
  if [[ -z "${retention}" ]]; then
    echo "FAIL: archive bucket ${ARCHIVE_BUCKET} has no retention policy" >&2
    return 1
  fi
  if (( retention < MIN_RETENTION_SECONDS )); then
    echo "FAIL: archive bucket ${ARCHIVE_BUCKET} retention ${retention}s is less than required ${MIN_RETENTION_SECONDS}s" >&2
    return 1
  fi
  echo "archive_retention_ok: ${ARCHIVE_BUCKET} (${retention}s)"
}

check_staging_deletable() {
  local json="$1"
  if echo "${json}" | grep -q '"retentionPeriod": "[1-9]'; then
    echo "FAIL: staging bucket ${STAGING_BUCKET} must not have a retention lock" >&2
    return 1
  fi
  echo "staging_deletable_ok: ${STAGING_BUCKET}"
}

check_prod_bucket_lock() {
  if [[ "${ENV}" != "prod" ]]; then
    return 0
  fi
  local json="$1"
  if ! echo "${json}" | grep -q '"retentionPolicyLocked": true'; then
    echo "WARN: prod archive bucket ${ARCHIVE_BUCKET} retention policy is not locked (expected after CONFIRM_BUCKET_LOCK=true provision)" >&2
  fi
}

archive_json="$(describe_bucket "${ARCHIVE_BUCKET}")" || {
  echo "FAIL: archive bucket gs://${ARCHIVE_BUCKET} not found or inaccessible" >&2
  exit 1
}

staging_json="$(describe_bucket "${STAGING_BUCKET}")" || {
  echo "FAIL: staging bucket gs://${STAGING_BUCKET} not found or inaccessible" >&2
  exit 1
}

failed=0
check_archive_retention "${archive_json}" || failed=1
check_staging_deletable "${staging_json}" || failed=1
check_public_access_prevention "${archive_json}" "${ARCHIVE_BUCKET}" || failed=1
check_public_access_prevention "${staging_json}" "${STAGING_BUCKET}" || failed=1
check_prod_bucket_lock "${archive_json}" || true

if (( failed != 0 )); then
  exit 1
fi

echo "Settlement bucket validation passed for ENV=${ENV}"
