# Implementation Plan: Event Lifecycle & Card Label Utilities

**Branch**: `023-event-lifecycle-card-label` | **Date**: 2026-06-18 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/023-event-lifecycle-card-label/spec.md` (Linear SPLR-64)

## Summary

Extract event lifecycle state-machine rules and human-readable card labels from `eventSelection.ts` and inline `EventCombobox` hints into two dedicated pure utility modules with exhaustive Vitest coverage. Migrate the event combobox to consume the new utilities so status badges correctly show **"Budget locked"** for Pre-Show events with a locked budget (today they incorrectly show **"Planning"**). **Frontend-only** — no API, schema, or backend changes.

## Technical Context

**Language/Version**: TypeScript 5.7 + React 18 (`apps/web` only)

**Primary Dependencies**: Generated `EventStatus` type from `@/types/generated-api`; existing Vitest + React Testing Library test stack; no new npm packages

**Storage**: N/A (pure functions; no persistence)

**Testing**: Vitest unit tests for utility modules (table-driven lifecycle matrix); extend `EventCombobox` component tests for badge/hint migration; consolidate duplicate assertions out of `eventSelection.test.ts`; ≥80.0% line/branch coverage on new and modified frontend files (Constitution III)

**Target Platform**: Vite SPA — utilities consumed by event selector and future event surfaces

**Project Type**: Web application (`apps/web` vertical slice; `apps/api` unchanged)

**Performance Goals**: O(1) pure lookups; no measurable UI impact

**Constraints**: Constitution VI — use generated `EventStatus` only; no hand-written API types; Constitution III — Vitest coverage ≥80% on touched files; Constitution V — utilities encode read-only state rules (no mutations); role/permission gating remains in `useCanEditLedgerStructure` hook (FR-008); ≥80.0% coverage gate on frontend touched files (backend N/A)

**Scale/Scope**: 2 new utility modules, 2 new unit test files, ~2 modified consumers (`EventCombobox`, `eventSelection.ts`), ~1 extended component test file; 0 backend files

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Relevance | Status |
|-----------|-----------|--------|
| I. Core Mathematical Axioms | No monetary math. | N/A |
| II. Multi-Tenant Isolation | No data access. | N/A |
| III. Engineering Rigor | Vitest unit tests for all utility branches; ≥80% on touched frontend files. | PASS (with tests) |
| IV. QBO Integration | No QBO interaction. | N/A |
| V. Ledger State Machine | Utilities mirror Pre-Show → Settled → Reconciled rules; no mutation paths. | PASS |
| VI. Polyglot Contract | Read-only use of generated `EventStatus`; no new TS API types. | PASS |
| VII. EF Core Axioms | No backend queries. | N/A |
| VIII. Exception Governance | No new error paths. | N/A |
| IX. UI Iconography | No new icons. | N/A |

**Post-design re-check**: PASS. Frontend-only utility extraction; Complexity Tracking not required.

## Project Structure

### Documentation (this feature)

```text
specs/023-event-lifecycle-card-label/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── event-lifecycle-utilities.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
apps/web/src/venue/
├── eventSelection.ts           # MODIFIED: remove lifecycle/label helpers; keep filter/resolve only
├── eventLifecycle.ts           # NEW: phase resolution + permission booleans
└── eventCardLabel.ts           # NEW: status badge + action hint strings

apps/web/src/components/event/
└── EventCombobox.tsx           # MODIFIED: import from new modules; use hint utilities

apps/web/tests/venue/
├── eventSelection.test.ts      # MODIFIED: drop lifecycle assertions (moved to dedicated files)
├── eventLifecycle.test.ts      # NEW: exhaustive phase × permission matrix
└── eventCardLabel.test.ts      # NEW: badge + hint label matrix

apps/web/tests/components/event/
└── EventCombobox.test.tsx      # NEW or EXTENDED: badge shows "Budget locked" for locked Pre-Show
```

**Structure Decision**: Colocate utilities under `apps/web/src/venue/` alongside existing `eventSelection.ts` and `activeEventStorage.ts`. Split lifecycle logic (`eventLifecycle.ts`) from presentation labels (`eventCardLabel.ts`) so state-machine rules stay separate from user-facing copy.

## Implementation Phases

### Phase A — Utility modules (P1)

1. Add `eventLifecycle.ts` with `EventLifecyclePhase` union, `resolveLifecyclePhase`, `isPreShow`, `canEditEventMetadata`, `canDeleteEvent`, `isEventFullyLocked`.
2. Add `eventCardLabel.ts` with `formatStatusBadgeLabel`, `resolveEditActionHint`, `resolveDeleteActionHint`.
3. Accept `(status, isBudgetLocked?)` primitives; optional thin wrappers accepting `Pick<EventResponse, 'status' | 'isBudgetLocked'>` for combobox ergonomics.

### Phase B — Tests (P1)

1. Table-driven Vitest suites covering all four phases, unknown/null status, undefined budget-lock.
2. Golden label vectors per [contracts/event-lifecycle-utilities.md](./contracts/event-lifecycle-utilities.md).

### Phase C — Consumer migration (P1–P2)

1. Remove `formatEventStatus`, `canEditEvent`, `canDeleteEvent` from `eventSelection.ts`.
2. Update `EventCombobox` imports; replace inline hint strings with `resolveEditActionHint` / `resolveDeleteActionHint`.
3. Trim `eventSelection.test.ts`; add/extend combobox component test for budget-locked badge.

### Phase D — Verification

1. Run `npm run test -- eventLifecycle eventCardLabel eventSelection EventCombobox`.
2. Run coverage on touched files; confirm ≥80%.
3. Manual quickstart scenarios A–E.

## Complexity Tracking

> Not required — no constitution violations.

## Generated Artifacts

| Artifact | Path |
|----------|------|
| Implementation plan | [plan.md](./plan.md) |
| Research | [research.md](./research.md) |
| Data model | [data-model.md](./data-model.md) |
| Utility contracts | [contracts/event-lifecycle-utilities.md](./contracts/event-lifecycle-utilities.md) |
| Quickstart | [quickstart.md](./quickstart.md) |
