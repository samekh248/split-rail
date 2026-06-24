# Contract: Settlement Archive Bucket Provisioning (IaC)

Defines repeatable infrastructure provisioning for WORM settlement archive and deletable staging buckets (SPLR-47, TDD §7).

## Inputs (env)

| Variable | Required | Description |
|----------|----------|-------------|
| `GCP_PROJECT` | yes | `split-rail` |
| `GCP_REGION` | yes | `us-central1` (default location) |
| `ENV` | yes | `dev` \| `preview` \| `prod` |
| `CONFIRM_BUCKET_LOCK` | prod only | MUST be `true` to apply irreversible Bucket Lock on archive bucket |

## Script: `deploy/infra/provision-settlement-buckets.sh`

### Bucket name resolution

| `ENV` | Archive | Staging |
|-------|---------|---------|
| `dev` | `split-rail-settlements-dev` | `split-rail-settlements-staging-dev` |
| `preview` | `split-rail-settlements-preview` | `split-rail-settlements-staging-preview` |
| `prod` | `split-rail-settlements-prod` | `split-rail-settlements-staging-prod` |

### Step order

1. **Resolve names** from `ENV`.
2. **Create archive bucket** (if absent) — `us-central1`, Standard class, uniform bucket-level access, public access prevention enforced.
3. **Configure archive retention** — `--retention-period=2555d` (7 years).
4. **Lock archive retention** (prod only, when `CONFIRM_BUCKET_LOCK=true`) — `--lock-retention-period`; script MUST warn that lock is irreversible.
5. **Create staging bucket** (if absent) — same location/class/access; **no** retention period.
6. **Bind IAM** — Cloud Run runtime SA: `roles/storage.objectAdmin` on both buckets (parameterized `RUNTIME_SA_EMAIL` or project default).
7. **Validate** — invoke `deploy/lib/validate-settlement-buckets.sh` for this `ENV`; fail on non-zero exit.

### Idempotency contract

- Re-run with unchanged config: create steps no-op if buckets exist; retention/IAM updated only when drift detected.
- MUST NOT delete buckets or objects.
- MUST NOT reduce retention period on locked buckets.
- MUST fail with actionable error if existing archive bucket has insufficient retention and is already locked.

## Script: `deploy/lib/validate-settlement-buckets.sh`

### Checks (exit non-zero if any fail)

| Check | Archive | Staging |
|-------|---------|---------|
| Bucket exists | yes | yes |
| Retention period ≥ 2555 days | yes | no retention |
| Bucket lock (prod archive) | yes | n/a |
| Public access prevention | enforced | enforced |

### Outputs

- Structured stdout lines: `archive_retention_ok`, `staging_deletable_ok`, `public_access_ok`.
- No bucket credentials or signed URLs in output (Constitution VIII).

## Security contract

- Scripts MUST NOT write or print service account key JSON.
- Scripts MUST NOT embed long-lived secrets.
- IAM bindings use service account email only.

## Success criteria mapping

| Requirement | Contract enforcement |
|-------------|---------------------|
| FR-001 | Archive retention 2555d + lock (prod) |
| FR-002 | Staging created without retention |
| FR-003 | Standard class, encryption default, public access blocked |
| FR-004 | Distinct names per `ENV` |
| FR-005 | Idempotent create/update semantics |
| FR-010 | Validate script checks |
| SC-001, SC-002, SC-005, SC-006 | Validate + idempotent provision |

## Verification

- Vitest contract tests assert script files exist, reference retention period `2555`, staging has no lock command, prod requires `CONFIRM_BUCKET_LOCK`.
- Manual: run provision for `dev`, then validate; `gcloud storage buckets describe` both buckets.
