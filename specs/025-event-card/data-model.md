# Data Model: Event Card with Quick Links and Placeholder Booking Status

**Feature**: `025-event-card` | **Date**: 2026-06-18

No database schema or API changes. Describes component props, client-derived view models, storage, and validation rules.

## API entities (existing, read-only)

### `EventResponse`

| Field | Card use |
|-------|----------|
| `eventId`, `venueId` | Identity; passed to `onQuickLink` |
| `title`, `eventDate` | Display (placeholders when null) |
| `status`, `isBudgetLocked`, `settledAt`, `settlementPdfAvailable` | Input to `deriveLifecyclePhase`, `deriveBottleneckAlerts` |
| `qboTagName` | Bottleneck derivation (SPLR-64) |

Types imported from `generated-api.ts` only (Constitution VI).

### `LineItemDto` (optional prop)

| Field | Card use |
|-------|----------|
| `qboActualValue`, `settlementValue`, `variance` | Input to `eventHasNegativeVariance` via `resolveVarianceDisplay` |

Parent overview may omit when ledger not loaded; card skips variance badge (no false positive).

### `PermissionsDto`

| Field | Quick link gating |
|-------|-------------------|
| `canViewFinancials` | Edit Deal Builder, View QBO Variance, Open workspace fallback |
| `canLockBudget` | Lock Budget |
| `canEditSettlement` | Settlement Wizard |
| `canSignSettlement` | Capture Signature |
| `canTriggerQboSync` | One-Click QBO Sync |

## Client type: `WorkspaceFocus`

```typescript
type WorkspaceFocus = 'deal' | 'settlement' | 'signature' | 'variance' | 'sync';
```

Open workspace fallback invokes `onQuickLink` with `focus` omitted (`undefined`).

## Client type: `DashboardLifecyclePhase`

From SPLR-64 `deriveLifecyclePhase`:

| Phase | Quick links (before permission filter) |
|-------|----------------------------------------|
| `PreShow` | Edit Deal Builder, Lock Budget |
| `NightOf` | Settlement Wizard, Capture Signature |
| `PostShow` | View QBO Variance, One-Click QBO Sync |
| `Unknown` | Open workspace only |

## Client type: `QuickLinkDefinition`

| Field | Type | Rules |
|-------|------|-------|
| `label` | string | Visible button text |
| `focus` | `WorkspaceFocus` | Passed to parent on activate |
| `permission` | keyof PermissionsDto | Link hidden when permission false/undefined |
| `testId` | string | Stable `data-testid` for Vitest |

## Client type: `EventCardProps`

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `event` | `EventResponse` | yes | Must include `eventId`, `venueId` for links |
| `permissions` | `PermissionsDto` | yes | Drives link visibility |
| `onQuickLink` | `(venueId, eventId, focus?) => void` | yes | Card never navigates directly |
| `lineItems` | `LineItemDto[]` | no | When absent, variance badge suppressed |
| `isPinned` | `boolean` | no | Required with `onPinToggle` for pin UI |
| `onPinToggle` | `() => void` | no | When absent, pin control not rendered |

## Client type: `BottleneckAlert` (from SPLR-64)

| Kind | Example chip label |
|------|-------------------|
| `MISSING_SIGNATURE` | Missing signature |
| `SETTLED_NOT_SYNCED` | Not synced to QBO |
| `VARIANCE_REVIEW` | Variance review needed |

Rendered as chips; empty array → no chips.

## Client storage: `pinnedEventStorage`

| Key | Value | Storage |
|-----|-------|---------|
| `pinnedEvents` | `Record<string, true>` where key = `` `${venueId}:${eventId}` `` | `localStorage` |

Invalid UUID segments ignored on read/write. Toggle adds/removes key.

## Display formatting rules

| Input | Output |
|-------|--------|
| Missing `title` | `"Untitled event"` |
| Missing `eventDate` | `"Date TBD"` |
| Valid ISO date | Locale-formatted date (match EventCombobox pattern) |
| Booking badge | Placeholder label from `eventCardLabels` + tooltip |

## State transitions

Card is stateless except pin visual state (controlled by parent). Phase and alerts recompute on prop change / parent refetch. No internal fetching.
