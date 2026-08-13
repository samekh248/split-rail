# Phase 0 Research: Venue Drag-and-Drop Region Reassignment & Region Deletion Handling

All Technical Context items resolved — no `NEEDS CLARIFICATION` markers remain. Decisions grounded in the current `apps/web`/`apps/api` implementation (`VenueListGrouped.tsx`, `VenuesPage.tsx`, `RegionManagementPanel.tsx`, `RegionService.cs`, `RegionsController.cs`, `VenueEditModal.tsx`, `CreateVenuePage.tsx`) on branch `081-venue-drag-drop-regions`.

## D1. Drag-and-drop implementation approach (no new dependency)

**Decision**: Use the native HTML5 Drag and Drop API (`draggable`, `onDragStart`, `onDragOver`, `onDrop`, `onDragEnd`) rather than adding a library such as `@dnd-kit/core` or `react-dnd`.

**Rationale**: `apps/web`'s `package.json` has zero UI-kit/interaction-library dependencies today — every interactive widget in this codebase (`VenueSwitcher`, `EventCombobox`, `SelectField`) is hand-built on native DOM APIs and ARIA roles. A single drag-source-to-drop-target interaction (venue row → region section) is squarely within what the native API handles without abstraction overhead, so adding a ~10–30KB dependency for one interaction would break with established project convention for no real benefit.

**Alternatives considered**:
- `@dnd-kit/core` — rejected: purpose-built for complex sortable lists/multi-container reordering with accessibility keyboard support baked in; this feature only needs a single-item cross-section drop, which native DnD covers, and pulling in a new dependency contradicts the codebase's zero-dependency pattern for interactive widgets.
- `react-dnd` — rejected: same reasoning, plus it itself wraps the native HTML5 backend by default for web targets, so it would just be an abstraction layer over the same underlying browser API this plan uses directly.

## D2. Keeping the dragged venue in component state instead of `event.dataTransfer`

**Decision**: On `dragstart` (fired from the handle element), store the dragged venue's `id` and current `regionId` in local React state on `VenueListGrouped` (or a parent coordinating component). `onDrop` handlers read this state directly rather than calling `event.dataTransfer.getData(...)`. `dataTransfer.effectAllowed`/`dropEffect` are still set for cursor affordance, but no payload is round-tripped through `dataTransfer`.

**Rationale**: jsdom (used by Vitest for these tests) does not implement the `DataTransfer` constructor, which is the single biggest source of flakiness/boilerplate when testing native HTML5 drag-and-drop with React Testing Library. Keeping the payload in component state sidesteps that gap entirely — tests can fire plain `dragStart`/`dragOver`/`drop` events (with `preventDefault` as a no-op stub) and assert on the resulting `PUT /venues/{id}` call, with no `DataTransfer` mocking needed. This also matches how a single logical page (`VenuesPage`) already owns all the venue/region state the drag interaction needs.

**Alternatives considered**:
- Use `event.dataTransfer.setData('text/plain', venueId)` / `getData(...)` — rejected: works in real browsers but requires mocking `DataTransfer` in every test (a well-known jsdom gap), adding test complexity for zero functional benefit given the interaction is same-page, same-session.

## D3. Reusing the existing single-venue update endpoint for reassignment

**Decision**: Drag-and-drop reassignment calls the existing `useUpdateVenue(venueId)` hook (`PUT /venues/{id}` with `{ name, regionId }`, `regionId: null` when dropped on "Unassigned") — no new backend endpoint.

**Rationale**: `UpdateVenueRequest` already accepts an optional `RegionId`, and `VenueEditModal` already reassigns a venue's region through this exact path. `useUpdateVenue`'s `onSuccess` already invalidates the `['venues']` query, so after a successful drop the grouped sections re-render from fresh data with no extra plumbing (satisfies spec FR-003's "without a full page reload").

**Alternatives considered**:
- A new bulk/batch reassignment endpoint — rejected: unnecessary for single-item drag-and-drop; only the region-deletion "move venues" path needs bulk reassignment (see D5), which is a materially different, atomic, server-side operation.

## D4. No local optimistic move; confirm-then-refetch

**Decision**: On drop, call `updateVenue.mutateAsync(...)` and let the query invalidation re-render the grouped sections once the server confirms. Do not optimistically move the row in local state before the request resolves. While the request is in flight, the dragged row shows a pending/disabled visual state; if the request rejects, nothing needs to be "reverted" because the row was never optimistically moved — it simply stays in its original section, and an inline error message is shown.

**Rationale**: This directly and trivially satisfies spec FR-004 ("If a drag-and-drop reassignment fails to save, the system MUST return the venue to its original region section") — there is no rollback logic to get wrong, because no optimistic mutation of the section list ever happens. It's simpler and lower-risk than implementing and testing a full optimistic-update/rollback cycle for a single-field change that already round-trips quickly (one `PUT` call).

**Alternatives considered**:
- Optimistic `queryClient.setQueryData` update in `onMutate` with rollback in `onError` — rejected: correct but adds meaningful complexity (snapshot/restore logic, race handling with the query-invalidation-triggered refetch) for a interaction that's already a single fast round trip; the spec's success criteria (SC-001: "under 5 seconds") don't require optimistic UI to be met.

## D5. Region deletion resolution: single endpoint, request body, one atomic save

**Decision**: Extend `DELETE /regions/{regionId}` to accept an optional JSON body:

```csharp
public record DeleteRegionRequest(Guid? MoveVenuesToRegionId, bool DeleteVenues = false);
```

`RegionService.DeleteRegionAsync` behavior:
- If the region has zero venues: delete it immediately, exactly as today (request body ignored/absent) — spec FR-016.
- If the region has venues and `MoveVenuesToRegionId` is set: validate the destination region exists, belongs to the same organization, and is not the region being deleted; reassign all of the region's venues to it (`venue.RegionId = destination.Id` for each); then remove the region — all in one `SaveChangesAsync` call.
- If the region has venues and `DeleteVenues` is `true`: remove all of the region's venues and the region itself in one `SaveChangesAsync` call.
- If the region has venues and neither is provided: throw the existing `ConflictException` ("Region has assigned venues. Reassign venues before deleting.") — preserves today's behavior for any caller that doesn't yet send a resolution, and is what the frontend relies on to know a resolution prompt is needed (see D6).

**Rationale**: A single request body (rather than two separate calls — reassign-then-delete) makes the whole operation atomic: either both the venue changes and the region removal commit together, or neither does. This directly satisfies FR-015 ("no venue data lost") and SC-004 ("complete without leaving any venue in an inconsistent... state") — a two-call approach would risk a partial failure where venues are reassigned but the region deletion then fails (or vice versa), which a single transaction avoids entirely. ASP.NET Core supports request bodies on `HttpDelete` without issue, and the browser `fetch` API used by `apiFetch` supports a `body` on `DELETE` requests.

**Alternatives considered**:
- Query-string flags (`?deleteVenues=true` / `?moveVenuesToRegionId=...`) — rejected: less discoverable/typed than a request-body DTO flowing through the OpenAPI-generated contract (Constitution VI), and mixing a boolean and a nullable GUID as query params is less clear than a small typed body.
- Two separate endpoints/calls (bulk-reassign then delete) — rejected: breaks atomicity (see Rationale above); also duplicates validation logic that's simpler to keep in one place.
- A dedicated `POST /regions/{id}/resolve-and-delete` endpoint instead of extending `DELETE` — rejected: `DELETE` with an optional body is simpler (one endpoint, one route, backward compatible with the existing no-body call for the zero-venues case) and avoids introducing a non-standard action-style route for what is still fundamentally a delete operation.

## D6. Frontend: deciding when to show the resolution prompt

**Decision**: `RegionManagementPanel` already receives each region's `venueCount` from `RegionResponse` (existing field). When the admin clicks Delete on a region with `venueCount > 0`, open `RegionDeleteResolutionModal` (offering the two choices, with the destination-region `<select>` populated from `useRegions()` filtered to exclude the region being deleted, and hidden entirely when no other region exists — FR-012). When `venueCount === 0`, call `useDeleteRegion()` immediately as today (FR-016). The actual mutation always sends the appropriate `DeleteRegionRequest` body once the admin confirms a choice in the modal.

**Rationale**: `venueCount` is already fetched and displayed in the regions table (`region-panel__table`), so no new data fetch is needed to decide whether to show the prompt — this is a pure frontend branch on data already in hand.

**Alternatives considered**:
- Always call `DELETE` first and react to a `409 Conflict` by opening the resolution modal — rejected: works, but requires an extra failed round trip on every venue-holding region delete attempt, when `venueCount` already tells the frontend up front. Keeping the existing server-side `ConflictException` guard (D5) as a defense-in-depth safety net (in case `venueCount` is stale) is still valuable, but it should not be the primary trigger for showing the UI.

## D7. Retiring `CreateVenuePage` and the `/venues/new` route

**Decision**: Delete `apps/web/src/pages/CreateVenuePage.tsx`, its test file, the `/venues/new` case in `App.tsx`'s router, and the now-unused `navigateToCreateVenue`/`getCreateVenueRegionIdFromUrl` helpers in `appRoute.ts`/`dashboardRoute.ts` (plus their tests). `AddVenueModal` reimplements the same region-scoped, no-selector creation form as a modal rendered directly from `VenuesPage`, reusing `useCreateVenue()`.

**Rationale**: Once "Add venue" opens a modal, `/venues/new` has no remaining UI entry point — leaving it reachable only by typing the URL directly is dead, untested-by-users surface area, which conflicts with this project's "no half-finished implementations" / "avoid backwards-compatibility hacks" conventions. `AddVenueModal`'s form logic (name field, fixed region, validation, error mapping) is a near-direct port of `CreateVenuePage`'s existing logic into a modal shell matching `VenueEditModal`'s established pattern.

**Alternatives considered**:
- Keep `/venues/new` around unlinked "just in case" — rejected: dead code with no test coverage justification once no UI links to it; the project's stated conventions explicitly discourage this.

## D8. Actions column right-alignment

**Decision**: CSS-only change — add a right-aligned rule for the Actions `<th>`/`<td>` (and the `.team-table__actions` wrapper already used inside it) in the grouped venue table, scoped to not affect the unrelated `team-table` usages elsewhere (invitations, region panel) unless already right-aligned there too.

**Rationale**: The Actions column is already the last column in `VenueListGrouped`'s table; the request is about the button group's alignment *within* that column, not its position, so this is a targeted CSS fix, not a markup restructure.

**Alternatives considered**: None needed — no functional gap, purely a style rule.

## D9. Test strategy

**Decision**: Three-layer verification:
1. **Backend** (`apps/api.tests`): New `Integration/RegionsControllerTests.cs` (WebApplicationFactory, `IntegrationTestBase` pattern already used by `VenuesControllerTests`) covering: delete with zero venues (unchanged), delete with venues and no resolution (still 409), delete-with-venues-too (region and venues gone), move-then-delete (venues reassigned, region gone, target region unaffected otherwise), destination region from a different organization (rejected — Constitution II), destination region equal to the region being deleted (rejected).
2. **Frontend component/unit** (Vitest + RTL): `VenueListGrouped.test.tsx` (drag handle presence gated on `canManage`, drag-and-drop moves a venue between sections, drop on "Unassigned" clears region, failed reassignment leaves the row in place with an error shown); `AddVenueModal.test.tsx` (opens with fixed region, no selector, create success/failure); `RegionDeleteResolutionModal.test.tsx` (both choice paths, destination list excludes self, hidden when no other region exists); `RegionManagementPanel.test.tsx` (venueCount gates immediate delete vs. resolution modal); `VenuesPage.test.tsx` (wiring for the modal instead of navigation).
3. **Regression**: `venueListView.ts`/its tests remain unchanged (region-grouping selectors untouched); existing venue edit/delete flows unaffected.

No new Playwright E2E spec — this remains single-user, single-tenant-view interaction and admin-configuration work, not a multi-user/tenant-isolation workflow (Constitution III's Playwright trigger).

**Rationale**: Matches Constitution III exactly (xUnit for backend, Vitest+RTL for frontend, Playwright reserved for multi-user/tenant-isolation flows); backend Regions test coverage currently doesn't exist at all, so this feature also closes that gap for the endpoints it touches.

**Alternatives considered**: None — this is the established per-feature pattern in this repo (see specs 075, 079, 080).
