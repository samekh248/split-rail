# Implementation Plan: Post-Show Event Reconciliation Transition

**Branch**: `033-post-reconcile-endpoint` | **Date**: 2026-06-18 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/033-post-reconcile-endpoint/spec.md` (Linear SPLR-73)

## Summary

Close the **SETTLED → RECONCILED** lifecycle gap by adding a manual reconcile action on the existing settlement route tree. Extend the `events` table with `reconciled_at` and `reconciled_by_user_id` (mirroring settlement audit columns), implement `SettlementService.ReconcileAsync` with row-level locking and state guards, expose `POST .../reconcile` on `SettlementController` gated by `can_trigger_qbo_sync`, propagate metadata through `EventResponse` and `EventCardDto`, and verify with **xUnit integration tests** covering happy path, invalid states, authorization, tenant isolation, venue scoping, immutability preservation, and concurrent reconcile rejection. **Backend-only** — no frontend changes.

## Technical Context

**Language/Version**: C# / .NET 8.0 (`apps/api`)

**Primary Dependencies**: ASP.NET Core 8, Entity Framework Core 8, existing `Event` entity, `SettlementService`, `SettlementController`, `DashboardService`

**Storage**: PostgreSQL 16 — new columns on `events`: `reconciled_at`, `reconciled_by_user_id` (FK → `users.id` SET NULL)

**Testing**: xUnit + WebApplicationFactory + Testcontainers.PostgreSql (`apps/api.tests/Integration/`); new `ReconcileControllerTests.cs`; ≥80.0% line/branch coverage on **backend** touched files (Constitution III); no frontend changes — frontend coverage gate N/A for this feature

**Target Platform**: GCP Cloud Run API + local Docker PostgreSQL

**Project Type**: Web application monorepo — this feature touches **backend API layer only**

**Performance Goals**: Single-row status update; no latency SLA beyond standard EF patterns used by `lock-budget` and `settle`

**Constraints**: Constitution II — org scoping via EF global filters + `VenueService.IsVenueAccessibleAsync`; Constitution V — reconcile is a **sanctioned** `events` mutation that transitions status only (no financial field changes); Constitution VI — extend C# DTOs first, regenerate OpenAPI/`generated-api.ts` on build; ≥80.0% backend coverage on touched files; missing/unparseable coverage reports treated as failing

**Scale/Scope**: 1 EF migration, 2 new Event columns, 1 service method, 1 controller action, DTO extensions on `EventResponse` + `EventCardDto`, ~1 integration test file (~10–12 cases), 0 frontend files

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Relevance | Status |
|-----------|-----------|--------|
| I. Core Mathematical Axioms | No monetary math; status/metadata update only. | N/A |
| II. Multi-Tenant Isolation | **Yes** — venue access + event-in-venue validation; EF org filters. | PASS |
| III. Engineering Rigor | **Yes** — integration tests via Testcontainers; ≥80% on touched backend files. | PASS (primary driver) |
| IV. QBO Integration | No QBO HTTP mutations; permission gate aligns with sync operators only. | PASS |
| V. Ledger State Machine | **Yes** — reconcile mutates `events` status from SETTLED→RECONCILED only; does not touch `financial_line_items` or `event_artists` values; immutability guards remain for all other mutation paths. | PASS |
| VI. Polyglot Contract | **Yes** — add `reconciledAt`/`reconciledByUserId` to C# DTOs; swagger regen cascades to `generated-api.ts`. | PASS |
| VII. EF Core Axioms | Reconcile write uses tracked entity + `FOR UPDATE` lock; dashboard/event reads use `.AsNoTracking()`. | PASS |
| VIII. Exception Governance | Use `SettlementStateException`, `NotFoundException`, `ConcurrencyConflictException`; log reconcile events without PII. | PASS |
| IX. UI Iconography | No UI changes. | N/A |

**Post-design re-check (Phase 1)**: [research.md](./research.md), [data-model.md](./data-model.md), and [contracts/reconcile-api.md](./contracts/reconcile-api.md) confirm service placement, migration fields, response shape, and test matrix. Gates remain PASS. No Complexity Tracking entries required.

## Project Structure

### Documentation (this feature)

```text
specs/033-post-reconcile-endpoint/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── reconcile-api.md # Phase 1 output
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
apps/api/
├── Controllers/
│   └── SettlementController.cs       # MODIFY — add POST reconcile route
├── Services/
│   └── SettlementService.cs          # MODIFY — add ReconcileAsync
├── Models/
│   └── Event.cs                      # MODIFY — ReconciledAt, ReconciledByUserId
├── DTOs/
│   ├── Ledger/LedgerDtos.cs          # MODIFY — EventResponse + reconciled fields
│   └── Dashboard/DashboardDtos.cs    # MODIFY — EventCardDto + reconciled fields
├── Services/
│   ├── EventService.cs               # MODIFY — ToEventResponse mapping
│   └── DashboardService.cs           # MODIFY — ToEventCardDto mapping
├── Data/
│   ├── ApplicationDbContext.cs       # MODIFY — column + FK config
│   └── Migrations/
│       └── *_AddEventReconciliationColumns.cs  # NEW

apps/api.tests/
└── Integration/
    └── ReconcileControllerTests.cs   # NEW — lifecycle, auth, isolation
```

**Structure Decision**: Add reconcile to existing `SettlementController` at `api/venues/{venueId}/events/{eventId}/reconcile` (Linear SPLR-73) alongside `settle` and `reverse-settlement`. Business logic lives in `SettlementService.ReconcileAsync` to reuse venue/event loading, row-lock, and settlement-state exception patterns from `FinalizeAsync`.

## Implementation Phases

### Phase A — Schema migration (blocking)

1. Add `ReconciledAt` (`DateTimeOffset?`) and `ReconciledByUserId` (`Guid?`) to `Event` model per [data-model.md](./data-model.md).
2. Configure EF mapping in `ApplicationDbContext` (mirror `settled_at` / `settled_by_user_id`).
3. Generate and apply migration `AddEventReconciliationColumns`.

### Phase B — SettlementService.ReconcileAsync

Add method per [research.md](./research.md) and [data-model.md](./data-model.md):

1. Resolve `userId` from `ITenantContext`; 401 if absent.
2. `VenueService.IsVenueAccessibleAsync` → 404 if false.
3. `SELECT ... FOR UPDATE` on event row (same pattern as `LoadEventForFinalizeWithLockAsync`).
4. Validate `evt.Status == EventStatus.Settled`; else `SettlementStateException` → 400.
5. Set `Status = Reconciled`, `ReconciledAt = UtcNow`, `ReconciledByUserId = userId`.
6. `SaveChangesAsync`; on `DbUpdateConcurrencyException` → `ConcurrencyConflictException` → 409.
7. Log structured info (event id, venue id, user id — no PII).
8. Return `EventResponse` via `EventService.ToEventResponse(evt)`.

**Must NOT modify**: `SettledAt`, `SettledByUserId`, `ArtistSignatureData`, `SettlementPdfUrl`, line items, artists.

### Phase C — Controller + DTO propagation

1. Add to `SettlementController.cs` per [contracts/reconcile-api.md](./contracts/reconcile-api.md):

```csharp
[HttpPost("reconcile")]
[RequirePermission(PermissionNames.TriggerQboSync)]
public async Task<ActionResult<EventResponse>> Reconcile(
    Guid venueId,
    Guid eventId,
    CancellationToken cancellationToken) =>
    Ok(await _settlementService.ReconcileAsync(venueId, eventId, cancellationToken));
```

2. Extend `EventResponse` and `EventCardDto` with `ReconciledAt` and `ReconciledByUserId`.
3. Update `EventService.ToEventResponse` and `DashboardService.ToEventCardDto`.
4. Run `dotnet build` to regenerate swagger / `generated-api.ts` (Constitution VI).

### Phase D — Integration tests (Constitution III)

Add `ReconcileControllerTests.cs` covering [contracts/reconcile-api.md](./contracts/reconcile-api.md):

1. Settled event → reconcile → 200; status `RECONCILED`; metadata populated.
2. GET event after reconcile → metadata visible.
3. GET dashboard after reconcile → `EventCardDto` shows `RECONCILED` + metadata.
4. Pre-Show event → reconcile → 400.
5. Already Reconciled → reconcile → 400.
6. Missing `can_trigger_qbo_sync` → 403.
7. Cross-org reconcile → 404.
8. Out-of-scope venue → 404.
9. Wrong venueId for event → 404.
10. Post-reconcile line-item mutation → 400 (immutability).
11. Settlement fields unchanged after reconcile (settledAt, pdf ref).
12. Concurrent reconcile → one 200, one 409 (optional if test harness supports).

### Phase E — Coverage gate

```bash
cd apps/api.tests
dotnet test --filter "FullyQualifiedName~ReconcileControllerTests"
dotnet test --collect:"XPlat Code Coverage"
```

Verify ≥80% on `SettlementService.ReconcileAsync`, controller action, DTO mappers, and integration tests.

## Complexity Tracking

No constitution violations to justify.
