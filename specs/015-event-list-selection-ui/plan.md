# Implementation Plan: Event List & Selection UI

**Branch**: `015-event-list-selection-ui` | **Date**: 2026-06-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/015-event-list-selection-ui/spec.md` (Linear SPLR-58)

## Summary

Replace the hardcoded `DEFAULT_EVENT_ID` in `DashboardHome` with a **searchable event combobox**, **inline create/edit panel**, and **delete-with-confirmation** flow scoped to the active venue. Selected event id drives `EventLedgerPage`; selection persists per-tab in `sessionStorage` keyed by venue and resets on venue switch (009 pattern).

Grounding findings:

- **`GET/POST /api/venues/{venueId}/events` exist** (`EventsController`, `EventService.ListEventsAsync` already orders by `EventDate` descending). **No `PATCH`/`DELETE` endpoints yet** — required for clarified edit/delete scope (User Story 4).
- **`CreateEventAsync` currently requires `QboTagName`** — spec/clarify treat accounting tag as optional; backend validation must relax to allow empty string.
- **Permission for all event mutations today is `can_view_financials`** (`ViewFinancials` on `EventsController`); map spec "event-management permission" to this flag via `useCanManageEvents()`.
- **`EventResponse` already exposes `status`, `isBudgetLocked`, `qboTagName`** — sufficient for combobox badges and edit/delete gating without new read DTOs.
- **`DashboardHome` already resets `eventId` to `DEFAULT_EVENT_ID` on venue switch** — replace with resolved default from fetched event list (first item = server sort order).

This is a **hybrid slice**: primary frontend work plus small backend additions (update/delete endpoints, optional QBO tag, list tie-break), swagger regen, xUnit integration tests, Vitest + RTL, optional Playwright path.

## Technical Context

**Language/Version**: C# / .NET 8 (`apps/api`); TypeScript 5.7 + React 18 (`apps/web`)

**Primary Dependencies**: TanStack Query v5; existing `apiFetch` + `X-Active-Venue-Id` injection (009); `VenueSwitcher` combobox patterns; Vitest + RTL; xUnit + Testcontainers integration tests

**Storage**: PostgreSQL `events` table (existing); browser `sessionStorage` map `activeEventByVenue` (venue id → event id, per-tab)

**Testing**: xUnit integration tests for new PATCH/DELETE + validation guards; Vitest + RTL for combobox, panel, hooks, `DashboardHome` rewiring; ≥80.0% line/branch coverage enforced independently on backend and frontend (Constitution III); optional Playwright spec `tests/e2e/specs/venue/event-selection.spec.ts`

**Target Platform**: Linux containerized API + Vite SPA (desktop-first dashboard)

**Project Type**: Web application (`apps/api` + `apps/web`)

**Performance Goals**: Event switch → ledger reload within 3s (SC-001); first-event create flow under 2 minutes (SC-002)

**Constraints**: Constitution II — event list scoped by venue + org via existing `EventService` access checks; Constitution V — reject metadata delete/update on settled/reconciled; block delete when `isBudgetLocked`; Constitution VI — all payloads from `generated-api.ts` after DTO + swagger regen; no hand-written TS API types; ≥80.0% coverage both stacks; inline panel only (no modal/page for event CRUD)

**Scale/Scope**: ~12 new/modified frontend files; ~4 backend files + DTOs; ~8 new/extended test files; 1 optional E2E spec

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Relevance | Status |
|-----------|-----------|--------|
| I. Core Mathematical Axioms | No monetary math in this slice. | N/A |
| II. Multi-Tenant Isolation | All event queries go through `EventService` venue accessibility + global query filters. | PASS |
| III. Engineering Rigor | Vitest + xUnit coverage for new endpoints and UI; optional Playwright multi-step path. | PASS (with tests) |
| IV. QBO Integration | No QBO HTTP mutations; optional tag is local metadata only. | PASS |
| V. Ledger State Machine | Delete/update reject `Settled`/`Reconciled`; delete rejects `IsBudgetLocked`; metadata edit allowed on locked-budget PreShow. | PASS |
| VI. Polyglot Contract | Add `UpdateEventRequest`; regen `generated-api.ts`; no hand-authored TS interfaces. | PASS |
| VII. EF Core Axioms | List uses `.AsNoTracking().Include()`; update/delete load tracked entity with state guard. | PASS |
| VIII. Exception Governance | Domain exceptions (`ValidationException`, `LedgerStateException`); no PII in logs. | PASS |

**Post-design re-check**: PASS. No violations; Complexity Tracking not required.

## Project Structure

### Documentation (this feature)

```text
specs/015-event-list-selection-ui/
├── plan.md              # This file
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/
│   └── event-list-selection-ui.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
apps/api/
├── Controllers/
│   └── EventsController.cs              # MODIFIED: PATCH, DELETE
├── Services/
│   └── EventService.cs                  # MODIFIED: UpdateEventAsync, DeleteEventAsync, optional QboTag, list tie-break
└── DTOs/Ledger/
    └── LedgerDtos.cs                    # MODIFIED: UpdateEventRequest; optional QboTag on create

apps/api.tests/Integration/
└── EventsControllerTests.cs             # EXTENDED: update, delete, guard tests

apps/web/src/
├── api/
│   └── events.ts                        # NEW: useEvents, useCreateEvent, useUpdateEvent, useDeleteEvent
├── auth/
│   └── validation.ts                    # MODIFIED: validateEventForm()
├── hooks/
│   └── useCanManageEvents.ts            # NEW: canViewFinancials gate
├── venue/
│   ├── activeEventStorage.ts            # NEW: per-venue session map
│   └── eventSelection.ts                # NEW: resolveActiveEventId(), sort/filter helpers
├── components/event/
│   ├── EventCombobox.tsx                # NEW: searchable combobox + actions menu
│   ├── EventFormPanel.tsx               # NEW: inline create/edit panel
│   └── EventDeleteConfirm.tsx           # NEW: inline confirmation strip
├── pages/
│   └── DashboardHome.tsx                # MODIFIED: combobox, empty state, panel wiring; remove DEFAULT_EVENT_ID
└── index.css                            # MODIFIED: combobox + panel styles

apps/web/tests/
├── api/events.test.tsx                  # NEW
├── hooks/useCanManageEvents.test.ts     # NEW
├── venue/activeEventStorage.test.ts     # NEW
├── venue/eventSelection.test.ts         # NEW
├── components/event/
│   ├── EventCombobox.test.tsx           # NEW
│   ├── EventFormPanel.test.tsx          # NEW
│   └── EventDeleteConfirm.test.tsx      # NEW
└── pages/DashboardHome.test.tsx         # MODIFIED: event selection flows

tests/e2e/specs/venue/
└── event-selection.spec.ts              # NEW (optional): venue → event → ledger visible
```

**Structure Decision**: Mirror 009/014 patterns — API hooks in `src/api/`, session persistence in `src/venue/`, presentational components in `src/components/event/`, composition in `DashboardHome`. No new router routes (inline panel). Backend changes minimal and colocated in existing `EventService`/`EventsController`.

## Implementation Phases

### Phase A — Backend: update/delete + optional QBO tag

1. Add `UpdateEventRequest` record; relax `CreateEventAsync` QBO tag to optional (empty string stored).
2. `UpdateEventMetadataAsync` — PreShow only; allow when budget locked; fields: title, eventDate, qboTagName.
3. `DeleteEventAsync` — PreShow + `!IsBudgetLocked`; cascade via existing FK rules.
4. Controller `PATCH`/`DELETE` routes; regenerate OpenAPI → `generated-api.ts`.
5. Extend `EventsControllerTests` + list tie-break (`OrderByDescending EventDate` then `CreatedAt`).

### Phase B — Frontend API + selection state

1. `events.ts` hooks with query key `['events', venueId]`.
2. `activeEventStorage.ts` — JSON map in sessionStorage.
3. `eventSelection.ts` — resolve remembered id, default to first list item, fallback on invalid.
4. `useCanManageEvents()` from profile permissions.

### Phase C — UI components

1. `EventCombobox` — filter by title/date, status badge, sort display, edit/delete/create affordances.
2. `EventFormPanel` — shared create/edit inline panel with validation + dismiss.
3. `EventDeleteConfirm` — confirmation strip (not modal).
4. Events empty state in `DashboardHome` when venue has zero events.

### Phase D — Dashboard integration

1. Remove `DEFAULT_EVENT_ID`; wire `eventId` from resolver + combobox.
2. On venue switch: clear remembered event for new venue context, fetch list, resolve default.
3. Pass selected `eventId` to `EventLedgerPage`; error/fallback paths.

### Phase E — Tests & coverage

1. Component and hook unit tests per contracts.
2. `dotnet test` EventsControllerTests; `npm run test:coverage` ≥80%.

## Complexity Tracking

> No constitution violations requiring justification.

## Artifacts Generated

| Artifact | Path |
|----------|------|
| Research | [research.md](./research.md) |
| Data model | [data-model.md](./data-model.md) |
| UI contract | [contracts/event-list-selection-ui.md](./contracts/event-list-selection-ui.md) |
| Quickstart | [quickstart.md](./quickstart.md) |

**Next**: `/speckit-tasks` to generate `tasks.md`.
