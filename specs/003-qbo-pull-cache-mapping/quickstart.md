# Quickstart: QuickBooks Online Pull Cache & Inline Mapping Engine

**Feature**: 003-qbo-pull-cache-mapping
**Date**: 2026-06-14

Validation scenarios that prove the feature works end-to-end. See [data-model.md](data-model.md) for entity details and [contracts/](contracts/) for API specifications.

## Prerequisites

- .NET 8.0 SDK installed
- Node.js 20+ and npm
- PostgreSQL 16 (local or Docker via `docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=dev postgres:16`)
- Docker (for Testcontainers in integration tests)
- Features 001 (Tenant Foundation) and 002 (Financial Ledger Grid) implemented and migrations applied
- A QBO sandbox app registration with `com.intuit.quickbooks.accounting` scope (for E2E; unit/integration tests mock the QBO API)

## Setup

```bash
# From repo root

# 1. Apply new migrations
cd apps/api
dotnet ef database update

# 2. Install any new backend packages
dotnet restore

# 3. Regenerate frontend API types (after backend builds)
cd ../web
npm run generate-types

# 4. Start the backend
cd ../api
dotnet run

# 5. Start the frontend (separate terminal)
cd ../web
npm run dev
```

## Validation Scenario 1: Scheduled Sync Ingests Transactions (P1)

**Goal**: Prove the sync pipeline fetches QBO transactions by tag, resolves mappings, and aggregates into `qbo_actual_value`.

1. Create an event with `qbo_tag_name = "Show-104"` via the existing ledger API.
2. Add revenue and expense line items to the event.
3. Create a QBO account mapping: `POST /api/venues/{venueId}/mappings` with `{ "qboAccountId": "ACC-001", "mappedCategoryLabel": "Production" }`.
4. Mock the QBO API (or use sandbox) to return transactions tagged `Show-104` with `qbo_account_id = "ACC-001"`.
5. Trigger sync: `POST /api/venues/{venueId}/events/{eventId}/sync`.
6. **Expected**: Sync response shows `transactionsMapped ≥ 1`, `transactionsUnmapped = 0`. The `GET /ledger` response shows updated `qboActualValue` on the matching line item.

```bash
# Trigger manual sync
curl -X POST http://localhost:5000/api/venues/{venueId}/events/{eventId}/sync \
  -H "Authorization: Bearer {token}"

# Verify ledger shows updated QBO actuals
curl http://localhost:5000/api/venues/{venueId}/events/{eventId}/ledger \
  -H "Authorization: Bearer {token}"
```

## Validation Scenario 2: Append-Only Integrity (P1)

**Goal**: Prove that a second sync does not overwrite or delete previously-cached actuals.

1. Complete Scenario 1 (initial sync with mapped transactions).
2. Note the `qbo_actual_value` on the affected line item.
3. Modify the mock QBO API to return the same transaction with a different amount (simulating upstream edit).
4. Trigger sync again: `POST /api/venues/{venueId}/events/{eventId}/sync`.
5. **Expected**: The `qbo_actual_value` remains unchanged (original amount preserved). The `qbo_sync_ledger` table shows only the original entry — no UPDATE or new INSERT for the same `qbo_transaction_id`.

## Validation Scenario 3: Unmapped Transaction Handling (P2)

**Goal**: Prove unmapped transactions are staged, surfaced in the UI, and resolved via inline mapping.

1. Create an event with line items.
2. Mock the QBO API to return a transaction with `qbo_account_id = "ACC-NEW"` (no mapping exists).
3. Trigger sync: `POST /api/venues/{venueId}/events/{eventId}/sync`.
4. **Expected**: Sync response shows `transactionsUnmapped = 1`.
5. Verify unmapped list: `GET /api/venues/{venueId}/events/{eventId}/unmapped-transactions`.
6. **Expected**: Response shows one unmapped transaction with `qboAccountId = "ACC-NEW"`.
7. Create mapping: `POST /api/venues/{venueId}/mappings` with `{ "qboAccountId": "ACC-NEW", "mappedCategoryLabel": "Marketing" }`.
8. **Expected**: Unmapped count drops to 0. The previously-unmapped transaction is now in `qbo_sync_ledger` and `qbo_actual_value` is updated on the target line item.

```bash
# Check unmapped count
curl http://localhost:5000/api/venues/{venueId}/events/{eventId}/unmapped-count \
  -H "Authorization: Bearer {token}"

# Create mapping (resolves unmapped transactions automatically)
curl -X POST http://localhost:5000/api/venues/{venueId}/mappings \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"qboAccountId":"ACC-NEW","qboAccountName":"Marketing Services","mappedCategoryLabel":"Marketing"}'
```

## Validation Scenario 4: Self-Healing Routing (P2)

**Goal**: Prove that once a mapping exists, future syncs auto-route transactions with no human intervention.

1. Complete Scenario 3 (mapping for `ACC-NEW` exists).
2. Create a second event at the same venue with different line items.
3. Mock the QBO API to return a new transaction with `qbo_account_id = "ACC-NEW"` for the second event.
4. Trigger sync for the second event.
5. **Expected**: The transaction auto-routes to the mapped category. `transactionsUnmapped = 0`. No new unmapped entries.

## Validation Scenario 5: Manual Sync Permission Gating (P3)

**Goal**: Prove the sync endpoint enforces `can_trigger_qbo_sync` permission and venue scope.

1. Authenticate as a user WITHOUT `can_trigger_qbo_sync` permission.
2. Call `POST /api/venues/{venueId}/events/{eventId}/sync`.
3. **Expected**: HTTP 403 Forbidden.
4. Authenticate as a user with `can_trigger_qbo_sync` but scoped to a different venue.
5. Call the sync endpoint for an out-of-scope venue.
6. **Expected**: HTTP 403 or 404.

```bash
# Expect 403
curl -X POST http://localhost:5000/api/venues/{venueId}/events/{eventId}/sync \
  -H "Authorization: Bearer {unprivileged_token}" \
  -w "\n%{http_code}"
```

## Validation Scenario 6: Read-Only Enforcement (P1)

**Goal**: Prove no code path issues write operations to QBO.

This is validated via automated tests rather than a manual scenario:

```bash
cd apps/api.tests
dotnet test --filter "FullyQualifiedName~QboReadOnlyTests"
```

**Expected**: All tests pass, confirming that the mocked `HttpMessageHandler` never receives POST/PUT/DELETE requests to Intuit endpoints.

## Running All Tests

```bash
# Backend unit + integration tests
cd apps/api.tests
dotnet test

# Frontend component tests
cd apps/web
npm test
```

**Expected**: All tests pass with ≥80% coverage.
