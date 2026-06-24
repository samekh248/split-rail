# Phase 0 Research: Event Card with Quick Links and Placeholder Booking Status

**Feature**: `025-event-card` | **Date**: 2026-06-18

## R1 — Lifecycle phase and bottleneck derivation

- **Decision**: Consume **SPLR-64** pure functions (`deriveLifecyclePhase`, `deriveBottleneckAlerts`) from `apps/web/src/lib/eventLifecycle.ts` and booking labels from `eventCardLabels.ts`. Do not duplicate TDD §4.1–4.3 rules inside the card.
- **Rationale**: SPLR-64 is Done (Linear) and delivers the exact prerequisite named in the spec dependency. Centralizing rules keeps card tests focused on rendering and callbacks, not phase logic branches.
- **Alternatives considered**: Inline phase heuristics in EventCard — rejected (duplicates SPLR-64, harder to maintain). Backend-derived phase field — rejected (no API change in scope).

## R2 — Variance warning trigger

- **Decision**: Reuse `ledgerVariance.ts` (`resolveVarianceDisplay`) over optional `LineItemDto[]` prop; show card badge when **any row** has a **negative** derived/display variance (`compareMoney(variance, '0.00') < 0`).
- **Rationale**: Matches clarification session 2026-06-18 and spec 020 grid derivation. Card-level aggregation avoids a second threshold.
- **Alternatives considered**: Server `varianceFlagged` only — rejected (may not match client derivation mandate). Card-specific dollar threshold — rejected by clarification.

## R3 — Quick link permission mapping

- **Decision**: Map links to existing `PermissionsDto` booleans; hide unauthorized links; show Open workspace fallback when none remain.

| Link | Focus | Required permission |
|------|-------|---------------------|
| Edit Deal Builder | `deal` | `canViewFinancials` |
| Lock Budget | `deal` or dedicated | `canLockBudget` |
| Settlement Wizard | `settlement` | `canEditSettlement` |
| Capture Signature | `signature` | `canSignSettlement` |
| View QBO Variance | `variance` | `canViewFinancials` |
| One-Click QBO Sync | `sync` | `canTriggerQboSync` |
| Open workspace (fallback) | `undefined` | `canViewFinancials` |

- **Rationale**: Aligns with RBAC model in `PermissionsDto` and 001-tenant-rbac-foundation capability names. Hiding links matches clarification; fallback preserves read-only access path.
- **Alternatives considered**: Disable with tooltip — rejected (clarification chose hide). Parent-only gating — rejected (card would show links that fail on click).

## R4 — Navigation delegation

- **Decision**: EventCard never calls `navigateToEventWorkspace` directly. Parent `onQuickLink(venueId, eventId, focus?)` handler performs navigation (typically `navigateToEventWorkspace` from 023-split-dashboard-routes).
- **Rationale**: FR-009; keeps routing centralized for SPLR-66 overview and future focus scroll (SPLR-67).
- **Alternatives considered**: Card-internal navigation — rejected (breaks testability and overview composition).

## R5 — Pin persistence (Phase 1)

- **Decision**: Optional pin props (`isPinned`, `onPinToggle`); when wired, parent may use `pinnedEventStorage.ts` (`localStorage` map keyed `"${venueId}:${eventId}"`). Pin control **not rendered** when `onPinToggle` is omitted.
- **Rationale**: Clarification: hide when props absent. `localStorage` survives refresh (SC-006); matches spec "client-side storage until backend pin."
- **Alternatives considered**: `sessionStorage` only — rejected (fails refresh persistence acceptance). Always-visible no-op pin — rejected (clarification).

## R6 — Booking status badge

- **Decision**: Static placeholder label from `eventCardLabels.ts` (SPLR-64) with tooltip: "Booking status preview — full calendar coming soon."
- **Rationale**: Spec FR-003; real booking calendar explicitly out of scope.
- **Alternatives considered**: Omit badge — rejected (core P1 user story).

## R7 — Test strategy

- **Decision**: Primary coverage in `EventCard.test.tsx` with mocked lifecycle helpers only when testing card isolation; prefer integration-style tests importing real SPLR-64 helpers once merged. Optional unit tests for `eventCardQuickLinks` permission filter matrix.
- **Rationale**: Constitution III ≥80% on touched files; phase/link matrix is the highest regression risk.
- **Alternatives considered**: E2E-only validation — rejected (too slow for component slice; SPLR-68 covers overview flow later).
