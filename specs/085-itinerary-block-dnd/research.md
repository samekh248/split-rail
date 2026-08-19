# Phase 0 Research: Itinerary Block Interactive Scheduling

All Technical Context items resolved; no NEEDS CLARIFICATION remained after inspecting the existing timeline (spec 082/084) and backend block service.

## D1 — Interaction model: native HTML5 drag-and-drop vs. Pointer Events

**Decision**: Replace the current handle-bound HTML5 native drag (`draggable` + `onDragStart`/`onDragOver`/`onDrop` on `TimelineGrid`) with a unified **Pointer Events** state machine (`pointerdown → pointermove → pointerup`, with `setPointerCapture`) extracted into `useTimelineInteraction`.

**Rationale**:
- The spec requires one surface to serve three gestures that the block body must disambiguate: click-to-edit, body-drag-to-move, and edge-drag-to-resize. HTML5 DnD cannot express edge-resize or a click-vs-drag threshold cleanly, and its drag-image/`dragover` throttling makes a smooth 60 fps preview hard.
- Pointer Events give one event stream for mouse, pen, and touch, satisfying the spec's "short press is a click, press-and-move is a drag" requirement (Edge Cases) and the pointer-first assumption. A movement threshold (e.g. ≥ 4 px or ≥ one sub-slot) separates click from drag.
- `setPointerCapture` keeps the gesture tracking even when the pointer leaves the origin cell, which is essential for cross-stage moves and long resizes.

**Alternatives considered**:
- *Keep HTML5 DnD, add a separate resize handle library*: two interaction paradigms on one card, worse touch support, and still no clean click-vs-drag threshold. Rejected.
- *Adopt a DnD library (dnd-kit/react-dnd)*: new dependency and bundle weight for a bounded, single-board use case already 80% built with primitives. Rejected in favor of native Pointer Events.

## D2 — Snapping, bounds, and minimum duration

**Decision**: Snap every gesture to the existing 30-minute grid (`TIMELINE_SLOT_MINUTES`). Clamp start/end to the visible day window (`TIMELINE_START_HOUR` 08:00 → `TIMELINE_END_HOUR` 24:00). Enforce a minimum duration of one slot (30 min) on resize; refuse (no save, restore prior times) when a resize would drop below one slot or push a bound outside day bounds. A drop onto the block's current stage+start is a no-op.

**Rationale**: Directly encodes FR-002, FR-006, and US3 acceptance scenarios 4–5. Reuses `timeToMinutes`/`minutesToTime` already in `timelineUtils`; adds pure `snapMinutesToSlot`, `clampToDayBounds`, and `resizeBlockBound` helpers so the rules are unit-tested without rendering.

**Alternatives considered**: Free (unsnapped) placement with server rounding — rejected; the grid is 30-min and unsnapped previews mislead the scheduler about where a block will land.

## D3 — Overlap validation and conflict surfacing

**Decision**: Keep server-side same-stage overlap as the source of truth (`ProgrammingBlockService.AssertNoSameStageConflictAsync`, which already excludes canceled/non-active blocks and allows cross-stage concurrency). Mirror it client-side **for preview only** with the existing `detectSameStageOverlap`, extended to cover the resize candidate as well as the move candidate. On a refused save, route the thrown `BlockConflictException` through the existing `parseBlockConflictError` → `ConflictDialog` and restore prior times (optimistic revert).

**Rationale**: Satisfies FR-008/FR-009/FR-012 and US4 without duplicating authority. The client preview is advisory ("server will confirm"); the server remains the gate, so a concurrent booking by another user is still caught on save (spec Edge Case) and the timeline restores the prior placement.

**Alternatives considered**: Client-only overlap enforcement — rejected; it cannot see another user's just-saved block and would violate the "server confirms" contract already in `TimelineGrid`.

## D4 — Create-from-slot form seeding

**Decision**: Clicking an empty slot emits a create intent carrying `{ dayDate: selectedDay, stageZoneId, startTime: slot, endTime: slot + 30min }`. `FestivalItineraryPage` feeds these into `BlockEditorDrawer`'s existing `initialDayDate`/`initialStageZoneId`/`initialStartTime`/`initialEndTime` props and opens it in create mode. Clicking an **occupied** slot selects the existing block (opens its editor) instead of creating.

**Rationale**: FR-001/FR-002 and US1. The drawer and `useCreateBlock` already exist; the only wiring is a new `onSlotClick` prop from grid to page and a default-end computation. No second editor is introduced (spec assumption).

**Alternatives considered**: A dedicated inline quick-create popover — rejected; the spec explicitly reuses the existing block form and forbids a second editor.

## D5 — Permission, immutability, and pending-state gating

**Decision**: Gate all create/move/resize gestures on `canManage && viewMode === 'internal'` (as `TimelineGrid` already does for drag). Continue to disable a block's gestures while its save is in flight (`pendingBlockId`). Frozen/settled/finalized events are already refused server-side (`UpdateAsync` settlement guard, Constitution V); the frontend additionally suppresses gesture affordances when the block/event is immutable so the UI matches the server outcome.

**Rationale**: FR-010/FR-011 and Edge Cases (in-flight blocks not re-draggable; immutable events not editable). Reuses existing gating flags rather than new permission plumbing.

**Alternatives considered**: Relying solely on server rejection for immutable events — rejected; showing drag/resize affordances that always fail is poor UX and wastes a round-trip.

## D6 — Testing strategy

**Decision**: Unit-test the gesture state machine (`useTimelineInteraction`) and pure geometry (`timelineUtils`) directly; component-test `TimelineGrid` by simulating pointer sequences (`pointerdown`/`pointermove`/`pointerup` with coordinates) via RTL `fireEvent`; page-test the create-from-slot seed and resize-save/conflict routing in `FestivalItineraryPage`. No new backend or Playwright tests — no server code changes and the multi-user save path is already covered.

**Rationale**: Constitution III with ≥80% on changed frontend code. Extracting the state machine keeps coverage achievable without brittle full-DOM drag simulation.

**Alternatives considered**: End-to-end pointer drag via Playwright — rejected as disproportionate for a single-user, already-server-covered interaction; kept as a possible future smoke check, not a v1 gate.
