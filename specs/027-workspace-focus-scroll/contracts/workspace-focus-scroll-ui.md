# Contract: Workspace Focus Scroll UI (Frontend)

**Feature**: `027-workspace-focus-scroll` | **Extends**: [023-split-dashboard-routes/contracts/event-workspace-routing.md](../../023-split-dashboard-routes/contracts/event-workspace-routing.md), [025-event-card/contracts/event-card-ui.md](../../025-event-card/contracts/event-card-ui.md)  
**Date**: 2026-06-18 | **Linear**: SPLR-67

Types from `generated-api.ts` only for API payloads (Constitution VI). Focus types from `eventCardQuickLinks.ts`. No REST changes.

## Route hook (`appRoute.ts`) — MODIFIED

`useEventWorkspaceRoute()` MUST subscribe to `popstate` and re-read both pathname **and** search params so `focus` updates when query string changes on an unchanged workspace path (FR-005a).

```typescript
export interface EventWorkspaceRouteParams {
  venueId: string;
  eventId: string;
  focus: string | null;
}
```

## Focus scroll library (`workspaceFocusScroll.ts`) — NEW

```typescript
import type { WorkspaceFocus } from '@/lib/eventCardQuickLinks';

export const WORKSPACE_FOCUS_TARGETS: Record<WorkspaceFocus, string>;

export function isRecognizedWorkspaceFocus(
  value: string | null | undefined,
): value is WorkspaceFocus;

/** Scroll target into view; focus first focusable descendant. Returns false if root missing. */
export function scrollToWorkspaceFocus(
  focus: WorkspaceFocus,
  scope?: ParentNode,
): boolean;
```

### Target map (TDD §6.3)

| `WorkspaceFocus` | Root `data-testid` | Notes |
|------------------|-------------------|-------|
| `deal` | `artist-deal-panel` | Deal builder / artist proforma |
| `settlement` | `ledger-grid` | Settlement column area |
| `signature` | `finalize-settlement-panel` | Includes `signature-pad` |
| `variance` | `variance-banner` | Conditional when variances exist |
| `sync` | `workspace-focus-sync` | NEW wrapper around toolbar + unmapped banner |

## `EventLedgerPage` — MODIFIED

```typescript
interface EventLedgerPageProps {
  venueId: string;
  eventId: string;
  focus?: WorkspaceFocus | null;
}
```

### Sync region wrapper (NEW markup)

Wrap sync toolbar + unmapped banner:

```text
<div data-testid="workspace-focus-sync">
  <div class="event-ledger-page__toolbar">
    <SyncNowButton ... />
  </div>
  <UnmappedBanner ... />
</div>
```

### Focus effect

When `focus` is recognized and `ledger` loaded:

1. Call `scrollToWorkspaceFocus(focus, document)` (or ledger root ref).
2. Re-run when `focus`, `eventId`, or `ledger` identity changes.
3. No-op when target absent.

## `EventWorkspacePage` — MODIFIED

```typescript
const workspaceRoute = useEventWorkspaceRoute();
const focusParam = workspaceRoute?.focus ?? null;
const ledgerFocus = isRecognizedWorkspaceFocus(focusParam) ? focusParam : null;

// ...

<EventLedgerPage
  venueId={activeVenueId}
  eventId={selectedEventId}
  focus={ledgerFocus}
/>
```

### Navigation without focus (FR-007)

Existing calls unchanged — **no third argument**:

```typescript
navigateToEventWorkspace(activeVenueId, eventId);       // combobox
navigateToEventWorkspace(activeVenueId, resolved);      // venue switch
```

## Inbound navigation (unchanged consumers)

Overview and event cards already call:

```typescript
navigateToEventWorkspace(venueId, eventId, focus);
```

`WorkspaceFocus` values from `eventCardQuickLinks.ts` match FR-002.

## Test contracts

| Suite | Covers |
|-------|--------|
| `workspaceFocusScroll.test.ts` | Target map, type guard, scroll/focus with jsdom |
| `EventLedgerPage.test.tsx` | Focus prop invokes scroll helper per focus value; no-op when invalid |
| `EventWorkspacePage.test.tsx` | Focus wired from route; combobox clears `?focus=` |
| `appRoute.test.ts` | Hook updates `focus` when only search changes |

## testid additions

| testid | Element |
|--------|---------|
| `workspace-focus-sync` | Wrapper div for sync + unmapped region |

All other targets use existing testids (see data-model.md).

## Out of scope

- Playwright overview → workspace E2E (SPLR-68)
- Backend / OpenAPI changes
- New quick link definitions
