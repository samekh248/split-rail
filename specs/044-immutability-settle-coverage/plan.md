# Implementation Plan: Close Immutability Verification Gaps After Full Settlement

**Branch**: `044-immutability-settle-coverage` | **Date**: 2026-06-20 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/044-immutability-settle-coverage/spec.md` (Linear SPLR-39)

## Summary

Close SPLR-39 xUnit integration coverage gaps by proving post-settlement immutability on events seeded through the **real finalize pipeline** (and **real reconcile workflow** for `RECONCILED`), with **archived PDF byte-equality** after every blocked mutation attempt. Add shared `SeedFinalizedEventAsync` test helper, new `SettlementPostFinalizeImmutabilityTests` integration suite, and a **recalculate guard** (`FrozenEventMutationOperation.Recalculate` + `LedgerService.RecalculateAsync` rejection). QBO sync on frozen events verifies **sanctioned actuals refresh succeeds without PDF drift** — not blanket rejection. **Backend test-only**; no API DTO, route, or frontend changes.

## Technical Context

**Language/Version**: C# / .NET 8.0 (`apps/api`, `apps/api.tests`)

**Primary Dependencies**: Existing ASP.NET Core 8, EF Core 8, Testcontainers PostgreSQL, QuestPDF (finalize PDF generation), `InMemorySettlementArchiveStore`, `FrozenEventMutationAuditor`, settlement/reconcile controllers

**Storage**: No schema migrations. Uses in-memory archive store in integration tests for PDF byte assertions.

**Testing**: xUnit WebApplicationFactory integration tests; reuse `IntegrationTestBase`, `TestLogCollector`, `FrozenEventMutationAuditTests` audit assertion patterns; ≥80.0% line/branch coverage on touched backend files (Constitution III); no frontend changes

**Target Platform**: Linux CI (full QuestPDF suite); Windows AMD64 local; ARM Windows skips PDF tests via `IsQuestPdfSupported()`

**Project Type**: Web application monorepo — **backend verification-only** for this feature

**Performance Goals**: N/A (test suite additions only; no production path changes except recalculate guard)

**Constraints**: Real finalize seeding mandatory (no `SetEventStatusDirectAsync` in new tests); PDF byte stability on every blocked path; audit log contract from spec 039; QBO actuals-only sync remains allowed on frozen events (Constitution IV/V); ≥80.0% backend coverage on touched files; missing/unparseable coverage reports fail CI

**Scale/Scope**: ~1 new integration test file (~15–18 test cases), ~1 shared helper on `IntegrationTestBase`, optional refactor of `SettlementImmutabilityTests`, ~2 product lines in `LedgerService` + `FrozenEventMutationOperation`, 0 migrations, 0 API routes, 0 frontend files

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Relevance | Status |
|-----------|-----------|--------|
| I. Core Mathematical Axioms | No monetary math changes. | N/A |
| II. Multi-Tenant Isolation | Tests use existing `SetupFinancialAdminAsync` tenant-scoped clients. | PASS |
| III. Engineering Rigor | **Primary** — closes SPLR-39 verification gap; new integration tests; ≥80% on touched files. | PASS |
| IV. QBO Integration | QBO sync tests use mocked handler (read-only Intuit model preserved); verify actuals-only refresh allowed on frozen events. | PASS |
| V. Ledger State Machine | **Primary** — proves post-settle mutations rejected + PDF stable; adds recalculate guard. | PASS |
| VI. Polyglot Contract | No DTO/OpenAPI changes. | N/A |
| VII. EF Core Axioms | No new queries; existing test patterns. | N/A |
| VIII. Exception Governance | Tests assert HTTP 400 / `LedgerStateException`; audit logs exclude sensitive payloads. | PASS |
| IX. UI Iconography | No UI changes. | N/A |

**Post-design re-check (Phase 1)**: [research.md](./research.md), [data-model.md](./data-model.md), and [contracts/settled-event-immutability-verification.md](./contracts/settled-event-immutability-verification.md) confirm test matrix, lifecycle seeding, recalculate guard, and QBO actuals exception handling. Gates remain PASS. No Complexity Tracking entries required.

## Project Structure

### Documentation (this feature)

```text
specs/044-immutability-settle-coverage/
├── plan.md              # This file
├── research.md          # Phase 0 — gap analysis, seeding, QBO/recalculate decisions
├── data-model.md        # Phase 1 — test fixtures, mutation inventory, invariants
├── quickstart.md        # Phase 1 — validation scenarios
├── contracts/
│   └── settled-event-immutability-verification.md  # Phase 1 — test obligation contract
├── checklists/
│   └── requirements.md  # From /speckit-specify
└── tasks.md             # Phase 2 (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
apps/api/
├── Services/
│   ├── FrozenEventMutationOperation.cs    # EXTEND — add Recalculate constant
│   └── LedgerService.cs                   # MODIFY — RejectIfFrozen in RecalculateAsync

apps/api.tests/
├── Integration/
│   ├── IntegrationTestBase.cs             # EXTEND — SeedFinalizedEventAsync helper
│   ├── SettlementImmutabilityTests.cs     # REFACTOR — use shared seed (optional)
│   └── SettlementPostFinalizeImmutabilityTests.cs  # NEW — SPLR-39 gap coverage
```

**Structure Decision**: Minimal product diff (recalculate guard only if tests expose gap). Primary work in integration tests reusing existing infrastructure from specs 004/039/041/043. Keep `FrozenEventMutationAuditTests` helper-seeded for fast operation-label matrix; new file owns real-finalize + PDF assertions.

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
| Contract | [contracts/settled-event-immutability-verification.md](./contracts/settled-event-immutability-verification.md) | Complete |
| Quickstart | [quickstart.md](./quickstart.md) | Complete |

**Next**: Run `/speckit-tasks` to generate dependency-ordered `tasks.md`.
