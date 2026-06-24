# Quickstart: Validate Always-On QBO Egress Write Guard

**Feature**: 048-qbo-egress-write-guard (SPLR-41)  
**Plan**: [plan.md](./plan.md)  
**Contract**: [contracts/qbo-egress-write-guard.md](./contracts/qbo-egress-write-guard.md)

## Prerequisites

- .NET 8 SDK
- Docker (Testcontainers PostgreSQL for integration tests that share the standard factory)
- Repository root: `c:\Users\dusti\split-rail`

## 1. Run unit tests (handler behavior)

```powershell
cd apps/api.tests
dotnet test --filter "FullyQualifiedName~QboEgressRecordingHandlerTests"
```

**Expected** (baseline + extensions after implementation):
- `SendAsync_RecordsGetRequest` — GET recorded and permitted
- `SendAsync_BlocksMutatingIntuitRequest` — POST to accounting URL throws `QboSyncException`
- `SendAsync_BlocksPatchToIntuitBaseUrl` — PATCH blocked
- New (if added): PUT/DELETE to accounting URL blocked

## 2. Run integration test (production-like registration)

Uses in-memory EF via `WebApplicationFactory` (no Docker required).

```powershell
cd apps/api.tests
dotnet test --filter "FullyQualifiedName~QboEgressWriteGuard"
```

**Expected** (after implementation):
- Factory configured with `Preview:UseFakeQboConnector=false`
- `QboApi` client POST to `quickbooks.api.intuit.com` → `QboSyncException` / `zero_write_infiltration` before stub handler receives request
- `QboApi` client GET → stub handler receives request (guard permits read)

## 3. Regression — preview E2E egress contract

```powershell
cd tests/e2e
npx playwright test specs/integrity/zero-write-infiltration.spec.ts
```

**Expected**: Existing zero-write-infiltration spec continues to pass (preview handler + egress API unchanged).

## 4. Coverage gate

```powershell
cd apps/api.tests
dotnet test /p:CollectCoverage=true --filter "FullyQualifiedName~QboEgress"
```

**Expected**: ≥80.0% line/branch coverage on `QboEgressRecordingHandler` and `Program.cs` registration path (touched files). No frontend files touched — frontend coverage gate N/A.

## 5. Manual smoke (optional, local API)

1. Start API with `Preview:UseFakeQboConnector=false` (default local/production config).
2. Confirm application starts without DI errors.
3. Trigger a QBO OAuth connect flow — token exchange succeeds (`QboOAuth` channel unaffected).
4. Trigger a venue QBO sync (read path) — sync completes or fails only on legitimate read errors, not `zero_write_infiltration`.

## Failure diagnosis

| Symptom | Likely cause |
|---------|--------------|
| POST reaches stub handler in integration test | Handler not registered on `QboApi` in non-preview `Program.cs` branch |
| OAuth token refresh fails with `zero_write_infiltration` | OAuth incorrectly routed through `QboApi` instead of `QboOAuth` |
| GET accounting query blocked | Handler verb detection or host matching too broad |
| Preview E2E zero-write fails | Handler registration regression or `GetQboEgress` endpoint broken |

## Next step

Run `/speckit-tasks` to generate implementation tasks from [plan.md](./plan.md).
