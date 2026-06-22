# Split-Rail Live Production Infrastructure Blueprint

## 1. Cloud SQL Relation Engine Context
- **GCP Project ID:** `split-rail`
- **Instance Region Deployment:** `us-central1`
- **Cloud SQL Connection Name Target:** `split-rail:us-central1:split-rail-db-prod`
- **Relational Database Name Box:** `split-rail-db`
- **Persistence Framework:** Entity Framework Core utilizing `Npgsql.EntityFrameworkCore.PostgreSQL`
- **Axiom:** All C# DBContext initializations must assume UNIX socket execution when running on Cloud Run, utilizing `/cloudsql/split-rail:us-central1:split-rail-db-prod` as the local socket network proxy.

## 2. Immutable Object Snapshot Bucket Context
- **Production archive (WORM):** `gs://split-rail-settlements-prod` — 7-year Object Retention Policy + Bucket Lock (2555 days)
- **Production staging (deletable):** `gs://split-rail-settlements-staging-prod` — no retention lock (orphan cleanup per spec 043)
- **Development archive:** `gs://split-rail-settlements-dev`
- **Development staging:** `gs://split-rail-settlements-staging-dev`
- **Preview archive (optional):** `gs://split-rail-settlements-preview`
- **Preview staging (optional):** `gs://split-rail-settlements-staging-preview`
- **Provisioning:** `deploy/infra/provision-settlement-buckets.sh` or `.ps1` with `ENV=dev|preview|prod` (spec 054)
- **Validation:** `deploy/lib/validate-settlement-buckets.sh`
- **GCS Integration Strategy:** Google.Cloud.Storage.V1 client wrapper factory; Cloud Run Workload Identity (no JSON keys)
