# Quickstart & Validation: Unified Booking Calendar

**Feature**: `073-unified-booking-calendar` | **Date**: 2026-06-25

Manual and automated validation for the booking calendar module. See [contracts/](./contracts/) and [data-model.md](./data-model.md).

## Prerequisites

- .NET 8 SDK, Node 20+, Docker (Testcontainers for API integration tests)
- Branch `074-unified-booking-calendar`
- Migrations applied: `cd apps/api && dotnet ef database update`
- OpenAPI types regenerated: `npm run generate:api` (from repo root or `apps/web`)

```bash
# API
cd apps/api
dotnet build
dotnet test

# Web
cd apps/web
npm install
npm run test:coverage
```

## Automated tests

### Backend (xUnit)

```bash
cd apps/api
dotnet test --filter "FullyQualifiedName~Region"
dotnet test --filter "FullyQualifiedName~Calendar"
dotnet test --filter "FullyQualifiedName~BookingConflict"
```

**Expected**: Conflict matrix cases in [booking-conflicts.md](./contracts/booking-conflicts.md) all pass; tenant isolation verified.

### Frontend (Vitest)

```bash
cd apps/web
npm run test -- tests/lib/bookingCalendar.test.ts
npm run test -- tests/booking/
```

**Expected**: ≥80% line/branch on new/modified files (Constitution III).

### E2E (Playwright)

```bash
cd tests/e2e
npx playwright test specs/booking/
```

## Scenario A — Navigation (User Story 1)

1. Sign in as user with financial view permission.
2. Click **Booking Calendar** in global nav.

**Expected**: Lands on `/booking`; nav item active; no "Coming soon" label.

## Scenario B — Regions (User Story 2)

1. Open **Manage regions**; create "Pacific Northwest" with notes.
2. Edit a venue; assign to that region.
3. Open Global view.

**Expected**: Venue column grouped under "Pacific Northwest"; unassigned venues under "Unassigned".

## Scenario C — View modes (User Story 3)

1. Seed placements across 3 regions / 5 venues.
2. Switch Global → Regional (one region) → Single-venue.

**Expected**: Venue columns filter without full page reload; first session open defaults to Global + current month.

## Scenario D — Visual status (User Story 4)

1. Create Hold 1, Hold 2, Confirmed, and Cancelled on same venue/month.

**Expected**: Distinct chip styles; Cancelled hidden until toggle on.

## Scenario E — Create confirmed (User Story 5)

1. **+ Create Event** → fill venue, date, title → save.

**Expected**: Confirmed chip on grid; workspace link available; second Confirmed same date → error.

## Scenario F — Create holds (User Story 6)

1. **+ Create Hold** on open date → Hold 1.
2. Second hold same date → Hold 2.
3. Third hold → rejected.
4. Attempt workspace from hold → blocked.

**Expected**: Per [booking-conflicts.md](./contracts/booking-conflicts.md).

## Scenario G — Daily agenda (User Story 7)

1. Click a busy date cell.

**Expected**: `booking-daily-agenda` lists all placements chronologically with venue, time, status.

## Scenario H — Control panel (User Story 8)

1. Open Confirmed placement → edit date → save.
2. Release hold → confirm → slot opens.
3. Cancel Confirmed with line items → warning shown.

**Expected**: Grid refreshes without reload; immutability on settled shows.

## Scenario I — Mobile (User Story 9)

1. Resize to 375px width.

**Expected**: Matrix hidden; mobile stream visible; create/edit still works.

## Scenario J — Promote hold (User Story 10)

1. Hold 1 + Hold 2 on same date; promote Hold 1.

**Expected**: Confirmed + Hold 2 both visible; workspace opens for promoted show only.

## Scenario K — Dashboard badge (FR-025)

1. Open dashboard with upcoming events.

**Expected**: Event cards show real booking status (not hash preview).

## Coverage gate

```bash
cd apps/api && dotnet test /p:CollectCoverage=true
cd apps/web && npm run test:coverage
```

**Expected**: ≥80% line/branch on all new/modified source files.
