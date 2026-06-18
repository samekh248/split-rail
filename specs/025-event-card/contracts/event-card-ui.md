# Contract: Event Card UI (Frontend)

**Feature**: `025-event-card` | **Extends**: [023-split-dashboard-routes/contracts/event-workspace-routing.md](../../023-split-dashboard-routes/contracts/event-workspace-routing.md)  
**Prerequisite**: SPLR-64 (`eventLifecycle.ts`, `eventCardLabels.ts`)  
**Date**: 2026-06-18

Types from `generated-api.ts` only (Constitution VI). No REST changes.

## Component: `EventCard`

**Path**: `apps/web/src/components/dashboard/EventCard.tsx`

### Props

```typescript
import type { EventResponse, LineItemDto, PermissionsDto } from '@/types/generated-api';

export type WorkspaceFocus = 'deal' | 'settlement' | 'signature' | 'variance' | 'sync';

export interface EventCardProps {
  event: EventResponse;
  permissions: PermissionsDto;
  onQuickLink: (venueId: string, eventId: string, focus?: WorkspaceFocus) => void;
  lineItems?: LineItemDto[];
  isPinned?: boolean;
  onPinToggle?: () => void;
}
```

### DOM structure (semantic)

```text
<article class="event-card" data-testid="event-card-{eventId}">
  <header class="event-card__header">
    <h3 class="event-card__title">{title | "Untitled event"}</h3>
    {onPinToggle && <button pin control data-testid="event-card-pin-{eventId}">…</button>}
  </header>
  <p class="event-card__date" data-testid="event-card-date-{eventId}">{formattedDate | "Date TBD"}</p>
  <span class="event-card__booking-badge" title="Booking status preview — full calendar coming soon"
        data-testid="event-card-booking-{eventId}">{placeholderLabel}</span>
  {varianceWarning && <span class="event-card__variance-badge" data-testid="event-card-variance-{eventId}">Variance</span>}
  {bottleneckAlerts.map → <span class="event-card__alert-chip" data-testid="event-card-alert-{kind}-{eventId}">{label}</span>}
  <nav class="event-card__quick-links" aria-label="Event actions">
    {links.map → <button type="button" data-testid="event-card-link-{focus}-{eventId}" onClick → onQuickLink(...)>}
  </nav>
</article>
```

### Quick link resolution (`eventCardQuickLinks.ts`)

```text
resolveQuickLinks(phase: DashboardLifecyclePhase, permissions: PermissionsDto): QuickLinkDefinition[]

1. Select base links for phase (see data-model.md).
2. Filter out links where permissions[link.permission] !== true.
3. If result empty OR phase === Unknown → return single Open workspace link (requires canViewFinancials).
4. Return filtered list (1 or 2 links typical).
```

### Focus mapping (FR-005, SC-004)

| Button label | `focus` argument |
|--------------|------------------|
| Edit Deal Builder | `deal` |
| Lock Budget | `deal` |
| Settlement Wizard | `settlement` |
| Capture Signature | `signature` |
| View QBO Variance | `variance` |
| One-Click QBO Sync | `sync` |
| Open workspace | omitted (`undefined`) |

### Variance badge (`eventCardVariance.ts`)

```text
eventHasNegativeVariance(rows: LineItemDto[]): boolean
  for each row:
    v = resolveVarianceDisplay({ qboActual: row.qboActualValue, settlement: row.settlementValue, serverVariance: row.variance })
    if compareMoney(v.displayVariance, '0.00') < 0 → return true
  return false
```

When `lineItems` prop undefined → badge not rendered.

### Pin control (FR-008, Constitution IX)

- Rendered **only** when `onPinToggle` is defined.
- Icon: `faThumbtack` when unpinned, `faThumbtackSlash` when pinned (mirror `NavPinButton` pattern).
- `aria-label`: "Pin event" / "Unpin event".
- Parent responsible for reading/writing `pinnedEventStorage`.

### Parent wiring (SPLR-66 overview — reference)

```typescript
onQuickLink={(venueId, eventId, focus) => navigateToEventWorkspace(venueId, eventId, focus)}
```

Card MUST NOT import navigation helpers directly (FR-009).

## Permission matrix (test fixtures)

| Role fixture | Pre-Show visible links | Night Of visible links |
|--------------|------------------------|------------------------|
| Full permissions | Edit Deal Builder, Lock Budget | Settlement Wizard, Capture Signature |
| Read-only (`canViewFinancials` only) | Edit Deal Builder → fallback Open workspace if Lock hidden and Edit hidden? Actually Edit Deal needs canViewFinancials - so Edit shows, Lock hidden → 1 link |
| No financials | Open workspace only (if canViewFinancials false → no links area empty? Edge: hide all + no fallback if no canViewFinancials) |

**Edge**: When `canViewFinancials` is false, Open workspace fallback is also hidden; quick-link nav area empty (card summary still renders).

## Test IDs (Vitest)

| testId | Assert |
|--------|--------|
| `event-card-{eventId}` | Card root |
| `event-card-link-deal-{eventId}` | Pre-Show deal link |
| `event-card-link-settlement-{eventId}` | Night Of settlement link |
| `event-card-link-workspace-{eventId}` | Fallback link |
| `event-card-variance-{eventId}` | Present only when negative variance rows |
| `event-card-pin-{eventId}` | Present only when `onPinToggle` provided |

## Out of scope (explicit)

- Dashboard zone layout / sorting (SPLR-66)
- Workspace `?focus=` scroll behavior (SPLR-67)
- Server-side pin API
- Real booking calendar data
- Direct QBO sync execution from card (navigation only)
