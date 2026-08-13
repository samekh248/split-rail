# Data Model: Venue Drag-and-Drop Region Reassignment & Region Deletion Handling

This feature introduces **no new database tables or columns**. `Venue` and `Region` are unchanged at the schema level (see `apps/api/Models/Venue.cs`, `apps/api/Models/Region.cs`, and `apps/web/src/types/generated-api.ts` `VenueResponse`/`RegionResponse`). One new **request DTO** is added to express the region-deletion resolution choice.

## Existing entities (consumed, unchanged schema)

### Venue (`VenueResponse` / `Venue`)

| Attribute | Notes |
|---|---|
| `id` | Unique identifier |
| `name` | Display name; required on both create and update |
| `regionId` | Optional (nullable) FK to `Region` — the field mutated by both drag-and-drop reassignment and region-deletion venue-moves |

### Region (`RegionResponse` / `Region`)

| Attribute | Notes |
|---|---|
| `id` | Unique identifier |
| `name` | Display name |
| `organizationId` | Tenant scope — MUST match on both the region being deleted and any "move to" destination region (Constitution II) |
| `venueCount` | Existing computed field (`region.Venues.Count`), already used by `RegionManagementPanel` to decide whether the deletion-resolution prompt is needed (research.md D6) |

## New request DTO

### `DeleteRegionRequest` (backend: `apps/api/DTOs/Regions/RegionDtos.cs`)

| Field | Type | Notes |
|---|---|---|
| `MoveVenuesToRegionId` | `Guid?` | When set, all of the deleted region's venues are reassigned to this region first. Must reference an existing region in the same organization, and must not equal the region being deleted. |
| `DeleteVenues` | `bool` (default `false`) | When `true`, all of the deleted region's venues are removed along with the region. |

Exactly one of `MoveVenuesToRegionId`/`DeleteVenues=true` is meaningful when the region has venues; both omitted (the default, `null`/`false`) preserves today's behavior — reject with `ConflictException` when venues are still assigned (data-model VR-004 below). Both set simultaneously is not a supported combination the frontend will ever send (the resolution modal only ever picks one), but the service treats `MoveVenuesToRegionId` as taking precedence if both were somehow present, since a move is the more conservative (non-destructive) action.

This flows through the standard Constitution VI pipeline: defined in C# → OpenAPI spec regenerated → `npm run gen:api` → consumed from `generated-api.ts` on the frontend with no hand-written mirror.

## New client-side view state (transient, not persisted)

### Drag-and-drop state (`VenueListGrouped`)

| Field | Notes |
|---|---|
| `draggedVenue` | `{ id: string; regionId: string \| null } \| null` — set on the handle's `dragstart`, cleared on `dragend`/`drop`; consumed by section `onDrop` handlers instead of `event.dataTransfer` (research.md D2) |
| `dragOverSectionKey` | Optional — which section is currently a drop target, for the hover-highlight visual; not persisted |
| `pendingReassignVenueId` | Tracks the in-flight `PUT /venues/{id}` call so its row can show a pending state and block a second drag until it resolves (spec Edge Cases) |

### Region-deletion resolution state (`RegionDeleteResolutionModal`)

| Field | Notes |
|---|---|
| `choice` | `'delete-venues' \| 'move-venues'` — which path the admin has selected; no default pre-selected (forces an explicit choice) |
| `destinationRegionId` | Only relevant when `choice === 'move-venues'`; populated from `useRegions()` filtered to exclude the region being deleted |

## Validation rules

| ID | Rule |
|---|---|
| VR-001 | Drag handles and drag-and-drop reassignment MUST only be available to users with venue-management permission (spec FR-001, FR-005) — mirrors the existing `canManage` gating already used for Edit/Delete in `VenueListGrouped`. |
| VR-002 | Dropping a venue onto the region section it already belongs to MUST be a no-op (no `PUT` call issued). |
| VR-003 | Dropping a venue onto the "Unassigned" section MUST send `regionId: null` (spec FR-006). |
| VR-004 | `DeleteRegionAsync` MUST continue to throw `ConflictException` when the region has venues and neither `MoveVenuesToRegionId` nor `DeleteVenues=true` is provided (preserves today's guard as a defense-in-depth safety net — research.md D6). |
| VR-005 | `DeleteRegionAsync` MUST throw `NotFoundException`/`ValidationException` when `MoveVenuesToRegionId` does not reference an existing region in the same organization, or equals the region being deleted (Constitution II). |
| VR-006 | The region-deletion "move venues" destination list MUST exclude the region being deleted, and the "move venues" choice MUST be hidden entirely when no other region exists in the organization (spec FR-012). |
| VR-007 | A region-deletion resolution (either choice) and the region removal itself MUST occur in a single atomic database operation — no partial state where venues are reassigned/deleted but the region still exists, or vice versa (spec FR-015, SC-004). |
| VR-008 | Deleting a region with zero assigned venues MUST NOT trigger the resolution prompt (spec FR-016) — unchanged from today. |
| VR-009 | No new hand-written TypeScript interfaces may mirror `DeleteRegionRequest`/`VenueResponse`/`RegionResponse` (Constitution VI) — the frontend imports the generated type after `npm run gen:api`. |

## Out of scope

| Item | Reason |
|---|---|
| Bulk/standalone "move all venues in a region" action outside of deletion | Not requested — the move capability is only exposed as part of the region-deletion flow. |
| Touch or keyboard-only drag-and-drop reordering | Explicit spec Assumption — desktop/mouse interaction only for this feature. |
| New permission tier for region deletion or venue reassignment | Both already gated by the existing `ManagePermissions`/venue-management permission; no change. |
| Undo for a completed drag-and-drop reassignment or region deletion | Not requested; consistent with existing venue/region mutation flows having no undo today. |
