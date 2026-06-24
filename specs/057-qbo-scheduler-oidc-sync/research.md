# Phase 0 Research: Scheduled QBO Sync Trigger for Deployed Environments

This document resolves technical decisions for SPLR-49 — provisioning Cloud Scheduler to invoke the internal QBO sync trigger every 6 hours with OIDC authentication.

## 1. Current state gap

- **Decision**: Treat the feature as **infrastructure + endpoint auth hardening** on top of existing `QboSyncService` / `POST /api/internal/qbo-sync-trigger` (spec 003).
- **Rationale**: `QboSyncHostedService` disables its in-process timer when `EnableInProcessTimer=false` (production default). The internal trigger exists but authenticates via `X-Internal-Sync-Key` shared secret — not OIDC as originally planned in spec 003 research. No `deploy/infra/` scheduler script exists. Production deploy (spec 055) binds `QBO_INTERNAL_TRIGGER_KEY` from Secret Manager but nothing invokes the route on a schedule.
- **Alternatives considered**:
  - **Re-enable in-process timer in production** — rejected; unreliable on Cloud Run scale-to-zero (spec 003 research).
  - **Cloud Tasks per-venue scheduling** — rejected; unnecessary complexity for a single global sync batch.

## 2. Internal trigger authentication model

- **Decision**: Replace shared-key authentication on `QboInternalSyncController` with **Google OIDC service-account JWT validation** at the application layer:
  1. Add a second JWT bearer scheme (`GoogleScheduler`) with `Authority = https://accounts.google.com` and audience set to the Cloud Run service URL (or configured `QboSync:SchedulerTokenAudience`).
  2. Add authorization policy `SchedulerTrigger` requiring authenticated `GoogleScheduler` principal whose `email` claim equals `QboSync:SchedulerServiceAccountEmail`.
  3. Decorate `TriggerSync` with `[Authorize(AuthenticationSchemes = "GoogleScheduler", Policy = "SchedulerTrigger")]`.
  4. **Development/local**: retain optional `X-Internal-Sync-Key` fallback only when `EnableInProcessTimer=true` and key is configured (local integration tests); production MUST NOT accept shared key.
  5. Remove `InternalTriggerKey` from `ProductionSecretConfigurationValidator` and production `--set-secrets` bindings (supersedes interim spec 055 shared-key path for scheduler auth).

- **Rationale**: Spec FR-005/FR-006 require OIDC scheduler identity, not static secrets. App-level validation allows the route to coexist with public user JWT routes on the same Cloud Run service without requiring ingress-level `run.invoker` lockdown for all traffic. Cloud Scheduler natively attaches OIDC tokens via `--oidc-service-account-email` and `--oidc-token-audience`.
- **Alternatives considered**:
  - **Cloud Run IAM only (`roles/run.invoker`)** — rejected for v1; would block unauthenticated browser/API traffic unless split into a separate internal service.
  - **Keep shared key + scheduler header** — rejected; violates FR-005/FR-011 and spec 003 original intent.
  - **Custom HMAC middleware** — rejected; OIDC is GCP-native and secret-free.

## 3. Scheduler service account and IAM

- **Decision**:
  - Create dedicated service account per environment: `split-rail-qbo-scheduler-{env}@{GCP_PROJECT}.iam.gserviceaccount.com` where `{env}` is `dev` or `prod`.
  - Provision script creates SA (if absent), grants **no** broad project roles — scheduler SA only needs to mint OIDC tokens for HTTP target (implicit for its own identity).
  - Cloud Run runtime SA does **not** need changes for scheduler auth (validation is app-level JWT).
  - Optional: grant `roles/cloudscheduler.serviceAgent` is automatic; no `run.invoker` needed with app-level OIDC.

- **Rationale**: Least-privilege identity dedicated to sync triggering; environment isolation (FR-010 cross-env edge case).
- **Alternatives considered**:
  - **Reuse Cloud Run runtime SA as scheduler identity** — rejected; couples deploy identity to scheduler, harder to audit.
  - **Single cross-env scheduler SA** — rejected; violates environment isolation assumption.

## 4. Cloud Scheduler job configuration

- **Decision**:
  - Job name: `split-rail-qbo-sync-{env}` (e.g. `split-rail-qbo-sync-prod`).
  - Schedule: `0 */6 * * *` (every 6 hours at minute 0, UTC) — aligns with `QboSyncOptions.IntervalHours` default of 6.
  - HTTP target: `POST` to `{CLOUD_RUN_URL}/api/internal/qbo-sync-trigger`.
  - OIDC: `--oidc-service-account-email={SCHEDULER_SA_EMAIL}` and `--oidc-token-audience={CLOUD_RUN_URL}`.
  - Region: `us-central1` (same as Cloud Run).
  - Retry: default Cloud Scheduler retry (3 attempts, exponential backoff) — addresses cold-start edge case partially.
  - Time zone: `UTC`.

- **Rationale**: Matches TDD §5/§7 six-hour cadence; `gcloud scheduler jobs create http` / `update http` is consistent with bash IaC pattern (specs 054/055).
- **Alternatives considered**:
  - **`every 6 hours` English schedule** — rejected; cron is explicit and idempotent in scripts.
  - **Pub/Sub push** — rejected; HTTP POST is existing contract.

## 5. Infrastructure tooling and script layout

- **Decision**: Bash + PowerShell paired scripts under `deploy/` (Constitution §X):
  - `deploy/infra/provision-qbo-scheduler.sh` / `.ps1` — create SA, create/update scheduler job.
  - `deploy/lib/qbo-scheduler-names.sh` / `.ps1` — shared name resolution (job name, SA email) by `ENV`.
  - `deploy/lib/validate-qbo-scheduler.sh` / `.ps1` — read-only checks: job exists, schedule, URI, OIDC SA email.
  - Extend `deploy/production/deploy-api.sh` / `.ps1` — invoke validate before deploy; pass `QboSync__SchedulerServiceAccountEmail` and `QboSync__SchedulerTokenAudience` env vars.

- **Rationale**: Follows established monorepo deploy/IaC conventions (054, 055, 053). No Terraform in v1.
- **Alternatives considered**:
  - **Terraform `google_cloud_scheduler_job`** — rejected; no existing Terraform footprint.
  - **Bash-only** — rejected; violates Constitution §X.

## 6. Preview environment scope

- **Decision**: **Preview deploys omit scheduler provisioning** (spec FR-003, assumption). Preview continues manual sync or in-process timer if enabled. Provision/validate scripts support `ENV=dev|prod` only.
- **Rationale**: Ephemeral preview stacks don't need 6-hour background sync; reduces cost and complexity.
- **Alternatives considered**:
  - **Provision scheduler per preview RUN_ID** — rejected; overkill for short-lived stacks.

## 7. Concurrent trigger handling

- **Decision**: Add a **process-wide `SemaphoreSlim(1,1)`** (or `IAsyncLock` singleton) in `QboSyncService` around `SyncAllEligibleEventsAsync` so overlapping scheduler retries or duplicate fires no-op or await the in-flight batch.
- **Rationale**: Edge case from spec; current code has no global guard — concurrent POSTs could duplicate QBO API reads.
- **Alternatives considered**:
  - **Database advisory lock** — rejected for v1; heavier, cross-instance only matters if Cloud Run scales >1 (unlikely for sync trigger).
  - **Scheduler `attemptDeadline` only** — insufficient alone.

## 8. Observability

- **Decision**: Extend `QboInternalSyncController` / `QboSyncService` logging:
  - Log structured fields: `triggerSource` (`scheduler` | `in-process`), `eventsSynced`, `durationMs`, `outcome`.
  - Never log OIDC tokens, `InternalTriggerKey`, or QBO credentials (Constitution VIII).
  - Unauthorized attempts log at Warning with caller IP / scheme only (no token payload).

- **Rationale**: FR-014 and SC-005.
- **Alternatives considered**:
  - **Dedicated sync audit table** — rejected; out of scope; logs sufficient for v1.

## 9. Verification strategy

- **Decision**:
  - **xUnit integration tests**: OIDC policy rejects anonymous/wrong-SA/wrong-key (production config); accepts mocked Google JWT with correct `email` claim (using `WebApplicationFactory` test auth handler or `JwtSecurityTokenHandler` test tokens).
  - **xUnit unit tests**: `ProductionSecretConfigurationValidator` updated for scheduler SA email requirement.
  - **Vitest deploy contracts**: assert provision/validate scripts exist (both platforms), cron `0 */6`, OIDC flags, deploy env vars, removal of `QBO_INTERNAL_TRIGGER_KEY` from production secrets binding.
  - **Optional manual quickstart**: `gcloud scheduler jobs run` against dev after provision.

- **Rationale**: CI cannot run live scheduler; contract tests prove script/deploy wiring; integration tests prove auth gate (Constitution III, ≥80% on new code).
- **Alternatives considered**:
  - **Live scheduler E2E in CI** — deferred; credentialed optional job only.

## 10. Relationship to spec 055

- **Decision**: Spec 057 **supersedes** spec 055's `QBO_INTERNAL_TRIGGER_KEY` production secret binding for scheduler authentication. `qbo-internal-trigger-key` Secret Manager resource may remain for migration period but production deploy stops binding it once OIDC is live. Dev `InternalTriggerKey` in `appsettings.Development.json` remains for local key-based tests only.
- **Rationale**: FR-005/FR-011 require OIDC as primary production mechanism; avoids two parallel auth paths in production.
- **Alternatives considered**:
  - **Dual auth (key OR OIDC) in production** — rejected; weakens FR-006.

## 11. API and frontend surface

- **Decision**: **No frontend changes**. Internal route only. No OpenAPI/DTO changes for user-facing API. `generated-api.ts` unaffected.
- **Rationale**: Infrastructure + internal endpoint auth only (Constitution VI N/A).
