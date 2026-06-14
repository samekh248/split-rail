# Data Model: Core Financial Ledger Grid & Base-10 Math Engine

**Feature**: 002-financial-ledger-grid
**Date**: 2026-06-14

Builds on the 001 tenant foundation (`organizations`, `venues`, `users`, `organization_roles`). All new entities are isolated through the `event → venue → organization_id` chain via EF Core global query filters. Monetary columns are `NUMERIC(12,2)` (mapped to C# `decimal`); percentage columns are `NUMERIC(5,2)`.

## Entity Relationship Diagram

```
┌──────────────────┐        ┌──────────────────────────────┐
│      venues      │        │            events            │  (NEW)
│   (existing)     │        ├──────────────────────────────┤
│ id        UUID PK│◄───────│ id                  UUID PK  │
│ organization_id  │        │ venue_id            UUID FK  │
└──────────────────┘        │ title               VARCHAR  │
                            │ event_date          DATE     │
                            │ status        event_status   │  PRE_SHOW|SETTLED|RECONCILED
                            │ qbo_tag_name        VARCHAR  │
                            │ is_budget_locked    BOOL     │
                            │ settled_at          TIMESTZ  │
                            │ settled_by_user_id  UUID FK  │
                            │ created_at          TIMESTZ  │
                            └───────┬──────────────┬───────┘
                                    │ 1:N          │ 1:N
                       ┌────────────▼───┐   ┌──────▼───────────────────┐
                       │financial_line_ │   │      event_artists       │  (NEW)
                       │     items      │   ├──────────────────────────┤
                       │    (NEW)       │   │ id                UUID PK │
                       ├────────────────┤   │ event_id          UUID FK │
                       │ id        UUID │   │ artist_name       VARCHAR │
                       │ event_id  UUID │   │ performance_order INT     │
                       │ block_type     │   │ deal_type         VARCHAR │  guarantee|door_split|custom
                       │ row_label      │   │ custom_formula_expression │
                       │ sort_order     │   │ base_guarantee    NUM12,2 │
                       │ is_artist_     │   │ backend_percentage NUM5,2 │
                       │   deduction    │   │ tax_withholding_   NUM5,2 │
                       │ proforma_value │   │   percentage              │
                       │ settlement_val │   │ calculated_net_   NUM12,2 │
                       │ qbo_actual_val │   │   payout                  │
                       │ notes          │   │ xmin (concurrency)        │
                       │ is_hidden_from_│   └──────────────────────────┘
                       │   promoter     │
                       │ updated_at     │
                       │ xmin (concur.) │
                       └────────────────┘
```

## Enums

### `event_status` (PostgreSQL ENUM `event_status`)

| Value | Meaning |
|-------|---------|
| `PRE_SHOW` | Planning / settlement-prep phase |
| `SETTLED` | Settlement frozen (post-signature) |
| `RECONCILED` | QBO actuals reconciled |

Mapped in EF Core via Npgsql enum mapping (`MapEnum<EventStatus>`) or a string conversion. C# enum `EventStatus { PreShow, Settled, Reconciled }`.

### `BlockType` (stored as `VARCHAR(20)`)

`REVENUE` | `EXPENSES` | `DEAL_MATH`

### `DealType` (stored as `VARCHAR(50)`)

`guarantee` | `door_split` | `custom`

## Entities

### Event (New)

A single show belonging to a venue (and therefore an organization). Owns line items and artist deals; drives the lifecycle state machine.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK, default `gen_random_uuid()` | |
| venue_id | UUID | FK → venues.id, NOT NULL | CASCADE DELETE; isolation anchor |
| title | VARCHAR(255) | NOT NULL | |
| event_date | DATE | NOT NULL | |
| status | event_status | NOT NULL, default `PRE_SHOW` | lifecycle state |
| qbo_tag_name | VARCHAR(100) | NOT NULL | tag for future QBO sync |
| is_budget_locked | BOOL | NOT NULL, default `false` | locks proforma column |
| settled_at | TIMESTAMPTZ | NULL | set on settlement |
| settled_by_user_id | UUID | FK → users.id, NULL | who settled |
| created_at | TIMESTAMPTZ | NOT NULL, default `NOW()` | |

**Relationships**: Belongs to Venue (N:1); owns FinancialLineItems (1:N), EventArtists (1:N).
**Indexes**: `IX_events_venue_id` on venue_id.
**Query filter**: `OrganizationId == null || Venue.OrganizationId == OrganizationId`.

### FinancialLineItem (New)

A single ledger row within an event, classified by block, with per-column monetary values.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK, default `gen_random_uuid()` | |
| event_id | UUID | FK → events.id, NOT NULL | CASCADE DELETE |
| block_type | VARCHAR(20) | NOT NULL | `REVENUE` \| `EXPENSES` \| `DEAL_MATH` |
| row_label | VARCHAR(255) | NOT NULL | |
| sort_order | INT | NOT NULL, default 0 | ordering within block |
| is_artist_deduction | BOOL | NOT NULL, default `false` | subtract from gross before split |
| proforma_value | NUMERIC(12,2) | NOT NULL, default `0.00` | budget column |
| settlement_value | NUMERIC(12,2) | NOT NULL, default `0.00` | night-of column |
| qbo_actual_value | NUMERIC(12,2) | NOT NULL, default `0.00` | read-only; QBO sync later |
| notes | TEXT | NULL | free text |
| is_hidden_from_promoter | BOOL | NOT NULL, default `false` | future promoter row hiding |
| updated_at | TIMESTAMPTZ | NOT NULL, default `NOW()` | |
| (xmin) | system | concurrency token | Npgsql `UseXminAsConcurrencyToken()` |

**Relationships**: Belongs to Event (N:1).
**Indexes**: `IX_financial_line_items_event_id` on event_id; composite read order `(event_id, block_type, sort_order)`.
**Query filter**: `OrganizationId == null || Event.Venue.OrganizationId == OrganizationId`.

### EventArtist (New)

An artist's deal configuration on an event; produces a calculated net payout.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK, default `gen_random_uuid()` | |
| event_id | UUID | FK → events.id, NOT NULL | CASCADE DELETE |
| artist_name | VARCHAR(255) | NOT NULL | |
| performance_order | INT | NOT NULL, default 1 | |
| deal_type | VARCHAR(50) | NOT NULL | `guarantee` \| `door_split` \| `custom` |
| custom_formula_expression | TEXT | NULL | required when `deal_type = custom` |
| base_guarantee | NUMERIC(12,2) | NOT NULL, default `0.00` | pre-tax figure |
| backend_percentage | NUMERIC(5,2) | NOT NULL, default `0.00` | split % of net revenue |
| tax_withholding_percentage | NUMERIC(5,2) | NOT NULL, default `0.00` | |
| calculated_net_payout | NUMERIC(12,2) | NOT NULL, default `0.00` | engine output (persisted) |
| (xmin) | system | concurrency token | Npgsql `UseXminAsConcurrencyToken()` |

**Relationships**: Belongs to Event (N:1).
**Indexes**: `IX_event_artists_event_id` on event_id.
**Query filter**: `OrganizationId == null || Event.Venue.OrganizationId == OrganizationId`.

### Variance (Computed — not persisted)

Per line item: `variance = qbo_actual_value − settlement_value`. Assembled into the ledger response DTO; flagged when `|variance| > 0.00`.

## Validation Rules

- **title**: required, ≤255 chars. **qbo_tag_name**: required, ≤100 chars.
- **block_type / deal_type / status**: must be a defined enum value.
- **Monetary values**: parsed from invariant-culture decimal strings; stored at `NUMERIC(12,2)`.
- **Percentages**: `NUMERIC(5,2)`; `backend_percentage` and `tax_withholding_percentage` expected in `[0, 100]` (data-entry concern; no cross-artist ≤100% cap per clarification Q2).
- **custom deal**: `custom_formula_expression` must be present and, after sanitization to `[a-zA-Z0-9\s+\-*/().]`, must parse and evaluate; otherwise `FormulaEvaluationException`.
- **Mutation guard**: any create/update/delete of an Event's line items or artists is rejected (HTTP 400, `LedgerStateException`) when `event.status ∈ {SETTLED, RECONCILED}`.
- **Column editability** (enforced server-side and surfaced to client):

| State | status | is_budget_locked | Proforma | Settlement | QBO Actuals |
|-------|--------|------------------|----------|------------|-------------|
| Planning | PRE_SHOW | false | editable | locked | locked |
| Budget locked | PRE_SHOW | true | read-only | editable | locked |
| Settled | SETTLED | true | read-only | read-only | read-only |
| Reconciled | RECONCILED | true | read-only | read-only | auto-populated (read-only) |

- **Settlement edits** additionally require `can_edit_settlement` permission, `is_budget_locked = true`, and `status = PRE_SHOW`.
- **Concurrency**: a write whose `xmin` token is stale → `ConcurrencyConflictException` (HTTP 409).

## State Transitions

### Event Lifecycle

```
[PRE_SHOW, locked=false]
      │ POST /lock-budget  (requires can_lock_budget)
      ▼
[PRE_SHOW, locked=true]   ← settlement column editable (can_edit_settlement)
      │ settlement finalized (separate signature feature → sets status)
      ▼
[SETTLED]                 ← all line-item/artist mutations rejected (400)
      │ QBO sync (separate feature)
      ▼
[RECONCILED]              ← qbo actuals populated; variance + alerts; read-only
```

Within scope of this feature: the `PRE_SHOW(unlocked) → PRE_SHOW(locked)` transition (lock-budget endpoint). Transitions into `SETTLED` and `RECONCILED` are owned by the separate settlement-signature and QBO-sync features; this feature enforces the read-only/rejection behavior for those states.

## Recalculation Flow

On any line-item or artist mutation, and via explicit `POST /recalculate`:

1. Load the event with line items + artists (`.AsNoTracking()` for read, tracked for the persist step), scoped by org filter.
2. Choose the active column by lifecycle: `proforma_value` while `is_budget_locked = false`; `settlement_value` once locked.
3. `grossRevenue = Σ active value of REVENUE rows`; `totalDeductions = Σ active value of rows where is_artist_deduction = true`; `netShowRevenue = grossRevenue − totalDeductions`.
4. For each `event_artist`, run `DealMathEngine` (or `CustomFormulaEvaluator` for `custom`) against the same `netShowRevenue`; persist `calculated_net_payout`.
5. Return the full ledger grid snapshot DTO (blocks, rows, artists, per-row variance).
