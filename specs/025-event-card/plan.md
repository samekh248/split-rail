# Implementation Plan: Event Card with Quick Links and Placeholder Booking Status

**Branch**: `025-event-card` | **Date**: 2026-06-18 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/025-event-card/spec.md` (Linear SPLR-65)

## Summary

Build a reusable **dashboard Event Card** component that summarizes a single show (title, date, placeholder booking badge), surfaces **phase-appropriate quick links** (Pre-Show / Night Of / Post-Show), **variance and bottleneck alerts**, and an optional **pin toggle** with local persistence. The card is a presentational unit: it delegates navigation to the parent via `onQuickLink(venueId, eventId, focus?)` and consumes shared lifecycle utilities from **SPLR-64** (`deriveLifecyclePhase`, `deriveBottleneckAlerts`, booking label helpers). **Frontend-only** — no API or schema changes. Vitest + RTL coverage ≥80% on new/modified files.

## Technical Context

**Language/Version**: TypeScript 5.7 + React 18 (`apps/web` only)

**Primary Dependencies**: `EventResponse` + `PermissionsDto` from `generated-api.ts`; SPLR-64 libs (`eventLifecycle.ts`, `eventCardLabels.ts`); `ledgerVariance.ts` (`deriveVariance`, `resolveVarianceDisplay`); `money.ts` (`compareMoney`); `navigateToEventWorkspace` / `buildEventWorkspacePath` from `eventWorkspaceRoute.ts` / `appRoute.ts`; Font Awesome pin icons (`faThumbtack` / `faThumbtackSlash`, Constitution IX); existing permission hooks pattern

**Storage**: Browser `localStorage` for Phase 1 pin state (`pinnedEventStorage.ts`, keyed by venue+event); parent overview owns event list data (TanStack Query)

**Testing**: Vitest + React Testing Library in `apps/web/tests/components/dashboard/EventCard.test.tsx`; unit tests for quick-link resolution helper if extracted; ≥80.0% line/branch coverage on touched frontend files (Constitution III); no backend changes; Playwright deferred to SPLR-68

**Target Platform**: Vite SPA dashboard zones (consumed by SPLR-66 overview; validated in isolation)

**Project Type**: Web application (`apps/web` vertical slice; `apps/api` unchanged)

**Performance Goals**: Card render is synchronous from props; no per-card network calls; suitable for lists of 20+ cards without layout jank

**Constraints**: Constitution VI — no hand-written API types; Constitution III — Vitest coverage ≥80%; Constitution IX — Font Awesome for pin; card MUST NOT navigate directly (FR-009); unauthorized quick links hidden (clarification); Open workspace fallback for unknown phase and zero permitted links; variance badge uses ledger grid derivation (020); pin control hidden when parent omits pin props; SPLR-64 utilities MUST be merged before implementation; ≥80.0% coverage gate on frontend touched files (backend N/A)

**Scale/Scope**: ~1 new component, ~2–3 new lib modules, ~1 storage helper, ~1 test file, optional CSS block in `index.css`; 0 backend files

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Relevance | Status |
|-----------|-----------|--------|
| I. Core Mathematical Axioms | Variance check uses `ledgerVariance.ts` + `money.ts` decimal-string math only. | PASS |
| II. Multi-Tenant Isolation | Card receives pre-scoped event data from parent; no fetches. | N/A (parent responsibility) |
| III. Engineering Rigor | Vitest + RTL for EventCard; ≥80% on touched frontend files. | PASS (with tests) |
| IV. QBO Integration | Sync link is navigation-only; no QBO HTTP mutations from card. | PASS |
| V. Ledger State Machine | No ledger mutations from card. | N/A |
| VI. Polyglot Contract | Props use `EventResponse`, `PermissionsDto`, `LineItemDto` from generated types. | PASS |
| VII. EF Core Axioms | No backend queries. | N/A |
| VIII. Exception Governance | Missing title/date → placeholders; derivation failures → no false alert badges. | PASS |
| IX. UI Iconography | Pin uses `faThumbtack` / `faThumbtackSlash`. | PASS |

**Post-design re-check**: PASS. Frontend-only presentational component; Complexity Tracking not required.

## Project Structure

### Documentation (this feature)

```text
specs/025-event-card/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── event-card-ui.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
apps/web/src/
├── components/dashboard/
│   └── EventCard.tsx                    # NEW: card UI + quick links + alerts + optional pin
├── lib/
│   ├── eventCardQuickLinks.ts           # NEW: phase → link defs, permission filter, focus mapping
│   ├── eventCardVariance.ts             # NEW: eventHasNegativeVariance(rows) via ledgerVariance
│   └── pinnedEventStorage.ts            # NEW: localStorage pin read/write/toggle
└── index.css                            # MODIFIED: event-card BEM block

apps/web/tests/
├── components/dashboard/
│   └── EventCard.test.tsx               # NEW: all user stories + edge cases
└── lib/
    ├── eventCardQuickLinks.test.ts      # NEW (optional): pure helper branches
    └── eventCardVariance.test.ts        # NEW (optional): variance aggregation

# Prerequisite (SPLR-64 — merge before implement):
apps/web/src/lib/
├── eventLifecycle.ts                    # deriveLifecyclePhase, deriveBottleneckAlerts
└── eventCardLabels.ts                   # placeholder booking badge label
```

**Structure Decision**: Single vertical slice through `apps/web`. Pure helpers colocated under `lib/`; card under `components/dashboard/`. Parent overview (SPLR-66) composes cards and wires `onQuickLink` → `navigateToEventWorkspace`.

## Implementation Phases

### Phase A — Prerequisite merge (blocking)

1. Merge or rebase **SPLR-64** (`eventLifecycle.ts`, `eventCardLabels.ts`, unit tests) into the feature branch.
2. Verify `deriveLifecyclePhase`, `deriveBottleneckAlerts`, and booking label helpers are importable.

### Phase B — Pure helpers (P2–P3)

1. `eventCardQuickLinks.ts`: map lifecycle phase → link definitions with `focus` targets; filter by `PermissionsDto`; emit Open workspace fallback when phase unknown or zero links remain.
2. `eventCardVariance.ts`: `eventHasNegativeVariance(rows: LineItemDto[])` using `resolveVarianceDisplay` + negative check via `compareMoney`.
3. `pinnedEventStorage.ts`: get/set/toggle pin by `venueId` + `eventId` in `localStorage`.

### Phase C — EventCard component (P1–P4)

1. Props: `event`, optional `lineItems`, `permissions`, `onQuickLink`, optional `isPinned` + `onPinToggle`.
2. Render title, formatted date, booking preview badge + tooltip from `eventCardLabels`.
3. Render phase quick links or fallback; invoke `onQuickLink` on click.
4. Render variance badge when `eventHasNegativeVariance(lineItems)` (skip when `lineItems` omitted).
5. Render bottleneck chips from `deriveBottleneckAlerts(event)`.
6. Render pin control only when `onPinToggle` provided; Font Awesome thumbtack icons.

### Phase D — Tests & styling (all priorities)

1. Vitest fixtures for Pre-Show, Night Of, Post-Show, unknown phase, permission-denied, variance+, bottleneck+.
2. Assert callback payloads (`focus` values), hidden unauthorized links, fallback link, pin toggle, pin hidden without props.
3. CSS: card layout, alert chips, variance badge, responsive wrap.

## Complexity Tracking

> Not required — no constitution violations.
