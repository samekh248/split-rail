# Ephemeral Preview Environment

Per-PR Cloud Run preview for E2E testing. See `specs/005-e2e-lifecycle-leak-testing/contracts/preview-environment.md`.

## Web frontend container (`Dockerfile.web`)

The preview pipeline builds a self-contained web image from the **repository root**:

```bash
docker build -t splitrail-web:local -f deploy/preview/Dockerfile.web .
```

The multi-stage build:

1. Exports OpenAPI from the compiled API (`dotnet swagger tofile`)
2. Regenerates `generated-api.ts` (`npm run gen:api`)
3. Produces the Vite production bundle
4. Serves static assets with nginx SPA fallback (`try_files → /index.html`)

Local smoke validation (requires Docker):

```bash
./deploy/preview/smoke-web-image.sh
```

**Note**: `deploy-preview.sh` currently pushes the web image to Artifact Registry but deploys **API only** to Cloud Run. Wiring the web image into Cloud Run is future work (see spec 051 Out of Scope).

## Branch protection (required checks)

Configure `main` to require these status checks:

- `coverage-gate`
- `e2e-gate`

```bash
gh api repos/:owner/:repo/branches/main/protection \
  --method PUT \
  --field required_status_checks[strict]=true \
  --field required_status_checks[contexts][]=coverage-gate \
  --field required_status_checks[contexts][]=e2e-gate \
  --field enforce_admins=true \
  --field required_pull_request_reviews[required_approving_review_count]=1
```

Adjust review requirements to match your repo policy.

## Deploy / teardown

```bash
export GCP_PROJECT=your-project
export GCP_REGION=us-central1
export RUN_ID="${GITHUB_RUN_ID:-local-$(date +%s)}"

./deploy/preview/deploy-preview.sh
./deploy/preview/teardown-preview.sh  # always run, even on failure
```
