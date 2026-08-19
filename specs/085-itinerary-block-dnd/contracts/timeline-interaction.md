# Contract: Timeline Interaction

This feature exposes a **UI interaction contract**, not a new API surface. It documents the component boundary between `TimelineGrid` and its parent (`FestivalItineraryPage`), and the reused backend endpoints those callbacks resolve to.

## 1. `TimelineGrid` props (new/changed)

```ts
export interface TimelineGridProps {
  // ...existing props unchanged (venueId, eventId, days, stages, blocks, selectedDay,
  // onDayChange, onBookingStatusChange, onPinToggle, canManage)...

  /** Existing: click (no drag) on an active block opens its editor. Unchanged signature. */
  onBlockClick?: (block: ProgrammingBlockResponse) => void;

  /** NEW: click (no drag) on an empty slot opens the create form pre-seeded. */
  onSlotClick?: (seed: {
    dayDate: string;
    stageZoneId: string;
    startTime: string;
    endTime: string;
  }) => void;

  /**
   * CHANGED signature (was drag-and-drop only): now fired for both a body-drag move
   * and an edge-drag resize. `kind` disambiguates which; resize always keeps the same
   * stageZoneId as the block's current stage.
   */
  onBlockPlacementChange: (change: {
    kind: 'move' | 'resize';
    blockId: string;
    dayDate: string;
    stageZoneId: string;
    startTime: string;
    endTime: string;
  }) => Promise<void>;

  /** Existing: fired when a placement change is rejected by the server as a conflict. */
  onConflict: (conflict: ReturnType<typeof parseBlockConflictError>, block: ProgrammingBlockResponse) => void;
}
```

Notes:
- `onBlockPlacementChange` replaces `onBlockMove` (`BlockMoveTarget`) with a superset shape (`kind` + same fields). `FestivalItineraryPage.handleBlockMove` is renamed/extended to `handleBlockPlacementChange` and branches only on which fields changed (stage for move, one bound for resize) when building the `UpdateProgrammingBlockRequest` — no new hook.
- A no-op drop (same stage + same start) MUST NOT call `onBlockPlacementChange` (Edge Cases).
- `onSlotClick` MUST NOT fire when `canManage` is false or the clicked slot is occupied (occupied → existing `onBlockClick` behavior, selecting that block, per US1 Acceptance Scenario 5).

## 2. Interaction contract (pointer gesture → callback)

| Pointer gesture on | Movement | Fires | Guard conditions |
|---|---|---|---|
| Block body | ≤ threshold | `onBlockClick(block)` | Always allowed (read-only viewers get read-only detail if it already exists; this feature does not change that) |
| Block body | > threshold | `onBlockPlacementChange({ kind: 'move', ... })` on release over a valid target | `canManage`, block not pending, block active, event not frozen/settled |
| Block edge handle (top/bottom) | > threshold | `onBlockPlacementChange({ kind: 'resize', ... })` on release | Same as move, plus: only within the same stage, resulting duration ≥ 1 slot, bounds within day window |
| Empty slot cell | ≤ threshold | `onSlotClick(seed)` | `canManage`; slot must be empty (no active block covering it) |
| Occupied slot cell (on the block, not empty gap) | ≤ threshold | `onBlockClick(block)` | Same as block-body click |
| Any in-progress gesture | Escape / `pointercancel` | none (reverts to prior placement, no callback) | — |

During a `moving`/`resizing` gesture the grid renders a live preview (valid or conflict styling per D3) but calls **no** callback until release — no per-move network calls (Technical Context, Performance Goals).

## 3. Reused backend endpoints (unchanged — documented for traceability only)

| Endpoint | Method | Consumed by |
|---|---|---|
| `POST /venues/{venueId}/events/{eventId}/blocks` | Create | `useCreateBlock` via `BlockEditorDrawer` submit, after `onSlotClick` seeds the form |
| `PUT /venues/{venueId}/events/{eventId}/blocks/{blockId}` | Update | `useUpdateBlock` via `onBlockPlacementChange` (move and resize) and via `BlockEditorDrawer` submit (unchanged edit-form path) |

Both endpoints already implement, unchanged by this feature:
- Same-stage overlap rejection (`AssertNoSameStageConflictAsync`) throwing `BlockConflictException` with the conflicting block's id/title/time — the exact payload `parseBlockConflictError` already parses.
- Cross-stage concurrency allowed.
- Settlement/frozen immutability guard (`SettlementStateException` on `Finalized`).
- Audit history recording for `Moved` (stage or day changed) vs `Reschedule` (time changed) on save.

No request/response shape changes. No new error codes.

## 4. Verification mapping (requirements → contract surface)

| Requirement | Contract element that satisfies it |
|---|---|
| FR-001/FR-002 | `onSlotClick` seed shape, threshold-gated to a true click |
| FR-003 | Click-vs-drag threshold on block body |
| FR-004 | `onBlockPlacementChange({ kind: 'move' })`, any stage column as drop target |
| FR-005/FR-006 | `onBlockPlacementChange({ kind: 'resize' })`, edge-only origin, snap/clamp/min-duration guards |
| FR-008/FR-009 | Client preview via `detectSameStageOverlap`; server remains authority via existing conflict exception |
| FR-010 | `canManage` guard on every gesture-emitting path |
| FR-011 | No new bypass of `UpdateAsync`'s settlement guard; frontend suppresses gesture affordance when block/event immutable |
| FR-012/FR-013 | Live preview during gesture; on successful save the moved/resized block re-renders at its new position and frees its old slot (existing render is keyed off `blocks` query data, refetched after save) |
