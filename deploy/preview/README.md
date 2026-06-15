# Ephemeral Preview Environment

Per-PR Cloud Run preview for E2E testing. See `specs/005-e2e-lifecycle-leak-testing/contracts/preview-environment.md`.

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
