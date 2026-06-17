# Contract: Event List & Selection UI

**Feature**: `015-event-list-selection-ui` | **Phase 1** | **Date**: 2026-06-17

Behavioral contracts for components, hooks, and API extensions. Vitest + RTL for unit/component; xUnit for API; optional Playwright for E2E path.

## C1. `useEvents(venueId)`

Module: `apps/web/src/api/events.ts`

| # | Behavior |
|---|----------|
| C1.1 | Fetches `GET /api/venues/{venueId}/events` when `venueId` matches `activeVenueId`. |
| C1.2 | Query key `['events', venueId]`; refetches on venue switch. |
| C1.3 | Returns events in server order (event date desc, created desc tie-break). |
| C1.4 | Surfaces loading/error states for combobox and empty/error UI (FR-013). |

## C2. Event mutations

Module: `apps/web/src/api/events.ts`

| # | Behavior |
|---|----------|
| C2.1 | `useCreateEvent(venueId)` POST create; invalidates `['events', venueId]` on success. |
| C2.2 | `useUpdateEvent(venueId, eventId)` PATCH metadata; invalidates list on success. |
| C2.3 | `useDeleteEvent(venueId)` DELETE; invalidates list; clears storage entry for deleted id. |
| C2.4 | All mutations use types from `generated-api.ts` only. |

## C3. `activeEventStorage`

Module: `apps/web/src/venue/activeEventStorage.ts`

| # | Behavior |
|---|----------|
| C3.1 | Persists `{ [venueId]: eventId }` in sessionStorage per tab. |
| C3.2 | `getActiveEventId(venueId)` returns null for missing/invalid uuid. |
| C3.3 | `setActiveEventId` writes only valid uuids. |
| C3.4 | Does not leak event ids across venues (FR-014). |

## C4. `resolveActiveEventId`

Module: `apps/web/src/venue/eventSelection.ts`

| # | Behavior |
|---|----------|
| C4.1 | Prefers remembered id when present in fetched list. |
| C4.2 | Single event → auto-select (FR-005). |
| C4.3 | Multiple events, no valid memory → first list item (FR-006). |
| C4.4 | Empty list → null. |
| C4.5 | Invalid remembered id → fallback without error loop (FR-012). |

## C5. `EventCombobox`

Module: `apps/web/src/components/event/EventCombobox.tsx`

| # | Behavior |
|---|----------|
| C5.1 | Searchable combobox: type-to-filter title and date (FR-001, FR-002). |
| C5.2 | Each option shows title, date, status badge. |
| C5.3 | List ordered event date descending; filtered results keep order (FR-024). |
| C5.4 | No filter matches → "no results" without clearing selection (FR-023). |
| C5.5 | Selecting event updates storage + parent `selectedEventId` (FR-004). |
| C5.6 | Keyboard accessible (open, filter, select, escape). |
| C5.7 | Create action (if `useCanManageEvents`) opens inline panel. |
| C5.8 | Edit/delete actions per event when permitted; hidden/disabled per lifecycle rules (FR-022, FR-025). |
| C5.9 | Single event still shows active event label (edge case). |

## C6. `EventFormPanel`

Module: `apps/web/src/components/event/EventFormPanel.tsx`

| # | Behavior |
|---|----------|
| C6.1 | Inline panel below header — not modal, not separate page (FR-009). |
| C6.2 | Create mode: empty fields; edit mode: pre-filled metadata (FR-018). |
| C6.3 | Fields: title (required), event date (required), QBO tag (optional). |
| C6.4 | Submit create → close panel, select new event, show ledger (FR-010). |
| C6.5 | Submit edit → close panel, refresh combobox (FR-019). |
| C6.6 | Cancel/dismiss → closed panel, prior dashboard state (FR-017). |
| C6.7 | Inline validation errors; preserve field values on failure. |
| C6.8 | No ledger/budget controls in panel (budget-locked edit edge case). |

## C7. `EventDeleteConfirm`

Module: `apps/web/src/components/event/EventDeleteConfirm.tsx`

| # | Behavior |
|---|----------|
| C7.1 | Requires explicit confirm before DELETE (delete confirmation edge case). |
| C7.2 | Cancel returns to prior state without mutation. |
| C7.3 | Success selects fallback event or empty state (FR-021). |
| C7.4 | Not offered for budget-locked or settled/reconciled events. |

## C8. `DashboardHome` rewiring

Module: `apps/web/src/pages/DashboardHome.tsx`

| # | Behavior |
|---|----------|
| C8.1 | Renders `EventCombobox` when `activeVenueId` set and venues loaded. |
| C8.2 | Does **not** use `DEFAULT_EVENT_ID` (FR-003). |
| C8.3 | Zero events → empty state with create CTA when permitted (FR-008). |
| C8.4 | Zero events, no permission → read-only empty state (FR-011). |
| C8.5 | Venue switch clears event context for new venue; resolves default (FR-014, User Story 3). |
| C8.6 | Passes `selectedEventId` to `EventLedgerPage`. |
| C8.7 | Preserves existing venue loading/empty/error surfaces. |

## C9. Backend API extensions

Modules: `EventsController.cs`, `EventService.cs`

| # | Endpoint | Behavior |
|---|----------|----------|
| C9.1 | `PATCH /api/venues/{venueId}/events/{eventId}` | Update title, date, qboTagName for PreShow events. |
| C9.2 | `DELETE /api/venues/{venueId}/events/{eventId}` | Delete PreShow + unlocked budget only. |
| C9.3 | Both | 404 cross-venue/cross-tenant; 400 on lifecycle violation. |
| C9.4 | `POST` (existing) | QBO tag optional after validation change. |

## C10. `useCanManageEvents`

Module: `apps/web/src/hooks/useCanManageEvents.ts`

| # | Behavior |
|---|----------|
| C10.1 | Returns true when `canViewFinancials` on user profile. |
| C10.2 | False → no create/edit/delete controls anywhere in event UI. |

## E2E contract (optional Playwright)

Spec: `tests/e2e/specs/venue/event-selection.spec.ts`

| # | Scenario |
|---|----------|
| E1 | User with venue and zero events creates first event via empty state → ledger visible. |
| E2 | User with two events switches combobox selection → ledger updates. |
| E3 | Venue switch loads new venue's events; prior event not shown. |

## Test coverage mapped to contracts

| Test file | Covers |
|-----------|--------|
| `apps/web/tests/api/events.test.tsx` | C1, C2 |
| `apps/web/tests/venue/activeEventStorage.test.ts` | C3 |
| `apps/web/tests/venue/eventSelection.test.ts` | C4 |
| `apps/web/tests/components/event/EventCombobox.test.tsx` | C5 |
| `apps/web/tests/components/event/EventFormPanel.test.tsx` | C6 |
| `apps/web/tests/components/event/EventDeleteConfirm.test.tsx` | C7 |
| `apps/web/tests/pages/DashboardHome.test.tsx` | C8 |
| `apps/web/tests/hooks/useCanManageEvents.test.ts` | C10 |
| `apps/api.tests/Integration/EventsControllerTests.cs` | C9 |
| `tests/e2e/specs/venue/event-selection.spec.ts` | E1–E3 |
