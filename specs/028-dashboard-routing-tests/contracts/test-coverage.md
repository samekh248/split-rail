# Test Coverage Contract: Dashboard Routing Test & E2E Alignment

**Feature**: 028-dashboard-routing-tests  
**Date**: 2026-06-18  
**Status**: Complete (2026-06-18 implementation)

UI/test contract mapping functional requirements to verification targets.

## Coverage matrix

| ID | Requirement / scenario | Target under test | Suite (extend or add) | Key assertions | Status |
|----|------------------------|-------------------|------------------------|----------------|--------|
| R1 | FR-001 overview at `/`, not ledger | `DashboardOverviewPage` | `pages/DashboardOverviewPage.test.tsx` | `dashboard-overview` present; no ledger | ✓ |
| R2 | FR-001 no auto-redirect to workspace | `DashboardOverviewPage` | same | pathname stays `/` when events exist | ✓ |
| R3 | FR-002 no-venue empty state + CTA gating | `DashboardOverviewPage` | same | `empty-state-add-venue` show/hide by permission | ✓ |
| R4 | FR-002 no-events on overview without create | `DashboardOverviewPage` | same | `dashboard-no-events`; no `empty-state-create-event` | ✓ |
| R5 | FR-002 events load error + retry | `DashboardOverviewPage` | same | error copy + Retry button | ✓ |
| R6 | FR-003 card body → workspace nav | `DashboardOverviewPage` | same | `navigateToEventWorkspace(venueId, eventId)` | ✓ |
| R7 | FR-004 quick link → workspace + focus | `DashboardOverviewPage` | same | `navigateToEventWorkspace(..., focus)` | ✓ |
| R8 | FR-005 deep-link workspace loads context | `EventWorkspacePage` | `pages/EventWorkspacePage.test.tsx` | mock ledger shows venue:event | ✓ |
| R9 | FR-005 invalid venue/event fallback | `EventWorkspacePage` | same | redirect to `/` or URL correction | ✓ |
| R10 | FR-006 combobox updates URL + ledger | `EventWorkspacePage` | same | pathname + ledger eventId update | ✓ |
| R11 | FR-006 venue switch clears event + focus | `EventWorkspacePage` | same | new venue URL; `search` empty | ✓ |
| R12 | FR-007 workspace create-event → ledger | `EventWorkspacePage` | same | new event URL + ledger visible | ✓ |
| R13 | FR-007 no-events CTA on workspace only | `EventWorkspacePage` | same | create CTA on workspace empty state | ✓ |
| R14 | FR-008 Dashboard nav active on workspace | `GlobalNav` | `shell/GlobalNav.test.tsx` | `global-nav-dashboard--active` | ✓ |
| R15 | FR-008 Dashboard nav active on `/` | `GlobalNav` | same | active on root | ✓ |
| R16 | FR-009 workspace path build/parse | `appRoute` | `lib/appRoute.test.ts` | round-trip + invalid parse | ✓ |
| R17 | FR-009 navigateToEventWorkspace storage | `eventWorkspaceRoute` | `lib/eventWorkspaceRoute.test.ts` | path, query, session storage | ✓ |
| R18 | FR-009 dashboard entry navigation | `dashboardRoute` | `lib/dashboardRoute.test.ts` | `/`, `/venues/new` helpers | ✓ |
| R19 | FR-009 barrel re-export smoke | `dashboardRoute` | `lib/dashboardRoute.test.ts` | `navigateToEventWorkspace` callable from barrel | ✓ |
| R20 | FR-010 migrate DashboardHome tests | split pages | overview + workspace suites | no `DashboardHome.test.tsx` | ✓ |
| R21 | FR-011 E2E overview → workspace | Playwright | `tests/e2e/specs/venue/event-selection.spec.ts` | overview → card → ledger on workspace URL | ✓ |
| R22 | FR-011 E2E create first event | Playwright | same | create from workspace route, not overview `/` | ✓ |
| R23 | FR-012 venue switcher E2E | Playwright | `tests/e2e/specs/venue/venue-switching.spec.ts` | scoped list; header capture | ✓ |
| R24 | FR-012 venue switch on overview | Playwright | same | header capture without ledger assertion on `/` | ✓ |
| R25 | FR-013 legacy page removed | repo | grep / CI | no `DashboardHome` imports | ✓ |
| R26 | Edge: zone order + tonight hero | `DashboardOverviewPage` | overview suite | zone testids + date rules | ✓ |
| R27 | Edge: focus strip on combobox switch | `EventWorkspacePage` | workspace suite | `data-focus` empty after select | ✓ |
| R28 | Edge: browser back after event switch | `EventWorkspacePage` | workspace suite | prior event restored | ✓ |
| R29 | FR-016 + SC-006 coverage gate | full frontend | `vitest run --coverage` | thresholds ≥80% | ✓ |

## Contract rules

1. **Real source execution**: Page tests render actual page components; route tests call exported functions.
2. **Contract types only**: Fixtures from `@/types/generated-api` (Constitution VI).
3. **Scope fidelity**: Stub lists rendered verbatim (Constitution II).
4. **No duplicate ownership**: Event edit/delete → feature 015; focus scroll E2E depth → feature 027; auth baseline → feature 010.
5. **Consolidation**: Extend existing files; do not add parallel `dashboard-routing/` directory.
6. **E2E environment**: Skip when `WEB_BASE_URL` / `PREVIEW_BASE_URL` unset (existing pattern).

## Definition of Done (verification)

- All in-scope matrix rows have at least one passing test.
- `DashboardHome.tsx` and `DashboardHome.test.tsx` absent; zero production imports.
- `vitest run --coverage` passes thresholds (R29).
- Playwright primary journey (R21) and fixed create flow (R22) pass against preview/local stack when E2E env is available.
- Injected regression (card nav staying on `/`) fails at least one test (SC-005) — covered by `navigates to workspace when card body is activated` test.
