# Split-Rail Live Production Infrastructure Blueprint

## 1. Cloud SQL Relation Engine Context
- **GCP Project ID:** `split-rail`
- **Instance Region Deployment:** `us-central1`
- **Cloud SQL Connection Name Target:** `split-rail:us-central1:split-rail-db-prod`
- **Relational Database Name Box:** `split-rail-db`
- **Persistence Framework:** Entity Framework Core utilizing `Npgsql.EntityFrameworkCore.PostgreSQL`
- **Axiom:** All C# DBContext initializations must assume UNIX socket execution when running on Cloud Run, utilizing `/cloudsql/split-rail:us-central1:split-rail-db-prod` as the local socket network proxy.

## 2. Immutable Object Snapshot Bucket Context
- **WORM Target Bucket Uniform Identifier:** `gs://split-rail-settlements-prod`
- **Active Lock Status:** Enforced (3-Year WORM Compliance Retention Policy Policy)
- **GCS Integration Strategy:** Google.Cloud.Storage.V1 client wrapper factory.