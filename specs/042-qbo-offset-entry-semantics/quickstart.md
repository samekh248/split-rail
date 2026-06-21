# Quickstart Validation Guide: Explicit Offset Entry Semantics for QBO Actuals Corrections

**Feature**: 042-qbo-offset-entry-semantics  
**Date**: 2026-06-20

## Prerequisites

- .NET 8.0 SDK
- Node.js 20+
- Docker (Testcontainers for integration tests)
- Features 002 (ledger grid), 003 (QBO sync), 004 (settlement freeze), 039 (frozen-event auditor) operational
- EF migration `AddQboSyncLedgerOffsetSemantics` applied

## Setup

### 1. Apply migration

```bash
cd apps/api
dotnet ef database update
dotnet build
```

### 2. Regenerate frontend types

```bash
cd apps/web
npm run generate-types
```

### 3. Run backend unit tests

```bash
cd apps/api.tests
dotnet test --filter "FullyQualifiedName~QboSyncCorrection"
dotnet test --filter "FullyQualifiedName~QboAppendOnly"
dotnet test --filter "FullyQualifiedName~QboOffsetCorrection"
dotnet test --filter "FullyQualifiedName~QboSyncLedgerAppendOnlyGuard"
```

### 4. Run frontend tests

```bash
cd apps/web
npm test -- LedgerRow
```

---

## Validation Scenarios

Maps to [contracts/qbo-offset-corrections.md](./contracts/qbo-offset-corrections.md) and [contracts/ledger-correction-badge.md](./contracts/ledger-correction-badge.md).

### Scenario 1: Upstream amount change produces offset (P1)

**Validates**: FR-004, FR-005, SC-001, SC-002, contract S1

Integration test `QboOffsetCorrectionTests.AmountChange_CreatesOffset_PreservesOriginal`:
1. Seed event + mapped line item + original ledger row (`TXN-1`, amount 100).
2. Mock QBO fetch returning `TXN-1` with amount 150.
3. `POST .../sync`.
4. Assert ledger count = 2; original row amount still 100; offset row amount +50 with `OffsetCorrection` type.
5. Assert line item `qboActualValue = 150`.

### Scenario 2: Upstream void produces negating offset (P1)

**Validates**: FR-004, contract S2

Integration test `QboOffsetCorrectionTests.VoidRemoval_CreatesNegatingOffset`:
1. Seed original ledger row (`TXN-1`, amount 100).
2. Mock QBO fetch with TXN-1 absent.
3. Sync.
4. Assert offset amount -100, `VoidRemoval` type, `targetStateAbsent = true`.
5. Assert line item `qboActualValue = 0`.

### Scenario 3: Idempotent re-sync (P1)

**Validates**: FR-007, SC-005, contract S3

Integration test `QboOffsetCorrectionTests.ResyncUnchanged_DoesNotDuplicateOffset`:
1. Complete Scenario 1.
2. Sync again with same mock (amount 150).
3. Assert ledger count unchanged.

### Scenario 4: Append-only guard (P2)

**Validates**: FR-001, FR-010, SC-004

Integration tests `QboAppendOnlyTests` and `QboSyncLedgerAppendOnlyGuardTests`:
1. Capture original row snapshot before correction sync.
2. Run amount-change sync.
3. Assert original row `Id`, `Amount`, `EntryType` identical; new row appended only.

### Scenario 5: Settled event actuals update (P1)

**Validates**: FR-012, contract C6

Integration test `QboOffsetCorrectionTests.SettledEvent_UpdatesActualsOnly`:
1. Settle event (spec 004 flow).
2. Run correction sync.
3. Assert `qboActualValue` updated; `settlementValue` unchanged; frozen-event guards not triggered for sync path.

### Scenario 6: Correction badge in grid (P1)

**Validates**: FR-013, SC-007, contract B1/B2

Vitest `LedgerRow.test.tsx`:
1. Render row with `hasQboCorrection: true` → badge visible (`qbo-correction-badge-{id}`).
2. Render row with `hasQboCorrection: false` → badge absent.
3. QBO actuals value displays corrected amount.

---

## Manual Smoke (optional)

```bash
# Start API + web
cd apps/api && dotnet run
cd apps/web && npm run dev
```

1. Open event workspace with synced QBO actuals.
2. Trigger sync after sandbox correction in QuickBooks.
3. Confirm actuals value updates and correction badge appears on affected rows.

---

## Supersedes

Spec 003 quickstart **Scenario 2** (expect stale actuals on upstream edit) is replaced by Scenario 1 above.

## Coverage Gate

```bash
cd apps/api.tests
dotnet test /p:CollectCoverage=true

cd apps/web
npm test -- --coverage
```

Touched files MUST meet ≥80% line/branch coverage (Constitution III).
