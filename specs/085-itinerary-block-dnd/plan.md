# Implementation Plan: Itinerary Block Interactive Scheduling

**Branch**: `085-itinerary-block-dnd` | **Date**: 2026-08-18 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/085-itinerary-block-dnd/spec.md`

## Summary

Turn the festival itinerary timeline into a direct-manipulation board. Schedulers click an empty slot to open the block form pre-filled with that day/stage/start (default +30 min end), drag a block **body** to move it to a new time or a different stage, and drag its top/bottom **edge** to resize — all with a live valid/conflict preview, snapping to the 30-minute grid, and same-stage overlap refusal. A plain click (no drag) still opens the block editor.

The current timeline (spec 082/084) already drag-moves via the HTML5 native drag API bound to a small grip handle, and the backend `ProgrammingBlockService.UpdateAsync` already validates same-stage overlap, records reschedule/move audit history, and respects settlement immutability. This feature is **frontend-only**: it replaces the handle-based HTML5 drag with a unified pointer-gesture controller that distinguishes click / move-drag / edge-resize, adds click-to-create-from-slot, and reuses the existing create/update mutations and conflict dialog. No API, DTO, schema, or permission changes.

## Technical Context

**Language/Version**: TypeScript 5.7 (React 18.3) in `apps/web`, consuming the existing ASP.NET Core 8 / C# API (unchanged by this feature)

**Primary Dependencies**: `TimelineGrid` and `timelineUtils` (spec 082), `BlockEditorDrawer` (already accepts `initialDayDate`/`initialStageZoneId`/`initialStartTime`/`initialEndTime` seed props and a create path via `useCreateBlock`), `useUpdateBlock` (move/resize), `ConflictDialog` + `conflictTypes`, `@fortawesome/*` icons (Constitution IX), React Query; native Pointer Events API for the drag/resize controller (no new DnD library)

**Storage**: N/A — no persistence or schema changes. Moves and resizes persist through the existing `PUT /venues/{venueId}/events/{eventId}/blocks/{blockId}` update endpoint; create-from-slot through the existing `POST .../blocks`

**Testing**: Vitest + React Testing Library for the timeline interaction controller (click-vs-drag, create-from-slot seed, move across stage, edge-resize bounds/min-duration, overlap preview and refusal, permission/immutability gating) and `timelineUtils` pure helpers; ≥80.0% line/branch coverage on changed frontend code (Constitution III). No backend tests are added because no backend code changes; existing `ProgrammingBlockTests` continue to cover conflict/immutability server-side. No new Playwright E2E — this is single-user direct manipulation reusing already-covered multi-user save paths

**Target Platform**: Browser-based web application (desktop primary; pointer-capable narrow viewports keep drag/resize, with the block form as the keyboard/touch fallback per spec)

**Project Type**: Web application; frontend-only vertical slice in `apps/web`

**Performance Goals**: Drag/resize preview tracks the pointer at 60 fps with no per-move network calls; a single save fires on release. New placement is visible immediately after the save resolves (SC-002/SC-003 under 5 s for an unconflicted gesture)

**Constraints**: No handwritten API types — reuse `@/types/generated-api` (Constitution VI); no monetary math (Constitution I — N/A); moves/resizes must respect existing settlement/frozen immutability and record schedule-change history (already enforced server-side, Constitution V); same-stage overlap refused, cross-stage concurrency allowed (FR-008/FR-009); this feature adds **no** new delete/remove flow, so Constitution §XI applies only to the existing block cancel path already covered by spec 082; no `deploy/` scripts (Constitution X — N/A)

**Scale/Scope**: One festival day rendered at a time (≤ ~10 stage columns × 32 half-hour slots); a bounded set of active blocks per day. One refactored component (`TimelineGrid`), one new interaction hook/module, extended pure helpers in `timelineUtils`, and focused Vitest coverage. No new routes or entities

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Relevance | Status |
|---|---|---|
| I. Core Mathematical Axioms | Timeline math is minute/pixel geometry, not money. No `decimal` monetary paths touched. | N/A |
| II. Multi-Tenant Isolation | No new queries. Reused create/update endpoints already scope by `venueId`/`eventId` through `FestivalAccessGuard`. | PASS |
| III. Engineering Rigor | Add Vitest + RTL coverage for the new interaction controller and helpers; keep ≥80% on changed frontend code. | PASS |
| IV. QBO Integration | No QBO calls. | N/A |
| V. Ledger State Machine | Move/resize route through `UpdateAsync`, which already blocks finalized-settlement edits and records audit history; frontend gates gestures on immutable events. | PASS |
| VI. Polyglot Contract | Reuse generated `ProgrammingBlockResponse` / request types; no handwritten interfaces mirroring API payloads. | PASS |
| VII. EF Core Axioms | No backend persistence work. | N/A |
| VIII. Exception Governance | Server conflict/validation errors surface through the existing `BlockConflictException` → `ConflictDialog` path; no new catch blocks that swallow. | PASS |
| IX. UI Iconography | Reuse Font Awesome Free icons already on the timeline (grip, clock, triangle-exclamation); no ad-hoc SVG/glyphs for new resize/drop affordances. | PASS |
| X. Dual-Platform Operator Scripts | No operator scripts added. | N/A |
| XI. Destructive Action Confirmation | No new delete/remove flow. Existing block cancel keeps its spec-082 confirmation; move/resize are reversible reschedules and are exempt. | PASS |

**Result**: PASS — no violations; Complexity Tracking not required.

**Post-design re-check**: PASS. The Phase 1 design keeps all mutation ownership in the existing hooks and endpoints, introduces no new API surface, and confines new logic to presentational interaction state plus pure geometry helpers.

## Project Structure

### Documentation (this feature)

```text
specs/085-itinerary-block-dnd/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (client-side interaction model)
├── quickstart.md        # Phase 1 output (validation guide)
├── contracts/
│   └── timeline-interaction.md   # UI interaction contract + reused API endpoints
├── checklists/
│   └── requirements.md  # Pre-existing spec checklist
└── tasks.md             # Created later by /speckit-tasks
```

### Source Code (repository root)

```text
apps/web/
├── src/
│   ├── components/festival/
│   │   ├── TimelineGrid.tsx              # Replace handle-only HTML5 drag with pointer gesture
│   │   │                                 #   controller; add slot-click create, body-move,
│   │   │                                 #   edge-resize handles, valid/conflict preview overlay
│   │   ├── timelineUtils.ts              # Extend: pixel↔minute↔slot snapping, resize bound
│   │   │                                 #   clamping, min-duration guard, create-seed builder
│   │   ├── useTimelineInteraction.ts     # NEW: pointer-event state machine
│   │   │                                 #   (idle→pressing→moving/resizing→commit) that emits
│   │   │                                 #   click / move / resize / create-from-slot intents
│   │   ├── BlockEditorDrawer.tsx         # Reused as-is (seed props already exist); no change
│   │   │                                 #   expected beyond confirming +30m default end seed
│   │   └── ConflictDialog.tsx            # Reused for refused same-stage overlaps
│   ├── pages/
│   │   └── FestivalItineraryPage.tsx     # Wire onSlotClick→openCreateBlock(seed) and
│   │   │                                 #   onBlockResize→handleBlockMove-style update
│   └── index.css                          # Timeline preview / resize-handle / conflict styles
└── tests/
    ├── components/festival/
    │   ├── TimelineGrid.test.tsx          # Extend: click-vs-drag, create-from-slot, body-move
    │   │                                  #   across stage, edge-resize, overlap preview/refusal,
    │   │                                  #   permission + immutable-event gating
    │   ├── timelineUtils.test.ts          # Extend: snapping, clamping, min-duration, seed math
    │   └── useTimelineInteraction.test.ts # NEW: gesture state-machine transitions
    └── pages/
        └── FestivalItineraryPage.test.tsx # Extend: slot-click opens seeded create; resize
                                           #   save + conflict routing to ConflictDialog
```

**Structure Decision**: Keep all ownership inside the existing festival itinerary surface. `TimelineGrid` remains the single board component; the pointer gesture logic is extracted into a `useTimelineInteraction` hook so the component stays declarative and the state machine is unit-testable in isolation. Pure geometry (minute↔pixel↔slot, snapping, clamping, overlap) lives in `timelineUtils` where `detectSameStageOverlap`/`blockGridStyle` already live. `FestivalItineraryPage` continues to own the mutations (`useCreateBlock`, `useUpdateBlock`) and the `ConflictDialog`; the grid only emits intents.

## Complexity Tracking

> No constitution violations requiring justification.
