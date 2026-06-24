# API Contract: Event Reconciliation

**Feature**: 033-post-reconcile-endpoint  
**Date**: 2026-06-18  
**Base path**: `/api/venues/{venueId}/events/{eventId}/reconcile`  
**Auth**: JWT Bearer (`Authorization: Bearer <accessToken>`)  
**Tenant scope**: Organization from JWT `org_id`; venue access per user venue scopes.

## POST `/reconcile`

Transitions a **Settled** event to **Reconciled** status, persisting reconciliation audit metadata.

- **Permission**: `can_trigger_qbo_sync`
- **Request**: empty body
- **200 OK**: `EventResponse` JSON body with updated status and reconciliation metadata
- **400 Bad Request**: Event not in `SETTLED` status (`ledger_state` error type)
- **401 Unauthorized**: Not authenticated
- **403 Forbidden**: Missing `can_trigger_qbo_sync`
- **404 Not Found**: Venue not accessible, event not found in venue, or cross-tenant resource
- **409 Conflict**: Concurrent reconcile lost race (`concurrency` error type)

### Behavior

1. Validate venue access for authenticated user (`VenueService.IsVenueAccessibleAsync`).
2. Acquire row lock on event (`SELECT ... FOR UPDATE`).
3. Load event where `id == eventId && venue_id == venueId`.
4. If event status is not `SETTLED` → 400 with clear message.
5. Set `status = RECONCILED`, `reconciled_at = UtcNow`, `reconciled_by_user_id = authenticatedUserId`.
6. Save changes; do not modify settlement fields, line items, or artists.
7. Return `EventResponse` including `reconciledAt` and `reconciledByUserId`.

### Response shape (`EventResponse` — extended fields highlighted)

```json
{
  "eventId": "uuid",
  "venueId": "uuid",
  "title": "string",
  "eventDate": "yyyy-MM-dd",
  "status": "RECONCILED",
  "isBudgetLocked": true,
  "qboTagName": "string",
  "editability": { "proforma": "read-only", "settlement": "read-only", "metadata": "read-only" },
  "settledAt": "ISO-8601",
  "settlementPdfAvailable": true,
  "reconciledAt": "ISO-8601",
  "reconciledByUserId": "uuid"
}
```

Property names follow ASP.NET Core camelCase JSON serialization.

### Dashboard propagation

After reconcile, `GET /api/venues/{venueId}/dashboard` returns `EventCardDto` entries with:

| Field | Value after reconcile |
|-------|----------------------|
| `status` | `"RECONCILED"` |
| `reconciledAt` | non-null ISO 8601 |
| `reconciledByUserId` | authenticated user's id |
| `settledAt` | unchanged from pre-reconcile value |

---

## Coverage matrix

| ID | Requirement | Verification target | Suite | Key assertions | Status |
|----|-------------|---------------------|-------|----------------|--------|
| R1 | FR-001 reconcile action | `POST .../reconcile` | `ReconcileControllerTests` | 200; status RECONCILED; metadata set | ✓ |
| R2 | FR-002 SETTLED-only | Pre-Show event | same | 400; status unchanged | ✓ |
| R3 | FR-002 no duplicate | Already RECONCILED | same | 400 | ✓ |
| R4 | FR-003 sync permission | Role without permission | same | 403 | ✓ |
| R5 | FR-004 org validation | Cross-org event | same | 404 | ✓ |
| R6 | FR-005 venue scope | Scoped user, wrong venue | same | 404 | ✓ |
| R7 | FR-006 no tenant leak | Org B event from Org A | same | 404 | ✓ |
| R8 | FR-007 GET reflects state | GET event after reconcile | same | RECONCILED + metadata | ✓ |
| R9 | FR-007 dashboard reflects | GET dashboard after reconcile | same | EventCardDto updated | ✓ |
| R10 | FR-008 settlement preserved | Compare settledAt/pdf before/after | same | Unchanged | ✓ |
| R11 | FR-009 immutability | POST line-item after reconcile | same | 400 | ✓ |
| R12 | FR-010 concurrency | Parallel POST | same | One 200; loser 400 or 409 | ✓ |
| R13 | SC-006 ≥80% coverage | Coverage collector | `dotnet test --collect:"XPlat Code Coverage"` | Touched files ≥80% | ✓ |

## Contract rules

1. **Empty request body**: Reconcile is implied by authenticated user + route params only.
2. **Sanctioned events mutation**: Only `status`, `reconciled_at`, `reconciled_by_user_id` may change on the `events` row.
3. **404 over 403 for scope misses**: Consistent with `SettlementController` and `TenantIsolationTests`.
4. **Irreversible v1**: No undo endpoint; `reverse-settlement` remains SETTLED-only.
5. **Manual v1**: QBO sync completion does not auto-trigger reconcile.
6. **Downstream readiness**: Dashboard Post-Show quick links (separate feature) will call this endpoint.

## Definition of Done (verification)

- All matrix rows R1–R13 have at least one passing test or measurable coverage outcome.
- `dotnet test` in `apps/api.tests` passes with no regressions.
- Swagger/OpenAPI includes new route after build; `generated-api.ts` regenerated via build pipeline.
