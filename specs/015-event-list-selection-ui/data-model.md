# Data Model: Event List & Selection UI

**Feature**: `015-event-list-selection-ui` | **Date**: 2026-06-17

Minimal backend DTO additions; primary new state is client-side event selection. Payload types from `generated-api.ts` after swagger regen (Constitution VI).

## API entities

### `EventResponse` (existing, generated)

| Field | Type | UI use |
|-------|------|--------|
| `eventId` | uuid | Selection key; ledger prop |
| `venueId` | uuid | Scope validation |
| `title` | string | Combobox label; filter target |
| `eventDate` | string (`yyyy-MM-dd`) | Combobox label; filter target |
| `status` | string | Status badge (`PRE_SHOW`, `SETTLED`, `RECONCILED`) |
| `isBudgetLocked` | boolean | Delete gate; edit affordance hint |
| `qboTagName` | string | Optional accounting tag in form |
| `editability` | object | Not mutated by this feature; ledger owns column edit rules |

### `CreateEventRequest` (existing)

| Field | Type | Rules |
|-------|------|-------|
| `title` | string | Required; trimmed non-empty |
| `eventDate` | string | Required; valid ISO date |
| `qboTagName` | string | **Optional** after backend change; empty → `""` |

### `UpdateEventRequest` (new)

| Field | Type | Rules |
|-------|------|-------|
| `title` | string | Required; trimmed non-empty |
| `eventDate` | string | Required; valid ISO date |
| `qboTagName` | string | Optional; empty → `""` |

**Server guards** (not in DTO):

| Operation | Allowed when |
|-----------|--------------|
| PATCH metadata | `status == PRE_SHOW` |
| DELETE | `status == PRE_SHOW && isBudgetLocked == false` |

Reject `SETTLED` / `RECONCILED` for both (Constitution V).

### List ordering (server)

```
ORDER BY event_date DESC, created_at DESC
```

Client default selection uses `events[0]` after fetch.

## Persisted browser state

| Key | Store | Value | Lifetime |
|-----|-------|-------|----------|
| `activeEventByVenue` | `sessionStorage` | JSON `Record<venueId, eventId>` | Per-tab; cleared on tab close |

API: `getActiveEventId(venueId)`, `setActiveEventId(venueId, eventId)`, `clearActiveEventId(venueId)`.

On venue switch: do **not** copy prior venue's event id; resolve for new `activeVenueId`.

## Client view state (`DashboardHome` + components)

| State | Type | Notes |
|-------|------|-------|
| `selectedEventId` | `string \| null` | Drives `EventLedgerPage` |
| `panelMode` | `'closed' \| 'create' \| 'edit'` | Inline panel visibility |
| `editingEvent` | `EventResponse \| null` | Pre-fill for edit |
| `deleteTarget` | `EventResponse \| null` | Inline delete confirm |
| `filterQuery` | string | Combobox type-to-filter (local) |

## Permission gate

| Profile field | Hook | UI |
|---------------|------|-----|
| `canViewFinancials` | `useCanManageEvents()` | Create/edit/delete affordances |

Users without flag: combobox read-only selection + read-only zero-events empty state.

## Selection resolution

```
given events = GET /api/venues/{activeVenueId}/events (ordered)
let remembered = getActiveEventId(activeVenueId)
if remembered && events.some(e => e.eventId === remembered):
    selectedEventId = remembered
elif events.length === 1:
    selectedEventId = events[0].eventId
elif events.length > 1:
    selectedEventId = events[0].eventId   // server sort = FR-006 default
    setActiveEventId(activeVenueId, selectedEventId)
else:
    selectedEventId = null                // empty state
```

Invalid `GET .../events/{id}` → error surface + fallback to resolver without remembered id.

## Relationships

```text
Organization
  └── Venue (active via VenueContext / X-Active-Venue-Id)
        └── Event[] (listed in combobox)
              └── Financial ledger grid (EventLedgerPage)
```

## Validation (client)

| Field | Rule |
|-------|------|
| Title | Required; trimmed; max 200 chars (align with event title DB column if constrained) |
| Event date | Required; valid date; not empty |
| QBO tag | Optional; max length per backend if enforced |

Mapped in `validateEventForm()` alongside existing auth validation helpers.
