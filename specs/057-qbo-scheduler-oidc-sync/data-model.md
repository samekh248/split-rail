# Data Model: Scheduled QBO Sync Trigger for Deployed Environments

**Feature**: 057-qbo-scheduler-oidc-sync (SPLR-49) | **Date**: 2026-06-22

This feature is **infrastructure + internal endpoint auth** — no new EF entities or database tables. The model describes **scheduler resources**, **service identities**, **configuration bindings**, and **logical sync execution records**.

## Entities

### QboSchedulerServiceAccount

Dedicated GCP identity that mints OIDC tokens for scheduled HTTP triggers.

| Field | Type | Description |
|-------|------|-------------|
| `email` | string | e.g. `split-rail-qbo-scheduler-prod@split-rail.iam.gserviceaccount.com` |
| `environment` | enum | `dev` \| `prod` |
| `projectId` | string | `split-rail` |
| `displayName` | string | Human-readable label |

**Validation**:
- `email` MUST be unique per `environment`.
- MUST NOT have service account key JSON generated (Constitution VIII).
- Production `email` MUST differ from development `email`.

**State transitions**:

```text
[absent] → created → bound_to_scheduler_job
```

---

### QboSchedulerJob

Managed recurring HTTP job invoking the internal sync trigger.

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | e.g. `split-rail-qbo-sync-prod` |
| `environment` | enum | `dev` \| `prod` |
| `schedule` | string | Cron: `0 */6 * * *` (UTC) |
| `httpMethod` | string | `POST` |
| `targetUri` | string | `{cloudRunUrl}/api/internal/qbo-sync-trigger` |
| `oidcServiceAccountEmail` | string | FK → `QboSchedulerServiceAccount.email` |
| `oidcTokenAudience` | string | Cloud Run service URL (token audience) |
| `location` | string | `us-central1` |
| `timeZone` | string | `UTC` |

**Validation**:
- `schedule` MUST fire every 6 hours (FR-001).
- `targetUri` MUST match the environment's Cloud Run service URL (FR-010).
- `oidcServiceAccountEmail` MUST reference the environment's scheduler SA (FR-011).
- MUST NOT exist for `preview` environment (FR-003).

**Relationships**:
- Uses exactly one `QboSchedulerServiceAccount`.
- Targets one Cloud Run service URL per environment.

**State transitions**:

```text
[absent] → created → configured → active → [updated idempotently]
```

---

### InternalSyncTriggerConfig

Application configuration binding scheduler auth to the API (not persisted in DB).

| Field | Type | Description |
|-------|------|-------------|
| `schedulerServiceAccountEmail` | string | Expected `email` claim on OIDC JWT |
| `schedulerTokenAudience` | string | Expected JWT `aud` claim (Cloud Run URL) |
| `intervalHours` | int | `6` (informational; scheduler cron must align) |
| `enableInProcessTimer` | bool | `true` in Development local; `false` in Production |
| `internalTriggerKey` | string? | Dev-only fallback when in-process timer enabled; empty in Production |

**Validation**:
- Production: `schedulerServiceAccountEmail` and `schedulerTokenAudience` MUST be non-empty (startup fail-fast).
- Production: `internalTriggerKey` MUST be empty or ignored (FR-006).
- Development: `internalTriggerKey` MAY be set for local key-based integration tests.

---

### SyncExecutionRecord (logical)

Observable outcome of a single trigger invocation — **logs only**, no DB table in v1.

| Field | Type | Description |
|-------|------|-------------|
| `triggerSource` | enum | `scheduler` \| `in-process` \| `dev-key` |
| `startedAt` | timestamp | UTC |
| `completedAt` | timestamp | UTC |
| `eventsSynced` | int | Count returned by `SyncAllEligibleEventsAsync` |
| `outcome` | enum | `success` \| `failure` \| `skipped-concurrent` |
| `errorCategory` | string? | Sanitized failure class (no tokens/PII) |

**Validation**:
- Logs MUST NOT contain cleartext OIDC tokens, QBO tokens, or `internalTriggerKey` (FR-014, Constitution VIII).

---

## Environment Bindings

| Environment | Scheduler job | Scheduler SA | In-process timer | Shared key auth |
|-------------|---------------|--------------|------------------|-----------------|
| `local` (Development) | none | n/a | enabled | optional (tests) |
| `dev` (deployed) | `split-rail-qbo-sync-dev` | `split-rail-qbo-scheduler-dev@...` | disabled | no |
| `preview` | none | n/a | optional | n/a |
| `prod` | `split-rail-qbo-sync-prod` | `split-rail-qbo-scheduler-prod@...` | disabled | no |

---

## Provision / Validate Lifecycle

```text
provision-qbo-scheduler (ENV)
  → resolve names (qbo-scheduler-names)
  → create scheduler SA (if absent)
  → create or update scheduler job (HTTP POST + OIDC)
  → validate-qbo-scheduler (ENV)
```

**Idempotency**: Re-run updates job in place; does not create duplicate jobs with same name.

---

## Relationships to Existing Domain

| Existing entity | Relationship |
|-----------------|--------------|
| `QboSyncService` | Invoked by internal trigger; unchanged ingestion logic |
| `QboVenueCredentials` | Determines eligible venues for `SyncAllEligibleEventsAsync` |
| `QboSyncHostedService` | In-process timer; disabled in production |

No changes to `financial_line_items`, `qbo_sync_ledger`, or tenant isolation models.
