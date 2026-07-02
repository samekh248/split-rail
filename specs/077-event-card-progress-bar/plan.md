# Implementation Plan: Event Card Lifecycle Progress Bar

**Branch**: `077-event-card-progress-bar` | **Date**: 2026-07-02 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/077-event-card-progress-bar/spec.md`

## Summary

Add a **bottom-mounted lifecycle progress bar** to the shared dashboard `EventCard` component (full and compact variants). The bar shows four milestone bubbles—**Holds**, **Confirmed**, **Event date**, **Post-event**—with a brand-token gradient fill indicating current position. Milestone resolution is a new pure utility (`eventCardProgress.ts`) driven by `bookingPlacementStatus` and calendar-relative `eventDate`; it is **separate** from `deriveLifecyclePhase` (quick links). Cancelled placements show a de-emphasized bar with no active milestone. Compact cards use bubble-only layout with hover/focus/tap tooltips for labels. **Frontend-only** — no API changes. Vitest + RTL coverage ≥80% on touched files.

## Technical Context

**Language/Version**: TypeScript 5.7 + React 18 (`apps/web` only)

**Primary Dependencies**: `EventCardDto` / `EventResponse` from `generated-api.ts`; `BookingPlacementStatus` from `@/lib/bookingCalendar`; date helpers from `eventLifecycle.ts` (or shared `eventDateUtils.ts`); existing `EventCard` component and BEM styles in `index.css`

**Storage**: N/A (derived UI state only; optional `openTooltipId` React state in progress bar)

**Testing**: Vitest + React Testing Library — `eventCardProgress.test.ts`, `EventCardProgressBar.test.tsx`, extensions to `EventCard.test.tsx`; ≥80.0% line/branch coverage on touched frontend files (Constitution III); no backend changes; Playwright not required for this slice

**Target Platform**: Vite SPA — dashboard overview zones (`DashboardZoneSections`, `DashboardZoneEvents`, compact upcoming sections)

**Project Type**: Web application (`apps/web` vertical slice; `apps/api` unchanged)

**Performance Goals**: Synchronous derivation from props; no per-card network calls; tooltip state local to each bar instance

**Constraints**: Constitution III — Vitest ≥80% coverage; Constitution VI — no hand-written API types; Constitution IX — no custom SVG icons for milestones (bubbles are CSS); progress bar read-only; scope limited to `EventCard` (not mini-calendar chips or combobox rows); gradient/colors via design tokens only; ≥80.0% coverage gate on frontend touched files (backend N/A)

**Scale/Scope**: ~1 new subcomponent, ~1 new lib module, CSS block in `index.css`, ~2–3 test files, minor `EventCard.tsx` integration; 0 backend files

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Relevance | Status |
|-----------|-----------|--------|
| I. Core Mathematical Axioms | No monetary math in progress bar. | N/A |
| II. Multi-Tenant Isolation | Card receives pre-scoped event data from parent. | N/A (parent responsibility) |
| III. Engineering Rigor | Vitest + RTL for utility and components; ≥80% on touched files. | PASS (with tests) |
| IV. QBO Integration | No QBO mutations. | N/A |
| V. Ledger State Machine | No ledger mutations; financial status does not drive milestones. | N/A |
| VI. Polyglot Contract | Uses `EventCardDto` fields only from generated types. | PASS |
| VII. EF Core Axioms | No backend queries. | N/A |
| VIII. Exception Governance | Invalid/missing dates → safe fallback milestones. | PASS |
| IX. UI Iconography | Milestone markers are CSS bubbles, not ad-hoc icon glyphs. | PASS |
| X. Dual-Platform Scripts | No deploy scripts in this feature. | N/A |

**Post-design re-check**: PASS. Frontend-only presentational extension; Complexity Tracking not required.

## Project Structure

### Documentation (this feature)

```text
specs/077-event-card-progress-bar/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── event-card-progress-bar-ui.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
apps/web/src/
├── components/dashboard/
│   ├── EventCard.tsx                      # MODIFIED: mount progress bar at bottom
│   └── EventCardProgressBar.tsx           # NEW: bar UI, tooltips, a11y
├── lib/
│   └── eventCardProgress.ts               # NEW: resolveEventCardProgressPosition
└── index.css                              # MODIFIED: event-card__progress BEM block

apps/web/tests/
├── lib/
│   └── eventCardProgress.test.ts          # NEW: milestone matrix
└── components/dashboard/
    ├── EventCardProgressBar.test.tsx      # NEW: DOM, tooltips, cancelled, compact
    └── EventCard.test.tsx                 # MODIFIED: assert bar presence
```

**Structure Decision**: Single vertical slice through `apps/web`. Pure milestone logic in `lib/eventCardProgress.ts`; presentational subcomponent colocated with `EventCard`; styles extend existing `event-card` BEM namespace.

## Implementation Phases

### Phase A — Pure milestone utility (P1)

1. Implement `resolveEventCardProgressPosition` per [data-model.md](./data-model.md).
2. Unit-test all combinations: hold tiers, confirmed, show-day, post-event, cancelled, missing date, legacy null placement, hold-on-show-day.
3. Export milestone label map for UI reuse.

### Phase B — EventCardProgressBar component (P1–P2)

1. Render track, gradient fill, four milestone bubbles with state classes.
2. Full card: inline labels; compact: bubbles + controlled tooltip (hover/focus/tap).
3. `role="progressbar"` + per-bubble `aria-label`; cancelled modifier.
4. Stop click propagation on bubble buttons so card `onActivate` does not fire.

### Phase C — EventCard integration (P1)

1. Import and render `EventCardProgressBar` as last child of `<article>`.
2. Pass `bookingPlacementStatus`, `eventDate`, `eventId`, `compact`.
3. Verify layout in dashboard overview CSS contexts (transparent card backgrounds).

### Phase D — Styling (P2)

1. Add `event-card__progress*` BEM block with token-based gradient.
2. Compact variant sizing; de-emphasized cancelled state.
3. Tooltip positioning above bubble; focus-visible ring per existing patterns.

### Phase E — Tests & coverage (all priorities)

1. `EventCardProgressBar.test.tsx` — visual states, compact tooltips, touch click, a11y attributes.
2. Extend `EventCard.test.tsx` — bar at bottom, full + compact.
3. Confirm ≥80% line/branch on new/modified files via `npm run test -- --coverage`.

## Complexity Tracking

> Not required — no constitution violations.

## Phase 0 & Phase 1 Artifacts

| Artifact | Path | Status |
|----------|------|--------|
| Research | [research.md](./research.md) | Complete |
| Data model | [data-model.md](./data-model.md) | Complete |
| UI contract | [contracts/event-card-progress-bar-ui.md](./contracts/event-card-progress-bar-ui.md) | Complete |
| Quickstart | [quickstart.md](./quickstart.md) | Complete |
| Agent context | `.cursor/rules/specify-rules.mdc` | Updated to this plan |

**Next**: `/speckit-tasks` to generate `tasks.md`.
