# Data Model: Venue Visual Cleanup

This feature introduces **no persisted entities, API payloads, database tables, or DTO changes**. Event, festival, QBO sync, and ledger records remain as defined in `apps/web/src/types/generated-api.ts`. The model below covers **client-side layout regions and action-placement view state**.

## Existing entities (consumed, unchanged)

### Event (`EventResponse`)

| Attribute | Layout relevance |
|---|---|
| `eventId` | Workspace selection; Sync Now and festival card identity |
| `eventType` | `FESTIVAL` shows the active festival card; otherwise the convert prompt (managers only) |
| `status` | Frozen `SETTLED` / `RECONCILED` hides convert; unchanged |
| `eventDate` / `endDate` | Festival meta display only |

### QBO sync permission (existing hook)

| Signal | Layout relevance |
|---|---|
| `useCanTriggerQboSync()` | When false, Sync Now is not rendered and no empty action row is reserved |
| `useTriggerSync(...).isPending` | Label becomes `Syncing…`; control disabled; cluster width must remain stable |

## Layout regions (derived, not persisted)

### Event workspace inset

A computed page structure on `EventWorkspacePage` when the ledger is shown:

| Region | Owner | Inset rule |
|---|---|---|
| Shell content | `.app-shell__content` | Existing `--shell-content-padding-*` (unchanged) |
| Event workspace | `.event-workspace` | Shared `max-width: 1200px`, horizontal padding, vertical gap for festival + ledger |
| Festival section | `.festival-mode-card` | Card chrome only; **no extra outer inset** beyond `.event-workspace` |
| Ledger | `.event-ledger-page` | No second max-width / competing horizontal padding once inside `.event-workspace` |

**Rule**: Festival and ledger outer left/right edges MUST coincide at desktop and narrow widths (FR-001, FR-002).

### Section action cluster

Each in-scope authenticated section exposes:

| Slot | Contents | Alignment |
|---|---|---|
| Title / heading | Section name or event title | Start (left in LTR) |
| Actions | Primary control; optional grouped secondaries | End (right in LTR) at desktop; still end-aligned when stacked |

**Rule**: If the section has no primary action, do not insert an empty actions slot that adds blank space (FR-005).

## View states

### Festival section

| State | Condition | Rendering |
|---|---|---|
| Hidden | No selected event, or standard event without manage permission, or frozen standard event | Nothing |
| Convert prompt | Standard event, manager, not frozen | Prompt copy + right-aligned **Convert to festival** |
| Active festival | `eventType === 'FESTIVAL'` | Title, meta, stages, itinerary/ledger links |

### Sync Now

| State | Condition | Rendering |
|---|---|---|
| Hidden | `useCanTriggerQboSync()` is false | No control; no empty toolbar |
| Ready | Permission granted, mutation idle | **Sync Now** in ledger hero actions |
| Pending | `isPending` | **Syncing…**, disabled, same cluster |

### Ledger hero actions

| Lock Budget visible | Sync Now visible | Cluster |
|---|---|---|
| Yes | Yes | Both grouped on the right |
| Yes | No | Lock Budget only |
| No | Yes | Sync Now only |
| No | No | Title only; no empty action row |

## State transitions

| Trigger | Layout outcome |
|---|---|
| Operator opens event details | Festival card (if applicable) and ledger share `.event-workspace` inset |
| Operator has sync permission | Sync Now appears in the ledger hero action cluster |
| Sync starts | Pending label; cluster does not collapse or jump left |
| Sync permission absent | Sync Now omitted; header remains balanced |
| Viewport ≤ 768px | Header stacks; action cluster stays associated and end-aligned; no horizontal overflow |

## Validation rules

- **VR-001**: `.festival-mode-card` and `.event-ledger-page` are descendants of `.event-workspace`.
- **VR-002**: `.event-ledger-page__toolbar` is not rendered.
- **VR-003**: In-scope section primaries are in `.section-header__actions` (or the adopted equivalent class) rather than a left-aligned body row, except Finalize Settlement which remains after its required inputs but right-aligned in its action row.
- **VR-004**: `data-testid="workspace-focus-sync"` remains in the document whenever the ledger hero is shown so `scrollToWorkspaceFocus('sync')` still resolves.
- **VR-005**: `data-testid="sync-now-button"` is absent when the operator cannot sync.
- **VR-006**: No affected section introduces a blank action row solely to preserve alignment.
