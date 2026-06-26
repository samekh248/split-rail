#!/usr/bin/env bash
# Shared QBO scheduler name resolution (spec 057).
# Source from provision/validate scripts — do not execute directly.

resolve_qbo_scheduler_names() {
  : "${ENV:?ENV required (dev|prod)}"
  : "${GCP_PROJECT:?GCP_PROJECT required}"

  case "${ENV}" in
    dev)
      SCHEDULER_JOB_NAME="split-rail-qbo-sync-dev"
      SCHEDULER_SA_ID="split-rail-qbo-scheduler-dev"
      ;;
    prod)
      SCHEDULER_JOB_NAME="split-rail-qbo-sync-prod"
      SCHEDULER_SA_ID="split-rail-qbo-scheduler-prod"
      ;;
    *)
      echo "Invalid ENV '${ENV}': must be dev or prod" >&2
      return 1
      ;;
  esac

  SCHEDULER_SA_EMAIL="${SCHEDULER_SA_ID}@${GCP_PROJECT}.iam.gserviceaccount.com"
  export SCHEDULER_JOB_NAME SCHEDULER_SA_ID SCHEDULER_SA_EMAIL
}

SCHEDULER_CRON="*/15 * * * *"
SCHEDULER_TIME_ZONE="UTC"
SCHEDULER_HTTP_METHOD="POST"
SCHEDULER_TRIGGER_PATH="/api/internal/qbo-sync-trigger"
export SCHEDULER_CRON SCHEDULER_TIME_ZONE SCHEDULER_HTTP_METHOD SCHEDULER_TRIGGER_PATH
