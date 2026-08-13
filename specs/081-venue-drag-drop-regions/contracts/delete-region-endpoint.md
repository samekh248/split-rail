# Contract: `DELETE /api/regions/{regionId}` (extended)

Backend API contract change for the region-deletion resolution flow. Runtime source of truth: `apps/api/Controllers/RegionsController.cs`, `apps/api/Services/RegionService.cs`, `apps/api/DTOs/Regions/RegionDtos.cs`. Test parity: `apps/api.tests/Integration/RegionsControllerTests.cs`.

## Request

```
DELETE /api/regions/{regionId}
Authorization: Bearer <token>  (requires ManagePermissions)
Content-Type: application/json   (body optional)

{
  "moveVenuesToRegionId": "guid | null",
  "deleteVenues": "boolean, default false"
}
```

The body is entirely optional and MAY be omitted, exactly as it is today, when the target region has zero venues.

## Behavior matrix

| `region.Venues.Count` | Body | Result |
|---|---|---|
| `0` | any / omitted | Region deleted. `204 No Content`. (unchanged from today) |
| `> 0` | omitted, or `{}` | `409 Conflict` — `"Region has assigned venues. Reassign venues before deleting."` (unchanged from today) |
| `> 0` | `{ deleteVenues: true }` | All of the region's venues removed, then the region removed. Single atomic save. `204 No Content`. |
| `> 0` | `{ moveVenuesToRegionId: <valid same-org region, != regionId> }` | All of the region's venues reassigned to the destination region, then the region removed. Single atomic save. `204 No Content`. |
| `> 0` | `{ moveVenuesToRegionId: <region in a different org> }` | `404 Not Found` — destination not resolvable within the caller's organization. |
| `> 0` | `{ moveVenuesToRegionId: <regionId itself> }` | `400 Bad Request` (`ValidationException`) — cannot move a region's venues into itself. |
| any | `{ moveVenuesToRegionId: <valid>, deleteVenues: true }` | `moveVenuesToRegionId` takes precedence (research.md D5) — venues moved, not deleted. |

## `RegionResponse` (unchanged)

No changes to the response shape for `GET /api/regions` or the other region endpoints. `venueCount` (existing field) remains the frontend's signal for whether the resolution prompt is needed before calling `DELETE` (research.md D6) — this is a UX optimization, not a substitute for the server-side `409` guard in the table above, which remains authoritative.

## Frontend consumption

| Concern | Contract |
|---|---|
| `useDeleteRegion()` | Mutation input changes from `regionId: string` to `{ regionId: string; moveVenuesToRegionId?: string; deleteVenues?: boolean }`; `onSuccess` invalidates both `regionsQueryKey()` and `['venues']` (venues may have changed region or been removed). |
| `RegionManagementPanel` | Delete button: `venueCount === 0` → calls `useDeleteRegion()` immediately (unchanged). `venueCount > 0` → opens `RegionDeleteResolutionModal`; the mutation is only called once the admin confirms a choice there. |
| `RegionDeleteResolutionModal` | Destination `<select>` options = `useRegions()` results excluding the region being deleted; the "move venues" radio option is not rendered at all when that filtered list is empty (FR-012). |

## Validation checklist (maps to [data-model.md](../data-model.md) VR-004..VR-007)

- [ ] Zero-venue region delete: unchanged, no body needed, `204`.
- [ ] Venue-holding region delete with no body: still `409` (defense-in-depth guard preserved).
- [ ] `deleteVenues: true`: region and its venues gone; other regions/venues unaffected.
- [ ] `moveVenuesToRegionId` (valid): venues appear under the destination region; original region gone; no venue lost or duplicated.
- [ ] `moveVenuesToRegionId` (different org): rejected, no partial state.
- [ ] `moveVenuesToRegionId` (== regionId): rejected, no partial state.
- [ ] Any successful resolution is a single atomic operation — a simulated mid-operation failure must leave neither the venues reassigned/deleted nor the region removed (verifies VR-007's atomicity, not just the happy path).
