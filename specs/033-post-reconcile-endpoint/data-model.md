# Data Model: Post-Show Event Reconciliation Transition

**Feature**: 033-post-reconcile-endpoint  
**Date**: 2026-06-18

## Schema change: `events` table

New nullable audit columns mirroring settlement metadata.

| Column | Type | Nullable | FK | Notes |
|--------|------|----------|-----|-------|
| `reconciled_at` | `timestamptz` | Yes | — | Set to `DateTimeOffset.UtcNow` on successful reconcile |
| `reconciled_by_user_id` | `uuid` | Yes | `users.id` SET NULL | Authenticated user performing reconcile |

**Existing columns unchanged by reconcile**: `settled_at`, `settled_by_user_id`, `artist_signature_data`, `settlement_pdf_url`, all `financial_line_items` and `event_artists` fields.

### Entity: `Event` (extended)

| Property | Type | Notes |
|----------|------|-------|
| `ReconciledAt` | `DateTimeOffset?` | Null until reconciled |
| `ReconciledByUserId` | `Guid?` | Null until reconciled |
| `ReconciledByUser` | `User?` | Navigation; optional include on reads |

**Status enum** (unchanged): `PRE_SHOW` → `SETTLED` → `RECONCILED`

## Lifecycle state transitions

| From | To | Trigger | Preconditions | Persisted fields |
|------|-----|---------|---------------|------------------|
| `SETTLED` | `RECONCILED` | `POST .../reconcile` | `can_trigger_qbo_sync`; venue access; event in venue | `status`, `reconciled_at`, `reconciled_by_user_id` |
| `PRE_SHOW` | — | reconcile attempt | — | Rejected (400) |
| `RECONCILED` | — | reconcile attempt | — | Rejected (400) |
| `RECONCILED` | — | reversal | — | Out of scope v1 (irreversible) |

## Validation rules (API layer)

| Rule | Source | Enforcement |
|------|--------|-------------|
| Caller authenticated | FR-003 | `ITenantContext.UserId`; 401 |
| Caller has `can_trigger_qbo_sync` | FR-003 | `[RequirePermission]`; 403 |
| Venue accessible | FR-005 | `VenueService.IsVenueAccessibleAsync`; 404 |
| Event exists in venue | FR-004 | `eventId + venueId` match; 404 |
| Status is `SETTLED` | FR-002 | `SettlementStateException`; 400 |
| Org isolation | FR-004, FR-006 | EF global filters; 404 |
| No financial mutation | FR-008 | Service updates status/metadata only |
| Concurrent reconcile | FR-010 | Row lock + status re-check; 409 |

## Service: `SettlementService.ReconcileAsync`

| Method | Input | Output | Side effects |
|--------|-------|--------|--------------|
| `ReconcileAsync(venueId, eventId, ct)` | Route params | `EventResponse` | `status → RECONCILED`, set reconciled audit fields |

**Dependencies**: `ApplicationDbContext`, `ITenantContext`, `VenueService`, `ILogger`

## DTO extensions

### `EventResponse` (ledger)

Add optional fields:

| Field | Type | Description |
|-------|------|-------------|
| `reconciledAt` | ISO 8601 string \| null | Reconciliation timestamp |
| `reconciledByUserId` | uuid \| null | User who reconciled |

### `EventCardDto` (dashboard)

Same two fields added for dashboard aggregation parity with `settledAt`.

## Out of scope (this feature)

- Automatic reconcile after QBO sync completion
- Reconcile reversal / undo
- New permissions beyond `can_trigger_qbo_sync`
- Frontend UI components
- Changes to `financial_line_items`, `event_artists`, or settlement PDF pipeline
