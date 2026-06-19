# Research: Explicit Audit Logging for Rejected Frozen-Event Mutations

**Feature**: 039-log-frozen-mutation-rejections  
**Date**: 2026-06-19

## 1. Where to emit audit logs

**Decision**: Emit structured audit logs inside a new `FrozenEventMutationAuditor` service at the immutability rejection point — immediately before throwing `LedgerStateException` — not in `ExceptionHandlerMiddleware`.

**Rationale**: SPLR-36 identifies that `AssertNotSettledOrReconciled` throws without logging and middleware only records `{ExceptionType}`. Middleware lacks event id, venue id, user id, and operation context without parsing exceptions or HTTP bodies. Rejection-point logging satisfies FR-003 and Constitution V ("explicitly logged") while keeping middleware generic.

**Alternatives considered**:
- Enhance `ExceptionHandlerMiddleware` for all `LedgerStateException` — rejected; catches non-frozen ledger-state errors (e.g., proforma column not editable) and lacks structured context without exception enrichment.
- Custom `LedgerStateException` properties logged in middleware — rejected; still requires every throw site to populate context; doesn't centralize sanitization rules.
- Database audit table — rejected; YAGNI; spec assumes centralized application logging (GCP Cloud Logging).

## 2. Centralization vs. per-service logging

**Decision**: Single `FrozenEventMutationAuditor` injected into `LedgerService` and `EventService`. Replace static `LedgerService.AssertNotSettledOrReconciled(Event)` with instance delegation.

**Rationale**: FR-004 requires all frozen-event rejection paths covered. Current guards are split across:
- `LedgerService.AssertNotSettledOrReconciled` — line-item create/update/delete
- `LedgerService.LockBudgetAsync` — inline settled/reconciled check
- `LedgerService.AssertArtistEditable` — artist create/update/delete (non-`PRE_SHOW`, effectively frozen for `SETTLED`/`RECONCILED`)
- `EventService.UpdateEventAsync` / `DeleteEventAsync` — inline settled/reconciled checks

Central auditor ensures consistent log schema and sanitization.

**Alternatives considered**:
- Duplicate `LogWarning` at each inline check — rejected; drift risk and inconsistent operation labels.
- Static helper without DI — rejected; harder to unit test and violates existing service DI patterns.

## 3. Structured log format

**Decision**: Use `ILogger.LogWarning` with a fixed message template and named structured properties:

```
"Rejected frozen event mutation: {Operation} on event {EventId} at venue {VenueId} by user {UserId} (status {EventStatus})"
```

Properties: `Operation` (stable snake_case string from `FrozenEventMutationOperation`), `EventId`, `VenueId`, `UserId` (nullable `Guid?` — omit or use `Guid.Empty` when unauthenticated; prefer logging only when `ITenantContext.UserId` is available), `EventStatus` (`SETTLED` / `RECONCILED` string).

**Rationale**: Matches existing project logging style (`EventService` uses `{EventId}` / `{VenueId}` templates). Structured properties enable GCP Cloud Logging field filters. No raw payloads attached.

**Alternatives considered**:
- JSON blob in message string — rejected; ASP.NET Core structured logging is idiomatic and Cloud Logging-friendly.
- `LogInformation` — rejected; rejection is a security/compliance signal; Warning aligns with middleware's non-500 failure severity.

## 4. Operation labels

**Decision**: Define stable operation constants in `FrozenEventMutationOperation`:

| Constant | Call site |
|----------|-----------|
| `update_event_metadata` | `EventService.UpdateEventAsync` |
| `delete_event` | `EventService.DeleteEventAsync` |
| `lock_budget` | `LedgerService.LockBudgetAsync` |
| `create_line_item` | `LedgerService.CreateLineItemAsync` |
| `update_line_item` | `LedgerService.UpdateLineItemAsync` |
| `delete_line_item` | `LedgerService.DeleteLineItemAsync` |
| `create_artist` | `LedgerService.CreateArtistAsync` |
| `update_artist` | `LedgerService.UpdateArtistAsync` |
| `delete_artist` | `LedgerService.DeleteArtistAsync` |

**Rationale**: FR-002 and spec Key Entities require searchable operation classification. Snake_case matches existing API/error conventions.

**Alternatives considered**:
- HTTP method + route only — rejected; service-layer rejections (e.g., test seeding) also need labels; route doesn't distinguish create vs update.

## 5. Artist mutation path on frozen events

**Decision**: When `AssertArtistEditable` detects `EventStatus.Settled` or `EventStatus.Reconciled`, delegate to `FrozenEventMutationAuditor` for logging, then throw the **existing** artist-specific `LedgerStateException` message unchanged.

**Rationale**: FR-008 preserves user-facing messages. Artist rejections on frozen events currently say "Artist configuration is only permitted while event is in PRE_SHOW status" — keep that text; add audit log only for `SETTLED`/`RECONCILED` (not hypothetical future statuses).

**Alternatives considered**:
- Unify artist frozen message with line-item message — rejected; breaks FR-008 / existing API contract tests.

## 6. Paths explicitly excluded from audit emission

**Decision**: Do NOT emit frozen-event rejection audit entries for:
- Successful mutations on `PRE_SHOW` events
- `SettlementService.FinalizeAsync` double-finalize guard (`SettlementStateException`, not `LedgerStateException`)
- `SettlementService.ReconcileAsync` (sanctioned SETTLED → RECONCILED transition)
- `SettlementService.ReverseAsync` (sanctioned super-admin reversal)
- Non-frozen `LedgerStateException` paths (proforma/settlement column editability, budget-locked delete, etc.)

**Rationale**: Spec FR-009 and edge-case notes; false positives undermine compliance signal quality.

## 7. Log capture testing strategy

**Decision**: Add a `TestLogCollector` (`ILoggerProvider` + `ILogger`) in `apps/api.tests/TestSupport/`. Register via `WebApplicationFactory.WithWebHostBuilder` → `ConfigureLogging` for integration tests. Unit-test `FrozenEventMutationAuditor` directly with the same collector.

**Rationale**: Project has no existing log-capture helper or `Microsoft.Extensions.Logging.Testing` package. Minimal custom provider avoids new NuGet dependency and works with structured logging scopes/state.

**Alternatives considered**:
- `NSubstitute.For<ILogger<T>>()` — awkward for structured template verification; collector inspects actual formatted output + state.
- Snapshot entire log stream in E2E Playwright — rejected; overkill for backend observability gap; integration tests sufficient per Constitution III.

## 8. RECONCILED event coverage

**Decision**: Integration tests must seed or transition events to `RECONCILED` (via existing `POST .../reconcile` endpoint from spec 033) and assert audit logs on at least one mutation path per entity class.

**Rationale**: FR-011 requires both `SETTLED` and `RECONCILED` coverage. Reconcile endpoint already exists in codebase.

**Alternatives considered**:
- SETTLED-only tests — rejected; fails FR-011.

## 9. Frontend scope

**Decision**: No frontend changes. Frontend coverage gate N/A; backend touched-file coverage carries the ≥80% obligation.

**Rationale**: Spec assumptions state backend observability only; immutability guards are server-authoritative.
