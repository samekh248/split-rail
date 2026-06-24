# Quickstart Validation Guide: Centralized Secret Management for Production Credentials

**Feature**: 055-gcp-secret-manager-qbo-jwt (SPLR-48) | **Date**: 2026-06-22

## Prerequisites

- `gcloud` CLI authenticated to project `split-rail`
- .NET 8 SDK (for API integration tests)
- Node 22 + `npm ci` in `apps/web` (for contract tests)
- IAM: `secretmanager.admin` or equivalent to provision secrets; `secretAccessor` on Cloud Run SA

See [contracts/production-secret-bindings.md](contracts/production-secret-bindings.md) and [contracts/committed-config-hygiene.md](contracts/committed-config-hygiene.md).

---

## Scenario 1 — Contract Tests Pass Locally (no GCP)

**Validates**: FR-008, SC-002, Constitution III

```bash
cd apps/web
npm run test -- tests/deploy/deployProductionApi.test.ts
npm run test -- tests/deploy/deployAppSecrets.test.ts
npm run test -- tests/deploy/assertProductionSecretsContract.test.ts
```

**Expected**:
- `deploy-api.sh` and `deploy-api.ps1` include `--set-secrets` for `DB_PASSWORD`, `Jwt__Secret`, `QBO_CLIENT_ID`, `QBO_CLIENT_SECRET`, `QBO_INTERNAL_TRIGGER_KEY`
- No hardcoded JWT/QBO secrets in production deploy script
- `appsettings.json` has empty `Jwt:Secret` and empty QBO credential fields

---

## Scenario 2 — Production Startup Fails Without Secrets

**Validates**: FR-005, SC-004

```bash
cd apps/api.tests
dotnet test --filter "FullyQualifiedName~ProductionSecretConfiguration"
```

**Expected**:
- `WebApplicationFactory` with `ASPNETCORE_ENVIRONMENT=Production` and no secret env vars → startup throws / host fails to build
- With test env vars `Jwt__Secret`, `QBO_CLIENT_ID`, `QBO_CLIENT_SECRET`, `DB_PASSWORD` set → host starts

---

## Scenario 3 — Provision Secret Manager Resources (one-time operator)

**Validates**: FR-001 infrastructure prerequisite

**Linux / macOS / Git Bash:**

```bash
export GCP_PROJECT=split-rail
./deploy/infra/provision-app-secrets.sh
```

**Windows (PowerShell):**

```powershell
$env:GCP_PROJECT = 'split-rail'
.\deploy\infra\provision-app-secrets.ps1
```

Add initial secret versions (example — use real values from secure store):

```bash
# Replace placeholders with real values from your password manager / Intuit developer portal
echo -n "YOUR_JWT_SIGNING_KEY_MIN_32_CHARS" | gcloud secrets versions add jwt-signing-key --data-file=-
echo -n "YOUR_QBO_CLIENT_ID" | gcloud secrets versions add qbo-client-id --data-file=-
echo -n "YOUR_QBO_CLIENT_SECRET" | gcloud secrets versions add qbo-client-secret --data-file=-
echo -n "YOUR_INTERNAL_TRIGGER_KEY" | gcloud secrets versions add qbo-internal-trigger-key --data-file=-
# db-password assumed to exist from prior Cloud SQL setup
```

Grant Cloud Run service account accessor on each secret:

```bash
SA="$(gcloud run services describe split-rail-api --region=us-central1 --format='value(spec.template.spec.serviceAccountName)')"
for SECRET in db-password jwt-signing-key qbo-client-id qbo-client-secret qbo-internal-trigger-key; do
  gcloud secrets add-iam-policy-binding "$SECRET" \
    --member="serviceAccount:${SA}" \
    --role="roles/secretmanager.secretAccessor" \
    --project=split-rail
done
```

**Expected**: All five secrets exist; SA has accessor role; no values written to git.

---

## Scenario 4 — Production Deploy Binds All Secrets

**Validates**: FR-001, SC-001, SC-003

**Prerequisites**: Scenario 3 complete; container image built and pushed (`IMAGE` env set).

**Linux / macOS / Git Bash:**

```bash
export GCP_PROJECT=split-rail
export GCP_REGION=us-central1
export IMAGE="us-central1-docker.pkg.dev/split-rail/.../split-rail-api:TAG"
export DB_PASSWORD="$(gcloud secrets versions access latest --secret=db-password --project=$GCP_PROJECT)"
./deploy/production/deploy-api.sh
```

**Windows (PowerShell):**

```powershell
$env:GCP_PROJECT = 'split-rail'
$env:GCP_REGION = 'us-central1'
$env:IMAGE = 'us-central1-docker.pkg.dev/split-rail/.../split-rail-api:TAG'
$env:DB_PASSWORD = gcloud secrets versions access latest --secret=db-password --project=$env:GCP_PROJECT
.\deploy\production\deploy-api.ps1
```

Inspect deployed bindings:

```bash
gcloud run services describe split-rail-api --region=us-central1 --format=yaml | grep -A20 'secrets:'
```

**Expected**:
- Deploy completes without embedding cleartext secrets in script output
- Service revision lists all five secret env bindings
- Service becomes ready

---

## Scenario 5 — Authenticated API Works After Secret Injection

**Validates**: SC-003, User Story 1 acceptance scenario 2

After Scenario 4 deploy:

```bash
# Register or login (adjust URL to your Cloud Run service URL)
curl -s -X POST "https://YOUR_SERVICE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"...","password":"..."}'
```

**Expected**: HTTP 200 with access token; token validates on subsequent authenticated request.

---

## Scenario 6 — Secret Rotation Without Code Change

**Validates**: SC-005, User Story 3

```bash
# Add new version of internal trigger key (example rotation target)
echo -n "NEW_ROTATED_TRIGGER_KEY_VALUE" | gcloud secrets versions add qbo-internal-trigger-key --data-file=-
gcloud run services update split-rail-api --region=us-central1 --project=split-rail
# Or redeploy same image to pick up :latest
```

**Expected**: New revision starts; application reads updated env on cold start; no source code changes required.

**JWT rotation note**: Rotating `jwt-signing-key` invalidates existing access tokens — users re-authenticate (documented in research.md §7).

---

## Scenario 7 — Coverage Gate

**Validates**: FR-009, SC-006, Constitution III

```bash
cd apps/web && npm run test:coverage -- tests/deploy/
cd apps/api.tests && dotnet test /p:CollectCoverage=true
```

**Expected**: ≥80% line/branch coverage on new Vitest assertion modules and xUnit production secret tests; CI fails on missing reports.

---

## Troubleshooting

| Symptom | Likely cause |
|---------|--------------|
| Cloud Run revision fails immediately | Missing secret version or SA lacks `secretAccessor` |
| JWT auth fails after deploy | `Jwt__Secret` binding missing or placeholder still in config |
| QBO OAuth fails | `QBO_CLIENT_ID` / `QBO_CLIENT_SECRET` not bound or empty |
| Migration step fails | `DB_PASSWORD` not exported in deploy runner before script |
| Contract tests fail on appsettings | Placeholder not removed from `appsettings.json` |
