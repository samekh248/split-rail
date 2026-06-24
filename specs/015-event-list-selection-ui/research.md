# Phase 0 Research: Event List & Selection UI

**Feature**: `015-event-list-selection-ui` | **Date**: 2026-06-17

Resolves technical unknowns for the plan. Clarifications from `/speckit-clarify` (inline panel, edit+delete, searchable combobox, date-desc sort, budget-lock delete rule) are incorporated.

## D1. Hybrid slice — frontend + backend PATCH/DELETE

- **Decision**: Implement UI against existing `GET/POST` and **add** `PATCH` + `DELETE` on `EventsController` with `EventService` methods. Regenerate OpenAPI → `generated-api.ts`.
- **Rationale**: Clarify session expanded scope to edit/delete (User Story 4). No update/delete endpoints exist today; frontend-only would fail acceptance tests for delete and metadata edit.
- **Alternatives considered**:
  - *Frontend-only with POST-only MVP*: rejected — contradicts clarified spec and leaves edit/delete untestable.
  - *Separate micro-feature branch for API*: rejected — small cohesive surface (~2 service methods).

## D2. Permission mapping: `can_view_financials`

- **Decision**: `useCanManageEvents()` returns `useUserProfile().role.permissions.canViewFinancials`. Hide create/edit/delete when false; read-only empty state for zero events.
- **Rationale**: `EventsController` already gates create/list/get with `[RequirePermission(PermissionNames.ViewFinancials)]`. Matches Financial Admin / roles with ledger access. No separate "manage events" flag exists.
- **Alternatives considered**:
  - *New permission flag*: rejected — out of scope; would require RBAC migration.
  - *Gate create on `canLockBudget`*: rejected — too narrow; bookers with view-only financials could not create shows.

## D3. Optional QBO tag — relax backend validation

- **Decision**: Change `CreateEventAsync` (and update) to accept null/whitespace `QboTagName`; persist as `string.Empty`. Frontend omits or sends empty string when field blank.
- **Rationale**: Spec FR-009 and clarify treat tag as optional; current `ValidationException("QBO tag name is required.")` blocks create without tag. DB column is non-null `string` with empty default — no migration.
- **Alternatives considered**:
  - *Require tag in UI always*: rejected — contradicts spec.
  - *Nullable DB column*: rejected — unnecessary migration for empty-string semantics.

## D4. Lifecycle guards for update/delete (Constitution V)

- **Decision**:
  - **Update metadata**: allowed when `status == PreShow` (including `isBudgetLocked == true`). Reject `Settled`/`Reconciled` with `LedgerStateException` → HTTP 400.
  - **Delete**: allowed when `status == PreShow && !isBudgetLocked`. Reject otherwise with explicit error message.
- **Rationale**: Matches clarify Q5-B and ledger immutability rules (002). Locked budget still allows title/date/tag corrections; delete would destroy frozen proforma context.
- **Alternatives considered**:
  - *Block all edits when budget locked*: rejected — clarify chose metadata edit allowed.
  - *Soft-delete events*: rejected — no soft-delete column; cascade delete acceptable for unlocked planning events only.

## D5. Searchable combobox — extend VenueSwitcher pattern

- **Decision**: Build `EventCombobox` as a combobox (button + listbox + filter input) reusing keyboard/outside-click patterns from `VenueSwitcher.tsx`. Client-side filter on title substring + date string (ISO `yyyy-MM-dd` and display format). No new npm combobox library.
- **Rationale**: Clarify chose searchable combobox; venue switcher proves accessible custom dropdown in this codebase without headless-ui. Event counts per venue remain small (tens) — client filter sufficient.
- **Alternatives considered**:
  - *Plain dropdown like venue switcher*: rejected — clarify chose C.
  - *`<datalist>` native*: rejected — insufficient for edit/delete actions and status badges.

## D6. Inline panel for create/edit (not modal/page)

- **Decision**: `EventFormPanel` renders as an expandable section below the header row inside `DashboardHome` (same route `/`). Dismiss via Cancel or successful submit. Delete uses separate inline `EventDeleteConfirm` strip.
- **Rationale**: Clarify Q1-A; distinct from 014 dedicated page for venues. Keeps user in ledger context for fast first-event flow (SC-002).
- **Alternatives considered**:
  - *Modal overlay*: rejected — clarify excluded modals.
  - *Dedicated `/events/new` route*: rejected — clarify excluded navigation.

## D7. Active event persistence — per-venue sessionStorage map

- **Decision**: `activeEventStorage.ts` stores `Record<venueId, eventId>` JSON under key `activeEventByVenue` in `sessionStorage`. On venue switch, read map for new venue id (not prior venue's event). Clear entry when selected event deleted.
- **Rationale**: FR-007 requires remember within tab, reset on venue switch. Single global event id (current `useState`) cannot remember per-venue preference when switching back. Mirrors 009 sessionStorage pattern without cross-tab sync.
- **Alternatives considered**:
  - *React state only*: rejected — lost on reload within session (FR-007).
  - *URL query `?eventId=`*: rejected — inconsistent with venue id not in URL (009 decision).

## D8. Default event resolution

- **Decision**: After fetch, `resolveActiveEventId(events, venueId)`:
  1. If remembered id ∈ list → use it.
  2. Else if list length === 1 → that id.
  3. Else if list non-empty → first item (server orders `EventDate DESC`, `CreatedAt DESC` tie-break).
  4. Else → `null` (empty state).
- **Rationale**: FR-005/FR-006; server-side sort avoids exposing `createdAt` on `EventResponse` if unnecessary — client picks `events[0]` after ordered fetch.
- **Alternatives considered**:
  - *Add `createdAt` to EventResponse*: acceptable fallback if tie-break needed client-side; deferred — server ordering sufficient.

## D9. Events list query key and venue header

- **Decision**: `useEvents(venueId)` calls `GET /api/venues/{venueId}/events` **with** normal `X-Active-Venue-Id` (venue must match path). Query key `['events', venueId]`; enabled when `activeVenueId === venueId`.
- **Rationale**: Unlike venues list (009 omit header), events are venue-scoped resource under path; header aligns active context for downstream ledger calls.
- **Alternatives considered**:
  - *skipVenueContext on events list*: rejected — no collapse behavior documented; path already scopes venue.

## D10. Remove `DEFAULT_EVENT_ID`

- **Decision**: Delete usage from `DashboardHome`; remove or deprecate `apps/web/src/venue/defaults.ts` constant once no references remain. Invalid remembered ids trigger fallback resolver (FR-012).
- **Rationale**: FR-003 explicit; placeholder GUID caused misleading ledger loads.

## D11. Testing strategy (Constitution III)

- **Decision**:
  - **Backend**: extend `EventsControllerTests` — update metadata, delete unlocked, reject delete locked/settled, optional qbo tag create, tenant isolation spot-check.
  - **Frontend**: Vitest for storage, resolver, combobox filter/sort, panel validation, permission gating, DashboardHome integration.
  - **E2E** (optional): `event-selection.spec.ts` — create event → ledger visible; switch event → grid updates.
- **Rationale**: Hybrid slice requires both stacks for ≥80% gate; E2E satisfies Linear acceptance "venue → event → ledger grid visible".
