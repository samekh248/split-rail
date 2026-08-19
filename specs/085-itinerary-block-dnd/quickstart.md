# Quickstart: Itinerary Block Interactive Scheduling

Validates the pointer-driven create/move/resize/conflict behavior end-to-end in the running app, plus the automated checks that back each user story.

## Prerequisites

- Repo checked out on branch `085-itinerary-block-dnd`.
- API and web apps runnable locally (see repo root scripts / `apps/api`, `apps/web`).
- A festival event with **at least two stages** and **at least one existing active block**, seeded via the existing festival fixtures/seed data or created ad hoc through the app (Festival Itinerary → Add block).
- A user session with schedule-edit permission (`canManage`) for manual verification of the guarded paths, and a second read-only/public session for the negative checks.

## Automated validation (run first)

```bash
cd apps/web
npm run test -- TimelineGrid timelineUtils useTimelineInteraction FestivalItineraryPage
npm run typecheck
```

Expected: all suites pass; ≥80% line/branch coverage on the changed files (Constitution III / SC-006). No backend suite run is required — no backend files change — but `apps/api.tests/Integration/ProgrammingBlockTests.cs` (unchanged) continues to pass as the regression guard for server-side overlap/immutability.

## Manual scenarios (map to spec User Stories)

### US1 — Create from an empty slot (P1)

1. Open the festival itinerary, timeline view, a day with an empty slot on any stage (e.g. Main Stage 14:00).
2. Click the empty 14:00 cell.
3. **Expect**: the block form opens with day = current itinerary day, stage = Main Stage, start = 14:00, end = 14:30.
4. Fill required fields, save.
5. **Expect**: the new block appears at Main Stage 14:00–14:30; form closes. (SC-001: under 30 s.)
6. Repeat as a read-only/public session.
7. **Expect**: no form opens; timeline unchanged (FR-010).

### US2 — Move by dragging, including cross-stage (P1)

1. Click an existing block's body without moving the pointer.
2. **Expect**: its edit form opens (not a drag).
3. Press and drag the same block's body to a later empty time on the same stage; release.
4. **Expect**: block relocates to the new time, duration unchanged, previous slot freed, visible immediately after save (SC-002: under 5 s).
5. Drag the block onto an empty time on a different stage; release.
6. **Expect**: block reassigned to that stage at the drop time, duration unchanged.
7. While dragging, hover a valid empty target.
8. **Expect**: a clear valid-drop preview at the prospective start/end.
9. Repeat step 3 as a read-only session.
10. **Expect**: the block does not move.

### US3 — Resize by dragging an edge (P2)

1. Find (or seed) a 60-minute block with empty time on both sides.
2. Drag its bottom edge one slot later; release.
3. **Expect**: end time updates, start unchanged, block visibly grows (SC-003: under 5 s).
4. Drag its top edge one slot earlier; release.
5. **Expect**: start time updates, end unchanged, block grows upward.
6. During either drag, observe the live preview before release.
7. Attempt to resize a block to under 30 minutes duration.
8. **Expect**: change is not applied; block stays at its previous times.
9. Attempt to resize past the visible day bounds (before 08:00 or after 24:00).
10. **Expect**: change is not applied.

### US4 — Same-stage overlap refusal (P1)

1. With two active blocks on one stage with a gap between them, drag the first onto the second's time.
2. **Expect**: refused; conflicting block identified (via `ConflictDialog`); original times remain.
3. Resize the first block into the second's time.
4. **Expect**: same refusal behavior.
5. Click an empty slot that would overlap an existing block, attempt to save a create there.
6. **Expect**: same refusal behavior identifying the conflicting block.
7. During any of the above drags, hover the conflicting region before releasing.
8. **Expect**: an invalid/conflict preview is shown; the drop is not treated as valid.
9. Drop the first block onto a **different** stage at the same clock time as an existing block there.
10. **Expect**: allowed — concurrent programming on different stages is not a conflict.

### Edge cases to spot-check

- Drop a block back onto its own current stage/time → no save, no conflict dialog (no-op).
- Start a move, then press Escape (or drop outside any valid target) → block snaps back to its original placement.
- Start dragging a block, and while pending, immediately try to drag it again before the first save resolves → second drag is refused until the first completes.
- On a frozen/settled event, open the itinerary → no create/move/resize affordances are offered.
- Hide a stage via the itinerary filters → that stage's columns are not a valid drop target for a block being moved.
- Narrow/mobile viewport → click-to-create and click-to-edit remain available; a short touch press opens, not moves.

## Traceability

| Scenario above | Spec requirement(s) |
|---|---|
| US1 | FR-001, FR-002, FR-010 |
| US2 | FR-003, FR-004, FR-010, FR-012 |
| US3 | FR-005, FR-006, FR-012 |
| US4 | FR-008, FR-009, FR-012 |
| Edge cases | FR-006, FR-007 (unchanged existing cancel flow), FR-010, FR-011 |
