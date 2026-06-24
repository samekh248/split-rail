# Research: Persistence-Layer Immutability Guard for Frozen Events

**Feature**: 041-ef-savechanges-interceptor  
**Date**: 2026-06-20

## 1. Interceptor vs. DbContext override

**Decision**: Implement `FrozenEventImmutabilityInterceptor` extending EF Core `SaveChangesInterceptor`, registered via `options.AddInterceptors(...)` in `Program.cs`.

**Rationale**: SPLR-35 explicitly calls for a `SaveChangesInterceptor`. Interceptors run for every `SaveChanges`/`SaveChangesAsync` on the context, including paths that bypass application services. Existing test precedent: `QboSyncLedgerAppendOnlyInterceptor` in `apps/api.tests/TestSupport/` demonstrates the project pattern.

**Alternatives considered**:
- Override `ApplicationDbContext.SaveChangesAsync` — rejected; scatters logic in generated/migration-sensitive file; harder to unit test in isolation.
- Database triggers — rejected; out of stack; harder to test; doesn't emit application audit logs.
- PostgreSQL row-level security — rejected; operational complexity; doesn't integrate with `FrozenEventMutationAuditor`.

## 2. Scoped dependencies in interceptors

**Decision**: Register `FrozenEventImmutabilityInterceptor` as **scoped** and resolve from the service provider when configuring `AddDbContext`:

```csharp
builder.Services.AddDbContext<ApplicationDbContext>((sp, options) =>
{
    options.UseNpgsql(connectionString);
    options.AddInterceptors(sp.GetRequiredService<FrozenEventImmutabilityInterceptor>());
});
builder.Services.AddScoped<FrozenEventImmutabilityInterceptor>();
```

**Rationale**: Interceptor needs scoped `IFrozenEventSaveContext`, `ITenantContext`, and `FrozenEventMutationAuditor`. Scoped registration per DbContext lifetime matches ASP.NET request scope.

**Alternatives considered**:
- Singleton interceptor with service locator per call — rejected; lifetime mismatch with scoped DbContext.
- `IDbContextFactory` only — rejected; primary API uses injected scoped DbContext.

## 3. Determining frozen status at intercept time

**Decision**: Use **original values** for `Event` entity entries (`entry.OriginalValues`) and **database-resolved parent event status** for child entity entries (`event_artists`, `financial_line_items`) via a batched lookup of distinct `EventId`s in the pending change set.

**Rationale**:
- **Finalize transition**: Event `OriginalValues.Status = PreShow`, `CurrentValues.Status = Settled` — source state not frozen → allow entire save including line-item snapshot updates.
- **Reversal/reconcile**: Event `OriginalValues.Status = Settled` — frozen source → require authorized save context.
- **Child entity bypass**: Attacker modifies line item directly; parent event already `SETTLED` in DB → block.

**Alternatives considered**:
- Current values only — rejected; would block finalize (current status becomes Settled mid-save before evaluation order issues).
- Always query DB for event status — rejected for Event self-modification; original values sufficient and cheaper.

## 4. Sanctioned exception recognition (clarification Q2)

**Decision**: **Hybrid** approach:

| Exception | Detection |
|-----------|-----------|
| QBO actuals-only update | Field-diff on `FinancialLineItem`: only `QboActualValue` and `UpdatedAt` may differ from original values on `Modified` entries whose parent event is frozen |
| Settlement reversal | `IFrozenEventSaveContext` carries `FrozenEventSaveReason.SettlementReversal` during `SettlementService.ReverseAsync` save |
| SETTLED → RECONCILED | `IFrozenEventSaveContext` carries `FrozenEventSaveReason.EventReconciliation` during `SettlementService.ReconcileAsync` save |
| Finalize PRE_SHOW → SETTLED | Implicit — original event status not frozen; no context required |

**Rationale**: QBO sync (`RecomputeActualsForEventAsync`) touches only aggregate actuals + timestamp — narrow field-diff is stable and requires no service changes. Reversal and reconcile modify multiple event fields; explicit context prevents heuristic drift.

**Alternatives considered**:
- Field-diff only for all exceptions — rejected; reversal changes status, pdf url, and adds out-of-scope reversal row — too many moving parts for reliable diff.
- Explicit context for all exceptions including QBO — rejected; unnecessary coupling; QBO sync already constrained to two fields.

## 5. Authorized save context implementation

**Decision**: Scoped `FrozenEventSaveContext` service exposing `IDisposable Authorize(FrozenEventSaveReason reason)` backed by `AsyncLocal<FrozenEventSaveReason?>`.

**Rationale**: AsyncLocal flows across async/await in the same logical request without passing parameters. Disposable scope clears authorization on exit (including exceptions). Interceptor reads `CurrentReason` at save time.

**Alternatives considered**:
- Flag on `ApplicationDbContext` instance — rejected; harder to test; doesn't work if multiple contexts in one scope.
- `[SkipFrozenEventGuard]` attribute on entities — rejected; not idiomatic EF; easy to forget.

## 6. Audit logging integration (clarification Q1)

**Decision**: Persistence rejections call `FrozenEventMutationAuditor.RejectIfFrozen(...)` with persistence-specific operation labels (`persistence_update_line_item`, etc.) before throwing.

**Rationale**: Same Warning template, structured properties, and `LedgerStateException` as spec 039. Support engineers search one log pattern. Service-layer paths continue to use existing operation labels; persistence bypass paths get `persistence_*` prefix for distinguishability.

**Alternatives considered**:
- Separate persistence logger — rejected per clarification Q1.
- Log without throw — rejected; save must abort.

## 7. Guard scope (clarification Q3)

**Decision**: Interceptor evaluates **only** `ChangeTracker.Entries<Event>()`, `Entries<EventArtist>()`, and `Entries<FinancialLineItem>()`. All other entity types ignored.

**Rationale**: Matches FR-001 and constitution scope. `QboSyncLedger` inserts during sync on frozen events proceed unaffected. `SettlementReversal` inserts during reversal proceed unaffected.

**Alternatives considered**:
- Guard all entities with `EventId` FK — rejected; over-scoped; would block legitimate ledger/sync writes.

## 8. Field-diff rules for `FinancialLineItem`

**Decision**: On `Modified` entries whose parent event is frozen, permitted property changes:

| Property | Permitted when frozen |
|----------|----------------------|
| `QboActualValue` | Yes (QBO actuals exception) |
| `UpdatedAt` | Yes (side effect of actuals recompute) |
| All others (`ProformaValue`, `SettlementValue`, `BlockType`, `RowLabel`, `SortOrder`, `IsArtistDeduction`, `Notes`, `IsHiddenFromPromoter`, `EventId`) | No |

`Added` and `Deleted` line items on frozen events: **always blocked**.

**Rationale**: Matches `QboSyncService.RecomputeActualsForEventAsync` behavior and spec 040 research. Mixed saves changing actuals + settlement value rejected atomically.

## 9. Field-diff rules for `Event` and `EventArtist`

**Decision**:
- **`Event`**: If original status is frozen (`Settled`/`Reconciled`), block unless authorized save context matches the pending transition (reversal or reconciliation field set).
- **`EventArtist`**: Block all `Added`/`Modified`/`Deleted` when parent event is frozen — no sanctioned artist mutations post-settlement.

**Rationale**: Aligns with service-layer guards. Artist edits only allowed in `PRE_SHOW`.

## 10. Test strategy for bypass proof (FR-012)

**Decision**: Integration test `FrozenEventPersistenceGuardTests` that:
1. Seeds and settles an event.
2. Opens a scoped `ApplicationDbContext` (or uses factory), attaches a `FinancialLineItem`, mutates `SettlementValue` directly.
3. Calls `SaveChangesAsync` **without** invoking `LedgerService`.
4. Asserts `LedgerStateException`, no DB change, and audit log with `persistence_*` operation label.

**Rationale**: SPLR-35 acceptance criterion explicitly requires proving interceptor blocks service bypass.

**Alternatives considered**:
- Unit test with in-memory provider only — insufficient; integration proves registration wiring in `Program.cs`.

## 11. Double-rejection with service layer

**Decision**: No deduplication needed. Service-layer guard throws before `SaveChanges` on standard API paths; persistence guard only fires on bypass paths. If both could fire, service layer wins first — acceptable.

**Rationale**: FR-011 preserves user-facing behavior; persistence layer is safety net only.
