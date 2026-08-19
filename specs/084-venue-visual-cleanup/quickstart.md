# Quickstart: Validate Venue Visual Cleanup

## Prerequisites

- Start the web application using the project’s normal development workflow.
- Use a test account that can open an event workspace. Prefer one operator with QBO sync permission and festival-manage permission, and one without sync permission.
- Have both a standard event and a festival-enabled event available.

Refer to [event-workspace-layout.md](./contracts/event-workspace-layout.md) for class and test-id contracts and [data-model.md](./data-model.md) for layout states.

## Validation Scenarios

### 1. Festival section matches event-workspace inset

1. Open a standard event that shows the festival convert prompt.
2. Compare the festival card’s left and right edges with the ledger card below it.
3. Repeat on a festival-enabled event (active festival card with stages/links).
4. Narrow the viewport through the existing mobile breakpoint.

**Expected**

- Festival and ledger share the same outer inset; the festival card is not closer to the shell edges.
- No horizontal overflow at the narrow width.

### 2. Section-level primary actions sit on the right

1. Scan authenticated sections that have a primary action (event ledger hero, festival convert, venues header, itinerary **Add block**, QBO Connect, Finalize Settlement).
2. At desktop width, confirm each primary sits on the right of its header or action row.
3. Narrow the viewport until headers wrap.

**Expected**

- Primaries remain associated with their section and stay visually on the trailing edge.
- Secondary actions stay grouped with the primary.
- Auth, empty-state retry, and modal buttons are unchanged.

### 3. Sync Now belongs to the event

1. As an operator with sync permission, open event details.
2. Locate **Sync Now**.
3. Trigger sync and watch the pending label.

**Expected**

- Sync Now sits in the ledger/event hero action area, not in a lone row between the festival card and the ledger body.
- Pending state shows **Syncing…** without an empty gap or layout jump.
- Dashboard/workspace `focus=sync` still scrolls to that action area.

### 4. No empty action row without permission

1. Open the same event as an operator who cannot trigger QBO sync.

**Expected**

- Sync Now is absent.
- The ledger header does not leave a blank right-side hole or leftover toolbar.

## Automated Checks

From `apps/web`:

```powershell
npm test -- tests/pages/EventWorkspacePage.test.tsx tests/pages/EventLedgerPage.test.tsx tests/qbo/SyncNowButton.test.tsx tests/lib/workspaceFocusScroll.test.ts
npm run build
npm run test:coverage
```

Add the new FestivalModeCard, LedgerGrid placement, and section-header CSS contract tests to the focused `npm test` invocation once they exist. Coverage for changed frontend files must meet the ≥80% line/branch gate (Constitution III).
