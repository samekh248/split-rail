# Contract: QBO Disconnected / Degraded UI

**Feature**: 076-qbo-online-sync  
**Gate flag**: `isQboConnected` from `OrganizationQboSummaryDto` and/or per-venue `VenueQboIntegrationDto.connectionState`

Shared hook: `useQboConnectionGate(venueId?)` combining org summary + venue integration status.

---

## Ledger grid (`BlockSection`, `LedgerRow`, `VarianceCell`)

| Connection | Columns shown |
|------------|---------------|
| Connected | Proforma, Settlement, QBO Actual, Cleared Feed, Variance |
| Not connected | Proforma, Settlement only |

---

## Dashboard (`FinancialHealthWidget`)

| Connection | Admin viewer | Non-Admin viewer |
|------------|--------------|------------------|
| Connected | Full widget with QBO series | Full widget (no Integrations CTA) |
| Not connected | Manual targets only + onboarding callout + CTA → Integrations | Manual targets only; layout expands; no callout |

Callout copy: *"Unlock Real-Time Bank Reconciliation. Link your QuickBooks Online account to instantly generate variance maps against cleared merchant deposits."*

---

## Unassigned transactions banner (`UnassignedTransactionsBanner`)

- Hidden when `!organizationQboSummary.isQboConnected`

---

## Event card post-show (`EventCard`, `eventLifecycle.ts`, `eventCardSummary.ts`)

| Connection | Behavior |
|------------|----------|
| Connected | Existing QBO variance link + sync button |
| Not connected | Remove **View QBO Variance** link; sync label *"Sync Unavailable (No Integration Setup)"* (disabled); suppress `SETTLED_NOT_SYNCED` and `VARIANCE_REVIEW` bottleneck alerts |

---

## Accounting overview (`AccountingOverviewPage`)

Extend existing partial QBO gating to full pattern above.

---

## API payload alignment

When disconnected, server omits QBO fields (see [qbo-integration-api.md](./qbo-integration-api.md)); frontend MUST NOT assume null placeholders — treat missing fields as disconnected.

---

## Test matrix (Vitest)

| Component | Cases |
|-----------|-------|
| `BlockSection` | connected vs disconnected column headers |
| `FinancialHealthWidget` | Admin CTA visible only when disconnected + Admin |
| `EventCard` | post-show links suppressed when disconnected |
| `useQboConnectionGate` | org-level any-venue-connected semantics |

Playwright E2E (Constitution III): Admin sees onboarding CTA when disconnected; non-Admin does not.
