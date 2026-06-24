# Quickstart & Validation: Event List & Selection UI

**Feature**: `015-event-list-selection-ui` | **Date**: 2026-06-17

Manual and automated validation. See [contracts/event-list-selection-ui.md](./contracts/event-list-selection-ui.md) and [data-model.md](./data-model.md).

## Prerequisites

- .NET 8 SDK, Node 20+, Docker (Testcontainers for backend integration tests).
- Features 009 (venue context), 014 (venue creation) implemented.
- User with `can_view_financials` (Financial Admin or equivalent).
- Optional: user without financials permission for gating checks.

```bash
# API
dotnet run --project apps/api/split-rail-api.csproj

# Web (separate terminal)
cd apps/web && npm run dev
```

After backend DTO changes, regenerate frontend types:

```bash
# From repo root — follow existing project script if documented; typical flow:
dotnet build apps/api/split-rail-api.csproj
# then run project's openapi → generated-api.ts step
```

## Scenario A — Select event for ledger (User Story 1, P1)

1. Sign in as financial user with active venue and ≥2 events.
2. Open dashboard — event combobox shows events with title, date, status.
3. Type in combobox to filter; select a different event.

**Expected**: Ledger reloads for selected event within ~3s; no hardcoded placeholder data.

## Scenario B — First event from empty state (User Story 2, P2)

1. Sign in with active venue and zero events.
2. See "No events yet" empty state with **Create event** CTA.
3. Click CTA — inline panel opens (stay on dashboard).
4. Enter title + date; optionally leave QBO tag blank; submit.

**Expected**: Panel closes; new event selected; ledger visible.

## Scenario C — Venue switch resets event (User Story 3, P3)

1. Select event A in venue 1.
2. Switch venue to venue 2 via venue switcher.

**Expected**: Event A not active; venue 2's default event selected or empty state shown.

## Scenario D — Edit and delete (User Story 4, P4)

1. With unlocked planning event, open combobox → Edit; change title; save.

**Expected**: Combobox and ledger header reflect new title.

2. With second unlocked planning event, Delete → confirm.

**Expected**: Event removed; another event selected or empty state.

3. Open budget-locked planning event.

**Expected**: Edit available; Delete disabled with explanation.

4. Open settled event.

**Expected**: Edit and Delete unavailable.

## Scenario E — Permission gating

1. Sign in as user without `can_view_financials`, venue with zero events.

**Expected**: Read-only empty state; no create CTA.

## Scenario F — Error recovery

1. With valid selection, simulate network failure on event list (devtools offline) → Retry.

**Expected**: Recoverable error with retry; no blank screen.

## Automated tests

```bash
# Backend
dotnet test apps/api.tests/split-rail-api.tests.csproj --filter "FullyQualifiedName~EventsControllerTests"

# Frontend
cd apps/web
npm run test -- tests/api/events.test.tsx tests/venue/activeEventStorage.test.ts tests/venue/eventSelection.test.ts tests/components/event tests/pages/DashboardHome.test.tsx tests/hooks/useCanManageEvents.test.ts
npm run test:coverage
```

**Expected**: All pass; ≥80% lines/branches/functions/statements on frontend.

## Optional E2E

```bash
# From repo root, with API + web running and Playwright configured
npx playwright test tests/e2e/specs/venue/event-selection.spec.ts
```

**Expected**: Create → ledger visible; switch event → grid updates.

## Regression checks

- Venue switcher (009) still works; event reset on venue change does not break header.
- `EventLedgerPage` unchanged except receiving real `eventId`.
- No references to `DEFAULT_EVENT_ID` in production dashboard path.
