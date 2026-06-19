# Phase 0 Research: Dashboard Routing Test & E2E Alignment

**Feature**: 028-dashboard-routing-tests  
**Date**: 2026-06-18

All spec clarifications are resolved. This document records testing-approach decisions for aligning verification with the overview + workspace routing split (SPLR-68).

## Decision 1 — Migration target: split page suites, not DashboardHome

- **Decision**: Retire `DashboardHome.test.tsx` assertions by mapping them to **`DashboardOverviewPage.test.tsx`** (overview landing, zones, card navigation, no create-event on overview) and **`EventWorkspacePage.test.tsx`** (combobox, create-event, ledger host, URL sync, permission-gated shell actions).
- **Rationale**: Product split (023/026) replaced the combined page. Maintaining a third page test file would assert obsolete routing. Baseline audit shows extensive coverage already landed on the split suites.
- **Alternatives considered**: Keep `DashboardHome.test.tsx` as alias wrapper (rejected — FR-013 requires removal); single merged page test (rejected — violates split ownership).

## Decision 2 — Route helper ownership

- **Decision**: **`appRoute.test.ts`** owns path build/parse, `useAppRoute`, `useEventWorkspaceRoute`, settings navigation. **`eventWorkspaceRoute.test.ts`** owns `navigateToEventWorkspace` side effects (path, query, session storage). **`dashboardRoute.test.ts`** owns dashboard entry helpers (`getDashboardPath`, `navigateToDashboard`, `navigateToCreateVenue`) plus a **smoke re-export test** for `navigateToEventWorkspace` from the barrel module.
- **Rationale**: Matches production module boundaries (`dashboardRoute.ts` re-exports). Avoids duplicating full navigation matrices in three files.
- **Alternatives considered**: Collapse all route tests into one file (rejected — file already large; weak ownership).

## Decision 3 — E2E primary journey vs. legacy assumptions

- **Decision**: Add Playwright scenario: **login → `/` → assert `dashboard-overview` → activate event card → assert workspace URL + `event-ledger-page`**. Fix **`event-selection.spec.ts` E1** to create first event from **workspace empty state** (navigate to workspace route or post-seed deep link), not from overview — overview intentionally omits create-event CTA (026 clarification).
- **Rationale**: Current E1 expects `empty-state-create-event` on `/`, which contradicts 026 product rules and will fail/flake after overview ships.
- **Alternatives considered**: Re-add create CTA to overview for E2E convenience (rejected — product decision locked in 026); skip E1 (rejected — loses first-event regression signal).

## Decision 4 — Venue-switching E2E on overview

- **Decision**: **Audit** `venue-switching.spec.ts` E3 ("selecting a venue updates ledger"). On overview `/`, no ledger renders — test should either (a) assert overview zone content updates and API header still captured, or (b) navigate to workspace before ledger-specific assertion. Prefer (a) when seed includes events visible on overview; use (b) only when ledger visibility is the explicit assertion target.
- **Rationale**: Venue switcher lives on both overview and workspace; header injection must still work from overview. Ledger-specific assertions are invalid on `/`.
- **Alternatives considered**: Redirect overview to workspace on load (rejected — contradicts 026).

## Decision 5 — Focus scroll E2E scope

- **Decision**: **Page tests** cover overview quick links calling `navigateToEventWorkspace` with focus (already in `DashboardOverviewPage.test.tsx`). **Full scroll/focus E2E** for all five workflow targets remains owned by **027** if not already present; this feature does not block on Playwright scroll assertions.
- **Rationale**: SPLR-68 acceptance criteria emphasize overview → workspace routing; 027 owns scroll behavior verification.
- **Alternatives considered**: Duplicate 027 E2E here (rejected — scope creep).

## Decision 6 — Stubbing and fixtures

- **Decision**: Reuse **`mockWorkspaceFetch`** + **`createWrapper`** patterns from existing page tests; reset storage in `beforeEach`; mock `EventLedgerPage` in workspace page tests for fast URL/context assertions.
- **Rationale**: Proven harness from 017/023/026; keeps page tests fast and deterministic.
- **Alternatives considered**: Render full ledger in workspace page tests (rejected — slow, duplicates ledger suite ownership).

## Decision 7 — Coverage attribution

- **Decision**: Each new/extended test must import and render the **real page module** under test. Route tests invoke **real exported functions** against `window.history`. Run **`vitest run --coverage`** before completion; treat missing lcov as CI failure.
- **Rationale**: Constitution III gate; trivial mock-only tests do not satisfy FR-016.
- **Alternatives considered**: Coverage-only integration test file (rejected — poor attribution).

## Baseline audit summary (2026-06-18)

| Area | Status | Remaining work |
|------|--------|----------------|
| `DashboardOverviewPage.test.tsx` | Substantial | Minor gap fill only |
| `EventWorkspacePage.test.tsx` | Substantial | Minor gap fill only |
| `appRoute.test.ts` | Substantial | Audit App.test.tsx routing |
| `dashboardRoute.test.ts` | Thin | Add barrel re-export + navigation smoke |
| `eventWorkspaceRoute.test.ts` | Minimal | Align focus examples with union |
| `GlobalNav.test.tsx` | Complete | None |
| `DashboardHome` removal | Done on branch | Verify zero references |
| `event-selection.spec.ts` E1 | **Broken assumption** | Rewrite for workspace create |
| Overview → workspace E2E | **Missing** | Add primary journey test |
| `venue-switching.spec.ts` E3 | **Needs audit** | Remove/adjust ledger assertion on `/` |
