# Contract: Event Workspace Visual Cleanup (084)

CSS class and component placement contract for festival-section inset, section-level primary actions, and Sync Now. Runtime source of truth: `apps/web/src/pages/EventWorkspacePage.tsx`, `apps/web/src/pages/EventLedgerPage.tsx`, `apps/web/src/components/ledger/LedgerGrid.tsx`, `apps/web/src/components/festival/FestivalModeCard.tsx`, `apps/web/src/components/qbo/SyncNowButton.tsx`, `apps/web/src/index.css`. Focus-target source of truth: `apps/web/src/lib/workspaceFocusScroll.ts`.

No backend/API contract changes — this feature is presentation-only (see [data-model.md](../data-model.md)).

## Shared event-workspace inset

`EventWorkspacePage` MUST wrap the festival card and ledger in one layout container when `showLedger` is true:

```tsx
<div className="event-workspace" data-testid="event-workspace">
  <FestivalModeCard ... />
  <EventLedgerPage ... />
</div>
```

| Class | Contract |
|---|---|
| `.event-workspace` | `max-width: 1200px`; centered; shared horizontal padding and vertical gap |
| `.festival-mode-card` | Card surface only; MUST NOT add a competing outer max-width or extra horizontal page margin |
| `.event-ledger-page` | MUST NOT keep a second `max-width` / extra horizontal padding that insets the ledger further than the festival card |

**Rule**: At both desktop and the existing `768px` narrow breakpoint, the festival card’s outer left/right edges MUST match the ledger’s outer left/right edges.

## Section header action pattern

Authenticated section-level primaries MUST use the shared pattern (names may be BEM modifiers that compose these rules):

| Class | Alignment |
|---|---|
| `.section-header` | Horizontal flex, wrap allowed, space-between (title start, actions end) |
| `.section-header__actions` | Grouped primary + secondaries; `margin-left: auto` at desktop |
| `.section-header` at `max-width: 768px` | May stack; actions remain `justify-content: flex-end` and full-width of the section |

Existing headers that already satisfy the pattern (`ledger-grid__header`, `venues-page__header`, `festival-itinerary-page__header`) MAY keep their BEM names if they compose equivalent rules. New or currently left-aligned rows MUST opt in.

### In-scope surfaces

| Surface | Primary control | Placement |
|---|---|---|
| Ledger hero | Lock Budget, Sync Now | Right action cluster |
| Festival convert prompt | Convert to festival | Right of prompt copy |
| QBO integration card | Connect / Reconnect | Right action cluster |
| Finalize Settlement | Finalize Settlement | Right-aligned in the section action row after required inputs |
| Festival itinerary | Add block | Remain end-aligned in page header |
| Venues page | Existing header actions | Remain end-aligned |
| Accounting Sync all | Sync all | Remain end-aligned; not relocated |

### Explicit non-goals

Unauthenticated auth/onboarding submits, modal footers, empty-state retry/CTA buttons, and compact inline row actions MUST keep current placement.

## Sync Now placement

| Requirement | Contract |
|---|---|
| Location | Inside the ledger hero action cluster, not a standalone toolbar |
| Removed | `.event-ledger-page__toolbar` MUST NOT render |
| Behavior | `SyncNowButton` permission gate, `Syncing…` pending label, and mutation/invalidation stay unchanged |
| Empty space | When `useCanTriggerQboSync()` is false, `data-testid="sync-now-button"` is absent and no empty toolbar is reserved |
| Deep link | `WORKSPACE_FOCUS_TARGETS.sync` remains `'[data-testid="workspace-focus-sync"]'` |

`EventLedgerPage` (or `LedgerGrid` if the cluster is lifted there) MUST keep `data-testid="workspace-focus-sync"` on the hero/header so `?focus=sync` still scrolls to the event action area.

Suggested markup (implementation may pass `SyncNowButton` as a header child):

```tsx
<div className="ledger-grid__header section-header">
  <div>{/* title + meta */}</div>
  <div className="section-header__actions" data-testid="workspace-focus-sync">
    <SyncNowButton venueId={venueId} eventId={eventId} />
    {/* Lock Budget when visible */}
  </div>
</div>
```

If the actions wrapper would be empty, omit extra padding/min-height so VR-006 holds; the test id MAY live on `.ledger-grid__header` instead to keep the focus target.

## Test id stability

| `data-testid` | Status |
|---|---|
| `event-workspace` | New; wrapper for shared inset |
| `festival-mode-card` | Unchanged |
| `festival-convert-button` | Unchanged; remains the convert primary |
| `event-ledger-page` | Unchanged |
| `ledger-grid` | Unchanged |
| `lock-budget-btn` | Unchanged |
| `sync-now-button` | Unchanged; still omitted without permission |
| `workspace-focus-sync` | Retained; moved off the deleted toolbar onto the hero/header |
| `finalize-settlement-btn` | Unchanged |
| `qbo-connect-button` | Unchanged |

## Validation checklist (maps to [data-model.md](../data-model.md) VR-001..VR-006)

- [ ] Festival card and ledger are inside `event-workspace` and share outer alignment.
- [ ] `event-ledger-page__toolbar` is gone.
- [ ] Sync Now renders in the ledger hero action cluster when permitted.
- [ ] `workspace-focus-sync` still resolves for `scrollToWorkspaceFocus('sync')`.
- [ ] No sync permission → no `sync-now-button` and no empty action row.
- [ ] In-scope section primaries are end-aligned at desktop width.
- [ ] Narrow viewport: no horizontal overflow; actions stay associated with their section.
