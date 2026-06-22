#!/usr/bin/env bash
# Shared bucket name resolution for settlement archive IaC (spec 054).
# Source from provision/validate scripts — do not execute directly.

resolve_settlement_bucket_names() {
  : "${ENV:?ENV required (dev|preview|prod)}"

  case "${ENV}" in
    dev)
      ARCHIVE_BUCKET="split-rail-settlements-dev"
      STAGING_BUCKET="split-rail-settlements-staging-dev"
      ;;
    preview)
      ARCHIVE_BUCKET="split-rail-settlements-preview"
      STAGING_BUCKET="split-rail-settlements-staging-preview"
      ;;
    prod)
      ARCHIVE_BUCKET="split-rail-settlements-prod"
      STAGING_BUCKET="split-rail-settlements-staging-prod"
      ;;
    *)
      echo "Invalid ENV '${ENV}': must be dev, preview, or prod" >&2
      return 1
      ;;
  esac

  export ARCHIVE_BUCKET STAGING_BUCKET
}
