# Contract: Internal QBO Sync Trigger Authentication

Defines authentication and authorization for `POST /api/internal/qbo-sync-trigger` (SPLR-49, spec 003 internal route).

## Endpoint

| Property | Value |
|----------|-------|
| Method | `POST` |
| Path | `/api/internal/qbo-sync-trigger` |
| Auth | Environment-specific (see below) |
| Success response | `202 Accepted` with `{ "eventsSynced": <int> }` |
| Unauthorized | `401 Unauthorized` (no sync side effects) |
| Forbidden | `403 Forbidden` (valid token, wrong identity) |

## Production / deployed non-preview

### Required authentication

- `Authorization: Bearer <Google OIDC JWT>` minted by the scheduler service account.
- JWT validation:
  - Issuer: `https://accounts.google.com`
  - Audience: `QboSync:SchedulerTokenAudience` (Cloud Run service URL)
  - `email` claim: MUST equal `QboSync:SchedulerServiceAccountEmail`

### Rejected callers (MUST NOT execute sync)

- No `Authorization` header
- User session JWT (application `JwtBearer` scheme)
- OIDC JWT with wrong `email` claim
- `X-Internal-Sync-Key` header (deprecated in production)
- Expired or malformed JWT

### Startup validation (Production)

- `QboSync:SchedulerServiceAccountEmail` MUST be non-empty
- `QboSync:SchedulerTokenAudience` MUST be non-empty
- `QboSync:InternalTriggerKey` MUST be empty (or ignored)

## Development (local)

### Primary: in-process timer

- `QboSync:EnableInProcessTimer=true` — `QboSyncHostedService` runs sync on interval; endpoint optional.

### Secondary: shared key (tests only)

- When `EnableInProcessTimer=true` and `InternalTriggerKey` configured:
  - `X-Internal-Sync-Key: {key}` MAY authenticate the endpoint for integration tests.
- OIDC validation MAY be bypassed in Development environment only.

## Implementation hooks (for tasks phase)

| Component | Responsibility |
|-----------|----------------|
| `QboSyncOptions` | Add `SchedulerServiceAccountEmail`, `SchedulerTokenAudience` |
| `Program.cs` | Register `GoogleScheduler` JWT bearer + `SchedulerTrigger` policy |
| `QboInternalSyncController` | `[Authorize]` with environment-appropriate scheme |
| `ProductionSecretConfigurationValidator` | Require scheduler SA email; remove InternalTriggerKey requirement |
| `QboSyncService` | `SemaphoreSlim` guard on `SyncAllEligibleEventsAsync` |

## Logging contract (FR-014)

On each invocation attempt, log (structured):

| Field | Values |
|-------|--------|
| `triggerSource` | `scheduler`, `in-process`, `dev-key` |
| `eventsSynced` | int (on success) |
| `outcome` | `accepted`, `rejected-unauthorized`, `failure` |
| `durationMs` | int (on completion) |

MUST NOT log: JWT raw value, `InternalTriggerKey`, QBO tokens, PII.

## Security contract

- Unauthorized requests MUST NOT call `QboSyncService.SyncAllEligibleEventsAsync` (FR-007).
- No cleartext scheduler secrets in configuration artifacts (FR-008).

## Success criteria mapping

| Requirement | Contract enforcement |
|-------------|---------------------|
| FR-005 | OIDC JWT with scheduler SA email |
| FR-006 | Reject anonymous, user JWT, shared key (prod) |
| FR-007 | No sync on rejected auth |
| FR-008 | No shared secrets in prod config |
| FR-014 | Structured sanitized logs |
| SC-002 | Integration tests for reject/accept matrix |

## Verification

- xUnit: matrix of auth scenarios (anonymous, wrong key, wrong SA JWT, valid SA JWT).
- xUnit: production startup fails without scheduler config.
- Vitest: production deploy no longer binds `QBO_INTERNAL_TRIGGER_KEY`.
