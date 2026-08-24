# Quickstart Validation: Event Workflow Visual Cleanup and Show Detail Capture

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Contract**: [contracts/event-detail.md](./contracts/event-detail.md)

Runnable checks that prove the feature works end to end. Field semantics live in [data-model.md](./data-model.md); this document is the run guide.

## Prerequisites

- A venue with at least one event whose booking placement is **confirmed**
- A second event on a **hold** placement (`Hold1` or `Hold2`)
- A third event that is **settled or reconciled**
- A signed-in user with event-edit permission, and a second without it
- Local Postgres available for the API and for Testcontainers-backed tests

## Automated checks

Run from the repository root unless noted.

```bash
dotnet test apps/api.tests/split-rail-api.tests.csproj --filter FullyQualifiedName~Events
```

```bash
npm run test --prefix apps/web
```

```bash
npm run build --prefix apps/web
```

Coverage gates, matching CI:

```bash
npm run test:coverage --prefix apps/web
```

```bash
dotnet test apps/api.tests/split-rail-api.tests.csproj --collect:"XPlat Code Coverage"
```

### Contract drift gate (blocking — see research.md D7)

After any DTO change, regenerate and confirm no drift. The Swashbuckle CLI cannot bootstrap this app, so the API must actually be running:

```bash
npm run gen:api --prefix apps/web
```

```bash
git diff --exit-code apps/web/src/types/generated-api.ts
```

A non-empty diff means the committed types are stale and CI's `contract-type-drift` job will fail.

## Manual scenarios

### S1 — Creation surfaces match the app (US1)

1. Open the booking calendar and start a new event.
2. Confirm every selection control is the shared dropdown, not a native one.
3. Confirm the dismiss action sits left and the primary action right, with a leading icon.
4. Repeat in the event form panel; confirm the standard-vs-festival choice is unmistakable.

**Expected**: Both surfaces read as the same product as the rest of the app; no unstyled native selection control remains.

### S2 — Doors and show start on a confirmed event (US2)

1. Open the confirmed event's detail view and enter edit mode.
2. Set a doors time and a show start time after it. Save.
3. Reopen the event.

**Expected**: Both times persist and appear together under a labelled schedule grouping.

### S3 — Show start is confirmed-only (US2)

1. Open the **hold** event's detail view in edit mode.

**Expected**: Doors time is offered; show start time is **not rendered at all**.

2. Call the update endpoint directly with a show start time for that hold event.

**Expected**: Rejected server-side — the rule is not interface-only ([research.md](./research.md) D3).

### S4 — Ordering is enforced (US2)

1. On the confirmed event, set doors to `19:00` and show start to `18:00`. Save.

**Expected**: Refused, naming the conflict; previously saved times unchanged.

### S5 — Start time survives a placement change (US2)

1. On the confirmed event with a saved show start time, move the placement to a hold.
2. Confirm the show start time is no longer displayed.
3. Move the placement back to confirmed.

**Expected**: The original show start time reappears — it was retained, not cleared.

### S6 — Supporting lineup (US3)

1. On any event, enter opening and supporting bands. Save and reopen.

**Expected**: The lineup persists and is readable **without** entering edit mode. The event's headline artist relationship is unchanged.

### S7 — Notes (US4)

1. Enter multi-line notes including blank lines. Save and reopen.
2. Enter text containing markup such as `<b>load in early</b>`.

**Expected**: Line breaks preserved; markup shown as literal text, never rendered. An event with no notes shows no empty notes block.

### S8 — Workspace actions (US5)

1. Open a standard event workspace as a user permitted to convert.

**Expected**: *Convert to festival* is **not** a top-level button; it is reachable from the overflow menu and runs the same conversion flow.

2. Press Escape with the menu open.

**Expected**: Closes with no action taken.

3. View as a user **not** permitted to convert.

**Expected**: No conversion entry, and no empty overflow menu left behind.

4. View the artist section.

**Expected**: *Add artist* sits at the **foot** of the section, after existing artists, with its permission gate unchanged.

### S9 — Detail view is legible (US6)

1. Open a fully populated confirmed event.

**Expected**: Content grouped under clear headings; actions grouped and separated from content.

2. Open an event missing most optional detail.

**Expected**: No gaps where absent information would have been.

### S10 — Immutability and permissions

1. Open the settled/reconciled event as an editor.

**Expected**: The new fields are readable but not editable.

2. Open any event as a user without event-edit permission.

**Expected**: All four fields readable, none editable.

## Done when

- Every automated command above passes, including both coverage gates
- `git diff --exit-code` on the generated types is clean
- S1–S10 behave as described
