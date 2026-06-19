# API Contract: Event Pin

**Feature**: 030-event-pin-endpoints  
**Date**: 2026-06-18  
**Base path**: `/api/venues/{venueId}/events/{eventId}/pin`  
**Auth**: JWT Bearer (`Authorization: Bearer <accessToken>`)  
**Tenant scope**: Organization from JWT `org_id`; venue access per user venue scopes.

## PUT `/pin`

Creates a personal pin for the authenticated user on the specified event.

- **Permission**: `can_view_financials`
- **Request**: empty body
- **204 No Content**: Pin created, or already pinned (idempotent)
- **401 Unauthorized**: Not authenticated
- **403 Forbidden**: Missing `can_view_financials`
- **404 Not Found**: Venue not accessible, event not found in venue, or cross-tenant resource

### Behavior

1. Validate venue access for authenticated user.
2. Validate event exists with `eventId` under `venueId`.
3. If pin row exists for `(userId, eventId)` → return 204 (no duplicate insert).
4. Else insert `UserEventPin` with `PinnedAt = DateTimeOffset.UtcNow` → return 204.

---

## DELETE `/pin`

Removes the authenticated user's pin for the specified event.

- **Permission**: `can_view_financials`
- **Request**: empty body
- **204 No Content**: Pin removed, or never pinned (idempotent no-op)
- **401 Unauthorized**: Not authenticated
- **403 Forbidden**: Missing `can_view_financials`
- **404 Not Found**: Venue not accessible, event not found in venue, or cross-tenant resource

### Behavior

1. Validate venue access for authenticated user.
2. Validate event exists with `eventId` under `venueId`.
3. Delete pin row for `(userId, eventId)` if present → return 204.

---

## Coverage matrix

| ID | Requirement | Verification target | Suite | Key assertions | Status |
|----|-------------|---------------------|-------|----------------|--------|
| A1 | FR-001 pin action | `PUT .../pin` | `EventPinControllerTests` | 204; pin row exists | ✓ |
| A2 | FR-002 unpin action | `DELETE .../pin` | same | 204; pin row removed | ✓ |
| A3 | FR-003 per-user pins | Two users, same event | same | User B pin unaffected by User A unpin | ✓ |
| A4 | FR-004 financial permission | Role without permission | same | 403 | ✓ |
| A5 | FR-005 org validation | Cross-org event id | same | 404 | ✓ |
| A6 | FR-006 venue scope | Scoped user, wrong venue | same | 404 | ✓ |
| A7 | FR-007 idempotent pin | Double PUT | same | Single row | ✓ |
| A8 | FR-008 idempotent unpin | DELETE without prior pin | same | 204, zero rows | ✓ |
| A9 | FR-009 no tenant leak | Org B event from Org A client | same | 404, no Org B data | ✓ |
| A10 | FR-010 event delete cascade | Pin then DELETE event | same | Zero pin rows | ✓ |
| A11 | FR-011 PinnedAt timestamp | After PUT | same | `PinnedAt` not default | ✓ |
| A12 | SC-007 ≥80% coverage | Coverage collector | `dotnet test --collect:"XPlat Code Coverage"` | Touched files ≥80% | ✓ |

## Contract rules

1. **No request body**: Pin state is implied by authenticated user + route params only.
2. **No response body**: 204 responses; OpenAPI documents empty success only.
3. **Per-user isolation**: Service MUST NOT accept a target user id from the client.
4. **404 over 403 for scope misses**: Consistent with `EventsController` and `TenantIsolationTests`.
5. **No ledger guards**: Pin/unpin allowed regardless of event settlement status.
6. **Downstream readiness**: SPLR-72 may query `UserEventPins` for dashboard; SPLR-71 will call these endpoints from the overview UI.

## Definition of Done (verification)

- All matrix rows A1–A12 have at least one passing test or measurable coverage outcome.
- `dotnet test` in `apps/api.tests` passes with no regressions.
- Swagger/OpenAPI includes new routes after build (no manual TypeScript types until SPLR-71).
