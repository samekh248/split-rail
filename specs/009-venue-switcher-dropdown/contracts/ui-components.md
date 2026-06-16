# Contract: Venue Switcher UI

**Feature**: `009-venue-switcher-dropdown` | **Phase 1** | **Date**: 2026-06-16

Behavioral contracts for the presentational layer. Tests assert behavior and accessibility, not a specific DOM element choice. Coverage via Vitest + React Testing Library; multi-user scope flow via Playwright.

## C5. `VenueSwitcher` component

Module: `apps/web/src/components/venue/VenueSwitcher.tsx` (consumes `useActiveVenue()`)

| # | Behavior |
|---|----------|
| C5.1 | Renders a control in the dashboard header listing each accessible venue by name (FR-001, FR-002). |
| C5.2 | The currently active venue is clearly indicated (e.g., selected state / checkmark / current label). |
| C5.3 | Choosing a different venue calls `setActiveVenue(id)` with the chosen venue's id (FR-005). |
| C5.4 | The control is keyboard operable (open/move/select via keyboard) and exposes an accessible name/label and current-selection state for assistive tech (FR-013). |
| C5.5 | With exactly one accessible venue, that venue is shown as active and the control communicates there is nothing else to switch to (single-venue edge case). |
| C5.6 | With no accessible venues, the switcher renders nothing (or a disabled empty affordance); the dashboard shows its existing "No venues yet" empty state (FR-012). |
| C5.7 | Only venues from the scoped list are offered; the component never fabricates or filters venues itself (Constitution II). |

## C6. `DashboardHome` rewiring

Module: `apps/web/src/pages/DashboardHome.tsx`

| # | Behavior |
|---|----------|
| C6.1 | Renders `VenueSwitcher` in the header (next to org name / sign-out). |
| C6.2 | Drives the downstream `EventLedgerPage` `venueId` from `useActiveVenue().activeVenueId` instead of the `?venueId=` URL placeholder. |
| C6.3 | On venue switch, the same view type (ledger) is preserved but the open event is reset to the new venue's default; the prior `eventId` is not carried over (FR-006, research D6). |
| C6.4 | Preserves the existing loading (`Loading workspace…`), empty (`No venues yet`), and error-with-retry surfaces, now sourced from the venue context (FR-012). |
| C6.5 | When `activeVenueId` is `null` (no venues), the ledger is not rendered. |

## C7. Provider wiring

Module: `apps/web/src/App.tsx` (+ `main.tsx` verification)

| # | Behavior |
|---|----------|
| C7.1 | The authenticated dashboard subtree is wrapped in `<VenueProvider>`; it is mounted only when `phase === 'authenticated'`. |
| C7.2 | Provider nesting order is `QueryClientProvider → AuthProvider → (App) → VenueProvider → DashboardHome`. |
| C7.3 | On sign-out, the venue selection does not leak into a later session (sessionStorage is per-tab/session; explicit clear acceptable but not required for correctness). |

## E2E contract (Playwright)

Spec: `tests/e2e/specs/venue/venue-switching.spec.ts`

| # | Scenario |
|---|----------|
| E1 | A full-access user sees all organization venues in the switcher. |
| E2 | A venue-scoped user sees only their assigned venues; unassigned venues are absent. |
| E3 | Selecting a different venue updates the active workspace and the ledger reflects the new venue (request carries `X-Active-Venue-Id`). |
| E4 | An attempt to operate on an out-of-scope venue is denied by the server and the active venue is unchanged. |

## Test coverage mapped to contracts

| Test file | Covers |
|-----------|--------|
| `apps/web/tests/venue/VenueSwitcher.test.tsx` | C5.1–C5.7 |
| `apps/web/tests/pages/DashboardHome.test.tsx` (extend) | C6.1–C6.5, C7.1–C7.2 |
| `tests/e2e/specs/venue/venue-switching.spec.ts` | E1–E4 |

All component paths counted toward the ≥80% frontend coverage gate (Constitution III).
