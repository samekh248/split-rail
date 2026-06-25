# Quickstart & Validation: Venue Page Region Controls

**Feature**: `075-venue-region-controls` | **Date**: 2026-06-25

Manual and automated validation. See [contracts/venues-page-ui.md](./contracts/venues-page-ui.md) and [data-model.md](./data-model.md).

**Depends on**: spec 073 regions API and `RegionManagementPanel` implemented.

## Prerequisites

- .NET 8 SDK, Node 20+.
- Admin user with `can_manage_permissions`.
- Org with ≥2 regions and ≥4 venues (mix of assigned and unassigned).
- Optional: scoped user with access to subset of venues.

```bash
dotnet run --project apps/api/split-rail-api.csproj

cd apps/web && npm run dev
```

## Scenario A — Manage regions from Venues page (US1)

1. Sign in as admin; open **Venues** in global nav (`/venues`).
2. Confirm **Manage regions** appears in toolbar (not on Booking Calendar).
3. Click **Manage regions**; create region "Southwest".
4. Open Booking Calendar — confirm no **Manage regions** button.

**Expected**: Region panel works; calendar header lacks manage control.

## Scenario B — Region filter (US2)

1. On Venues page with venues in two regions + one unassigned.
2. Filter defaults to **All regions** — all visible venues listed.
3. Select region A — only its venues shown.
4. Select **Unassigned** — only venues without region.
5. Select **All regions** — full list restored.
6. Filter to region with no venues (if seeded) — empty-state "no venues match" in flat mode.

**Expected**: Instant client-side filter; distinct empty-filter message.

## Scenario C — Grouped vs flat display (US3)

1. Toggle to **By region**.
2. Confirm sections per region (alphabetical), **Unassigned** last if present.
3. Confirm empty region shows heading + "No venues".
4. Toggle to **List** — single A–Z table, no region column.
5. With filter active + grouped — only matching section visible.

**Expected**: No page reload; flat mode has no region labels.

## Scenario D — Preference persistence (FR-008a)

1. Set filter to region A and display to **By region**.
2. Navigate to Dashboard; return to Venues.

**Expected**: Same filter and display mode restored.

3. Open new incognito window — defaults **All regions** + **List**.

## Scenario E — Permissions (FR-009)

1. Sign in as user without `can_manage_permissions`.

**Expected**: No **Manage regions** button; filter and toggle still work.

## Scenario F — Scoped user

1. Sign in as user scoped to one venue in region A.

**Expected**: Filter options only include regions with visible venues; list respects scope.

## Automated tests

```bash
cd apps/web
npm run test -- tests/lib/venueListView.test.ts tests/lib/venueListViewStorage.test.ts tests/pages/VenuesPage.test.tsx tests/components/venue/VenueListGrouped.test.tsx
```

Update booking calendar control tests to assert `booking-manage-regions` absent.

```bash
npm run test:coverage
```

**Expected**: ≥80% line/branch on `apps/web` (Constitution III).

## Backend suite

No new backend tests required unless incidental file touched. If zero backend changes, CI backend gate unchanged.
