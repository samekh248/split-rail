# Phase 1 Data Model: Itinerary Block Interactive Scheduling

No database schema, entity, or DTO changes. This feature is client-side interaction state layered on top of the existing `ProgrammingBlock` entity and `ProgrammingBlockResponse` contract (spec 082). This document describes the **client-side interaction model** the new gesture controller introduces, plus how it maps onto reused server entities.

## Reused server entity (unchanged)

### ProgrammingBlock (existing — `apps/api/Models/ProgrammingBlock.cs`)

Fields relevant to this feature (all pre-existing):

| Field | Type | Relevance here |
|---|---|---|
| `Id` | Guid | Identifies the block being moved/resized |
| `StageZoneId` | Guid | Move target when dragged across stages |
| `DayDate` | DateOnly | Fixed for this feature — moves/resizes stay on the selected day |
| `StartTime` / `EndTime` | TimeOnly | Mutated by move (both shift) and resize (one bound shifts) |
| `ScheduleStatus` | enum (`Scheduled`, `Delayed`, `PartiallyCompleted`, `Canceled`) | Only `Scheduled`/`Delayed` (`IsActive()`) participate in overlap and are drop/resize targets |
| `SettlementStatus` | enum | `Finalized` blocks refuse `UpdateAsync` server-side; frontend must not offer gestures that will always fail |

No new fields, no migration.

## New client-side interaction model

These types live in `apps/web/src/components/festival/` (in `useTimelineInteraction.ts` and `timelineUtils.ts`) and are **not** part of the generated API contract — they describe pointer-gesture state only, per Constitution VI (no handwritten types mirroring API payloads; these mirror UI state, not a payload).

### GestureIntent (discriminated union — the controller's output)

```ts
type GestureIntent =
  | { kind: 'click'; block: ProgrammingBlockResponse }
  | { kind: 'create'; dayDate: string; stageZoneId: string; startTime: string; endTime: string }
  | { kind: 'move'; blockId: string; stageZoneId: string; startTime: string; endTime: string }
  | { kind: 'resize'; blockId: string; startTime: string; endTime: string };
```

- `click` — pointer down+up on a block body with movement under the drag threshold → open existing block editor (FR-003).
- `create` — pointer down+up on an empty slot cell under the drag threshold → open create form seeded with day/stage/start, end = start + 30 min (FR-001/FR-002).
- `move` — pointer down on a block **body**, moved past threshold, released over a slot cell (same or different stage) → duration-preserving reschedule (FR-004).
- `resize` — pointer down on a block **edge handle** (top or bottom), moved past threshold, released → one bound changes, the other is pinned (FR-005).

### GestureState (internal state machine — `useTimelineInteraction`)

```ts
type GesturePhase = 'idle' | 'pressing' | 'moving' | 'resizing';

interface GestureState {
  phase: GesturePhase;
  pointerId: number | null;
  originBlockId: string | null;
  originEdge: 'start' | 'end' | null;   // set only when phase becomes 'resizing'
  originStageId: string | null;
  originStartTime: string | null;
  originEndTime: string | null;
  currentStageId: string | null;        // updates as pointer crosses stage columns during 'moving'
  currentStartTime: string | null;      // snapped, clamped preview values
  currentEndTime: string | null;
  isValid: boolean;                     // false when preview overlaps an active same-stage block
  conflictBlockId: string | null;       // set when isValid is false, for the preview label
}
```

Transitions:

```
idle --pointerdown(body, canManage)--> pressing
idle --pointerdown(edge handle, canManage)--> pressing (originEdge set)
idle --pointerdown(empty slot, canManage)--> pressing (originBlockId null)
pressing --pointermove(> threshold, originEdge==null, originBlockId!=null)--> moving
pressing --pointermove(> threshold, originEdge!=null)--> resizing
pressing --pointerup(<= threshold)--> idle, emits 'click' or 'create'
moving --pointermove--> moving (recompute currentStageId/currentStartTime/currentEndTime, isValid)
moving --pointerup--> idle, emits 'move' if isValid and not no-op, else no emission (snap back)
resizing --pointermove--> resizing (recompute the dragged bound only, clamp, min-duration check, isValid)
resizing --pointerup--> idle, emits 'resize' if isValid and change is non-zero, else no emission (snap back)
any --pointercancel / Escape--> idle, no emission (snap back)
```

### Derived preview geometry (pure functions, `timelineUtils`)

| Function | Input → Output | Used for |
|---|---|---|
| `snapMinutesToSlot(minutes)` | raw pointer minutes → nearest 30-min boundary | Move/resize snapping (D2) |
| `clampToDayBounds(minutes)` | minutes → clamped to `[TIMELINE_START_HOUR*60, TIMELINE_END_HOUR*60]` | Edge cases: bounds refusal |
| `resizeBlockBound(block, edge, candidateMinutes)` | block + which edge + snapped/clamped candidate → `{ startTime, endTime } \| null` (null when resulting duration < 1 slot) | Resize preview + release guard |
| `detectSameStageOverlap(blocks, candidate)` (existing, reused) | active blocks + candidate placement → conflicting block or null | Move/resize/create preview and pre-save check |
| `buildCreateSeed(dayDate, stageZoneId, startTime)` | slot click → `{ dayDate, stageZoneId, startTime, endTime: startTime + 30min }` | Create-from-slot (FR-002) |

No new persisted state, no new store. `GestureState` lives in a `useState`/`useReducer` inside `useTimelineInteraction`, scoped to one `TimelineGrid` instance, discarded on unmount or day change.

## Mutation mapping (reused, unchanged)

| Gesture intent | Existing hook | Existing endpoint |
|---|---|---|
| `create` (after form submit) | `useCreateBlock(venueId, eventId)` | `POST /venues/{venueId}/events/{eventId}/blocks` |
| `move` / `resize` | `useUpdateBlock(venueId, eventId)` | `PUT /venues/{venueId}/events/{eventId}/blocks/{blockId}` |
| Same-stage conflict on either | — | `409`-style `BlockConflictException` → `parseBlockConflictError` → `ConflictDialog` (existing) |

`FestivalItineraryPage.handleBlockMove` already builds the full `UpdateProgrammingBlockRequest` from a partial move target by merging in the existing block's unrelated fields (title, category, artist, etc.) — resize reuses the same function with only start/end changed.
