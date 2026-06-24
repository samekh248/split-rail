# Contract: Venues API (update)

Base route: `/api/venues` — `[Authorize]` (authenticated). Shared error envelope (see Organizations contract → Error Contract). C# DTOs are the source of truth; TS types are generated into `apps/web/src/types/generated-api.ts`.

## Existing endpoints (unchanged, for reference)

- `GET /api/venues` → 200 `VenueResponse[]` (accessible venues).
- `POST /api/venues` → 201 `VenueResponse` (create; `RequirePermission(can_manage_permissions)`; now enforces ≤200-char trimmed name).
- `GET /api/venues/{venueId}` → 200 `VenueResponse` / 404.
- `DELETE /api/venues/{venueId}` → 204 (`RequirePermission(can_manage_permissions)`).

## NEW: PUT /api/venues/{venueId} — update venue

Updates the venue's name. Requires the manage permission and venue-scope access.

- **Auth**: `[RequirePermission(can_manage_permissions)]` **plus** venue-scope accessibility check (`VenueService` accessible-venue query / `IsVenueAccessibleAsync`).
- **Path**: `venueId: guid`.
- **Request body**: `UpdateVenueRequest`

```json
{ "name": "The Roxy (Updated)" }
```

- **Response 200**: `VenueResponse` (updated entity, FR-014).

```json
{ "id": "a1...", "name": "The Roxy (Updated)", "organizationId": "3f...", "createdAt": "2026-06-16T00:00:00+00:00" }
```

| Scenario | Result |
|----------|--------|
| Permitted user, venue in scope, valid name | 200 updated `VenueResponse` (FR-003, SC-002) |
| Same name (no-op) | 200 current details (idempotent, edge case) |
| User lacks `can_manage_permissions` | 403 `authorization` (FR-004) |
| Permitted user, venue NOT in scope | 404 `not_found` (no existence leak) (FR-005, SC-002, SC-005) |
| Venue not in caller's organization | 404 `not_found` (FR-013) |
| Unknown venue id | 404 `not_found` |
| Empty/whitespace name | 400 `validation` (FR-010) |
| Name > 200 chars | 400 `validation` (FR-010) |
| Unauthenticated | 401 `authentication` |

Name is trimmed before persistence (FR-011). Concurrency: last-write-wins; no version/ETag, no conflict error on concurrent updates (FR-012).

> Note: out-of-scope and cross-tenant venues both resolve to `404 not_found` (via the accessible-venue/tenant query) so existence is not disclosed; lacking the permission yields `403 authorization` from the policy.
