# Production deployment

Automated production releases run from GitHub Actions on push to `main` (after CI gates pass) or via manual **workflow_dispatch**. The pipeline deploys the API to Cloud Run and the web app to Firebase Hosting.

## Pipeline flow

1. **CI gates** — `coverage-gate` and `contract-type-drift` must pass.
2. **API** — build/push container image → EF migrations → `deploy-api.sh` (Cloud Run).
3. **Web** — build `apps/web/dist` → `deploy-web-hosting.sh` (Firebase Hosting).
4. **Smoke** — curl Cloud Run Swagger and Firebase Hosting root.

Workflow: [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) (`deploy-production` job).

## Enable production deploy

Production deploy is **off by default**. Enable intentionally:

1. Create a GitHub Environment named **`production`** (Settings → Environments). Optional: add required reviewers for manual approval before deploy.
2. Set repository **variables**:
   - `GCP_PROJECT` — e.g. `split-rail`
   - `GCP_REGION` — e.g. `us-central1`
   - `ENABLE_PRODUCTION_DEPLOY` — set to `true`
3. Set repository **secrets**:
   - `GCP_SA_KEY` — JSON key for the deploy service account (same as preview CI)
   - `FIREBASE_TOKEN` — CI token from `firebase login:ci`

### Generate Firebase CI token

```bash
firebase login:ci
```

Copy the token into GitHub **Settings → Secrets and variables → Actions → `FIREBASE_TOKEN`**.

## GitHub configuration reference

| Name | Type | Required | Purpose |
|------|------|----------|---------|
| `GCP_PROJECT` | variable | yes | GCP project id |
| `GCP_REGION` | variable | yes | Region for Cloud Run and Artifact Registry |
| `ENABLE_PRODUCTION_DEPLOY` | variable | yes | Must be `true` for deploy job to run |
| `GCP_SA_KEY` | secret | yes | gcloud / Artifact Registry / Cloud Run / Secret Manager |
| `FIREBASE_TOKEN` | secret | yes | Firebase Hosting deploy from CI |

## IAM for deploy service account

The service account behind `GCP_SA_KEY` (`github-deployer@...`) needs:

| Permission / role | Used for |
|-------------------|----------|
| Artifact Registry Writer | Push API images |
| Cloud Run Admin | Deploy `split-rail-api` |
| Secret Manager Secret Accessor | Read `db-password` for migrations |
| Cloud SQL Client | Cloud SQL Auth Proxy during migrate step |
| Service Account User on runtime SA (`PROJECT_NUMBER-compute@developer.gserviceaccount.com`) | `gcloud run deploy` actAs |
| Service Account User on `split-rail-qbo-scheduler-prod@...` | Scheduler OIDC job create/update |
| Cloud Scheduler Admin | Create/update `split-rail-qbo-sync-prod` |
| Service Account Admin (or pre-create SA) | Create scheduler SA if missing |

### Cloud Run runtime service account

The default compute SA that runs the container also needs:

| Permission | Used for |
|------------|----------|
| Secret Manager Secret Accessor on `db-password`, `jwt-signing-key`, `qbo-client-id`, `qbo-client-secret` | `--set-secrets` mounts |
| Cloud SQL Client | Connect via Cloud SQL connector |
| Storage Object Admin on `gs://split-rail-dp-keys-prod` | Data Protection key ring |
| Cloud KMS CryptoKey Encrypter/Decrypter on `.../cryptoKeys/masterkey` | Protect DP keys |
| Storage access on settlement buckets | Settlement archive |

### Provision Data Protection resources (one-time)

```powershell
# Bucket for DP key ring XML
gcloud storage buckets create gs://split-rail-dp-keys-prod `
  --project=split-rail `
  --location=us-central1 `
  --uniform-bucket-level-access

# KMS key ring + key (skip create if already exists)
gcloud kms keyrings create dataprotection --location=global --project=split-rail
gcloud kms keys create masterkey `
  --location=global `
  --keyring=dataprotection `
  --purpose=encryption `
  --project=split-rail

$RuntimeSa = "800439099052-compute@developer.gserviceaccount.com"
gsutil iam ch "serviceAccount:${RuntimeSa}:objectAdmin" gs://split-rail-dp-keys-prod
gcloud kms keys add-iam-policy-binding masterkey `
  --location=global `
  --keyring=dataprotection `
  --member="serviceAccount:$RuntimeSa" `
  --role="roles/cloudkms.cryptoKeyEncrypterDecrypter" `
  --project=split-rail
```

Firebase Hosting uses `FIREBASE_TOKEN` (separate from the GCP SA). Ensure the Firebase account has Hosting deploy access on project `split-rail`.

## Manual deploy (local)

### API

```bash
export GCP_PROJECT=split-rail
export GCP_REGION=us-central1
export IMAGE=us-central1-docker.pkg.dev/split-rail/split-rail/api:tag
export DB_PASSWORD="$(gcloud secrets versions access latest --secret=db-password --project="${GCP_PROJECT}")"
./deploy/production/deploy-api.sh
```

See [`specs/053-cloud-sql-ef-migrations/contracts/production-api-deploy.md`](../../specs/053-cloud-sql-ef-migrations/contracts/production-api-deploy.md).

### Web

```bash
./deploy/production/deploy-web-hosting.sh
```

## Manual workflow trigger

In GitHub: **Actions → CI → Run workflow** on branch `main`. The deploy job runs only when `ENABLE_PRODUCTION_DEPLOY=true` and CI gates pass.

## Verification

After a successful run:

- Actions log shows image push → migrate → Cloud Run revise → Firebase deploy.
- API: `curl -sf "$(gcloud run services describe split-rail-api --region=us-central1 --format='value(status.url)')/swagger/v1/swagger.json"`
- Web: `curl -sf https://split-rail.web.app/`

Optional local hosting smoke (emulator): `./deploy/production/smoke-firebase-hosting.sh`
