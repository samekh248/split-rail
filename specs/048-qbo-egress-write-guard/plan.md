# Implementation Plan: Always-On QuickBooks Egress Write Guard

**Branch**: `048-qbo-egress-write-guard` | **Date**: 2026-06-21 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/048-qbo-egress-write-guard/spec.md` (Linear SPLR-41)

## Summary

Close the **production zero-write-infiltration gap**: `QboEgressRecordingHandler` already blocks mutating verbs (POST/PUT/DELETE/PATCH) toward Intuit accounting hosts and throws `QboSyncException` (`zero_write_infiltration`), but it is registered on the `QboApi` `HttpClient` only when `Preview:UseFakeQboConnector=true`. Register the handler **unconditionally** on `QboApi` in `Program.cs` so production enforces Constitution IV at the egress boundary. OAuth token/revoke traffic remains unaffected via the separate `QboOAuth` client. **Backend-only**; no schema, API, or frontend changes.

## Technical Context

**Language/Version**: C# / .NET 8.0 (`apps/api`, `apps/api.tests`)

**Primary Dependencies**: Existing `QboEgressRecordingHandler`, `IHttpClientFactory` (`QboApi`, `QboOAuth`), `QboSyncOptions`, `QboTransactionClient`, `QboTokenService`, Polly retry on `QboApi`

**Storage**: No schema migrations or persistence changes

**Testing**: xUnit unit tests (`QboEgressRecordingHandlerTests`) + new integration test (`QboEgressWriteGuardProductionTests`) with `WebApplicationFactory<Program>` and `Preview:UseFakeQboConnector=false`; regression via existing preview E2E `zero-write-infiltration.spec.ts`; ≥80.0% line/branch coverage on touched backend files (Constitution III); no frontend changes

**Target Platform**: GCP Cloud Run API (production) + preview/test environments

**Project Type**: Web application monorepo — **backend HTTP client wiring** for this feature

**Performance Goals**: Negligible — one host/verb check per outbound `QboApi` request; in-memory egress record append

**Constraints**: Constitution IV zero-write-infiltration enforced at runtime in production; Constitution VIII sanitized logging (verb+host only on block); OAuth lifecycle on `QboOAuth` must remain functional; preview E2E egress contract (specs 005) must not regress; ≥80.0% backend coverage on touched files; missing/unparseable coverage reports fail CI

**Scale/Scope**: ~1 modified file (`Program.cs`), optional minor handler test extensions, 1 new integration test file, 0 migrations, 0 API routes, 0 frontend files

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Relevance | Status |
|-----------|-----------|--------|
| I. Core Mathematical Axioms | No monetary math. | N/A |
| II. Multi-Tenant Isolation | No query or data-scope changes. | N/A |
| III. Engineering Rigor | **Primary** — unit + integration tests; ≥80% on touched files. | PASS |
| IV. QBO Integration | **Primary** — closes production gap for read-only Intuit model; blocks POST/PUT/DELETE/PATCH at egress. | PASS |
| V. Ledger State Machine | Unrelated (local ledger guards unchanged). | N/A |
| VI. Polyglot Contract | No DTO/OpenAPI changes. | N/A |
| VII. EF Core Axioms | No database access. | N/A |
| VIII. Exception Governance | **Primary** — `QboSyncException` with `zero_write_infiltration`; logs verb+host only. | PASS |
| IX. UI Iconography | No UI changes. | N/A |

**Post-design re-check (Phase 1)**: [research.md](./research.md), [data-model.md](./data-model.md), and [contracts/qbo-egress-write-guard.md](./contracts/qbo-egress-write-guard.md) confirm unconditional `QboApi` handler registration, structural OAuth exclusion via `QboOAuth` client, and integration test strategy for non-preview mode. Gates remain PASS. No Complexity Tracking entries required.

## Project Structure

### Documentation (this feature)

```text
specs/048-qbo-egress-write-guard/
├── plan.md              # This file
├── research.md          # Phase 0 — registration, OAuth separation, testing decisions
├── data-model.md        # Phase 1 — HTTP client channels, endpoint classification
├── quickstart.md        # Phase 1 — validation scenarios
├── contracts/
│   └── qbo-egress-write-guard.md  # Phase 1 — verb matrix + registration contract
├── checklists/
│   └── requirements.md  # From /speckit-specify
└── tasks.md             # Phase 2 (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
apps/api/
├── Program.cs                              # MODIFY — always register QboEgressRecordingHandler on QboApi
└── Http/
    └── QboEgressRecordingHandler.cs        # EXISTING — no behavior change expected

apps/api.tests/
├── Unit/
│   └── QboEgressRecordingHandlerTests.cs   # EXTEND — PUT/DELETE coverage if branch gaps remain
└── Integration/
    └── QboEgressWriteGuardProductionTests.cs  # NEW — guard active when UseFakeQboConnector=false

tests/e2e/
└── specs/integrity/
    └── zero-write-infiltration.spec.ts     # REGRESSION — preview egress contract unchanged
```

**Structure Decision**: Minimal DI change in `Program.cs` — move `AddSingleton<QboEgressRecordingHandler>()` and `.AddHttpMessageHandler(...)` outside the `UseFakeQboConnector` branch while keeping fake-connector and seeding registration preview-gated. Verification focuses on proving production wiring via integration test, not reimplementing handler logic.

## Complexity Tracking

> No constitution violations requiring justification.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |

## Phase 0 & Phase 1 Outputs

| Artifact | Path | Status |
|----------|------|--------|
| Research | [research.md](./research.md) | Complete |
| Data model | [data-model.md](./data-model.md) | Complete |
| Contract | [contracts/qbo-egress-write-guard.md](./contracts/qbo-egress-write-guard.md) | Complete |
| Quickstart | [quickstart.md](./quickstart.md) | Complete |

**Next**: Run `/speckit-tasks` to generate dependency-ordered `tasks.md`.
