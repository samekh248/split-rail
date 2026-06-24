# API Contract: Dashboard Aggregate

**Feature**: 031-dashboard-aggregate-api  
**Date**: 2026-06-18  
**Base path**: `/api/venues/{venueId}/dashboard`  
**Auth**: JWT Bearer (`Authorization: Bearer <accessToken>`)  
**Tenant scope**: Organization from JWT `org_id`; venue access per user venue scopes.

## GET `/`

Returns a venue dashboard with server-partitioned event collections and per-event summary aggregates.

- **Permission**: `can_view_financials`
- **Request**: empty body
- **200 OK**: `DashboardResponse` JSON body
- **401 Unauthorized**: Not authenticated
- **403 Forbidden**: Missing `can_view_financials`
- **404 Not Found**: Venue not accessible or cross-tenant resource

### Response shape (`DashboardResponse`)

```json
{
  "venueId": "uuid",
  "tonightEvents": [ /* EventCardDto[] */ ],
  "pinnedEvents": [ /* EventCardDto[] */ ],
  "recentEvents": [ /* EventCardDto[] */ ],
  "upcomingEvents": [ /* EventCardDto[] */ ]
}
```

Property names follow ASP.NET Core camelCase JSON serialization (verify in generated OpenAPI).

### `EventCardDto` fields

| Field | Type | Description |
|-------|------|-------------|
| `eventId` | uuid | Event identifier |
| `venueId` | uuid | Owning venue |
| `title` | string | Event title |
| `eventDate` | string | ISO date `yyyy-MM-dd` |
| `status` | string | Event status enum value |
| `isBudgetLocked` | bool | Budget lock state |
| `qboTagName` | string | QBO class/tag label |
| `settledAt` | string (ISO 8601) \| null | Settlement timestamp |
| `settlementPdfAvailable` | bool | Archive PDF exists |
| `isPinned` | bool | Pinned by requesting user |
| `hasVarianceConcern` | bool | Any line item with non-zero variance |
| `unmappedCount` | int | Count of unmapped QBO transactions |
| `lastSyncedAt` | string (ISO 8601) \| null | Latest sync ledger timestamp |

### Behavior

1. Validate venue access for authenticated user (`VenueService.IsVenueAccessibleAsync`).
2. Load all events for `venueId` in org scope with line items, unmapped transactions, sync ledger entries, and user pin state.
3. Compute per-event aggregates (`hasVarianceConcern`, `unmappedCount`, `lastSyncedAt`, `isPinned`).
4. Partition events into four collections per [data-model.md](../data-model.md) using UTC calendar boundaries.
5. Return `DashboardResponse` with all four arrays (empty when no matches).

### Partition overlap examples

| Event date | Pinned | Appears in |
|------------|--------|------------|
| Today | No | `tonightEvents` |
| Today | Yes | `tonightEvents`, `pinnedEvents` |
| 3 days ago | Yes | `pinnedEvents`, `recentEvents` |
| 14 days ahead | Yes | `pinnedEvents`, `upcomingEvents` |
| 60 days ahead | No | *(none)* |

---

## Coverage matrix

| ID | Requirement | Verification target | Suite | Key assertions | Status |
|----|-------------|---------------------|-------|----------------|--------|
| B1 | FR-001 single aggregate | `GET .../dashboard` | `DashboardControllerTests` | 200; four partitions present | ✓ |
| B2 | FR-002 tonight partition | Event dated UTC today | same | In `tonightEvents` only (+ pinned if pinned) | ✓ |
| B3 | FR-002 recent window | Event 7 days ago | same | In `recentEvents`; not in upcoming | ✓ |
| B4 | FR-002 upcoming window | Event 30 days ahead | same | In `upcomingEvents` | ✓ |
| B5 | FR-003 overlap | Pinned + upcoming event | same | In both `pinnedEvents` and `upcomingEvents` | ✓ |
| B6 | FR-005 variance flag | Line item with non-zero variance | same | `hasVarianceConcern: true` | ✓ |
| B7 | FR-005 unmapped count | UnmappedQboTransaction rows | same | `unmappedCount` matches seed | ✓ |
| B8 | FR-005 last sync | QboSyncLedger entry | same | `lastSyncedAt` matches max | ✓ |
| B9 | FR-006 server pins | Pin via spec 030 API | same | `isPinned: true`; in `pinnedEvents` | ✓ |
| B10 | FR-007 permission | Role without financial view | same | 403 | ✓ |
| B11 | FR-008 cross-org | Org B venue from Org A | same | 404 | ✓ |
| B12 | FR-008 venue scope | Scoped user, wrong venue | same | 404 | ✓ |
| B13 | FR-009 empty partitions | Venue with zero events | same | All arrays empty, 200 | ✓ |
| B14 | FR-011 coverage | Coverage collector | `dotnet test --collect:"XPlat Code Coverage"` | Touched files ≥80% | ✓ |
| B15 | Constitution VI | Type generation | `npm run gen:api` | `DashboardResponse` in generated-api.ts | ✓ |

## Contract rules

1. **Read-only**: No mutation side effects on GET.
2. **Per-user pins**: `isPinned` and `pinnedEvents` reflect authenticated user only; never accept user id from client.
3. **404 over 403 for scope misses**: Consistent with `EventsController` and tenant isolation tests.
4. **Always four arrays**: Never omit partitions; use `[]` for empty zones (FR-009).
5. **No ActionCenter / FinancialHealth**: Deferred to SPLR-74; response must not require those blocks.
6. **Downstream readiness**: SPLR-71 will consume this endpoint via `useDashboard()` hook; types must exist in `generated-api.ts`.

## Definition of Done (verification)

- All matrix rows B1–B15 have at least one passing test or measurable outcome.
- `dotnet test` in `apps/api.tests` passes with no regressions.
- Swagger/OpenAPI includes `DashboardResponse` and `EventCardDto` after build.
- `apps/web/src/types/generated-api.ts` regenerated with zero manual TS interface additions.
