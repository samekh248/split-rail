# Quickstart & Validation: Venue Creation UI

**Feature**: `014-venue-creation-ui` | **Date**: 2026-06-17

Manual and automated validation for venue creation from the dashboard. See [contracts/venue-creation-ui.md](./contracts/venue-creation-ui.md) and [data-model.md](./data-model.md).

## Prerequisites

- .NET 8 SDK, Node 20+, Docker (Testcontainers for backend suite if running full CI locally).
- Features 001 (RBAC), 006 (auth forms), 007 (onboarding empty state), 009 (venue context) implemented.
- Admin user with `can_manage_permissions` (default Admin role).
- Optional: second user with Promoter/Booker role (no manage permission) for gating checks.

```bash
# API
dotnet run --project apps/api/split-rail-api.csproj

# Web (separate terminal)
cd apps/web && npm run dev
```

## Scenario A — First venue from empty state (User Story 1, P1)

1. Register a new account (or use seeded admin with zero venues).
2. Land on dashboard — see "No venues yet" empty state.
3. Click **Add venue** (empty-state CTA or header action).
4. Enter `The Roxy`, submit.

**Expected**: Redirect to dashboard; ledger/workspace visible; venue switcher shows `The Roxy`; `sessionStorage` active venue id set.

## Scenario B — Additional venue from header (User Story 2, P2)

1. Sign in as admin with ≥1 venue.
2. Click header **Add venue**.
3. Enter `Second Room`, submit.

**Expected**: Return to dashboard; new venue active; switcher lists both venues.

## Scenario C — Permission gating (User Story 3, P3)

1. Sign in as non-admin without `can_manage_permissions`, org with zero venues.

**Expected**: Empty state without Add venue CTA; explanatory copy only.

2. Sign in as same user when org has venues.

**Expected**: No header Add venue action.

3. Navigate directly to `http://localhost:5173/venues/new`.

**Expected**: Silent redirect to `/` with no toast/message.

## Scenario D — Validation & errors (User Story 4, P4)

1. Open create page; submit empty name.

**Expected**: Inline "required" error; no network call.

2. Enter 201-character name.

**Expected**: Max-length error before or at submit.

3. Double-click submit with valid name.

**Expected**: Single POST; button disabled while pending.

## Automated tests

```bash
cd apps/web
npm run test -- tests/pages/DashboardHome.test.tsx tests/pages/CreateVenuePage.test.tsx tests/hooks/useCanManageVenues.test.ts tests/api/venues.test.tsx
npm run test:coverage
```

**Expected**: All tests pass; coverage thresholds ≥80% lines/branches/functions/statements.

Backend regression (unchanged API):

```bash
dotnet test apps/api.tests/split-rail-api.tests.csproj --filter "FullyQualifiedName~VenuesControllerTests"
```

## API smoke (optional)

```bash
# After login token in env $TOKEN
curl -s -X POST http://localhost:5000/api/venues \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"API Smoke Venue"}'
```

**Expected**: `201` with `VenueResponse` body.
