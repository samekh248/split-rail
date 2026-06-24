# Data Model: Workspace Focus Scroll Targets

**Feature**: `027-workspace-focus-scroll` | **Date**: 2026-06-18

No database schema or REST API changes. Describes URL query state, client types, scroll target registry, and component prop contracts.

## URL query parameter

### `focus` (workspace focus indicator)

| Attribute | Value |
|-----------|-------|
| Location | Query string on event workspace path `/venues/{venueId}/events/{eventId}` |
| Encoding | `encodeURIComponent` via `buildEventWorkspacePath` |
| Recognized values | `deal`, `settlement`, `signature`, `variance`, `sync` |
| Unrecognized / absent | No scroll; default viewport position |
| Stripped on | Event combobox selection; venue switch (navigation without focus arg) |
| Retained on | Quick link arrival, bookmark, refresh, history back/forward |

Types align with `WorkspaceFocus` in `apps/web/src/lib/eventCardQuickLinks.ts` (025).

## Client type: `WorkspaceFocus`

```typescript
type WorkspaceFocus = 'deal' | 'settlement' | 'signature' | 'variance' | 'sync';
```

Re-export from `eventCardQuickLinks.ts`; do not duplicate (Constitution VI N/A — client-only union).

## Client type: `EventWorkspaceRouteParams` (existing, extended behavior)

From `appRoute.ts`:

| Field | Type | Notes |
|-------|------|-------|
| `venueId` | string | Path segment |
| `eventId` | string | Path segment |
| `focus` | string \| null | From `URLSearchParams.get('focus')`; hook MUST update when search changes on same pathname |

## Client type: `FocusScrollTargetDefinition`

```typescript
interface FocusScrollTargetDefinition {
  focus: WorkspaceFocus;
  selector: string;           // data-testid root query
  description: string;      // human label for docs/tests
}
```

Registry in `workspaceFocusScroll.ts`:

| focus | selector | DOM region |
|-------|----------|------------|
| `deal` | `[data-testid="artist-deal-panel"]` | Artist deal builder / proforma area |
| `settlement` | `[data-testid="ledger-grid"]` | Ledger grid (settlement column) |
| `signature` | `[data-testid="finalize-settlement-panel"]` | Settlement finalize + signature pad |
| `variance` | `[data-testid="variance-banner"]` | Ledger variance alert banner |
| `sync` | `[data-testid="workspace-focus-sync"]` | Sync toolbar + unmapped banner wrapper |

## Component props (modified)

### `EventLedgerPage`

| Prop | Type | Required | Rules |
|------|------|----------|-------|
| `venueId` | string | yes | unchanged |
| `eventId` | string | yes | unchanged |
| `focus` | `WorkspaceFocus \| null` | no | When recognized and ledger loaded, trigger scroll + keyboard focus |

### `EventWorkspacePage`

| Concern | Behavior |
|---------|----------|
| Route | `const { focus } = useEventWorkspaceRoute() ?? {}` |
| Ledger render | `<EventLedgerPage ... focus={recognizedFocus} />` where `recognizedFocus` is parsed via `isRecognizedWorkspaceFocus` |
| Combobox | `navigateToEventWorkspace(venueId, eventId)` — no third arg |
| Venue switch effect | `navigateToEventWorkspace(activeVenueId, resolved)` — no third arg |

## State transitions

```text
[No focus in URL]
  → default scroll position

[Recognized focus in URL + ledger loading]
  → wait

[Recognized focus + ledger ready + target in DOM]
  → scrollIntoView + focus first focusable in target

[Recognized focus + ledger ready + target absent]
  → no-op (default position, no error)

[Event/venue switch via combobox/switcher]
  → URL without ?focus= → no scroll

[Same event + new ?focus= via quick link]
  → re-apply scroll (FR-005a)
```

## Validation rules

| Rule | Enforcement |
|------|-------------|
| FR-002 five values | `isRecognizedWorkspaceFocus` type guard |
| FR-004 invalid focus | Returns false → null prop to ledger |
| FR-007 strip on switch | Navigation helper omits focus parameter |
| FR-003 keyboard focus | First focusable in target root; skip if none |
| Conditional targets | `scrollToWorkspaceFocus` returns false if selector miss |

## Out of scope

- Server persistence of focus preference
- New quick link labels or focus values
- Playwright overview E2E (SPLR-68)
