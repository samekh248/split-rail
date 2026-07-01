# Quickstart: QuickBooks Online Core Integration

**Feature**: 076-qbo-online-sync | **Date**: 2026-06-26

End-to-end validation scenarios. See [data-model.md](data-model.md) and [contracts/](contracts/) for details.

## Prerequisites

- Specs 003, 037, 048, 057 implemented (QBO pull pipeline, accounting views, egress guard, scheduler OIDC).
- .NET 8 SDK, Node.js 20+, PostgreSQL 16, Docker (Testcontainers).
- Intuit sandbox app with `com.intuit.quickbooks.accounting` scope for manual OAuth validation.
- QBO sandbox company with at least one Class or Tag configured.

## Setup

```bash
# From repo root

# 1. Apply migrations (QboTrackingMapping, Organization.TimeZoneId, credential extensions)
cd apps/api
dotnet ef database update

# 2. Restore and regenerate frontend types
dotnet build
cd ../web
npm run generate-types

# 3. Start API (Development → sandbox URLs)
cd ../api
dotnet run

# 4. Start web (separate terminal)
cd ../web
npm run dev
```

Configure `QboSync:ClientId`, `ClientSecret`, `RedirectUri` in user secrets or `appsettings.Development.json`.

## Scenario A — Admin connects from Settings Integrations (P1)

1. Sign in as **Admin**.
2. Profile Badge → Settings → **Integrations**.
3. Select venue (if multi-venue).
4. Click **Connect to QuickBooks**; complete Intuit sandbox OAuth.
5. **Expected**: Redirect to `/settings/integrations?venueId=…&qboConnected=true`; card shows **Connected** with company name, realm id, last sync.

```bash
curl http://localhost:5000/api/venues/{venueId}/qbo/integration \
  -H "Authorization: Bearer {adminToken}"
# Expect connectionState: "Connected"
```

## Scenario B — Non-Admin blocked (P1)

1. Sign in as **Venue Manager** or **External Bookkeeper**.
2. **Expected**: Integrations nav item hidden.
3. Navigate manually to `/settings/integrations`.
4. **Expected**: Redirect to `/settings` with toast; no integration controls.
5. Attempt `POST /api/venues/{venueId}/qbo/disconnect` as non-Admin.
6. **Expected**: HTTP 403; audit log entry emitted.

## Scenario C — Tracking mapping + sync (P2)

1. As Admin with connected venue, open Integrations → **Tracking Mappings** tab.
2. Bind sandbox Tag `Show-104` to an Event.
3. Create event with matching QBO transactions in sandbox (or use test seed).
4. Click **Force Pull Latest QBO Data**.
5. **Expected**: Event ledger shows updated QBO actuals; variance calculated.

```bash
curl -X POST "http://localhost:5000/api/venues/{venueId}/qbo/tracking-mappings" \
  -H "Authorization: Bearer {adminToken}" \
  -H "Content-Type: application/json" \
  -d '{"qboTrackingType":"Tag","qboTrackingId":"1","qboTrackingName":"Show-104","targetTier":"Event","targetEntityId":"{eventId}"}'
```

## Scenario D — Quick Assign on event form (P2)

1. As Admin, create/edit event via event form.
2. Use **Quick Assign Tracking** typeahead; select a catalog Tag.
3. Save event.
4. **Expected**: Event-tier tracking mapping created; visible in Integrations console.

## Scenario E — Disconnect + purge (P3)

1. As Admin, **Disconnect Account** on Integrations card.
2. **Expected**: Card shows Disconnected; ledger still shows cached QBO actuals (snapshot).
3. Click **Clear Cached QBO Data**; confirm modal.
4. **Expected**: QBO actuals cleared from ledger; settlement PDF archive still retrievable if event was settled.

## Scenario F — Force Pull debounce (P3)

1. As Admin, click **Force Pull** twice within 30 seconds.
2. **Expected**: Second click debounced client-side; server returns 429 if bypassed.

## Scenario G — Nightly timezone dispatch (P3)

Unit test (no manual wait required):

```bash
cd apps/api
dotnet test --filter "FullyQualifiedName~NightlyDispatch"
```

Manual operator check (deployed dev):

```bash
# Verify scheduler cron updated
./deploy/lib/validate-qbo-scheduler.sh
# Expect cron */15 * * * *
```

## Scenario H — Disconnected UI degradation (P4)

1. Disconnect all venues (or use org with no connections).
2. Open event ledger, dashboard, post-show event card.
3. **Expected**: No QBO/variance columns; Admin dashboard shows onboarding CTA; non-Admin does not; event card shows sync unavailable.

## Scenario I — Expired connection (P1)

1. Revoke app access in Intuit developer portal (or mock refresh 401 in integration test).
2. Reload Integrations page.
3. **Expected**: **Connection Expired** state with **Reconnect** CTA; no unhandled exception.

## Automated test suites

```bash
# Backend
cd apps/api
dotnet test --filter "FullyQualifiedName~Qbo"
dotnet test --filter "FullyQualifiedName~AdminRole"

# Frontend
cd apps/web
npm test -- tests/components/qbo tests/pages/IntegrationsSettingsPage.test.tsx
npm test -- tests/deploy/deployQboScheduler.test.ts

# Coverage gate (Constitution III)
npm run test:coverage   # apps/web
dotnet test /p:CollectCoverage=true   # apps/api — per project CI config
```

**Expect**: ≥80% line/branch coverage on touched files; zero mutating Intuit HTTP verbs in integration tests.

## Environment routing check (FR-015)

| Environment | Intuit API host |
|-------------|-----------------|
| Development | `sandbox-quickbooks.api.intuit.com` |
| Production | `quickbooks.api.intuit.com` |

Verify via `QboSyncOptions.EnvironmentProfile` unit test — no production sandbox toggle in UI.
