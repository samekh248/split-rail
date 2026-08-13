# Contract: Venues Page Drag-and-Drop, Add-Venue Modal & Actions Alignment (081)

Component/behavior contract for the frontend-only pieces of this feature. Runtime source of truth: `apps/web/src/components/venue/VenueListGrouped.tsx`, `apps/web/src/components/venue/AddVenueModal.tsx`, `apps/web/src/pages/VenuesPage.tsx`, `apps/web/src/index.css`. Test parity: `apps/web/tests/components/venue/VenueListGrouped.test.tsx`, `apps/web/tests/components/venue/AddVenueModal.test.tsx`, `apps/web/tests/pages/VenuesPage.test.tsx`.

See [delete-region-endpoint.md](./delete-region-endpoint.md) for the region-deletion resolution contract.

## `VenueListGrouped` — drag handle & drag-and-drop

| Element | Contract |
|---|---|
| Drag handle | New leading `<td>`/cell per row, rendered only when `canManage` is true; `data-testid="venue-drag-handle-{venueId}"`; the handle itself carries `draggable`, not the row — dragging only initiates from the handle (spec FR-001). |
| Section drop target | Each `.venues-group` (except none are excluded — including `.venues-group--unassigned`) accepts `onDragOver` (calls `preventDefault()`) and `onDrop`. |
| Drag payload | Held in component state (`draggedVenue`), not `event.dataTransfer` (research.md D2). |
| No-op drop | Dropping on the section the venue already belongs to MUST NOT call `useUpdateVenue` (data-model VR-002). |
| Unassigned drop | Sends `regionId: null` (data-model VR-003). |
| Pending state | While a reassignment `PUT` is in flight, that row MUST NOT be draggable again until it resolves (spec Edge Cases). |
| Failure | On a rejected `PUT`, the row remains in its original section (no rollback needed — research.md D4) and an inline error is shown; `data-testid="venue-drag-error"`. |
| Permission gating | `canManage=false` → no drag handles rendered at all, and section drop handlers are no-ops (spec FR-005). |

## `VenueListGrouped` — Actions column alignment

| Element | Contract |
|---|---|
| `.venues-table thead th:last-child` (Actions header) and the `Actions` `<td>`'s `.team-table__actions` wrapper | Right-aligned (`text-align: right` / `justify-content: flex-end`), CSS-only change (research.md D8). |

## `AddVenueModal` (new)

| Prop/behavior | Contract |
|---|---|
| `regionId` (required prop) | Fixed for the modal's lifetime; no region `<select>` is rendered (spec FR-009). |
| `regionName` (required prop, display only) | Shown in the modal's copy, e.g. "Add a venue to {regionName}." |
| Opened from | Each named region section's existing `data-testid="venues-add-venue-{sectionKey}"` button in `VenueListGrouped`, now opening this modal via a callback instead of `navigateToCreateVenue(regionId)` (spec FR-008). |
| Submit | Calls `useCreateVenue()` with `{ name, regionId }`; on success, closes the modal and the new venue appears in that region's section via the existing `['venues']` query invalidation (spec FR-010). |
| Cancel/close | No venue created, modal closes, no navigation occurs (spec FR-008, Acceptance Scenario 4). |
| `data-testid` | `venue-add-modal`; form fields mirror `VenueEditModal`'s `venue-edit-*` naming (`venue-add-name`, `venue-add-save`). |

## `RegionDeleteResolutionModal` (new)

See [delete-region-endpoint.md](./delete-region-endpoint.md) for the backend contract this modal drives.

| Prop/behavior | Contract |
|---|---|
| Shown when | `RegionManagementPanel`'s Delete button is clicked for a region with `venueCount > 0`. |
| Choices | Two mutually exclusive options: "Delete the venues too" / "Move venues to another region" (`<select>` for the destination, excluding the region being deleted). No default pre-selected — the admin must actively choose (data-model). |
| Destination list empty | The "move venues" option is not rendered at all when there is no other region to move venues to (spec FR-012). |
| Confirm | Calls `useDeleteRegion()` with `{ regionId, deleteVenues: true }` or `{ regionId, moveVenuesToRegionId }` per the chosen path. |
| `data-testid` | `region-delete-resolution-modal`; choice controls `region-delete-choice-delete-venues` / `region-delete-choice-move-venues`; destination select `region-delete-destination`. |

## Removed surface

| Item | Status |
|---|---|
| `apps/web/src/pages/CreateVenuePage.tsx` | Removed (research.md D7) |
| `/venues/new` route in `App.tsx` | Removed |
| `navigateToCreateVenue`, `getCreateVenueRegionIdFromUrl` (`appRoute.ts`/`dashboardRoute.ts`) | Removed |
| `data-testid="venue-region-field"` on the create flow | No longer applicable to venue *creation* (still exists on `VenueEditModal` for editing — unaffected) |

## Validation checklist

- [ ] Drag handle visible only with `canManage`; absent otherwise.
- [ ] Drag-and-drop between two named regions works and persists after reload.
- [ ] Drag-and-drop onto "Unassigned" clears the venue's region.
- [ ] Dropping on the venue's current section is a no-op (no network call).
- [ ] Failed reassignment leaves the venue in its original section with an error shown.
- [ ] Actions column buttons are right-aligned in the rendered table.
- [ ] "Add venue" opens a modal with no region selector and no navigation.
- [ ] Successful add-venue-modal submission shows the venue in the correct section.
- [ ] Region delete with `venueCount === 0` has no prompt (unchanged).
- [ ] Region delete with `venueCount > 0` always shows the resolution modal, offering at most one destination region at a time.
- [ ] `/venues/new` is no longer reachable via any in-app control.
