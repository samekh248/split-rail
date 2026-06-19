# Implementation Plan: Workspace Focus Scroll Targets

**Branch**: `027-workspace-focus-scroll` | **Date**: 2026-06-18 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/027-workspace-focus-scroll/spec.md` (Linear SPLR-67)

## Summary

Complete deferred **SPLR-67** behavior: when users arrive at an event workspace URL with `?focus=` (`deal`, `settlement`, `signature`, `variance`, `sync`), scroll the corresponding ledger region into view and move keyboard focus to the first focusable control inside that region. Wire `focus` from `useEventWorkspaceRoute()` through `EventWorkspacePage` → `EventLedgerPage`; implement scroll via a new `workspaceFocusScroll.ts` helper using stable `data-testid` targets (TDD §6.3). Strip `?focus=` on in-workspace event/venue selection (already omitted by navigation helper). **Frontend-only**; Vitest + RTL ≥80% on touched files.

## Technical Context

**Language/Version**: TypeScript 5.7 + React 18 (`apps/web` only)

**Primary Dependencies**: `useEventWorkspaceRoute` / `buildEventWorkspacePath` (`appRoute.ts`); `navigateToEventWorkspace` (`eventWorkspaceRoute.ts`); `WorkspaceFocus` (`eventCardQuickLinks.ts`); existing ledger components (`ArtistDealPanel`, `LedgerGrid`, `FinalizeSettlementPanel`, `SyncNowButton`, `UnmappedBanner`); new `workspaceFocusScroll.ts`

**Storage**: N/A (URL query param only; not persisted)

**Testing**: Vitest + React Testing Library — `workspaceFocusScroll.test.ts`, extend `EventLedgerPage.test.tsx`, extend `EventWorkspacePage.test.tsx`, extend `appRoute.test.ts`; ≥80.0% line/branch coverage on touched frontend files (Constitution III); no backend changes; Playwright overview E2E deferred to SPLR-68

**Target Platform**: Vite SPA — event workspace route `/venues/{venueId}/events/{eventId}` inside `AppShell`

**Project Type**: Web application (`apps/web` vertical slice; `apps/api` unchanged)

**Performance Goals**: Scroll applies within 2s of ledger content visible (SC-003); single `scrollIntoView` + focus query per navigation; no layout thrashing

**Constraints**: Constitution VI — no hand-written API types; Constitution III — Vitest coverage ≥80%; FR-006 stable element targeting (no pixel scroll); FR-007 strip focus on combobox/venue switch; FR-005a re-scroll on same-event focused navigation; hook must react to query-only URL changes; ≥80.0% coverage gate on frontend touched files (backend N/A)

**Scale/Scope**: ~1 new lib module, ~2 modified pages, ~1 route hook fix, ~1 markup wrapper, ~4 test files touched; 0 backend files

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Relevance | Status |
|-----------|-----------|--------|
| I. Core Mathematical Axioms | No monetary math in scroll feature. | N/A |
| II. Multi-Tenant Isolation | No new data fetches; existing venue/event scoping unchanged. | PASS (existing) |
| III. Engineering Rigor | Vitest + RTL for scroll lib, ledger wiring, workspace focus strip; ≥80% on touched files. | PASS (with tests) |
| IV. QBO Integration | No QBO API calls; sync focus scrolls to existing `SyncNowButton`. | PASS |
| V. Ledger State Machine | No ledger mutations from scroll behavior. | N/A |
| VI. Polyglot Contract | No new API DTOs; `WorkspaceFocus` is client routing union only. | PASS |
| VII. EF Core Axioms | No backend queries. | N/A |
| VIII. Exception Governance | Missing scroll target is silent no-op, not thrown. | PASS |
| IX. UI Iconography | No new icons required. | N/A |

**Post-design re-check**: PASS. Frontend-only UX enhancement; Complexity Tracking not required.

## Project Structure

### Documentation (this feature)

```text
specs/027-workspace-focus-scroll/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── workspace-focus-scroll-ui.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
apps/web/src/
├── lib/
│   ├── appRoute.ts                      # MODIFIED: hook tracks search params
│   ├── eventWorkspaceRoute.ts           # EXISTING: navigate with optional focus
│   ├── eventCardQuickLinks.ts           # EXISTING: WorkspaceFocus union
│   └── workspaceFocusScroll.ts          # NEW: focus map + scroll/focus helper
├── pages/
│   ├── EventWorkspacePage.tsx           # MODIFIED: pass focus prop to ledger
│   └── EventLedgerPage.tsx              # MODIFIED: focus effect + sync wrapper

apps/web/tests/
├── lib/
│   ├── workspaceFocusScroll.test.ts     # NEW
│   └── appRoute.test.ts                 # MODIFIED: search-only URL updates
└── pages/
    ├── EventLedgerPage.test.tsx         # MODIFIED: focus scroll wiring
    └── EventWorkspacePage.test.tsx      # MODIFIED: focus param + strip on select
```

**Structure Decision**: Single vertical slice through `apps/web`. Pure scroll logic in `lib/workspaceFocusScroll.ts`; DOM targets remain on existing ledger components plus one sync wrapper testid.

## Implementation Phases

### Phase A — Prerequisites (blocking)

1. Confirm **023** (workspace routes + `useEventWorkspaceRoute`), **025** (`WorkspaceFocus`, quick links), and **026** (overview quick link navigation) are available on the branch.
2. Verify `navigateToEventWorkspace(venueId, eventId, focus)` appends `?focus=` correctly.

### Phase B — Route hook fix (P1)

1. Update `useEventWorkspaceRoute()` to re-read `getWorkspaceFocusFromUrl()` on `popstate` (not only pathname).
2. Add/adjust `appRoute.test.ts` case: same pathname, changed `?focus=` updates hook return value.

### Phase C — Focus scroll library (P1)

1. Create `workspaceFocusScroll.ts` with target map, `isRecognizedWorkspaceFocus`, `scrollToWorkspaceFocus`.
2. Unit tests: all five values, invalid input, missing DOM node, focusable descendant focus.

### Phase D — Ledger integration (P1–P3)

1. Add optional `focus` prop to `EventLedgerPage`.
2. Add `data-testid="workspace-focus-sync"` wrapper around toolbar + `UnmappedBanner`.
3. `useEffect`: when ledger loaded + recognized focus, call `scrollToWorkspaceFocus`; deps `[focus, eventId, ledger]`.
4. Extend `EventLedgerPage.test.tsx` with mocked scroll helper per focus value.

### Phase E — Workspace wiring + strip behavior (P4)

1. `EventWorkspacePage`: parse focus from route; pass to `EventLedgerPage`.
2. Confirm combobox and venue-switch navigation omit focus (URL has no query).
3. Extend `EventWorkspacePage.test.tsx` for focus wiring and strip-on-select.

### Phase F — Manual validation

Follow [quickstart.md](./quickstart.md) scenarios A–H.

## Complexity Tracking

> No constitution violations requiring justification.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |

## Phase 0 & Phase 1 Artifacts

| Artifact | Path | Status |
|----------|------|--------|
| Research | [research.md](./research.md) | Complete |
| Data model | [data-model.md](./data-model.md) | Complete |
| UI contract | [contracts/workspace-focus-scroll-ui.md](./contracts/workspace-focus-scroll-ui.md) | Complete |
| Quickstart | [quickstart.md](./quickstart.md) | Complete |

**Next command**: `/speckit-tasks` to generate dependency-ordered `tasks.md`.
