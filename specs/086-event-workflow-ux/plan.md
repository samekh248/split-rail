# Implementation Plan: Event Workflow Visual Cleanup and Show Detail Capture

**Branch**: `086-event-workflow-ux` | **Date**: 2026-08-19 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/086-event-workflow-ux/spec.md`

## Summary

Bring the event workflow surfaces up to the product's modernised form patterns, and finish capturing the show-day detail that operations needs: doors time, show start time (confirmed placements only), the opening/supporting lineup, and free-text notes.

A code survey materially narrowed the backend work. `Event` **already carries** `DoorsTime`, `LoadInTime`, `CurfewTime`, and `SupportLineup`; `CreateEventRequest`, `UpdateEventRequest`, and `EventResponse` **already carry all four**; and `EventService` already parses, normalises, and projects them. So doors time and the supporting lineup need **no backend change at all** — they need interface. Only two fields are genuinely new end-to-end: **show start time** and **notes**.

The remaining work is presentation: modernise the two creation surfaces (`CreateBookingEventModal`, `EventFormPanel`) onto the shared `SelectField`/action-row patterns, restructure the bare `BookingEventDrawer` detail mode into labelled groupings, move *Convert to festival* into the existing shared `KebabMenu`, and move *Add artist* to the foot of `ArtistDealPanel`.

## Technical Context

**Language/Version**: TypeScript 5.7 (React 18.3) in `apps/web`; C# / ASP.NET Core 8 in `apps/api` for the two new fields only

**Primary Dependencies**: Shared form primitives (`FormField`, `SelectField`, `ModalHeader`, `KebabMenu`), booking surfaces (`CreateBookingEventModal`, `BookingEventDrawer`), `EventFormPanel`, `FestivalModeCard`, `ArtistDealPanel`, `EventService` + `LedgerDtos`, EF Core migration, Vitest + RTL, xUnit + Testcontainers

**Storage**: PostgreSQL via EF Core. Two nullable columns added to `events`: a show start time and a notes text column. No other schema change; `DoorsTime` and `SupportLineup` columns already exist.

**Testing**: xUnit + Testcontainers for the new field persistence, validation, and immutability rules; Vitest + React Testing Library for the modernised modals, the confirmed-only gating of show start time, the kebab relocation, and the Add-artist relocation; ≥80.0% line/branch coverage on both stacks independently (Constitution III). No new Playwright E2E — no new multi-user or tenant-isolation flow is introduced.

**Target Platform**: Browser-based web application (desktop primary, existing narrow-viewport breakpoints)

**Project Type**: Web application; vertical slice across `apps/api` (two fields) and `apps/web` (all presentation)

**Performance Goals**: No new runtime cost. The added fields ride existing event create/update/read round-trips; no new endpoint or query is introduced.

**Constraints**: Frontend contract types MUST be regenerated from Swagger after the DTO change, never hand-written (Constitution VI) — this is the gate that failed CI on the previous feature, so it is called out explicitly as a task. Every event query keeps its `organization_id`/venue scoping (Constitution II). Settled/reconciled events stay immutable (Constitution V). No monetary values are involved (Constitution I — N/A). Icons come from Font Awesome Free (Constitution IX). No new destructive flow, so §XI applies only to the existing cancel action already in the drawer's kebab.

**Scale/Scope**: Two new nullable event fields, five frontend components restructured, one shared CSS pass. No new routes, entities, endpoints, or permissions.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Relevance | Status |
|---|---|---|
| I. Core Mathematical Axioms | No monetary computation; times and text only. | N/A |
| II. Multi-Tenant Isolation | Reuses existing event read/update paths, which already scope by venue/organization. No new query is introduced. | PASS |
| III. Engineering Rigor | xUnit coverage for the new fields and validation; Vitest + RTL for every relocated/restructured surface; ≥80% both stacks. | PASS |
| IV. QBO Integration | No QBO calls; `QboTagName` handling is untouched. | PASS |
| V. Ledger State Machine | The new fields are non-financial, but they live on `events`, so writes MUST still refuse on settled/reconciled status via the existing guard. | PASS |
| VI. Polyglot Contract | DTO changes first, then regenerate `generated-api.ts` from Swagger. No hand-written contract types. Explicit task, given this gate broke CI on spec 085. | PASS |
| VII. EF Core Axioms | Reads stay `AsNoTracking` with existing `.Include()` chains; two scalar columns add no new navigation to load. | PASS |
| VIII. Exception Governance | New validation (show start before doors) throws the existing granular `ValidationException`, not a base exception; no empty catch. | PASS |
| IX. UI Iconography | Reuses Font Awesome Free icons already in the codebase for the kebab and action buttons; no ad-hoc SVG. | PASS |
| X. Dual-Platform Operator Scripts | No `deploy/` scripts added. | N/A |
| XI. Destructive Action Confirmation | No new delete/remove flow. The drawer's existing cancel-booking action keeps its current confirmation. | PASS |

**Result**: PASS — no violations; Complexity Tracking not required.

**Post-design re-check**: PASS. The design adds two nullable columns and reuses every existing endpoint, guard, and shared component. Confirmed-placement gating is enforced server-side as well as in the interface, so the rule cannot be bypassed by a direct API call.

## Project Structure

### Documentation (this feature)

```text
specs/086-event-workflow-ux/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── event-detail.md  # Phase 1 output — API + UI contract
├── checklists/
│   └── requirements.md  # Pre-existing spec checklist
└── tasks.md             # Created later by /speckit-tasks
```

### Source Code (repository root)

```text
apps/api/
├── Models/
│   └── Event.cs                                  # + ShowStartTime, Notes (DoorsTime/SupportLineup already present)
├── DTOs/Ledger/
│   └── LedgerDtos.cs                             # + fields on Create/Update/EventResponse
├── Services/
│   └── EventService.cs                           # Parse/normalise/project; confirmed-only + start>=doors validation
├── Data/
│   ├── ApplicationDbContext.cs                   # Column config
│   └── Migrations/                               # New migration: add show start time + notes
└── (tests) apps/api.tests/Integration/
    └── EventsControllerTests.cs                  # Persistence, validation, immutability, placement gating

apps/web/
├── src/
│   ├── types/generated-api.ts                    # REGENERATED from Swagger — never hand-edited
│   ├── components/
│   │   ├── booking/
│   │   │   ├── CreateBookingEventModal.tsx       # Shared patterns; action row; doors retained
│   │   │   └── BookingEventDrawer.tsx            # Detail groupings; new fields in edit + detail
│   │   ├── event/
│   │   │   └── EventFormPanel.tsx                # Shared patterns; clearer type selection
│   │   ├── festival/
│   │   │   └── FestivalModeCard.tsx              # Convert-to-festival → KebabMenu
│   │   ├── artists/
│   │   │   └── ArtistDealPanel.tsx               # Add artist → foot of section
│   │   └── shell/KebabMenu.tsx                   # Reused as-is
│   └── index.css                                 # Detail groupings, notes area, action rows
└── tests/
    ├── booking/
    │   ├── CreateBookingEventModal.test.tsx      # NEW: shared controls, action order
    │   └── BookingEventDrawer.test.tsx           # Groupings, confirmed-only gating, new fields
    ├── components/event/EventFormPanel.test.tsx  # Shared controls, type selection
    ├── components/festival/FestivalModeCard.test.tsx  # Convert action behind kebab
    └── artists/ArtistDealPanel.test.tsx           # Add artist at section foot
```

**Structure Decision**: Keep ownership where it already sits. `EventService` remains the single writer for event fields, so the confirmed-placement rule and the start-after-doors rule live there rather than being duplicated per surface. `BookingEventDrawer` stays the one event detail surface and gains the new fields in both its detail and edit modes. `KebabMenu` and the shared form primitives are consumed unchanged — this feature adds no new shared component.

## Implementation Phases

### Phase A — Backend fields and rules (P1)

1. Add the show start time and notes columns to `Event.cs`, `ApplicationDbContext`, and a new EF migration.
2. Extend `CreateEventRequest`, `UpdateEventRequest`, and `EventResponse` in `LedgerDtos.cs` as optional fields, preserving positional-record compatibility by appending.
3. In `EventService`, parse/normalise/project the new fields alongside the existing `DoorsTime`/`SupportLineup` handling; enforce that a show start time is only accepted when the placement is confirmed, and that it is not earlier than the doors time.
4. Confirm the existing settled/reconciled guard covers the new fields; add coverage proving it.

### Phase B — Contract regeneration (P1, blocking frontend)

1. Build the API, serve Swagger, run `npm run gen:api`, and commit the regenerated `generated-api.ts`.
2. Verify `git diff --exit-code apps/web/src/types/generated-api.ts` is clean, matching the CI drift gate.

### Phase C — Modernised creation surfaces (P1)

1. `CreateBookingEventModal`: adopt the shared action row (dismiss left, primary right with leading icon) and consistent section spacing.
2. `EventFormPanel`: same action-row treatment; make the standard-vs-festival selection visually unambiguous.
3. Keep both surfaces' existing validation semantics and test IDs intact.

### Phase D — Show detail capture (P1–P2)

1. `BookingEventDrawer` edit mode: add doors time, show start time (rendered only for confirmed placements), supporting lineup, and notes.
2. `BookingEventDrawer` detail mode: restructure the bare paragraph list into labelled groupings (schedule, lineup, notes), omitting groups with no content.
3. Surface absence in words rather than blank space; render notes and lineup as literal text.

### Phase E — Workspace action reorganisation (P2)

1. `FestivalModeCard`: move *Convert to festival* into a `KebabMenu`, omitting the menu entirely when the user cannot convert.
2. `ArtistDealPanel`: move *Add artist* from the section header to the section foot, preserving its permission gate and disabled logic.

### Phase F — Verification (P1–P2)

1. Frontend: Vitest + RTL across all five components, including confirmed-only gating and the empty-menu case.
2. Backend: xUnit integration coverage for persistence, both validation rules, placement gating, and immutability.
3. Run typecheck, `npm run build`, both coverage gates, and the quickstart scenarios.

## Complexity Tracking

> No constitution violations requiring justification.
