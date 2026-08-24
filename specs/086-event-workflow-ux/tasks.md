---

description: "Task list for Event Workflow Visual Cleanup and Show Detail Capture"
---

# Tasks: Event Workflow Visual Cleanup and Show Detail Capture

**Input**: Design documents from `/specs/086-event-workflow-ux/`

**Prerequisites**: [plan.md](./plan.md) (required), [spec.md](./spec.md) (required for user stories), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/event-detail.md](./contracts/event-detail.md), [quickstart.md](./quickstart.md)

**Tests**: REQUIRED per Constitution III. Every user story phase includes xUnit (backend) and/or Vitest + RTL (frontend) test tasks, written first, matching the convention established on the immediately preceding feature (085).

**Organization**: Tasks are grouped by user story (US1–US6 from spec.md) to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US6)
- Destructive UI: N/A — this feature adds no new delete/remove flow (plan.md Constitution Check, §XI); the existing cancel-booking action's confirmation is untouched.
- Operator/deploy scripts: N/A — no `deploy/` changes.

## Path Conventions

Web application: `apps/api/` (backend, .NET) and `apps/web/` (frontend, React), per plan.md Project Structure. All test file paths below were verified to exist in the repository before being assigned to a task.

<!-- ============================================================================ -->

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm the working environment before touching any surface.

- [X] T001 Confirm the dev environment runs: `apps/api` (`dotnet build`) and `apps/web` (`npm run dev`) against a venue with at least one confirmed event, one hold event, and one settled/reconciled event, per [quickstart.md](./quickstart.md) Prerequisites. No code change — verification only.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Cross-cutting infrastructure that every user story would otherwise duplicate.

**None required.** Every shared building block this feature needs already exists and is unmodified: `SelectField`, `FormField`, `ModalHeader`, and `KebabMenu` on the frontend; `EventService`, `ParseTime`, `NormalizeOptionalText`, and `FrozenEventMutationAuditor.RejectIfFrozen` on the backend (per [research.md](./research.md) D1, D6). Each story below either touches only its own files or explicitly depends on an earlier story's shared-file edits (documented in Dependencies & Execution Order).

**Checkpoint**: Proceed directly to Phase 3.

---

## Phase 3: User Story 1 - Create an event through a form that matches the rest of the app (Priority: P1) 🎯 MVP

**Goal**: `CreateBookingEventModal` and `EventFormPanel` present a left-aligned dismiss action, a right-aligned primary action with a leading icon, and an unambiguous event-type selection, matching contracts/event-detail.md §2.

**Independent Test**: Open both creation surfaces. Confirm the action-row layout and, on `EventFormPanel`, that the selected creation type is visually unmistakable at a glance, not conveyed by a 1px border-color change alone.

**Note on scope**: `CreateBookingEventModal` already uses `SelectField` for its venue dropdown (FR-001's dropdown requirement is already met there); its only gap is the action row (FR-002). `EventFormPanel` has no native `<select>` to replace either — its gaps are the action row and the type-selection cue (US1 AC4).

### Tests for User Story 1 (REQUIRED) ⚠️

> Write these tests FIRST, ensure they FAIL before implementation.

- [X] T002 [P] [US1] RTL test in `apps/web/tests/booking/CreateBookingEventModal.test.tsx`: the action row renders a dismiss/Cancel action on the left and the primary save action on the right, and the save action carries a Font Awesome icon.
- [X] T003 [P] [US1] RTL test in `apps/web/tests/components/event/EventFormPanel.test.tsx`: the action row renders a Cancel action (calling `onCancel`) on the left and the primary submit action on the right with a leading icon, in both create and edit modes.
- [X] T004 [P] [US1] RTL test in `apps/web/tests/components/event/EventFormPanel.test.tsx`: selecting the festival type applies a class distinct from the hover-only state (e.g. asserts a `--active`/ring class on `.event-form-panel__type-option`), not merely a differing `aria-checked`/`checked` attribute.

### Implementation for User Story 1

- [X] T005 [US1] In `apps/web/src/components/booking/CreateBookingEventModal.tsx`, add a `team-modal__cancel` dismiss button (calling `onClose`) to the left of the existing `team-modal__save` button inside `.team-modal__actions.booking-create-modal__actions`, and add a leading Font Awesome icon (e.g. `faPlus`, matching the app's create-icon convention) to the save button.
- [X] T006 [US1] In `apps/web/src/components/event/EventFormPanel.tsx`, add a Cancel button (calling `onCancel`) to the left of the existing submit button inside `.event-form-panel__actions`, and add a leading icon to the submit button (`faPlus` for create, `faFloppyDisk` for edit, mirroring the convention already used in `BlockEditorDrawer.tsx`).
- [X] T007 [P] [US1] In `apps/web/src/index.css`, strengthen `.event-form-panel__type-option:has(input:checked)` with a `box-shadow` ring in addition to its existing `border-color`/`background` change — the same technique already applied to `.block-editor__category-btn--active` and `.block-editor__booking-btn--active` for the identical "border-color alone is too subtle" problem in this codebase.
- [X] T008 [US1] Verify no unstyled native `<select>` remains in either component (grep for `<select` in both files); none is expected to exist, so this is a confirmation step, not new work.

**Checkpoint**: User Story 1 fully functional and testable independently — both creation surfaces read as the same product as the rest of the app.

---

## Phase 4: User Story 2 - Record doors and show start times for a confirmed show (Priority: P1)

**Goal**: Doors time (already modelled) and show start time (new) are editable on the event detail, with show start time offered only while the booking placement is confirmed, validated against doors time, and retained across placement changes.

**Independent Test**: On a confirmed event, set both times and save; reopen and confirm both persist together. On a hold event, confirm show start time is not offered. Directly call the update endpoint with a show start time on a hold event and confirm it is rejected server-side.

**Note on scope**: `DoorsTime` already exists end-to-end (model, DTOs, service) per [research.md](./research.md) D1 — this story surfaces it in `BookingEventDrawer`'s edit form for the first time (it is currently only set at creation) and adds the entirely new `ShowStartTime`.

### Tests for User Story 2 (REQUIRED) ⚠️

- [X] T009 [P] [US2] xUnit test in `apps/api.tests/Integration/EventsControllerTests.cs`: updating a confirmed event with a show start time after doors time succeeds and the value round-trips on the next read.
- [X] T010 [P] [US2] xUnit test in `apps/api.tests/Integration/EventsControllerTests.cs`: updating a `Hold1`, `Hold2`, or `Cancelled` event with a show start time is rejected.
- [X] T011 [P] [US2] xUnit test in `apps/api.tests/Integration/EventsControllerTests.cs`: a show start time earlier than the event's doors time is rejected, naming the conflict, and the event's previously saved times are unchanged after the failed call.
- [X] T012 [P] [US2] xUnit test in `apps/api.tests/Integration/EventsControllerTests.cs`: a show start time saved while confirmed is still present (via direct query or a status-only update) after the placement moves to a hold, and is returned again once the placement returns to confirmed.
- [X] T013 [P] [US2] xUnit test in `apps/api.tests/Integration/EventsControllerTests.cs`: updating a settled or reconciled event's show start time is rejected by the existing `RejectIfFrozen` guard (parallels existing coverage in `FrozenEventMutationAuditTests.cs`/`FrozenEventPersistenceGuardTests.cs`).
- [X] T014 [P] [US2] RTL test in `apps/web/tests/booking/BookingEventDrawer.test.tsx`: edit mode on a confirmed placement renders both a doors-time and a show-start-time field, each editable.
- [X] T015 [P] [US2] RTL test in `apps/web/tests/booking/BookingEventDrawer.test.tsx`: edit mode on a hold placement renders the doors-time field but does **not** render a show-start-time field at all.
- [X] T016 [P] [US2] RTL test in `apps/web/tests/booking/BookingEventDrawer.test.tsx`: detail mode on a confirmed event with both times saved shows them together under one labelled schedule grouping; an event with neither shows the grouping's absence in words, not blank space.
- [X] T017 [P] [US2] RTL test in `apps/web/tests/booking/BookingEventDrawer.test.tsx`: submitting a show start time earlier than doors time in edit mode surfaces the server's conflict message via the existing error paragraph, and the drawer's displayed times remain the pre-submit values.
- [X] T069 [P] [US2] RTL test in `apps/web/tests/booking/BookingEventDrawer.test.tsx`: opening a hold-placement event whose data already carries a retained show start time, editing an unrelated field (e.g. title) only, and saving asserts the `updateEvent` mutation payload still includes the original `showStartTime` value — not `null` or omitted — even though the field itself is not rendered. Proves FR-006's retention survives a save made while the field is hidden, which the backend-only T012 does not exercise. *(Added during /speckit-analyze remediation — finding G3.)*

### Implementation for User Story 2

- [X] T018 [US2] Add `public TimeOnly? ShowStartTime { get; set; }` to `apps/api/Models/Event.cs`, alongside the existing `DoorsTime`/`LoadInTime`/`CurfewTime`.
- [X] T019 [US2] Add an EF Core migration (`dotnet ef migrations add AddEventShowStartTime --project apps/api/split-rail-api.csproj`) and, in `apps/api/Data/ApplicationDbContext.cs`, add `entity.Property(e => e.ShowStartTime).HasColumnName("show_start_time")` beside the existing `DoorsTime` column config. Depends on T018.
- [X] T020 [US2] Append `string? ShowStartTime = null` to `CreateEventRequest`, `UpdateEventRequest`, and `EventResponse` in `apps/api/DTOs/Ledger/LedgerDtos.cs`, after the existing `SupportLineup` parameter in each (preserves positional-record compatibility per [contracts/event-detail.md](./contracts/event-detail.md) §1).
- [X] T021 [US2] In `apps/api/Services/EventService.cs`, in `CreateEventAsync` and `UpdateEventAsync`: parse `request.ShowStartTime` via the existing `ParseTime` helper; if non-null, throw `ValidationException` when the resolved placement status is not `Confirmed`, and throw `ValidationException` naming the conflict when the parsed time is earlier than the resolved `DoorsTime`. Assign `evt.ShowStartTime` only after validation passes. Depends on T018, T020.
- [X] T022 [US2] In `EventService.ToEventResponse`, project `evt.ShowStartTime?.ToString("HH:mm")` into the response, positioned after `evt.SupportLineup` to match T020's DTO ordering. Depends on T020.
- [X] T023 [US2] Regenerate `apps/web/src/types/generated-api.ts`: build the API, apply migrations, serve Swagger, run `npm run gen:api --prefix apps/web`, and commit the result. Verify `git diff --exit-code apps/web/src/types/generated-api.ts` is clean before proceeding, matching CI's `contract-type-drift` gate ([research.md](./research.md) D7). Depends on T018–T022.
- [X] T024 [US2] In `apps/web/src/components/booking/BookingEventDrawer.tsx`, add `doorsTime` and `showStartTime` controlled state (initialized from `placement.doorsTime`/`placement.showStartTime` in the existing `open`-driven reset effect), replace the bare edit-mode `<label><input>` pairs with `FormField` (`type="time"`) for doors time (always rendered) and show start time (rendered **only** when `placement.bookingPlacementStatus === 'CONFIRMED'`), and include both in the `updateEvent.mutateAsync` payload in `handleSave` **using the current state value regardless of whether the field is currently rendered** — the field's visibility (gated on placement status) MUST NOT gate whether its value is sent, or a save made while the field is hidden will silently clear a retained show start time and violate FR-006. Depends on T023. Verified by T069.
- [X] T025 [US2] In `BookingEventDrawer.tsx` detail mode, add a labelled "Schedule" grouping rendering doors time and show start time when either is present, and communicating their absence in words when neither is set. Depends on T024.
- [X] T026 [US2] Confirm `handleSave`'s existing `catch` block surfaces the new start-before-doors validation message from the API (it already maps arbitrary error text into the error paragraph); add a test-covered assertion only if the current mapping truncates or replaces the server's message. Depends on T024.

**Checkpoint**: User Stories 1 AND 2 both work independently — modernised creation surfaces, and doors/show-start capture with server-enforced confirmed-only gating.

---

## Phase 5: User Story 3 - Capture the opening and supporting bands (Priority: P2)

**Goal**: The already-modelled `SupportLineup` field becomes editable and readable on the event detail — the first interface it has ever had.

**Independent Test**: Enter an opening/supporting lineup on any event, save, reopen, and confirm it is readable without entering edit mode.

**Note on scope**: Backend needs **no change** — `SupportLineup` is already fully wired through `Event.cs`, all three DTOs, and `EventService` ([research.md](./research.md) D1). This story is frontend-only.

### Tests for User Story 3 (REQUIRED) ⚠️

- [X] T027 [P] [US3] RTL test in `apps/web/tests/booking/BookingEventDrawer.test.tsx`: edit mode renders a supporting-lineup textarea pre-filled from `placement.supportLineup`.
- [X] T028 [P] [US3] RTL test in `apps/web/tests/booking/BookingEventDrawer.test.tsx`: detail mode renders a saved lineup as readable text without entering edit mode.
- [X] T029 [P] [US3] RTL test in `apps/web/tests/booking/BookingEventDrawer.test.tsx`: an event with no lineup renders no empty lineup control or section in either mode.
- [X] T030 [P] [US3] RTL test in `apps/web/tests/booking/BookingEventDrawer.test.tsx`: saving a lineup submits only lineup-related payload changes — the mutation call is asserted to not include any artist-relationship fields, confirming the existing headline-artist relationship is untouched (FR-007).
- [X] T070 [P] [US3] RTL test in `apps/web/tests/booking/BookingEventDrawer.test.tsx`: a supporting-lineup value containing markup (e.g. `<b>tag</b>`) renders as literal text content in detail mode, never as a rendered element — mirroring T037's notes coverage, closing the asymmetry in FR-010 between the two fields it covers. *(Added during /speckit-analyze remediation — finding G1.)*

### Implementation for User Story 3

- [X] T031 [US3] In `BookingEventDrawer.tsx` edit mode, add `supportLineup` controlled state (initialized from `placement.supportLineup`) and a `<textarea>` field, included in the `updateEvent.mutateAsync` payload.
- [X] T032 [US3] In `BookingEventDrawer.tsx` detail mode, add a labelled "Lineup" grouping rendering `placement.supportLineup` as literal text when non-empty; omit the grouping entirely when empty.

**Checkpoint**: User Stories 1–3 all independently functional.

---

## Phase 6: User Story 4 - Record free-form notes on an event (Priority: P2)

**Goal**: A new, bounded, multi-line notes field, editable and readable, with line breaks preserved and content always rendered as literal text.

**Independent Test**: Add multi-line notes, save, reopen, and confirm formatting survives; confirm markup entered into notes is never rendered as markup.

**Sequencing note**: This story's backend tasks touch the same files as User Story 2's (`Event.cs`, `LedgerDtos.cs`, `EventService.cs`, the migration set, and the contract regeneration cycle). It is sequenced after US2 to avoid two stories editing the same files concurrently — the same pattern used for shared-file dependencies on the immediately preceding feature (085). This is an engineering ordering, not a business dependency: Notes has no functional relationship to show start time.

### Tests for User Story 4 (REQUIRED) ⚠️

- [X] T033 [P] [US4] xUnit test in `apps/api.tests/Integration/EventsControllerTests.cs`: notes containing embedded line breaks are saved and returned with the line breaks intact.
- [X] T034 [P] [US4] xUnit test in `apps/api.tests/Integration/EventsControllerTests.cs`: notes beyond the configured maximum length are rejected with a message stating the limit.
- [X] T035 [P] [US4] xUnit test in `apps/api.tests/Integration/EventsControllerTests.cs`: updating a settled or reconciled event's notes is rejected by the existing `RejectIfFrozen` guard.
- [X] T036 [P] [US4] RTL test in `apps/web/tests/booking/BookingEventDrawer.test.tsx`: edit mode renders a multi-line notes textarea pre-filled from `placement.notes`.
- [X] T037 [P] [US4] RTL test in `apps/web/tests/booking/BookingEventDrawer.test.tsx`: detail mode preserves line breaks on redisplay and renders the notes text literally — a value containing `<b>tag</b>` is asserted to appear as text content, never as a rendered element.
- [X] T038 [P] [US4] RTL test in `apps/web/tests/booking/BookingEventDrawer.test.tsx`: an event with no notes renders no empty notes block.
- [X] T039 [P] [US4] RTL test in `apps/web/tests/booking/BookingEventDrawer.test.tsx`: entering notes beyond the accepted length shows the limit message before attempting to save (client-side check mirroring the server bound from T034).

### Implementation for User Story 4

- [X] T040 [US4] Add `public string? Notes { get; set; }` to `apps/api/Models/Event.cs`. Depends on T018 (same file; sequenced after US2's edit).
- [X] T041 [US4] Add an EF Core migration (`dotnet ef migrations add AddEventNotes --project apps/api/split-rail-api.csproj`) and, in `apps/api/Data/ApplicationDbContext.cs`, add `entity.Property(e => e.Notes).HasColumnName("notes").HasMaxLength(2000)`, mirroring the existing `SupportLineup` column config exactly. Depends on T040.
- [X] T042 [US4] Append `string? Notes = null` to `CreateEventRequest`, `UpdateEventRequest`, and `EventResponse` in `apps/api/DTOs/Ledger/LedgerDtos.cs`, after the `ShowStartTime` parameter added in T020. Depends on T020.
- [X] T043 [US4] In `EventService.CreateEventAsync` and `UpdateEventAsync`, normalise `request.Notes` via the existing `NormalizeOptionalText` helper and reject values whose trimmed length exceeds 2000 characters with a `ValidationException` stating the limit. Depends on T040, T042.
- [X] T044 [US4] In `EventService.ToEventResponse`, project `evt.Notes` into the response, positioned after the `ShowStartTime` projection added in T022. Depends on T042.
- [X] T045 [US4] Regenerate `apps/web/src/types/generated-api.ts` again (second contract cycle, same procedure as T023) and verify `git diff --exit-code` is clean. Depends on T040–T044.
- [X] T046 [US4] In `BookingEventDrawer.tsx` edit mode, add `notes` controlled state (initialized from `placement.notes`) and a multi-line `<textarea>`, with a client-side length check (2000 chars, matching T043) shown before submit; include `notes` in the `updateEvent.mutateAsync` payload. Depends on T045.
- [X] T047 [US4] In `BookingEventDrawer.tsx` detail mode, add a labelled "Notes" grouping that preserves line breaks (e.g. `white-space: pre-wrap`) and renders content as literal text only; omit the grouping entirely when empty. Depends on T046.

**Checkpoint**: User Stories 1–4 all independently functional. All four fields from the spec (doors, show start, lineup, notes) are captured and displayed.

---

## Phase 7: User Story 5 - Reach secondary workspace actions without them crowding the page (Priority: P2)

**Goal**: *Convert to festival* moves from a top-level button into the existing shared `KebabMenu`; *Add artist* moves to the foot of the artist section.

**Independent Test**: Open a standard event workspace. Confirm *Convert to festival* is reachable only via the overflow menu and that the artist section's add action is the last thing in the section.

**Note on scope**: Both target components already exist and are otherwise unmodified by this story; `KebabMenu` itself needs no changes ([research.md](./research.md) D6). Independent of every other story in this feature.

### Tests for User Story 5 (REQUIRED) ⚠️

- [X] T048 [P] [US5] RTL test in `apps/web/tests/components/festival/FestivalModeCard.test.tsx`: *Convert to festival* is not present as a top-level button (`festival-convert-button` testid is not directly queryable without opening a menu first); it is reachable as a `KebabMenu` item.
- [X] T049 [P] [US5] RTL test in `apps/web/tests/components/festival/FestivalModeCard.test.tsx`: opening the kebab menu and selecting *Convert to festival* opens `FestivalSetupModal` exactly as before this change.
- [X] T050 [P] [US5] RTL test in `apps/web/tests/components/festival/FestivalModeCard.test.tsx`: the overflow menu is omitted entirely (not rendered as an empty menu) when the current user cannot convert the event.
- [X] T071 [P] [US5] RTL test in `apps/web/tests/components/festival/FestivalModeCard.test.tsx`: with the overflow menu open, pressing Escape (or a pointer-down outside the menu) closes it without invoking any item's `onSelect` — covering spec.md US5 acceptance scenario 6 for this specific `KebabMenu` instance, rather than relying solely on the shared component's own (unchanged, but untested-here) behaviour. *(Added during /speckit-analyze remediation — finding G2.)*
- [X] T051 [P] [US5] RTL test in `apps/web/tests/artists/ArtistDealPanel.test.tsx`: `add-artist-btn` renders after the existing artist list (section foot), not inside `.artist-deal-panel__header`.
- [X] T052 [P] [US5] RTL test in `apps/web/tests/artists/ArtistDealPanel.test.tsx`: `add-artist-btn` remains absent for a user without artist-manage permission, preserving the existing gate.

### Implementation for User Story 5

- [X] T053 [US5] In `apps/web/src/components/festival/FestivalModeCard.tsx`, replace the top-level `festival-convert-button` with a `KebabMenu` (`ariaLabel="More event actions"`, one item: `{ label: 'Convert to festival', icon: faLayerGroup, testId: 'festival-convert-button', onSelect: () => setSetupOpen(true) }`), rendering the menu only when the user is permitted to convert.
- [X] T054 [US5] Update the pre-existing assertion in `apps/web/tests/components/festival/FestivalModeCard.test.tsx` (around the current `festival-convert-button` query) to open the kebab menu first, since the button now lives inside it. Depends on T053.
- [X] T055 [US5] In `apps/web/src/components/artists/ArtistDealPanel.tsx`, move the *Add artist* button out of `.artist-deal-panel__header` `.section-header__actions` and render it after the `<ul className="artist-deal-panel__list">`, preserving the existing `editable && formMode === 'add'` gate and disabled logic verbatim.

**Checkpoint**: User Stories 1–5 all independently functional.

---

## Phase 8: User Story 6 - Read an event's details without visual clutter (Priority: P3)

**Goal**: The groupings introduced in US2–US4 (Schedule, Lineup, Notes) share one consistent structure, and the drawer's actions are visually separated from that content.

**Independent Test**: Open a fully populated confirmed event; confirm related fields are grouped under clear headings and actions are separated from content. Open an event missing most optional detail; confirm no gaps are left where absent information would be.

**Sequencing note**: This story is a consolidation pass over the groupings US2, US3, and US4 already added to `BookingEventDrawer.tsx`'s detail mode — it is sequenced last among the detail-view stories so it refines real structure rather than a placeholder, per spec.md's own "Why this priority" (depends on those stories to be fully meaningful).

### Tests for User Story 6 (REQUIRED) ⚠️

- [X] T056 [P] [US6] RTL test in `apps/web/tests/booking/BookingEventDrawer.test.tsx`: detail mode's Schedule, Lineup, and Notes groupings each render under a `<h3>`-level heading (or equivalent), sharing one consistent container class.
- [X] T057 [P] [US6] RTL test in `apps/web/tests/booking/BookingEventDrawer.test.tsx`: the actions row (`.booking-event-drawer__actions`) is a structurally distinct sibling of the content groupings, not interleaved with them.
- [X] T058 [P] [US6] RTL test in `apps/web/tests/booking/BookingEventDrawer.test.tsx`: an event with no doors/show-start, no lineup, and no notes renders none of the three groupings — no empty containers, no layout gaps.

### Implementation for User Story 6

- [X] T059 [US6] In `BookingEventDrawer.tsx`, extract the Schedule/Lineup/Notes groupings added in T025/T032/T047 into one shared rendering pattern (a small local component or a consistent `className` + heading structure) so they are visually and structurally uniform.
- [X] T060 [US6] In `apps/web/src/index.css`, add the shared grouping-heading and grouping-container styles, and confirm `.booking-event-drawer__actions` remains visually separated (spacing/border) from the content above it.
- [X] T061 [US6] Confirm via T058 that all three groupings correctly omit themselves in combination, not just individually.

**Checkpoint**: All six user stories independently functional. The full event workflow — creation, schedule capture, lineup, notes, workspace actions, and detail legibility — is complete.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Coverage gates, contract-drift verification, and full quickstart validation spanning all stories.

- [X] T062 [P] Run the full changed-file Vitest suite: `CreateBookingEventModal.test.tsx`, `EventFormPanel.test.tsx`, `BookingEventDrawer.test.tsx`, `FestivalModeCard.test.tsx`, `ArtistDealPanel.test.tsx` in `apps/web`, and confirm all pass.
- [X] T063 [P] Run `dotnet test apps/api.tests/split-rail-api.tests.csproj --filter FullyQualifiedName~Events` and confirm `EventsControllerTests`, `FrozenEventMutationAuditTests`, `FrozenEventPersistenceGuardTests`, and `StandardEventRegressionTests` all still pass.
- [X] T064 Run `npx tsc --noEmit` (or the project's typecheck script) in `apps/web` and confirm no type errors from the regenerated contract types or the component changes.
- [X] T065 Run `npm run build --prefix apps/web` and confirm the production build succeeds.
- [X] T066 Verify ≥80.0% line/branch coverage on changed backend and frontend code independently, per [quickstart.md](./quickstart.md) coverage commands (Constitution III / spec SC-008). Missing or unparseable coverage reports FAIL this task.
- [X] T067 Confirm `git diff --exit-code apps/web/src/types/generated-api.ts` is clean as the final drift check, matching CI's `contract-type-drift` gate (this is the exact gate that broke CI on the immediately preceding feature).
- [ ] T068 Run the manual scenarios S1–S10 in [quickstart.md](./quickstart.md) against a local dev build and confirm each behaves as described.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately.
- **Foundational (Phase 2)**: Empty — no cross-cutting prerequisite exists for this feature.
- **User Stories (Phase 3–8)**: All can start once Setup is confirmed, subject to the shared-file sequencing below.
- **Polish (Phase 9)**: Depends on all desired user stories being complete.

### User Story Dependencies

- **US1 (P1)**: No dependency on any other story. Fully independent — ships first as the MVP.
- **US2 (P1)**: No dependency on any other story's *business* logic. Establishes the backend field-addition pattern (migration, DTO, service, contract regen) that US4 reuses.
- **US3 (P2)**: No backend work at all; depends only on `BookingEventDrawer.tsx` existing (it does). Independent of US2/US4's backend cycle, though all three edit the same frontend file (`BookingEventDrawer.tsx`) and should be merged in sequence to avoid conflicts.
- **US4 (P2)**: Shares backend files with US2 (`Event.cs`, `LedgerDtos.cs`, `EventService.cs`, the migration set, the contract-regeneration cycle). Sequenced **after** US2 for engineering reasons only — there is no functional dependency between show start time and notes.
- **US5 (P2)**: No dependency on any other story. Touches `FestivalModeCard.tsx` and `ArtistDealPanel.tsx`, neither touched elsewhere in this feature.
- **US6 (P3)**: Consolidates the `BookingEventDrawer.tsx` groupings added by US2, US3, and US4. Sequenced last among the detail-view work so it refines real structure.

### Within Each User Story

- Tests written and failing before implementation.
- Backend model → migration → DTOs → service → contract regeneration, in that order (a regeneration before the DTO change would capture nothing new).
- Frontend state/fields before the detail-mode grouping that displays them.
- Story complete (checkpoint) before moving to the next priority phase.

### Parallel Opportunities

- All test tasks marked `[P]` within a phase can run in parallel — independent `it()` blocks, no shared mutable state.
- **US1 and US5** can be implemented fully in parallel by different contributors — no shared files, no shared story dependency.
- **US3** can start in parallel with **US2**'s backend tasks (T018–T023), since US3 touches only the frontend and only the fields that already exist; merge US3's `BookingEventDrawer.tsx` edits after US2's to avoid a frontend-file conflict.
- Within Phase 4 (US2), backend tests T009–T013 are parallelizable with each other; frontend tests T014–T017 and T069 are parallelizable with each other and with the backend tests (different files).
- Within Phase 6 (US4), the same pattern applies: T033–T035 (backend) and T036–T039 (frontend) are each internally parallel.

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "RTL test: CreateBookingEventModal action row has left Cancel / right icon-Save in apps/web/tests/booking/CreateBookingEventModal.test.tsx"
Task: "RTL test: EventFormPanel action row has left Cancel / right icon-Submit in apps/web/tests/components/event/EventFormPanel.test.tsx"
Task: "RTL test: EventFormPanel checked type option has a non-subtle indicator class in apps/web/tests/components/event/EventFormPanel.test.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 3: User Story 1 (modernised creation surfaces).
3. **STOP and VALIDATE**: Run quickstart.md S1 independently.
4. Deploy/demo if ready — SC-001 is verifiable at this point alone, with zero backend risk.

### Incremental Delivery

1. Setup → environment confirmed.
2. Add US1 → creation surfaces modernised → validate → demo (MVP!).
3. Add US2 → doors + show start time, server-enforced confirmed-only gating → validate → demo.
4. Add US3 → supporting lineup surfaced (backend already existed) → validate → demo.
5. Add US4 → notes, second contract-regeneration cycle → validate → demo.
6. Add US5 → workspace kebab + Add-artist relocation → validate → demo.
7. Add US6 → detail-view consolidation pass → validate → demo.
8. Polish → coverage gates, drift check, full quickstart pass.

### Parallel Team Strategy

With multiple developers, after Setup:

- Developer A: US1 (creation surfaces) — fully independent, ships first.
- Developer B: US2 (doors/show start) — establishes the backend field-addition pattern; land before Developer C starts US4 to avoid the shared-file conflict.
- Developer C: US4 (notes) — starts once US2's backend tasks (T018–T023) are merged.
- Developer D: US5 (workspace actions) — fully independent, can run alongside everyone.
- US3 can be picked up by whoever finishes first — it has no backend dependency and only a soft frontend-file sequencing concern.
- US6 is the natural wrap-up once US2–US4 have landed.

---

## Notes

- `[P]` tasks = different files or independent `it()` blocks, no dependencies.
- `[Story]` label maps task to specific user story for traceability.
- This feature touches both `apps/api` (US2, US4 only) and `apps/web` (all six stories).
- The contract-regeneration step (T023, T045) is not optional bureaucracy — it is the exact CI gate (`contract-type-drift`) that broke on the immediately preceding feature when a DTO changed without it.
- Verify tests fail before implementing.
- Commit after each task or logical group.
- Stop at any checkpoint to validate a story independently.
- Avoid: vague tasks, same-file conflicts within a single `[P]` batch, cross-story dependencies beyond the documented shared-file sequencing (US2 → US4; US2/US3/US4 → US6).
- T069, T070, and T071 were added after an `/speckit-analyze` pass found three real coverage gaps (see specs/086-event-workflow-ux — findings G1, G2, G3). Their IDs are out of local sequence within their phase because they were appended rather than triggering a renumber of the whole file; they are otherwise ordinary `[P]` test tasks for their story and carry no special handling.
