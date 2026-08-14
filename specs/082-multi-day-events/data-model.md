# Data Model: Multi-Day Events (Festivals)

Entities, fields, relationships, and state machines for the festival module. All new tables reach `OrganizationId` through the wrapper `Event → Venue` (Constitution II). All money is `decimal` (Constitution I). All mutable financial rows carry the platform's `xmin` concurrency token. Design decisions referenced as D1–D15 from [research.md](./research.md).

## Modified entities

### Event (wrapper role) — D1

| Field | Type | Notes |
|---|---|---|
| `EventType` | enum `Standard \| Festival` | **New.** Default `Standard`; existing rows unchanged. Festival concepts render only when `Festival`. |
| `EndDate` | `DateOnly?` | **New.** Required for `Festival`; must satisfy `EventDate ≤ EndDate` and `(EndDate − EventDate) ≤ 2` (3 calendar days inclusive — v1 cap). Null for `Standard`. |

Existing fields reused by festival mode: `QboTagName` (the single master QBO tag, e.g. `#Fest-2026-KALISPELL`), `LineItems` (master ledger — REVENUE/EXPENSES blocks), `Status`/`EventStatus` (festival-level closeout freeze), `UnmappedQboTransactions` (master-tag transaction inbox), booking/calendar fields.

**Validation**: converting `Standard → Festival` requires `EndDate`; converting is lossless (existing title/date/venue/ledger retained). Shrinking the date range while `ProgrammingBlock.DayDate` values fall outside it → 409 listing affected block ids (edge case: explicit resolution required). `Festival → Standard` conversion is allowed only when no stages beyond the default, no blocks, and no festival financial rows exist.

### OrganizationRole — D10

New boolean permission flags: `ManageFestivalSchedule`, `ManageAllocations`, `AdjustSettlements`, `FinalizeSettlements`, `OverrideSettlements`, `PublishPublicItinerary`. No implicit grants across flags.

### UnmappedQboTransaction — D9

| Field | Type | Notes |
|---|---|---|
| `ReviewState` | enum `None \| Untagged \| MismatchedTag \| ChangedAfterImport \| StaleMapping \| ReclassificationRequired` | **New.** Default `None`. Non-`None` rows are excluded from settlement-impacting allocation until resolved by a user with `ManageAllocations`; resolution writes a `FestivalAuditEntry` preserving prior state, prior mapping, and reason. |

## New entities

### StageZone — D3

| Field | Type | Notes |
|---|---|---|
| `Id` | Guid | PK |
| `EventId` | Guid | FK → wrapper Event (Festival). Cascade scope. |
| `Name` | string | Unique per (`EventId`, `Name`). Auto-created default "Main Stage" on festival creation. |
| `SortOrder` | int | Y-axis order on the timeline. |
| `Xmin` | uint | Concurrency token. |

**Rules**: last remaining stage cannot be deleted; deleting a stage with blocks requires blocks moved/canceled first.

### ProgrammingBlock — D4, D6

| Field | Type | Notes |
|---|---|---|
| `Id` | Guid | PK |
| `EventId` | Guid | FK → wrapper Event. |
| `StageZoneId` | Guid | FK → StageZone (same wrapper — validated). |
| `FestivalArtistId` | Guid? | FK → FestivalArtist (same wrapper — validated). Music blocks typically set it. |
| `DayDate` | DateOnly | Must lie within wrapper `EventDate..EndDate`. |
| `Title` | string | Required (title or act name). |
| `StartTime` / `EndTime` | TimeOnly | Required; `StartTime < EndTime` (blocks do not span midnight in v1). |
| `Category` | enum `Music \| Exhibition \| Vendor \| Experience` | Drives field presets/labeling/reporting only. |
| `ScheduleStatus` | enum `Scheduled \| Delayed \| PartiallyCompleted \| Canceled` | See state machine below. "Moved" is a recorded reassignment, not a status. |
| `RequiresSettlement` | bool | Creation-time flag; non-music categories default false. |
| `IsPubliclyVisible` | bool | Public itinerary inclusion; edits gated by `PublishPublicItinerary`. |
| `Description` | string? | Primary container for logistics/vendor/sponsor/safety notes. |
| `LoadInTime` / `SoundcheckTime` | TimeOnly? | Music-preset optional fields. |
| **Deal terms** (settlement-bearing blocks) | | `DealType` (existing enum), `BaseGuarantee` decimal, `BackendPercentage` decimal, `PercentBasis` enum `Gross \| Net`, `CapAmount?`, `FloorAmount?`, `BonusThresholdAmount?`, `BonusAmount?`, `TaxWithholdingPercentage` decimal, `CustomFormulaExpression?` |
| **Settlement state** | | `SettlementStatus` enum `NotRequired \| Draft \| Finalized`; `CalculatedNetPayout` decimal; `FinalizedAt?`, `FinalizedByUserId?`, `SettlementPdfUrl?`, `FinalizedSnapshotJson?` |
| `Xmin` | uint | Concurrency token. |

**Indexes**: (EventId, StageZoneId, DayDate) for conflict/overlap queries; (EventId, DayDate) for day grouping; (FestivalArtistId) for rollups.

**Conflict rule (D12)**: among blocks with `ScheduleStatus ∈ {Scheduled, Delayed}` on the same (StageZoneId, DayDate): reject save when `StartTime < other.EndTime AND EndTime > other.StartTime` → 409 with conflicting block identity. Cross-stage overlap always allowed. Same-`FestivalArtistId` overlap anywhere → non-blocking warning.

#### ScheduleStatus state machine

```text
Scheduled ⇄ Delayed            (either direction; both are "active" for conflicts/settlement)
Scheduled|Delayed → PartiallyCompleted   (post-show exception; settlement requires manual review)
Scheduled|Delayed → Canceled             (frees slot; default no payout if settlement unstarted)
PartiallyCompleted|Canceled → Scheduled  (undo/reinstate; re-runs conflict validation)
```

Every transition writes a `FestivalAuditEntry` (prior, new, user, timestamp, optional reason). Transitions on blocks whose `SettlementStatus ≠ NotRequired/Draft-untouched` (settlement work started) flag the block `RequiresSettlementReview` in responses; finalization is blocked while an unreviewed material change exists. Finalized settlement outcomes are never rewritten by status changes.

#### SettlementStatus state machine

```text
NotRequired → Draft         (settlement enabled on the block)
Draft → Finalized           (two-phase atomic finalize only — D6)
Finalized → Draft           (controlled reopen: OverrideSettlements, reason code + note,
                             writes BlockSettlementRevision; re-finalize → Finalized again)
```

Mutations to deal/settlement fields or line items while `Finalized` (outside an authorized reopen context) are rejected by services **and** the extended spec-041 EF interceptor (Constitution V).

### FestivalArtist — D5

| Field | Type | Notes |
|---|---|---|
| `Id` | Guid | PK |
| `EventId` | Guid | FK → wrapper Event. |
| `Name` | string | Unique per (`EventId`, `Name`). |

Rollup view (computed, D14): appearances count, total `CalculatedNetPayout`, total allocated revenue, per-day/per-stage activity.

### RevenueBucket — D8

| Field | Type | Notes |
|---|---|---|
| `Id` | Guid | PK |
| `EventId` | Guid | FK → wrapper Event. |
| `Name` | string | e.g. "3-Day Wristbands". Unique per (`EventId`, `Name`). |
| `IsAllocable` | bool | **Default false** — allocation is opt-in per PRD. |
| `Amount` | decimal | Bucket total (basis for percentage allocations). |
| `LinkedLineItemId` | Guid? | FK → master-ledger `FinancialLineItem` (same wrapper) for traceability; optional. |
| `LockedAt` / `LockedByUserId` | DateTimeOffset? / Guid? | Set when any referencing settlement finalizes; locked buckets reject `Amount`/`IsAllocable` edits without `OverrideSettlements`. |
| `Xmin` | uint | Concurrency token. |

**Computed (never stored)**: `TotalAllocated = SUM(RevenueAllocation.CalculatedAmount)`, `Remaining = Amount − TotalAllocated`.

### RevenueAllocation — D7, D8

| Field | Type | Notes |
|---|---|---|
| `Id` | Guid | PK |
| `RevenueBucketId` | Guid | FK → RevenueBucket (must be `IsAllocable`). |
| `ProgrammingBlockId` | Guid | FK → ProgrammingBlock (same wrapper — validated). |
| `AllocationType` | enum `FixedAmount \| PercentOfBucket` | |
| `Percentage` / `Amount` | decimal? | Exactly one populated per type. |
| `CalculatedAmount` | decimal | Rounded via `RoundMoney`; penny remainder per D7 rule. |
| `CreatedByUserId` / `CreatedAt` | Guid / DateTimeOffset | |
| `Xmin` | uint | Concurrency token. |

**Rules**: write-time validation warns (draft) or rejects (>100% without `OverrideSettlements`); finalize re-checks `SUM ≤ Amount` inside the Phase B transaction. Edits audit before/after via `FestivalAuditEntry`. Allocations against finalized settlements follow the reopen flow.

### ExpenseAllocation — D9

| Field | Type | Notes |
|---|---|---|
| `Id` | Guid | PK |
| `EventId` | Guid | FK → wrapper Event. |
| `SourceLineItemId` | Guid? | FK → master-ledger `FinancialLineItem`. **Exactly one** source set. |
| `SourceQboTransactionId` | Guid? | FK → `UnmappedQboTransaction`. **Exactly one** source set. |
| `TargetType` | enum `Overhead \| Day \| Stage \| Block` | |
| `TargetDayDate` / `TargetStageZoneId` / `TargetBlockId` | per target | Exactly the matching target field set; same-wrapper validated. |
| `Method` | enum `Equal \| Percentage \| FixedAmount \| ManualLine` | |
| `Percentage` / `Amount` | decimal? / decimal | `CalculatedAmount` derived and stored. |
| `CalculatedAmount` | decimal | |
| `CountsTowardSettlement` | bool | Block-targeted lines surface as settlement deductions only when true. |
| `CreatedByUserId` / `CreatedAt` | Guid / DateTimeOffset | |
| `Xmin` | uint | Concurrency token. |

**Rules**: per source, `SUM(CalculatedAmount) ≤ source amount`; the unallocated remainder *is* overhead (implicit, surfaced in projections). Sources with `ReviewState ≠ None` cannot create `CountsTowardSettlement` lines. Unresolved settlement-affecting splits block referencing blocks' finalization.

### BlockSettlementLineItem — D6

| Field | Type | Notes |
|---|---|---|
| `Id` | Guid | PK |
| `ProgrammingBlockId` | Guid | FK → ProgrammingBlock. |
| `LineType` | enum `Deduction \| Adjustment \| RoundingAdjustment` | Adjustments are the post-finalization correction vehicle; rounding lines per D7. |
| `Label` | string | |
| `Amount` | decimal | Signed. |
| `EnteredByUserId` / `EnteredAt` | Guid / DateTimeOffset | Stage managers may enter predefined deduction types; custom/high-impact requires `AdjustSettlements` (D10). |
| `Xmin` | uint | Concurrency token. |

### BlockSettlementRevision — D6

| Field | Type | Notes |
|---|---|---|
| `Id` | Guid | PK |
| `ProgrammingBlockId` | Guid | FK → ProgrammingBlock. |
| `RevisionNumber` | int | Monotonic per block. |
| `SnapshotJson` | string | Full finalized-value snapshot at (re)finalization. |
| `ReasonCode` / `Note` | string / string | Required on reopen. |
| `ReopenedByUserId` / `ReopenedAt` | Guid? / DateTimeOffset? | |
| `FinalizedByUserId` / `FinalizedAt` | Guid / DateTimeOffset | Who re-finalized this revision. |
| `PdfUrl` / `DispatchOutcome` | string? / string? | Per-revision artifact + dispatch record. |

### StageZoneAssignment — D10

| Field | Type | Notes |
|---|---|---|
| `Id` | Guid | PK |
| `StageZoneId` | Guid | FK → StageZone. |
| `UserId` | Guid | FK → User (same org — validated). Unique per (StageZoneId, UserId). |

A user holding `FinalizeSettlements` **with** assignments is scoped to assigned stages (visibility + finalize); with none, org-level financial roles apply.

### FestivalAuditEntry — D4, D9, D10

| Field | Type | Notes |
|---|---|---|
| `Id` | Guid | PK |
| `EventId` | Guid | FK → wrapper Event. Indexed. |
| `EntityType` / `EntityId` | string / Guid | e.g. `ProgrammingBlock`, `RevenueAllocation`, `RevenueBucket`, `ExpenseAllocation`, `UnmappedQboTransaction`, `PublicItinerary`, `MasterLedgerAccess`. |
| `Action` | string | e.g. `StatusChange`, `Reschedule`, `AllocationEdit`, `PublishChange`, `ReviewStateResolved`, `LedgerViewed`, `FinalizeFailed`. |
| `PriorValueJson` / `NewValueJson` | string? | Before/after payloads (sanitized — no PII beyond in-domain names, Constitution VIII). |
| `UserId` / `OccurredAt` | Guid / DateTimeOffset | |
| `Reason` | string? | Optional note / required reason codes where flows demand one. |

One generic trail serves the PRD's many audit demands (schedule history, status audit, allocation audit, publish audit, ledger-access audit, reconciliation resolution audit) with per-entity queries via (`EntityType`, `EntityId`).

## Relationship diagram (wrapper-scoped)

```text
Organization ─ Venue ─ Event(EventType=Festival, EndDate)
                        ├─ FinancialLineItem (master ledger — existing)
                        ├─ UnmappedQboTransaction (+ReviewState — existing inbox)
                        ├─ StageZone ─┬─ StageZoneAssignment ─ User
                        │             └─ ProgrammingBlock ─┬─ BlockSettlementLineItem
                        ├─ FestivalArtist ─────────────────┤   BlockSettlementRevision
                        ├─ RevenueBucket ─ RevenueAllocation ─ (ProgrammingBlock)
                        ├─ ExpenseAllocation ─ (source: FinancialLineItem | UnmappedQboTransaction;
                        │                       target: Overhead | DayDate | StageZone | Block)
                        └─ FestivalAuditEntry
```

## Migration summary

One additive EF Core migration: 10 new tables (`stage_zones`, `programming_blocks`, `festival_artists`, `revenue_buckets`, `revenue_allocations`, `expense_allocations`, `block_settlement_line_items`, `block_settlement_revisions`, `stage_zone_assignments`, `festival_audit_entries`), 2 `events` columns, 6 `organization_roles` flags, 1 `unmapped_qbo_transactions` column, plus the indexes noted above. No destructive changes; all defaults preserve existing behavior (`EventType=Standard`, `ReviewState=None`, flags false).
