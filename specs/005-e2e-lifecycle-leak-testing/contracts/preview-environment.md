# Contract: Ephemeral Preview Environment & Hermetic QBO Stub

Per-run isolated deployment of the assembled stack for E2E execution (FR-002), destroyed afterward (FR-016). Provisioned by `deploy/preview/deploy-preview.sh`, removed by `deploy/preview/teardown-preview.sh`.

## Deploy contract (`deploy-preview.sh`)

Inputs (env): `GCP_PROJECT`, `GCP_REGION`, `RUN_ID` (unique per pipeline run), image tags.

Steps:
1. Build the API container (existing `apps/api/Dockerfile`) and the static web build (`apps/web` `vite build`), tag with `RUN_ID`, push to Artifact Registry.
2. Provision an ephemeral PostgreSQL (containerized Postgres in the deploy, or a short-lived Cloud SQL instance) — uniquely named with `RUN_ID`.
3. Deploy a uniquely-named Cloud Run service `splitrail-preview-${RUN_ID}` with environment:
   - `Preview:UseFakeQboConnector=true`
   - `Preview:EnableTestSeeding=true`
   - `ASPNETCORE_ENVIRONMENT=Preview`
   - ephemeral DB connection string; disposable settlement-archive bucket name (or in-process archive fake).
4. Run EF Core migrations against the ephemeral DB.
5. Invoke the seeding surface (see `seeding-api.md`) to load the deterministic dataset.
6. Emit `PREVIEW_BASE_URL` as a job output for the E2E matrix.

Outputs: `PREVIEW_BASE_URL`, `RUN_ID` (for teardown).

Failure handling (edge case "preview fails to start"): if any deploy step fails, the job fails cleanly and `teardown-preview` still runs; E2E is **not** executed against a partial/stale environment.

## Teardown contract (`teardown-preview.sh`)

- Runs in a CI job with `if: always()` (FR-016/SC-006).
- Deletes: Cloud Run service `splitrail-preview-${RUN_ID}`, the ephemeral DB instance, the disposable bucket, and pushed preview images (optional GC).
- Idempotent: safe to run even if deploy partially completed or already torn down.
- Optional scheduled reaper removes any `splitrail-preview-*` older than N hours as a safety net.

## Hermetic QBO stub contract

| Element | Production | Preview/Test |
|---------|-----------|--------------|
| `IQboTransactionClient` impl | `QboTransactionClient` (real Intuit HTTP) | `FakeQboTransactionClient` (deterministic actuals, no network) |
| Registration | always | swapped when `Preview:UseFakeQboConnector=true` |
| `QboApi` named client | real handler | wrapped with `QboEgressRecordingHandler` |

- `FakeQboTransactionClient.FetchTransactionsByTagAsync(...)` returns a fixed list of `QboFetchedTransaction` keyed by the seeded event's `qboTagName` (deterministic amounts), enabling reproducible variance assertions (FR-011a, US2#5). It performs no outbound HTTP and no mutation.
- `QboEgressRecordingHandler` (a `DelegatingHandler` on the `QboApi` client) records `{method, host, timestamp}` for any outbound request and **rejects** (throws granular domain exception) any POST/PUT/DELETE toward the Intuit base URL. The integrity suite asserts zero such records (FR-011/SC-004). It logs verb+host only — never auth headers or bodies (Constitution VIII).

## Isolation & safety

- Unique `RUN_ID` naming guarantees concurrent PR pipelines never share a preview (edge case: shared/stale environment).
- The preview DB and bucket are disposable; no production data is ever present.
- Seeded credentials are deterministic non-secret test values (Constitution VIII).
