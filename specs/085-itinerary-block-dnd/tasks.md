---

description: "Task list for Itinerary Block Interactive Scheduling"
---

# Tasks: Itinerary Block Interactive Scheduling

**Input**: Design documents from `/specs/085-itinerary-block-dnd/`

**Prerequisites**: [plan.md](./plan.md) (required), [spec.md](./spec.md) (required for user stories), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/timeline-interaction.md](./contracts/timeline-interaction.md), [quickstart.md](./quickstart.md)

**Tests**: REQUIRED per Constitution III. Every user story phase includes Vitest + RTL test tasks, written first. This feature is frontend-only (plan.md Summary) — no backend files change, so no backend test tasks are added; existing `apps/api.tests/Integration/ProgrammingBlockTests.cs` remains the regression guard for server-side overlap/immutability and is verified, not modified, in Polish.

**Organization**: Tasks are grouped by user story (US1–US4 from spec.md) to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Destructive UI: N/A — this feature adds no new delete/remove flow (plan.md Constitution Check, §XI)
- Operator/deploy scripts: N/A — no `deploy/` changes

## Path Conventions

Frontend-only, single web app: `apps/web/src/` and `apps/web/tests/`, per plan.md Project Structure.

<!-- ============================================================================ -->

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm the feature works from the existing itinerary surface; no new project scaffolding needed.

- [X] T001 Confirm dev environment runs: `apps/web` (`npm run dev`) against a festival event with ≥2 stages and ≥1 active block, per [quickstart.md](./quickstart.md) Prerequisites. No code change — verification only.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared geometry/snapping helpers and the pointer-gesture state machine that every user story's interactions depend on. No user story can be implemented until this phase is complete, because click-vs-drag disambiguation, snapping, and preview validity are shared across all four stories.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T002 [P] Add `snapMinutesToSlot(minutes)` and `clampToDayBounds(minutes)` pure functions to `apps/web/src/components/festival/timelineUtils.ts`, per data-model.md D2 (snap to `TIMELINE_SLOT_MINUTES`, clamp to `[TIMELINE_START_HOUR*60, TIMELINE_END_HOUR*60]`).
- [X] T003 [P] Add `resizeBlockBound(block, edge, candidateMinutes)` pure function to `apps/web/src/components/festival/timelineUtils.ts`, returning `{ startTime, endTime } | null` (null when resulting duration < one slot), per data-model.md D2.
- [X] T004 [P] Add `buildCreateSeed(dayDate, stageZoneId, startTime)` pure function to `apps/web/src/components/festival/timelineUtils.ts`, returning `{ dayDate, stageZoneId, startTime, endTime: startTime + 30min }`, per data-model.md D4.
- [X] T005 [P] Extend `detectSameStageOverlap` usage/signature in `apps/web/src/components/festival/timelineUtils.ts` (if needed) so it can validate a resize candidate in addition to a move candidate — same function, confirm it already accepts `{ id, stageZoneId, dayDate, startTime, endTime }` and needs no change; add a short comment only if a gap is found.
- [X] T006 [P] Unit tests for T002–T004 in `apps/web/tests/components/festival/timelineUtils.test.ts`: snapping to nearest 30-min boundary, clamping at 08:00/24:00 bounds, resize below one slot returns null, resize past day bounds returns null, create seed math.
- [X] T007 Create `useTimelineInteraction` pointer-gesture state machine hook in `apps/web/src/components/festival/useTimelineInteraction.ts`, implementing the `GesturePhase`/`GestureState`/`GestureIntent` model from data-model.md: `idle → pressing → moving|resizing → idle`, movement threshold to distinguish click from drag, `pointerId` capture, emits `GestureIntent` (`click` | `create` | `move` | `resize`) only on release, no emission on `pointercancel`/Escape/no-op drop. Depends on T002–T004.
- [X] T008 [P] Unit tests for the gesture state machine in `apps/web/tests/components/festival/useTimelineInteraction.test.ts`: click vs. drag threshold, `pressing→moving` on block body, `pressing→resizing` on edge origin, `pressing→click`/`pressing→create` on release under threshold, snap-back with no emission on cancel/Escape, no emission on no-op drop (same stage + same start). Depends on T007.

**Checkpoint**: Foundation ready — `timelineUtils` geometry and the gesture hook are unit-tested in isolation. User story implementation can now begin.

---

## Phase 3: User Story 1 - Create a block by clicking an empty time on a stage (Priority: P1) 🎯 MVP

**Goal**: Clicking an empty timeline slot opens the block form pre-filled with that stage, the current day, and the clicked start time (end = start + 30 min); clicking an occupied slot opens that block's editor instead; read-only/public viewers get no create affordance.

**Independent Test**: Open a festival itinerary with ≥2 stages. Click an empty slot (e.g. Main Stage 14:00). Confirm the form opens with that stage/start pre-filled and saving creates the block in that position.

### Tests for User Story 1 (REQUIRED) ⚠️

> Write these tests FIRST, ensure they FAIL before implementation.

- [X] T009 [P] [US1] RTL test in `apps/web/tests/components/festival/TimelineGrid.test.tsx`: clicking an empty slot cell (short press, no movement) calls `onSlotClick` with `{ dayDate, stageZoneId, startTime, endTime }` where `endTime` is `startTime + 30min`.
- [X] T010 [P] [US1] RTL test in `apps/web/tests/components/festival/TimelineGrid.test.tsx`: clicking a slot covered by an existing active block calls `onBlockClick(block)`, not `onSlotClick`.
- [X] T011 [P] [US1] RTL test in `apps/web/tests/components/festival/TimelineGrid.test.tsx`: with `canManage={false}`, clicking an empty slot calls neither `onSlotClick` nor any mutation, and the timeline is unchanged.
- [X] T012 [P] [US1] RTL test in `apps/web/tests/pages/FestivalItineraryPage.test.tsx`: `TimelineGrid`'s `onSlotClick` seed opens `BlockEditorDrawer` in create mode with `initialDayDate`/`initialStageZoneId`/`initialStartTime`/`initialEndTime` matching the seed.

### Implementation for User Story 1

- [X] T013 [US1] Add `onSlotClick` prop to `TimelineGridProps` in `apps/web/src/components/festival/TimelineGrid.tsx` per contracts/timeline-interaction.md §1. Depends on T007.
- [X] T014 [US1] Wire empty-slot cells in `apps/web/src/components/festival/TimelineGrid.tsx` through `useTimelineInteraction`: `pointerdown`/`pointerup` on a slot with no covering block emits `create` intent via `onSlotClick(buildCreateSeed(...))` when under the drag threshold; a slot covered by a block routes the click to `onBlockClick` instead (reuse existing block click handling). Depends on T013, T004.
- [X] T015 [US1] In `apps/web/src/pages/FestivalItineraryPage.tsx`, replace the static `openCreateBlock` seed (hardcoded `stageZoneId`/`startTime`/`endTime`) with a handler bound to `TimelineGrid`'s new `onSlotClick`, setting `editorSeed` from the emitted seed and opening the drawer in create mode. Depends on T014.
- [X] T016 [US1] Gate `onSlotClick` behind `canManage && viewMode === 'internal'` in `apps/web/src/components/festival/TimelineGrid.tsx`, matching the existing `canManage` gating already applied to drag (FR-010). Depends on T014.

**Checkpoint**: User Story 1 fully functional and testable independently — empty-slot click creates a pre-seeded block; occupied-slot click still opens the editor; permission gating holds.

---

## Phase 4: User Story 2 - Move a block by dragging it, including across stages (Priority: P1)

**Goal**: A click (no drag) on a block opens its editor; a body-drag to another time on the same stage or to a different stage/zone moves it, preserving duration, with a live valid-drop preview; users without edit permission cannot drag; canceled blocks are not movable drop obstacles.

**Independent Test**: Seed two stages with one movable block. Click it (no drag) → form opens. Drag it to a later time on the same stage and to the other stage; both saves succeed, duration preserved.

### Tests for User Story 2 (REQUIRED) ⚠️

- [X] T017 [P] [US2] RTL test in `apps/web/tests/components/festival/TimelineGrid.test.tsx`: pointer down+up on a block body with movement under the drag threshold calls `onBlockClick(block)` and does **not** call `onBlockPlacementChange`.
- [X] T018 [P] [US2] RTL test in `apps/web/tests/components/festival/TimelineGrid.test.tsx`: pointer down on a block body, moved past threshold to an empty slot on the **same** stage, released → calls `onBlockPlacementChange({ kind: 'move', blockId, stageZoneId: same, startTime: target, endTime: target + duration })`.
- [X] T019 [P] [US2] RTL test in `apps/web/tests/components/festival/TimelineGrid.test.tsx`: same drag sequence released over an empty slot on a **different** stage → `onBlockPlacementChange({ kind: 'move', stageZoneId: other, ... })` with duration unchanged.
- [X] T020 [P] [US2] RTL test in `apps/web/tests/components/festival/TimelineGrid.test.tsx`: during a move drag, hovering a valid empty target applies the `timeline-slot--valid`/preview styling at the prospective start/end.
- [X] T021 [P] [US2] RTL test in `apps/web/tests/components/festival/TimelineGrid.test.tsx`: with `canManage={false}`, attempting to press-and-drag a block body does not call `onBlockPlacementChange` and the block's position is unchanged.
- [X] T022 [P] [US2] RTL test in `apps/web/tests/components/festival/TimelineGrid.test.tsx`: dropping a block back onto its own current stage/start time (no-op) calls neither `onBlockPlacementChange` nor shows a conflict.
- [X] T023 [P] [US2] RTL test in `apps/web/tests/components/festival/TimelineGrid.test.tsx`: a canceled block does not block a move onto its former time/stage (verifies `detectSameStageOverlap`'s existing active-status filter still applies through the new gesture path).
- [X] T024 [P] [US2] RTL test in `apps/web/tests/pages/FestivalItineraryPage.test.tsx`: `onBlockPlacementChange({ kind: 'move', ... })` calls `useUpdateBlock` with the moved block's unrelated fields preserved (title, category, artist, etc.), matching the existing `handleBlockMove` merge behavior.

### Implementation for User Story 2

- [X] T025 [US2] In `apps/web/src/components/festival/TimelineGrid.tsx`, remove the HTML5 `draggable`/`onDragStart`/`onDragOver`/`onDrop` wiring on the block drag handle (`timeline-block-card__handle`) and replace with `pointerdown` on the block **body** routed through `useTimelineInteraction`, per contracts/timeline-interaction.md §2. Depends on T007.
- [X] T026 [US2] Rename `TimelineGridProps.onBlockMove` (`BlockMoveTarget`) to `onBlockPlacementChange` with the `{ kind: 'move' | 'resize', blockId, dayDate, stageZoneId, startTime, endTime }` shape from contracts/timeline-interaction.md §1, in `apps/web/src/components/festival/TimelineGrid.tsx`. Depends on T025.
- [X] T027 [US2] Implement move-gesture tracking in `apps/web/src/components/festival/TimelineGrid.tsx`: on `moving` phase, recompute `currentStageId`/`currentStartTime` from pointer position via `snapMinutesToSlot`, run `detectSameStageOverlap` for live preview validity, render valid/conflict slot styling; on release, call `onBlockPlacementChange({ kind: 'move', ... })` unless no-op or invalid. Depends on T025, T002, T005.
- [X] T028 [US2] Suppress `onBlockPlacementChange` for blocks with `pendingBlockId` set (in-flight save) and for canceled/inactive blocks as drop targets, in `apps/web/src/components/festival/TimelineGrid.tsx`, matching existing `pendingBlockId` gating. Depends on T027.
- [X] T029 [US2] In `apps/web/src/pages/FestivalItineraryPage.tsx`, rename `handleBlockMove` to `handleBlockPlacementChange`, keep the existing field-merge logic (loads the block, fills in unrelated fields, calls `useUpdateBlock`), and pass it as `TimelineGrid`'s `onBlockPlacementChange`. Depends on T026.
- [X] T030 [US2] Add filtered-stage drop-target guard in `apps/web/src/components/festival/TimelineGrid.tsx`: a stage hidden by `ItineraryFilters` (not present in the `stages` prop) cannot be targeted by a move, per spec Edge Cases. Depends on T027.

**Checkpoint**: User Stories 1 AND 2 both work independently — click-to-edit, click-to-create, and cross-stage move all function with the shared gesture controller.

---

## Phase 5: User Story 3 - Resize a block by dragging its start or end (Priority: P2)

**Goal**: Dragging a block's top or bottom edge changes only that bound, with snapping, a minimum one-slot duration, day-bounds clamping, and a live preview; edge-drag is distinguishable from body-drag (resize, not move) and from click (no form open).

**Independent Test**: Seed a 60-minute block with empty time before/after. Drag the end later by one interval and the start earlier by one interval; confirm times update and no other block is affected. Attempt an overlapping resize and confirm refusal.

### Tests for User Story 3 (REQUIRED) ⚠️

- [X] T031 [P] [US3] RTL test in `apps/web/tests/components/festival/TimelineGrid.test.tsx`: pointer down on the bottom edge handle, dragged one slot later, released → `onBlockPlacementChange({ kind: 'resize', blockId, startTime: unchanged, endTime: +30min })`.
- [X] T032 [P] [US3] RTL test in `apps/web/tests/components/festival/TimelineGrid.test.tsx`: pointer down on the top edge handle, dragged one slot earlier, released → `onBlockPlacementChange({ kind: 'resize', startTime: -30min, endTime: unchanged })`.
- [X] T033 [P] [US3] RTL test in `apps/web/tests/components/festival/TimelineGrid.test.tsx`: during an edge drag, a live preview (prospective duration styling) renders before release.
- [X] T034 [P] [US3] RTL test in `apps/web/tests/components/festival/TimelineGrid.test.tsx`: dragging an edge to a point that would make duration < 30 min and releasing does **not** call `onBlockPlacementChange`; the block visually reverts to its previous times.
- [X] T035 [P] [US3] RTL test in `apps/web/tests/components/festival/TimelineGrid.test.tsx`: dragging an edge past the visible day bounds (before 08:00 / after 24:00) and releasing does **not** call `onBlockPlacementChange`.
- [X] T036 [P] [US3] RTL test in `apps/web/tests/components/festival/TimelineGrid.test.tsx`: pointer down precisely on an edge handle, moved past threshold, is routed to resize (not move) — asserts `stageZoneId` never changes on a resize emission.
- [X] T037 [P] [US3] RTL test in `apps/web/tests/pages/FestivalItineraryPage.test.tsx`: `onBlockPlacementChange({ kind: 'resize', ... })` calls `useUpdateBlock` with only the resized bound changed and the block's other fields preserved.

### Implementation for User Story 3

- [X] T038 [US3] Add top/bottom edge-handle elements to each block card in `apps/web/src/components/festival/TimelineGrid.tsx`, rendered only when `canManage` (reusing the existing Font Awesome grip affordance pattern per Constitution IX — e.g. a thin edge strip, no new icon required unless a suitable Font Awesome resize icon exists). Depends on T025.
- [X] T039 [US3] Wire edge-handle `pointerdown` through `useTimelineInteraction` so `originEdge` is set (`'start'` or `'end'`), transitioning `pressing → resizing` on threshold per data-model.md's state machine. Depends on T038, T007.
- [X] T040 [US3] Implement resize-gesture tracking in `apps/web/src/components/festival/TimelineGrid.tsx`: on `resizing` phase, recompute the dragged bound via `resizeBlockBound`, run `detectSameStageOverlap` for live preview validity, render valid/conflict styling; on release, call `onBlockPlacementChange({ kind: 'resize', ... })` only when `resizeBlockBound` returned non-null and the change is valid/non-zero, else snap back with no emission. Depends on T039, T003, T005.
- [X] T041 [US3] In `apps/web/src/pages/FestivalItineraryPage.tsx`, extend `handleBlockPlacementChange` (from T029) to handle `kind: 'resize'` — same merge-and-call-`useUpdateBlock` path as move, since `onBlockPlacementChange`'s shape already unifies both. Depends on T029, T040.

**Checkpoint**: User Stories 1–3 all independently functional — create, click-to-edit, move, and resize all work through the unified gesture controller.

---

## Phase 6: User Story 4 - Refuse overlapping placements on the same stage (Priority: P1)

**Goal**: Every create, move, and resize that would overlap another active block on the same stage/day is refused: the UI shows an invalid/conflict preview during the gesture, and on a save attempt the existing `ConflictDialog` identifies the conflicting block and leaves prior times unchanged. Cross-stage overlap remains allowed.

**Independent Test**: Two active blocks on one stage with a gap. Drag the first onto the second's time, resize the first into the second, and create from an overlapping slot — all three refused with the conflicting block identified. Drop the first onto a different stage at the same clock time — allowed.

### Tests for User Story 4 (REQUIRED) ⚠️

- [X] T042 [P] [US4] RTL test in `apps/web/tests/components/festival/TimelineGrid.test.tsx`: hovering a move-drag over a same-stage occupied time shows conflict/invalid preview styling (`timeline-slot--warning`) and not the valid style.
- [X] T043 [P] [US4] RTL test in `apps/web/tests/components/festival/TimelineGrid.test.tsx`: releasing a move-drag over a same-stage occupied time still calls `onBlockPlacementChange` (client preview is advisory per research.md D3 — server is the gate); asserts the emitted intent so the page-level conflict test (T044) can verify the rejection path.
- [X] T044 [P] [US4] RTL test in `apps/web/tests/pages/FestivalItineraryPage.test.tsx`: when `useUpdateBlock`'s mutation rejects with a block-conflict error during a move, `onConflict` fires, `ConflictDialog` opens identifying the conflicting block, and the moved block's displayed position reverts to its prior placement (existing `isBlockConflictError`/`parseBlockConflictError` path, now reached via `handleBlockPlacementChange`).
- [X] T045 [P] [US4] RTL test in `apps/web/tests/pages/FestivalItineraryPage.test.tsx`: same rejection/revert behavior for a `kind: 'resize'` conflict.
- [X] T046 [P] [US4] RTL test in `apps/web/tests/pages/FestivalItineraryPage.test.tsx`: same rejection behavior for a create-from-slot save that the server refuses as a same-stage overlap (via `useCreateBlock`), and confirms the create form's error path already surfaces the conflicting block (existing `BlockEditorDrawer` conflict handling, unchanged).
- [X] T047 [P] [US4] RTL test in `apps/web/tests/components/festival/TimelineGrid.test.tsx`: two active blocks on **different** stages at overlapping clock times — moving/resizing either into that overlap is **not** flagged as invalid preview and `onBlockPlacementChange` is called normally (FR-009).
- [X] T048 [P] [US4] RTL test in `apps/web/tests/components/festival/timelineUtils.test.ts`: `detectSameStageOverlap` (existing, reused) returns null for a candidate overlapping a **canceled** block on the same stage (Edge Case: canceled blocks don't block placement) — confirms the existing behavior remains reachable from the new gesture paths.

### Implementation for User Story 4

- [X] T049 [US4] Confirm and, if needed, extend the conflict-preview computation in `apps/web/src/components/festival/TimelineGrid.tsx` (built in T027/T040) to cover both move and resize candidates uniformly via `detectSameStageOverlap`, rendering the existing `timeline-grid__overlap-warning` message and `timeline-slot--warning` styling for either gesture kind. Depends on T027, T040.
- [X] T050 [US4] In `apps/web/src/pages/FestivalItineraryPage.tsx`, confirm `handleBlockPlacementChange` (T029/T041) catches a rejected mutation via `isBlockConflictError`, calls `onConflict` with `parseBlockConflictError(error)`, and that the timeline visually reverts to the prior placement on rejection (React Query cache/refetch already drives this — verify no stale optimistic state is left behind for either move or resize). Depends on T029, T041.
- [X] T051 [US4] Verify (and adjust if a gap is found) that a hidden/filtered-out stage is never a valid drop target for conflict-preview purposes — reuses T030's guard for both move and resize. Depends on T030, T049.

**Checkpoint**: All four user stories independently functional. Same-stage overlap is refused end-to-end (preview + server confirmation) for create, move, and resize; cross-stage concurrency remains allowed.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Coverage gate, quickstart validation, and cleanup spanning all stories.

- [X] T052 [P] Remove the now-unused `BlockMoveTarget` type and any dead HTML5 drag-and-drop code left in `apps/web/src/components/festival/TimelineGrid.tsx` after T025–T026 replace it.
- [X] T053 [P] Add/confirm `aria-label` and keyboard-accessibility notes on edge-resize handles in `apps/web/src/components/festival/TimelineGrid.tsx` (pointer-first per spec Assumptions; keyboard users continue via the block form — verify no keyboard trap is introduced by the new handles).
- [X] T054 Run `npm run test -- TimelineGrid timelineUtils useTimelineInteraction FestivalItineraryPage` in `apps/web` and confirm all suites pass.
- [X] T055 Run `npm run typecheck` in `apps/web` and confirm no type errors from the `onBlockMove` → `onBlockPlacementChange` rename or new prop/types.
- [X] T056 Verify ≥80.0% line/branch coverage on changed frontend files (`TimelineGrid.tsx`, `timelineUtils.ts`, `useTimelineInteraction.ts`, `FestivalItineraryPage.tsx`) via `npm run test:coverage` (Vitest → lcov) in `apps/web`, per Constitution III / spec SC-006. Missing or unparseable coverage report FAILS this task.
- [X] T057 Run the manual scenarios in [quickstart.md](./quickstart.md) (US1–US4 + edge cases) against a local dev build and confirm each maps to a passing behavior, including the frozen/settled-event and hidden-stage checks.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories (shared `timelineUtils` helpers and `useTimelineInteraction` hook that every story's gestures use).
- **User Stories (Phase 3–6)**: All depend on Foundational phase completion.
  - US1 (Phase 3) has no dependency on US2–US4 and can ship alone as the MVP.
  - US2 (Phase 4) introduces the shared pointer-drag wiring on `TimelineGrid` (T025–T026) that US3 and US4 build on — implement US2 before US3/US4 even though all four are "independently testable" at the acceptance-scenario level, because US3's edge-resize and US4's conflict preview reuse the `moving`/gesture plumbing US2 establishes.
  - US3 (Phase 5) depends on US2's gesture wiring (T025) for the shared pointer-down routing, but resize-specific logic (edge handles, `resizeBlockBound`) is independent of US2's move logic.
  - US4 (Phase 6) depends on both US2 (move preview) and US3 (resize preview) existing to extend uniformly, plus the create path from US1.
- **Polish (Phase 7)**: Depends on all four user stories being complete.

### User Story Dependencies

- **US1 (P1)**: Foundational only. Fully independent of US2–US4.
- **US2 (P1)**: Foundational only at the acceptance-test level; implementation-wise it establishes the pointer-gesture wiring on `TimelineGrid` that US3/US4 extend.
- **US3 (P2)**: Foundational + US2's pointer-down routing (T025) for edge-handle wiring; resize math (T003, T040) is independent.
- **US4 (P1)**: Foundational + US2 (move preview) + US3 (resize preview) + US1 (create conflict path).

### Within Each User Story

- Tests written and failing before implementation.
- Shared prop/type changes (e.g. `onBlockPlacementChange` rename in US2) before the gesture logic that emits them.
- Grid-level (`TimelineGrid`) changes before page-level (`FestivalItineraryPage`) wiring that consumes them.
- Story complete (checkpoint) before moving to the next priority phase.

### Parallel Opportunities

- T002–T004 (pure helper functions, different concerns in the same file — coordinate before merging) and T006 can be parallelized across contributors if care is taken with the shared file; T008 is independent once T007 lands.
- All test tasks marked [P] within a story phase can run in parallel (different `it()` blocks, same or different test files — no shared mutable state).
- US1 (Phase 3) can be fully implemented and shipped as MVP before starting US2.
- Within Phase 6 (US4), all test tasks T042–T048 are parallelizable; implementation tasks T049–T051 are largely verification/extension of prior work and can proceed once T027/T040/T030 land.

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "RTL test: empty slot click calls onSlotClick with seeded day/stage/start/end in apps/web/tests/components/festival/TimelineGrid.test.tsx"
Task: "RTL test: occupied slot click calls onBlockClick, not onSlotClick, in apps/web/tests/components/festival/TimelineGrid.test.tsx"
Task: "RTL test: canManage=false suppresses onSlotClick in apps/web/tests/components/festival/TimelineGrid.test.tsx"
Task: "RTL test: onSlotClick seed opens BlockEditorDrawer pre-filled in apps/web/tests/pages/FestivalItineraryPage.test.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories).
3. Complete Phase 3: User Story 1 (click-to-create-from-slot).
4. **STOP and VALIDATE**: Run quickstart.md US1 scenario independently.
5. Deploy/demo if ready — SC-001 (create in under 30 s) is verifiable at this point alone.

### Incremental Delivery

1. Setup + Foundational → geometry helpers and gesture hook ready.
2. Add US1 → click-to-create works → validate → demo (MVP!).
3. Add US2 → click-to-edit + body-drag move (same-stage and cross-stage) works → validate → demo.
4. Add US3 → edge-drag resize works → validate → demo.
5. Add US4 → overlap refusal hardened across create/move/resize → validate → demo.
6. Polish → coverage gate, typecheck, full quickstart pass.

### Parallel Team Strategy

With multiple developers, after Foundational:

- Developer A: US1 (create-from-slot) — fully independent, ships first.
- Developer B: US2 (move) — establishes shared gesture wiring on `TimelineGrid`; land before C/D start on top of it to avoid rebasing churn.
- Developer C: US3 (resize) — starts once US2's pointer-down routing (T025) is merged.
- Developer D: US4 (conflict hardening) — starts once US2 and US3 previews exist to extend.

---

## Notes

- [P] tasks = different files or independent `it()` blocks, no dependencies.
- [Story] label maps task to specific user story for traceability.
- This feature touches no backend code (plan.md Summary) — all tasks are in `apps/web`.
- `onBlockMove`/`BlockMoveTarget` is renamed to `onBlockPlacementChange` (contracts/timeline-interaction.md §1) during US2; US1's create path does not depend on this rename and can be built/shipped first without it.
- Verify tests fail before implementing.
- Commit after each task or logical group.
- Stop at any checkpoint to validate a story independently.
- Avoid: vague tasks, same-file conflicts within a single [P] batch, cross-story dependencies that break independent testability beyond the documented gesture-wiring reuse (US2 → US3/US4).
