# Quickstart & Validation Guide: Venue Drag-and-Drop Region Reassignment & Region Deletion Handling

How to validate the four pieces of this feature. References [contracts/delete-region-endpoint.md](./contracts/delete-region-endpoint.md), [contracts/venues-page-interactions.md](./contracts/venues-page-interactions.md), and [data-model.md](./data-model.md).

## Prerequisites

- Node 22 + `npm install` in `apps/web`; .NET 8 SDK for `apps/api`
- Branch `081-venue-drag-drop-regions`
- A test organization with at least 2 regions, one region holding 2+ venues, another holding 0 venues, and at least one unassigned venue

## Run dev environment

```bash
task dev   # or the individual cloudsql-proxy / api / web tasks
```

Sign in as a venue-management user and open `/venues`.

## Automated tests (primary gate)

```bash
# Backend
cd apps/api.tests
dotnet test --filter "FullyQualifiedName~RegionsControllerTests"

# Frontend
cd apps/web
npm run test -- tests/components/venue/VenueListGrouped.test.tsx tests/components/venue/AddVenueModal.test.tsx tests/components/venue/RegionDeleteResolutionModal.test.tsx tests/components/booking/RegionManagementPanel.test.tsx tests/pages/VenuesPage.test.tsx
npm run test:coverage
npm run build
cd ../api && dotnet build -c Release
```

**Expected**: All new/updated tests pass; coverage ≥80% line/branch on touched files in both stacks; both builds succeed with no errors.

---

## Manual validation checklist

### Drag-and-drop reassignment (User Story 1)

1. Open `/venues` in the grouped view. Confirm a drag handle appears on the left of each venue row.
2. Drag a venue from Region A's section and drop it onto Region B's section. Confirm it moves immediately.
3. Reload the page. Confirm the venue is still under Region B.
4. Drag a venue onto the "Unassigned" section. Confirm its region is cleared.
5. Drag a venue and drop it back onto its own current section. Confirm nothing changes (no network call, no flicker).
6. Sign in as a read-only (non-venue-management) user. Confirm no drag handles appear and rows are not draggable.
7. Simulate a failed save (e.g., throttle/offline during a drop). Confirm the venue stays in its original section and an error message appears.

### Region deletion resolution (User Story 2)

1. Attempt to delete a region with zero venues. Confirm it's removed immediately with no prompt (unchanged).
2. Attempt to delete a region with venues. Confirm a prompt appears offering "delete venues too" or "move venues to another region."
3. Choose "delete venues too" and confirm. Confirm the region and all its venues are gone.
4. Repeat with "move venues," selecting one destination region. Confirm all venues now appear under the destination region and the original region is gone.
5. Confirm the destination selector never allows choosing more than one region, and excludes the region being deleted.
6. In an organization with only one region (which has venues), attempt to delete it. Confirm only the "delete venues too" option is offered.

### Add venue modal (User Story 3)

1. Click "Add venue" on a region section. Confirm a modal opens on the same page (URL does not change to `/venues/new`).
2. Confirm no region selector appears in the modal.
3. Enter a name and submit. Confirm the modal closes and the venue appears under the correct region.
4. Open the modal again and cancel/close it. Confirm no venue is created and the page is unchanged.
5. Directly navigate to `/venues/new` in the browser. Confirm it no longer resolves to a working create-venue page (route removed).

### Actions column alignment (User Story 4)

1. View the grouped venue table with venue-management permission. Confirm the Edit/Delete buttons are aligned to the right edge of the table.

---

## Regression checks

- Venue edit (region change via `VenueEditModal`) still works unchanged.
- The header venue dropdown's region filter (spec 080) is unaffected.
- The Venues page's own region filter and grouped/empty-state rendering (specs 075/079) are unaffected — no changes to `venueListView.ts`.
- Existing venue delete confirmation (`DeleteVenueConfirm`) unaffected.

---

## Related specs

- Spec: [spec.md](./spec.md)
- Plan: [plan.md](./plan.md)
