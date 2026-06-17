# Implementation Plan: Production Line-Item CRUD UI (Add/Edit/Delete/Reorder)

**Branch**: `dustin/splr-28-production-line-item-crud-ui-addeditdeletereorder` | **Date**: 2026-06-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/013-line-item-crud-ui/spec.md` (Linear SPLR-28)

## Summary

Replace the dev-only "Add sample expense row" button on the event ledger with production CRUD controls: per-block add-row forms, delete with confirmation, move-up/move-down reorder, and inline label/deduction editing — all lifecycle- and permission-aware. Backend `POST/PUT/DELETE …/line-items` endpoints already exist; this feature is primarily frontend wiring plus a small backend hardening pass to enforce structural-edit permissions on delete and non-value updates (currently unguarded). No new database entities or API routes.

## Technical Context

**Language/Version**: C# / .NET 8 (backend `apps/api`); TypeScript 5.7 + React 18 (frontend `apps/web`)

**Primary Dependencies**: TanStack Query (existing mutations in `ledger.ts`); Vitest + React Testing Library (frontend); xUnit + WebApplicationFactory + Testcontainers (backend)

**Storage**: PostgreSQL via EF Core 8 — no schema changes; uses existing `financial_line_items` table

**Testing**: xUnit integration tests for structural permission hardening; Vitest component tests for add/delete/reorder/edit flows and lifecycle gating; ≥80.0% line/branch coverage enforced independently per stack via CI

**Target Platform**: Linux server (containerized API) + desktop-first SPA (ledger grid)

**Project Type**: Web application (existing two-app layout)

**Performance Goals**: Reuse existing ledger recalc targets (≤1s recalc, ≤2s grid load per 002 spec); reorder uses two PUTs per move — acceptable at ≤100 rows/block

**Constraints**: No floating-point money (Constitution I); frontend types from `generated-api.ts` only (Constitution VI); no mutations when Settled/Reconciled (Constitution V); ≥80.0% coverage both stacks; structural ops throughout PRE_SHOW including budget-locked settlement phase

**Scale/Scope**: ~6 frontend.set/modified frontend components/hooks; 1 backend service method + tests; remove 1 dev-only button; extend 3 existing components (`BlockSection`, `LedgerRow`, `EventLedgerPage`)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Relevance | Status |
|-----------|-----------|--------|
| I. Core Mathematical Axioms | Client uses existing `parseMoneyInput`/`formatMoney` string paths; no JS `number` for money. | PASS |
| II. Multi-Tenant Isolation | No new queries; existing org-scoped EF filters on line items unchanged. | N/A |
| III. Engineering Rigor & Quality Gates | Vitest tests for all new UI interactions; xUnit tests for permission hardening; ≥80% coverage per stack. | PASS (with tests) |
| IV. QBO Integration Boundaries | No QBO mutations; `qboActualValue` remains read-only. | N/A |
| V. Ledger State Machine & Immutability | UI gates on Settled/Reconciled; server `AssertNotSettledOrReconciled` remains authoritative. | PASS |
| VI. Polyglot Contract & Serialization | Uses generated `CreateLineItemRequest`/`UpdateLineItemRequest`; no hand-written TS mirrors. | PASS |
| VII. EF Core Axioms | No new queries; existing eager-load patterns in `LedgerService` unchanged. | N/A |
| VIII. Exception Governance & Logging | Reuse existing `LedgerStateException`, `ConcurrencyConflictException`, `AuthorizationException` paths. | PASS |

**Post-design re-check**: PASS. No violations; Complexity Tracking not required.

## Project Structure

### Documentation (this feature)

```text
specs/013-line-item-crud-ui/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── line-item-crud-ui.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
apps/api/
├── Services/
│   └── LedgerService.cs                    # MODIFIED: ValidateLineItemStructuralEditAsync on create/update/delete
└── Controllers/
    └── LedgerController.cs                 # unchanged routes

apps/api.tests/
└── Integration/
    ├── LedgerStateMachineTests.cs          # MODIFIED: settlement-phase create test
    └── LineItemStructuralPermissionTests.cs # NEW: delete/label-only permission tests

apps/web/src/
├── api/
│   └── ledger.ts                           # unchanged hooks (wire useDeleteLineItem)
├── hooks/
│   └── useCanEditLedgerStructure.ts        # NEW: permission + lifecycle gate
├── components/ledger/
│   ├── AddLineItemForm.tsx                 # NEW: per-block add form
│   ├── BlockSection.tsx                    # MODIFIED: Add row button, form slot
│   ├── LedgerRow.tsx                       # MODIFIED: delete, reorder, label, deduction
│   └── LedgerGrid.tsx                      # MODIFIED: pass structural callbacks/flags
├── pages/
│   └── EventLedgerPage.tsx                 # MODIFIED: wire CRUD, remove dev button
└── lib/
    └── reorderLineItems.ts                 # NEW: swap sortOrder helper

apps/web/tests/ledger/
├── AddLineItemForm.test.tsx                # NEW
├── LineItemCrud.test.tsx                   # NEW
├── EventLedgerPage.test.tsx                # MODIFIED
└── Editability.test.tsx                    # MODIFIED: structural control visibility
```

**Structure Decision**: Existing `apps/api` + `apps/web` monorepo. Feature is a vertical slice through ledger UI components with a minimal backend permission fix. No new packages or projects.

## Implementation Phases

### Phase A — Backend permission hardening (small)

1. Add `ValidateLineItemStructuralEditAsync(Event evt, CancellationToken)` to `LedgerService`:
   - `PRE_SHOW` + unlocked → require `CanViewFinancials`
   - `PRE_SHOW` + locked → require `CanEditSettlement`
2. Call from `CreateLineItemAsync`, `UpdateLineItemAsync`, `DeleteLineItemAsync` (before persist).
3. Add integration tests:
   - Create with settlement value after budget lock → 201
   - Delete without permission → 403
   - Label-only update without permission → 403

### Phase B — Frontend hooks & helpers

1. `useCanEditLedgerStructure(status, isBudgetLocked)` using `useUserProfile` permissions.
2. `reorderLineItems.ts`: given row + direction, compute neighbor swap payloads.
3. Extend `ledger.ts` usage in page — wire `useDeleteLineItem` (already exists).

### Phase C — UI components

1. **`AddLineItemForm`**: label, value field (proforma or settlement based on lock state), deduction checkbox for Expenses; client validation; `sortOrder = max + 1`.
2. **`BlockSection`**: render "Add row" for REVENUE/EXPENSES when `canEditStructure`; toggle form visibility.
3. **`LedgerRow`**: inline label input, deduction checkbox, move-up/down buttons (boundary-disabled), delete button with confirm.
4. **`EventLedgerPage`**: orchestrate mutations, error handling, recalculate after structural changes; **remove** `event-ledger-page__dev-tools` aside entirely.
5. **`LedgerGrid`**: thread `canEditStructure` and mutation callbacks to blocks/rows.

### Phase D — Tests & validation

1. Vitest: form modes, delete confirm, reorder boundaries, settled-state control absence, dev button absent.
2. xUnit: structural permission tests + settlement create.
3. Run quickstart scenarios A–G; verify coverage ≥80%.

## Complexity Tracking

> No Constitution Check violations. Section intentionally empty.
