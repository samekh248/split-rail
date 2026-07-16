#!/usr/bin/env bash
set -euo pipefail

: "${GCP_PROJECT:?GCP_PROJECT required}"
: "${GCP_REGION:?GCP_REGION required}"
: "${ENV:?ENV required (dev|prod)}"
: "${CLOUD_RUN_URL:?CLOUD_RUN_URL required}"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck source=deploy/lib/qbo-scheduler-names.sh
source "${REPO_ROOT}/deploy/lib/qbo-scheduler-names.sh"
resolve_qbo_scheduler_names

TARGET_URI="${CLOUD_RUN_URL%/}${SCHEDULER_TRIGGER_PATH}"
FAILURES=0

# Compare strings directly. Do not evaluate `[[ ... ]]` via `"$@"` — `[[` is a
# shell keyword, so that pattern fails with "[[: command not found".
check_eq() {
  local label="$1"
  local actual="$2"
  local expected="$3"
  if [[ "${actual}" == "${expected}" ]]; then
    echo "${label}_ok"
  else
    echo "${label}_FAIL actual='${actual}' expected='${expected}'" >&2
    FAILURES=$((FAILURES + 1))
  fi
}

job_json="$(gcloud scheduler jobs describe "${SCHEDULER_JOB_NAME}" \
  --location="${GCP_REGION}" \
  --project="${GCP_PROJECT}" \
  --format=json 2>/dev/null || true)"

if [[ -z "${job_json}" ]]; then
  echo "scheduler_job_missing_FAIL" >&2
  exit 1
fi

schedule="$(echo "${job_json}" | grep -o '"schedule": *"[^"]*"' | head -1 | sed 's/.*"schedule": *"\([^"]*\)".*/\1/')"
uri="$(echo "${job_json}" | grep -o '"uri": *"[^"]*"' | head -1 | sed 's/.*"uri": *"\([^"]*\)".*/\1/')"
http_method="$(echo "${job_json}" | grep -o '"httpMethod": *"[^"]*"' | head -1 | sed 's/.*"httpMethod": *"\([^"]*\)".*/\1/')"
oidc_sa="$(echo "${job_json}" | grep -o '"serviceAccountEmail": *"[^"]*"' | head -1 | sed 's/.*"serviceAccountEmail": *"\([^"]*\)".*/\1/')"
oidc_aud="$(echo "${job_json}" | grep -o '"audience": *"[^"]*"' | head -1 | sed 's/.*"audience": *"\([^"]*\)".*/\1/')"

check_eq schedule_ok "${schedule}" "${SCHEDULER_CRON}"
check_eq uri_ok "${uri}" "${TARGET_URI}"
check_eq http_method_ok "${http_method}" "${SCHEDULER_HTTP_METHOD}"
check_eq oidc_sa_ok "${oidc_sa}" "${SCHEDULER_SA_EMAIL}"
check_eq oidc_audience_ok "${oidc_aud}" "${CLOUD_RUN_URL}"

if [[ "${FAILURES}" -gt 0 ]]; then
  echo "validate-qbo-scheduler: ${FAILURES} check(s) failed for ENV=${ENV}" >&2
  exit 1
fi

echo "validate-qbo-scheduler: all checks passed for ENV=${ENV}"
