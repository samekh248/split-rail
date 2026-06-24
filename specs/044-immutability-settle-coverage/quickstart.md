# Quickstart & Validation Guide: Post-Finalize Immutability Coverage

This guide validates SPLR-39 verification gaps. It references [data-model.md](data-model.md) and [contracts/settled-event-immutability-verification.md](contracts/settled-event-immutability-verification.md).

## Prerequisites

- Specs 004, 039, 041, 043 implemented (settlement finalize, audit logging, persistence guard, atomic finalize).
- .NET 8 SDK; Docker (Testcontainers PostgreSQL).
- On Windows x64/ARM without QuestPDF native support, PDF-dependent tests skip via `IsQuestPdfSupported()` — run full suite on Linux CI or Windows AMD64.

## Backend validation

```bash
cd apps/api
dotnet build
dotnet test ../api.tests --filter "FullyQualifiedName~SettlementPostFinalizeImmutability|FullyQualifiedName~SettlementImmutability" --collect:"XPlat Code Coverage"
```

## Scenario A — Real-finalize blocked mutations (FR-002, FR-003)

1. Run `SettlementPostFinalizeImmutabilityTests` blocked-mutation cases (delete line item, update/delete artist, full mutation inventory).
2. **Expect**: HTTP 400 for each attempt; immutability audit Warning log with correct `Operation`; underlying records unchanged.

## Scenario B — PDF byte stability (FR-006, FR-007)

1. Run any blocked-mutation test in Scenario A.
2. **Expect**: `ArchiveStore.GetStoredPdf(storedPath)` equals bytes captured immediately post-finalize; `StoredObjectCount` unchanged.

## Scenario C — Sequential mutation attempts (edge case)

1. Run sequential multi-mutation test on one finalized event.
2. **Expect**: Each attempt rejected; PDF bytes still equal original after full sequence.

## Scenario D — RECONCILED lifecycle (FR-004)

1. Run reconciled-state immutability tests (finalize → reconcile → mutate).
2. **Expect**: HTTP 400; audit log `EventStatus = RECONCILED`; PDF bytes unchanged.
3. **Expect**: No direct status-assignment seeding in these tests.

## Scenario E — Recalculate blocked (FR-005)

1. Run `PostFinalize_Recalculate_Returns400_AndLogsAudit_AndPdfUnchanged`.
2. **Expect**: HTTP 400; audit `Operation = recalculate`; PDF bytes unchanged.

## Scenario F — QBO sync PDF stability (sanctioned path)

1. Run post-finalize QBO sync test with mocked QBO handler and seeded account mapping.
2. **Expect**: HTTP 200; `QboActualValue` updated; settlement/proforma/artist payout fields unchanged; **no** immutability rejection audit; PDF bytes unchanged.

## Scenario G — Helper-seeded regression (SC-005)

```bash
dotnet test ../api.tests --filter "FullyQualifiedName~FrozenEventMutationAudit|FullyQualifiedName~FrozenEventPersistenceGuard|FullyQualifiedName~SettlementAtomicity|FullyQualifiedName~SettlementFinalize"
```

**Expect**: All existing tests pass unchanged.

## Coverage gate

```bash
dotnet test ../api.tests --collect:"XPlat Code Coverage"
```

**Expect**: ≥80% line/branch coverage on touched backend files (`LedgerService` if recalculate guard added, new integration test file, `IntegrationTestBase` helper). No frontend changes expected.

## Next step

Run `/speckit-tasks` to generate dependency-ordered implementation tasks in `tasks.md`.
