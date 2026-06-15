# Data Model: QuickBooks Online Pull Cache & Inline Mapping Engine

**Feature**: 003-qbo-pull-cache-mapping
**Date**: 2026-06-14

Builds on the 001 tenant foundation and the 002 financial ledger entities (`events`, `financial_line_items`). All new entities are isolated through venue or event navigation chains to `organization_id` via EF Core global query filters. Monetary columns are `NUMERIC(12,2)` (mapped to C# `decimal`).

## Entity Relationship Diagram

```
┌──────────────────┐        ┌──────────────────────────────┐
│      venues      │        │            events            │  (existing from 002)
│   (existing)     │        ├──────────────────────────────┤
│ id        UUID PK│◄───┬───│ venue_id            UUID FK  │
│ organization_id  │    │   │ qbo_tag_name        VARCHAR  │  ← ingestion filter
└──────────────────┘    │   └───────┬──────────────────────┘
                        │           │ 1:N
                        │   ┌───────▼──────────────────────┐
                        │   │   financial_line_items        │  (existing from 002)
                        │   ├──────────────────────────────┤
                        │   │ id                  UUID PK  │
                        │   │ event_id            UUID FK  │
                        │   │ qbo_actual_value    NUM12,2  │  ← aggregated from sync ledger
                        │   └──────────────────────────────┘
                        │
                        │   ┌──────────────────────────────┐
                        ├───│   qbo_account_mappings       │  (NEW)
                        │   ├──────────────────────────────┤
                        │   │ id                  UUID PK  │
                        │   │ venue_id            UUID FK  │
                        │   │ qbo_account_id      VARCHAR  │
                        │   │ qbo_account_name    VARCHAR  │
                        │   │ mapped_category_label VARCHAR│
                        │   │ mapped_line_item_id UUID FK  │  ← optional FK to financial_line_items
                        │   │ created_at          TIMESTZ  │
                        │   │ UNIQUE(venue_id, qbo_account_id)│
                        │   └──────────────────────────────┘
                        │
                        │   ┌──────────────────────────────┐
                        ├───│   qbo_venue_credentials      │  (NEW)
                        │   ├──────────────────────────────┤
                        │   │ id                  UUID PK  │
                        │   │ venue_id            UUID FK  │  UNIQUE
                        │   │ realm_id            VARCHAR  │  QBO company ID
                        │   │ encrypted_access_token  TEXT │
                        │   │ encrypted_refresh_token TEXT │
                        │   │ token_expires_at    TIMESTZ  │
                        │   │ connected_at        TIMESTZ  │
                        │   │ connected_by_user_id UUID FK │
                        │   └──────────────────────────────┘
                        │
                        │   ┌──────────────────────────────┐
                        │   │   qbo_sync_ledger            │  (NEW)
                        │   ├──────────────────────────────┤
                        │   │ id                  UUID PK  │
                        │   │ event_id            UUID FK  │
                        │   │ qbo_transaction_id  VARCHAR  │  QBO's transaction ID
                        │   │ qbo_account_id      VARCHAR  │
                        │   │ amount              NUM12,2  │
                        │   │ transaction_date    DATE     │
                        │   │ mapped_line_item_id UUID FK  │  FK → financial_line_items.id (nullable)
                        │   │ sync_batch_id       UUID     │  groups entries per sync run
                        │   │ synced_at           TIMESTZ  │
                        │   │ UNIQUE(event_id, qbo_transaction_id) │
                        │   └──────────────────────────────┘
                        │
                        └───┌──────────────────────────────┐
                            │unmapped_qbo_transactions     │  (NEW)
                            ├──────────────────────────────┤
                            │ id                  UUID PK  │
                            │ event_id            UUID FK  │
                            │ venue_id            UUID FK  │  denormalized for fast queries
                            │ qbo_transaction_id  VARCHAR  │
                            │ qbo_account_id      VARCHAR  │
                            │ qbo_account_name    VARCHAR  │
                            │ amount              NUM12,2  │
                            │ transaction_date    DATE     │
                            │ synced_at           TIMESTZ  │
                            │ UNIQUE(event_id, qbo_transaction_id) │
                            └──────────────────────────────┘
```

## Entities

### QboAccountMapping (New)

Persistent rule linking a QBO Chart of Accounts entry to a ledger category at the venue level. Used for self-healing routing: once mapped, all future transactions with the same `qbo_account_id` at the venue automatically route to the mapped row.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK, default `gen_random_uuid()` | |
| venue_id | UUID | FK → venues.id, NOT NULL | CASCADE DELETE; isolation anchor |
| qbo_account_id | VARCHAR(100) | NOT NULL | Intuit's account identifier |
| qbo_account_name | VARCHAR(255) | NOT NULL | Human-readable account name from QBO |
| mapped_category_label | VARCHAR(255) | NOT NULL | Target ledger row label (denormalized for display) |
| mapped_line_item_id | UUID | FK → financial_line_items.id, NULL | Optional direct FK for precise routing |
| created_at | TIMESTAMPTZ | NOT NULL, default `NOW()` | |

**Relationships**: Belongs to Venue (N:1). Optionally references a FinancialLineItem.
**Indexes**: Unique composite `IX_qbo_account_mappings_venue_account` on `(venue_id, qbo_account_id)`.
**Query filter**: `OrganizationId == null || Venue.OrganizationId == OrganizationId`.

### QboVenueCredential (New)

Encrypted OAuth 2.0 token storage per venue. One venue connects to one QBO company (realm).

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK, default `gen_random_uuid()` | |
| venue_id | UUID | FK → venues.id, NOT NULL, UNIQUE | One credential per venue |
| realm_id | VARCHAR(50) | NOT NULL | QBO company ID |
| encrypted_access_token | TEXT | NOT NULL | Data Protection encrypted |
| encrypted_refresh_token | TEXT | NOT NULL | Data Protection encrypted |
| token_expires_at | TIMESTAMPTZ | NOT NULL | When access token expires |
| connected_at | TIMESTAMPTZ | NOT NULL, default `NOW()` | |
| connected_by_user_id | UUID | FK → users.id, NULL | Who initiated the connection |

**Relationships**: Belongs to Venue (1:1).
**Indexes**: Unique `IX_qbo_venue_credentials_venue_id` on `venue_id`.
**Query filter**: `OrganizationId == null || Venue.OrganizationId == OrganizationId`.

### QboSyncLedger (New)

Append-only audit trail of every QBO transaction ever ingested. Each row represents one transaction from one sync batch. `qbo_actual_value` on `financial_line_items` is computed as `SUM(amount)` from this table where `mapped_line_item_id` matches.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK, default `gen_random_uuid()` | |
| event_id | UUID | FK → events.id, NOT NULL | CASCADE DELETE |
| qbo_transaction_id | VARCHAR(100) | NOT NULL | Intuit's transaction ID — idempotency key |
| qbo_account_id | VARCHAR(100) | NOT NULL | Which QBO account this came from |
| amount | NUMERIC(12,2) | NOT NULL | Transaction amount (`decimal`) |
| transaction_date | DATE | NOT NULL | When the transaction occurred in QBO |
| mapped_line_item_id | UUID | FK → financial_line_items.id, NULL | Target line item (null if unmapped at ingest time) |
| sync_batch_id | UUID | NOT NULL | Groups entries from the same sync run |
| synced_at | TIMESTAMPTZ | NOT NULL, default `NOW()` | |

**Relationships**: Belongs to Event (N:1). Optionally references a FinancialLineItem.
**Indexes**: Unique composite `IX_qbo_sync_ledger_event_txn` on `(event_id, qbo_transaction_id)`. Index on `mapped_line_item_id` for SUM aggregation.
**Query filter**: `OrganizationId == null || Event.Venue.OrganizationId == OrganizationId`.
**Immutability**: No UPDATE or DELETE operations are generated for this table. Rows are INSERT-only (append-only, Constitution IV).

### UnmappedQboTransaction (New)

Staging table for transactions with no mapping. Rows are deleted when the account is mapped (re-processed into `qbo_sync_ledger`).

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK, default `gen_random_uuid()` | |
| event_id | UUID | FK → events.id, NOT NULL | CASCADE DELETE |
| venue_id | UUID | FK → venues.id, NOT NULL | Denormalized for fast venue-scope queries |
| qbo_transaction_id | VARCHAR(100) | NOT NULL | Intuit's transaction ID |
| qbo_account_id | VARCHAR(100) | NOT NULL | Unmapped account |
| qbo_account_name | VARCHAR(255) | NOT NULL | Human-readable name from QBO |
| amount | NUMERIC(12,2) | NOT NULL | Transaction amount |
| transaction_date | DATE | NOT NULL | |
| synced_at | TIMESTAMPTZ | NOT NULL, default `NOW()` | When this was ingested |

**Relationships**: Belongs to Event (N:1) and Venue (N:1).
**Indexes**: Unique composite `IX_unmapped_qbo_txn_event_txn` on `(event_id, qbo_transaction_id)`. Index on `(venue_id, qbo_account_id)` for mapping resolution queries.
**Query filter**: `OrganizationId == null || Venue.OrganizationId == OrganizationId`.
**Lifecycle**: Rows are created during sync when no mapping exists. When a mapping is created for a `qbo_account_id`, all matching unmapped rows at the venue are re-processed (moved to `qbo_sync_ledger` with the correct `mapped_line_item_id`) and then deleted from this table.

## Consumed Entities (from feature 002)

### Event (consumed — `qbo_tag_name`)

The `qbo_tag_name` field (VARCHAR 100, NOT NULL) serves as the ingestion filter key. The sync pipeline queries QBO transactions tagged with this value.

### FinancialLineItem (consumed — `qbo_actual_value`)

The `qbo_actual_value` field (NUMERIC 12,2, default `0.00`) is the aggregation target. Its value is recomputed as `SUM(qbo_sync_ledger.amount)` where `mapped_line_item_id = financial_line_items.id` after each sync or mapping operation. This field remains read-only from the user's perspective (no manual entry).

## Validation Rules

- **qbo_account_id**: required, ≤100 chars.
- **qbo_account_name**: required, ≤255 chars.
- **mapped_category_label**: required, ≤255 chars.
- **realm_id**: required, ≤50 chars.
- **amount**: parsed from invariant-culture decimal strings; stored as `NUMERIC(12,2)`.
- **Unique constraints**: `(venue_id, qbo_account_id)` on mappings; `(event_id, qbo_transaction_id)` on sync ledger and unmapped tables.
- **Token fields**: MUST be encrypted via Data Protection before storage; MUST be decrypted only in-memory for API calls; MUST NOT appear in any log output.
- **Append-only guard**: No code path generates UPDATE or DELETE statements against `qbo_sync_ledger`. EF Core entity configuration marks this table as read-only after INSERT (enforced via code review and integration tests).

## Sync Flow (State Machine)

```
[QBO Transaction Fetched]
      │
      ▼
[Check qbo_transaction_id in qbo_sync_ledger]──exists──► SKIP (idempotent)
      │
      │ new
      ▼
[Resolve qbo_account_id against qbo_account_mappings for venue]
      │                                    │
      │ mapped                             │ unmapped
      ▼                                    ▼
[INSERT into qbo_sync_ledger         [INSERT into unmapped_qbo_transactions]
 with mapped_line_item_id]            [Increment unmapped counter]
      │
      ▼
[Recompute qbo_actual_value = SUM(amount)
 on target financial_line_item]
```

### Inline Mapping Flow

```
[User selects unmapped transaction]
      │
      ▼
[User picks target ledger row from dropdown]
      │
      ▼
[POST /api/venues/{venueId}/mappings]
      │
      ▼
[INSERT/UPSERT qbo_account_mappings]
      │
      ▼
[Re-process all unmapped_qbo_transactions for this qbo_account_id at venue]
      │
      ├──► INSERT into qbo_sync_ledger (with mapped_line_item_id)
      ├──► Recompute qbo_actual_value on target line items
      └──► DELETE matched rows from unmapped_qbo_transactions
```
