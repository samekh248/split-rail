# Quickstart: Global Nav QBO Views (SPLR-77)

**Feature**: `037-global-nav-qbo-views` | **Date**: 2026-06-19

Validate navigation wiring, accounting overview, venue-wide sync, and permission gates. See [contracts/](./contracts/) and [data-model.md](./data-model.md) for shapes.

## Prerequisites

- Branch `037-global-nav-qbo-views` checked out
- Dependencies: **031** dashboard API, **030** pin endpoints, **034** action center, **035** unassigned banner/drawer, **036** bottleneck helpers (blocked by SPLR-76 — merge or stub before full integration)
- Seed data: one org, two venues, admin with `canViewFinancials` + `canTriggerQboSync`, scoped user without financial permission, venue with QBO credential, ≥2 events with `qbo_tag_name`, ≥1 unmapped transaction

## 1. Backend — build and test new endpoints

```powershell
cd apps/api
dotnet build
cd ../api.tests
dotnet test --filter "FullyQualifiedName~VenueSync|FullyQualifiedName~VenueQboStatus"
```

**Expected**: All new integration tests pass; `VenueSyncResultDto` returns per-event results on partial failure.

## 2. Regenerate frontend types

```powershell
cd apps/api
dotnet build
# Run existing OpenAPI → generated-api.ts pipeline per repo convention
```

**Expected**: `VenueQboStatusDto`, `VenueSyncResultDto` present in `apps/web/src/types/generated-api.ts`.

## 3. Frontend unit tests

```powershell
cd apps/web
npm test -- --run tests/shell/GlobalNav.test.tsx tests/lib/globalNav.test.ts tests/pages/AccountingOverviewPage.test.tsx tests/components/qbo/SyncAllButton.test.tsx
```

**Expected**: Green; coverage ≥80% on touched shell/qbo/page files.

## 4. Manual — global nav permission matrix

1. Sign in as **admin** (financial permission).
2. Confirm left rail shows **Settlements / Accounting Sync** without "Coming soon".
3. Sign in as **non-financial** role.
4. Confirm accounting item is **absent** from global nav (desktop and mobile drawer).

## 5. Manual — navigation and active states

1. As admin, on dashboard `/`, click **Settlements / Accounting Sync**.
2. Confirm URL is `/accounting` and accounting nav item is **highlighted** (dashboard not highlighted).
3. Navigate to an event workspace — confirm **dashboard** highlighted, accounting not.
4. Open Settings — confirm **no** global item highlighted.
5. Switch venue in top bar on `/accounting` — confirm counts and status card refresh.

## 6. Manual — all-venues exit

1. On dashboard, select **All venues** aggregate view.
2. Click accounting nav.
3. Confirm overview loads for a **single** venue (last selected or first venue); all-venues mode exited.

## 7. Manual — overview content

1. On `/accounting` with unmapped transactions seeded:
   - Unassigned banner visible with correct count.
   - Open drawer → accordion → inline map one transaction → counts decrease.
2. Workload list shows events with unmapped or bottleneck alerts.
3. QBO status card shows connected/disconnected correctly.
4. Click event workspace link → lands with `?focus=sync`.

## 8. Manual — Sync all

1. As user **with** `canTriggerQboSync`, click **Sync all**.
2. Confirm progress state and completion summary.
3. Sign in as view-only financial user — **Sync all** not visible.

## 9. Manual — no venue

1. New org with zero venues (or simulate empty state).
2. Accounting nav still visible for financial admin.
3. Overview shows same empty-state guidance as dashboard.

## 10. Coverage gate

```powershell
cd apps/web
npm run test:coverage
cd ../api.tests
dotnet test /p:CollectCoverage=true
```

**Expected**: ≥80% line/branch on backend and frontend for this feature's touched files (Constitution III).

## Failure triage

| Symptom | Check |
|---------|-------|
| Accounting nav still "Coming soon" | `GlobalNav` permission filter; `globalNav.ts` `disabled` removed |
| Dashboard highlighted on `/accounting` | `matchPaths` includes `/accounting`; `resolveActiveGlobalNavId` order |
| Sync all 403 | User role `canTriggerQboSync`; endpoint permission attribute |
| Banner counts stale after map | Dashboard query invalidation from drawer on accounting page |
| All-venues not exiting | `navigateToAccounting` calls `activateVenueId` |
