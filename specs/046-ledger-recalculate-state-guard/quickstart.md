# Quickstart: Validate Ledger Recalculate Frozen-State Guard

**Feature**: 046-ledger-recalculate-state-guard (SPLR-34)  
**Plan**: [plan.md](./plan.md)  
**Contract**: [contracts/ledger-recalculate-frozen-guard.md](./contracts/ledger-recalculate-frozen-guard.md)

## Prerequisites

- .NET 8 SDK
- Docker (Testcontainers PostgreSQL for integration tests)
- Repository root: `c:\Users\dusti\split-rail`
- QuestPDF-supported platform for finalize tests (ARM Windows skips via `IsQuestPdfSupported()`)

## 1. Verify guard placement (code review)

Confirm `LedgerService.RecalculateAsync` calls `AssertNotSettledOrReconciled` **before** `RecalculateAndPersistAsync`:

```text
apps/api/Services/LedgerService.cs — RecalculateAsync
```

## 2. Run recalculate immutability integration tests

```powershell
cd apps/api.tests
dotnet test --filter "FullyQualifiedName~SettlementPostFinalizeImmutabilityTests&FullyQualifiedName~Recalculate"
```

**Expected** (after implementation complete):

- `PostFinalize_Recalculate_Returns400_AndLogsRecalculate_AndPdfUnchanged` — SETTLED baseline
- `PostReconcile_Recalculate_Returns400_AndLogsRecalculate_AndPayoutUnchanged` — RECONCILED (new)
- Deal-type cases: guarantee, door_split, custom — each 400 + audit + payout unchanged

## 3. Run full post-finalize immutability suite (regression)

```powershell
cd apps/api.tests
dotnet test --filter "FullyQualifiedName~SettlementPostFinalizeImmutabilityTests"
```

**Expected**: All tests pass; no regression on QBO sync scenarios.

## 4. Run editable-state recalculate regression

```powershell
cd apps/api.tests
dotnet test --filter "FullyQualifiedName~LedgerControllerTests.Recalculate_ReturnsUpdatedGrid"
```

**Expected**: 200 OK; grid totals updated on `PRE_SHOW` event.

## 5. Coverage gate

```powershell
cd apps/api.tests
dotnet test /p:CollectCoverage=true --filter "FullyQualifiedName~SettlementPostFinalizeImmutabilityTests|FullyQualifiedName~LedgerControllerTests.Recalculate"
```

**Expected**: ≥80.0% line/branch coverage on `LedgerService.RecalculateAsync` and related guard path.

## 6. Manual smoke (optional, local API)

1. Create event, add revenue line item + guarantee artist, lock budget, enter settlement values, finalize → `SETTLED`.
2. Note artist payout in ledger grid.
3. POST `/api/venues/{venueId}/events/{eventId}/recalculate`.
4. Confirm **400** response; payout unchanged; settlement PDF link still valid.
5. POST reconcile → `RECONCILED`; repeat recalculate → still **400**.

## Failure diagnosis

| Symptom | Likely cause |
|---------|--------------|
| 200 on frozen recalculate | Missing or after-the-fact guard in `RecalculateAsync` |
| 400 but no audit log | Guard throws without `FrozenEventMutationAuditor` |
| Payout changed despite 400 | Partial persist before guard; move guard earlier |
| Deal-type test passes guarantee only | Missing parameterized tests for `door_split` / `custom` |
