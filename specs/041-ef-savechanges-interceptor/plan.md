# Implementation Plan: Persistence-Layer Immutability Guard for Frozen Events

**Branch**: `041-ef-savechanges-interceptor` | **Date**: 2026-06-20 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/041-ef-savechanges-interceptor/spec.md` (Linear SPLR-35)

## Summary

Close the **defense-in-depth immutability gap**: service-layer guards (SPLR-19 / spec 004) and audit logging (SPLR-36 / spec 039) reject frozen-event mutations at the API layer, but a forgotten code path that calls `SaveChanges` directly could still mutate `events`, `event_artists`, or `financial_line_items`. Implement an EF Core **`SaveChangesInterceptor`** registered on `ApplicationDbContext` that inspects pending changes immediately before commit, blocks disallowed mutations when the owning event is `SETTLED` or `RECONCILED`, permits sanctioned exceptions via **field-diff** (QBO actuals-only) or **explicit authorized save context** (settlement reversal, reconciliation), and emits **`FrozenEventMutationAuditor`** audit entries (spec 039 format) before throwing `LedgerStateException`. Verify with **xUnit unit tests** (interceptor rules + field-diff + context) and **integration tests** (raw DbContext bypass on frozen events with log capture). **Backend-only** — no API contract or frontend changes.

## Technical Context

**Language/Version**: C# / .NET 8.0 (`apps/api`)

**Primary Dependencies**: Entity Framework Core 8 (`SaveChangesInterceptor`, `ChangeTracker`), existing `FrozenEventMutationAuditor`, `FrozenEventMutationOperation`, `ITenantContext`, `LedgerStateException`, ASP.NET Core DI

**Storage**: No schema changes — interceptor evaluates `ChangeTracker` entries against in-memory/database event status

**Testing**: xUnit unit tests for `FrozenEventImmutabilityInterceptor` + `FrozenEventSaveContext`; xUnit + WebApplicationFactory + Testcontainers integration test proving raw DbContext mutation bypass is blocked with audit log; extend existing `SettlementImmutabilityTests`, `FrozenEventMutationAuditTests`, `ReconcileControllerTests`, and QBO sync-on-settled scenarios; ≥80.0% line/branch coverage on **backend touched files** (Constitution III); no frontend changes — frontend coverage gate N/A for this feature

**Target Platform**: GCP Cloud Run API + local Docker PostgreSQL

**Project Type**: Web application monorepo — this feature touches **backend persistence layer only**

**Performance Goals**: Negligible — O(n) scan of pending `ChangeTracker` entries per save; one optional DB lookup batch for parent event statuses when child entities change

**Constraints**: Constitution V — persistence guard must not weaken service-layer guards or allow snapshot drift; Constitution VIII — rejections logged via `FrozenEventMutationAuditor` (IDs + operation labels only); guard scope strictly limited to `events`, `event_artists`, `financial_line_items` (QBO sync ledger, settlement reversals, and all other tables out of scope); hybrid exception recognition per clarifications (field-diff for QBO actuals-only; explicit context for reversal/reconcile); user-facing HTTP 400 responses unchanged for standard API paths; ≥80.0% backend coverage on touched files; missing/unparseable coverage reports treated as failing

**Scale/Scope**: 1 interceptor + 1 save-context service + operation label extensions, DI/interceptor registration in `Program.cs`, authorized-context wiring in `SettlementService`, ~2–3 test files (~20 cases), 0 migrations, 0 API routes, 0 frontend files

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Relevance | Status |
|-----------|-----------|--------|
| I. Core Mathematical Axioms | No monetary math in interceptor. | N/A |
| II. Multi-Tenant Isolation | **Yes** — audit entries include venue/event IDs; event status lookups respect tenant-scoped DbContext. | PASS |
| III. Engineering Rigor | **Yes** — unit + integration tests including bypass harness; ≥80% on touched backend files. | PASS (primary driver) |
| IV. QBO Integration | **Yes** — field-diff permits `qbo_actual_value` (+ `updated_at`) refresh on frozen events; QBO ledger inserts remain out of interceptor scope. | PASS |
| V. Ledger State Machine | **Yes — primary** | PASS | Interceptor enforces immutability at persistence layer; sanctioned reversal/reconcile/actuals exceptions preserved; no drift paths added. |
| VI. Polyglot Contract | No DTO or OpenAPI changes. | N/A |
| VII. EF Core Axioms | **Yes** — interceptor is the EF persistence hook; no new lazy-loading queries. | PASS |
| VIII. Exception Governance | **Yes** | PASS | Rejections throw `LedgerStateException` via auditor; structured logs sanitized per §VIII. |
| IX. UI Iconography | No UI changes. | N/A |

**Post-design re-check (Phase 1)**: [research.md](./research.md), [data-model.md](./data-model.md), and [contracts/frozen-event-persistence-guard.md](./contracts/frozen-event-persistence-guard.md) confirm interceptor placement, field-diff rules, authorized save context API, auditor integration, and test matrix. Gates remain PASS. One Complexity Tracking entry for Constitution V exception (QBO actuals field-diff on frozen line items — inherited from spec 040, now enforced at persistence layer too).

## Project Structure

### Documentation (this feature)

```text
specs/041-ef-savechanges-interceptor/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── frozen-event-persistence-guard.md  # Phase 1 output — interceptor behavior contract
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
apps/api/
├── Data/
│   ├── ApplicationDbContext.cs             # NO CHANGE (interceptor registered externally)
│   └── Interceptors/
│       └── FrozenEventImmutabilityInterceptor.cs   # NEW — SaveChangesInterceptor
├── Services/
│   ├── FrozenEventSaveContext.cs           # NEW — IFrozenEventSaveContext + AsyncLocal authorized scope
│   ├── FrozenEventSaveReason.cs            # NEW — enum: SettlementReversal, EventReconciliation
│   ├── FrozenEventMutationAuditor.cs       # MODIFY — add persistence-layer reject helper (or reuse RejectIfFrozen)
│   ├── FrozenEventMutationOperation.cs     # MODIFY — add persistence_* operation labels
│   ├── SettlementService.cs                # MODIFY — wrap ReverseAsync/ReconcileAsync saves in authorized scope
│   └── QboSyncService.cs                   # NO CHANGE — field-diff permits actuals-only saves without context
├── Program.cs                              # MODIFY — register interceptor + save context; AddInterceptors on DbContext

apps/api.tests/
├── Unit/
│   ├── FrozenEventImmutabilityInterceptorTests.cs  # NEW — field-diff, context bypass, entity coverage
│   └── FrozenEventSaveContextTests.cs              # NEW — scope enter/exit/dispose
├── Integration/
│   ├── FrozenEventPersistenceGuardTests.cs         # NEW — raw DbContext bypass + audit log capture
│   ├── SettlementImmutabilityTests.cs                # UNCHANGED behavior
│   ├── FrozenEventMutationAuditTests.cs              # UNCHANGED behavior (service-layer paths)
│   └── ReconcileControllerTests.cs                   # UNCHANGED behavior (sanctioned reconcile still succeeds)
└── TestSupport/
    └── (reuse TestLogCollector from spec 039)
```

**Structure Decision**: Follow the backend-only pattern from specs 033 and 039. Place interceptor under `Data/Interceptors/` alongside EF concerns. Use a scoped `IFrozenEventSaveContext` with `AsyncLocal` authorization token so singleton-registered interceptors can read per-request/per-async-flow sanctioned save intent without threading flags through every service method signature. Reuse `FrozenEventMutationAuditor` for audit emission to satisfy clarification Q1 (same format as spec 039). `QboSyncService.RecomputeActualsForEventAsync` requires no code change — field-diff automatically permits `QboActualValue` + `UpdatedAt` updates on frozen events.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Constitution V — permit `financial_line_items.qbo_actual_value` updates on SETTLED/RECONCILED at persistence layer | Spec clarification + spec 040: QuickBooks is source of truth; accountants must see corrected actuals post-settlement | Blocking all line-item modifications at persistence layer would break QBO sync even when service-layer exception exists |
