# Quickstart: Validate QBO Sync Frozen-Event Guard

**Feature**: 045-block-qbo-settled-mutation (SPLR-33)  
**Plan**: [plan.md](./plan.md)  
**Contract**: [contracts/qbo-sync-frozen-event-guard.md](./contracts/qbo-sync-frozen-event-guard.md)

## Prerequisites

- .NET 8 SDK
- Docker (Testcontainers PostgreSQL for integration tests)
- Repository root: `c:\Users\dusti\split-rail`

## 1. Run unit tests (sync recompute guard)

```powershell
cd apps/api.tests
dotnet test --filter "FullyQualifiedName~QboSyncServiceTests"
```

**Expected** (after implementation):
- `ProcessTransactionsAsync_MapsKnownAccountsAndRecomputesActuals` still passes on `PRE_SHOW` event
- New: `RecomputeActuals_SETTLED_WithNewTransactions_Rejected` → throws / rejects; snapshot fields unchanged
- New: `RecomputeActuals_RECONCILED_UpdatesActualsOnly` → `QboActualValue` changes; `SettlementValue` unchanged
- New: `RecomputeActuals_SETTLED_NoNewTransactions_SkipsWithoutMutation` → no line-item changes

## 2. Run integration tests (HTTP + audit + PDF)

```powershell
cd apps/api.tests
dotnet test --filter "FullyQualifiedName~QboSyncFrozenEvent"
```

**Expected** (after implementation):
- Finalized (`SETTLED`) event + sync with mocked new QBO transaction → **400** + audit log `qbo_sync_recompute` + PDF bytes unchanged
- Reconciled event + sync with new transaction → **200** + actuals updated + PDF bytes unchanged
- SETTLED event + sync with no new transactions → **200** + no line-item field changes

## 3. Coverage gate

```powershell
cd apps/api.tests
dotnet test /p:CollectCoverage=true --filter "FullyQualifiedName~QboSync"
```

**Expected**: ≥80.0% line/branch coverage on `QboSyncService` and `FrozenEventImmutabilityInterceptor` touched paths.

## 4. Manual smoke (optional, local API)

1. Start API + DB per project README.
2. Create event, lock budget, finalize settlement → `SETTLED`.
3. Connect QBO (or use test seed), trigger sync with a new tagged transaction.
4. Confirm sync returns error; settlement grid shows unchanged snapshot values.
5. POST reconcile → `RECONCILED`.
6. Trigger sync again → actuals column updates; settlement column unchanged.

## 5. Regression checks

```powershell
cd apps/api.tests
dotnet test --filter "FullyQualifiedName~FrozenEvent"
dotnet test --filter "FullyQualifiedName~SettlementImmutability"
```

**Expected**: Existing immutability and persistence guard tests continue to pass; interceptor change does not break sanctioned reconcile/reversal paths.

## Failure diagnosis

| Symptom | Likely cause |
|---------|--------------|
| SETTLED sync succeeds with changed actuals | Service guard missing or bypassed |
| RECONCILED sync returns 400 | Interceptor not permitting actuals-only; check parent status lookup |
| No audit log on SETTLED rejection | Auditor not injected into `QboSyncService` |
| PDF bytes changed after RECONCILED sync | Unintended settlement field mutation or PDF regeneration triggered |

## Next step

Run `/speckit-tasks` to generate implementation tasks from [plan.md](./plan.md).
