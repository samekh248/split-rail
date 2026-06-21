# Implementation Plan: Atomic Settlement Finalize Pipeline

**Branch**: `043-atomic-settle-pipeline` | **Date**: 2026-06-20 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/043-atomic-settle-pipeline/spec.md` (Linear SPLR-38)

## Summary

Harden the **finalize-settlement pipeline** (SPLR-38) so failures at PDF render, staging upload, or database commit leave the event **unsettled with zero orphaned PDF artifacts**, and operation ordering matches the spec 004 contract: render and stage upload complete **before** a dedicated short database transaction for state mutation. Introduce a **stage → commit → promote** pattern: upload to a deletable staging bucket, commit settlement state in a transaction that does not span storage I/O, then copy to the WORM archive path and delete staging. Extend `ISettlementArchiveStore` with `StageAsync` / `PromoteAsync` / `DeleteStagedAsync`; extract `ISettlementPdfRenderer` for render-failure tests; refactor `SettlementService.FinalizeAsync` transaction boundaries; add integration tests for render, upload, and DB-commit failure atomicity. **Backend-only** — no API DTO, route, or frontend changes.

## Technical Context

**Language/Version**: C# / .NET 8.0 (`apps/api`)

**Primary Dependencies**: Existing ASP.NET Core 8, EF Core 8, Npgsql, `Google.Cloud.Storage.V1`, QuestPDF; `FrozenEventImmutabilityInterceptor` (spec 041) — finalize on `PRE_SHOW` unchanged

**Storage**: No schema migrations. Operational: deletable **staging GCS bucket** (`SettlementArchiveOptions.StagingBucketName`) + existing WORM archive bucket. Staging path: `staging/settlements/{org}/{venue}/{event}/{settlementId}.pdf`; final path unchanged from spec 004.

**Testing**: xUnit integration (`SettlementAtomicityTests` extended for render + DB-commit failures; existing upload + concurrency tests updated for stage/promote); xUnit unit tests for `SettlementService` cleanup paths; `InMemorySettlementArchiveStore` tracks staged vs promoted objects; optional `SaveChangesFailureInterceptor` test helper; ≥80.0% line/branch coverage on touched backend files (Constitution III); no frontend changes

**Target Platform**: GCP Cloud Run API (Linux); GCS staging + WORM buckets via Workload Identity

**Project Type**: Web application monorepo — **backend-only hardening** for this feature

**Performance Goals**: Finalize latency unchanged (~10s p95 for typical event); staging upload + promote adds one GCS copy — acceptable for legal-artifact integrity

**Constraints**: No partial freeze (Constitution V); WORM final objects non-deletable; staging must be deletable on rollback; no raw signature/PII/credentials in logs (Constitution VIII); granular domain exceptions only; `FOR UPDATE` only inside short commit transaction; persistence guard must not block `PRE_SHOW` → `SETTLED` (spec 041); ≥80.0% backend coverage on touched files; missing/unparseable coverage reports fail CI

**Scale/Scope**: Refactor ~1 service method, extend 2 interfaces + 2 store implementations, 1 options class, ~3–4 test files (~8–10 new/updated cases), 0 migrations, 0 API routes, 0 frontend files

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Relevance | Status |
|-----------|-----------|--------|
| I. Core Mathematical Axioms | No monetary math changes; snapshot/render unchanged. | N/A |
| II. Multi-Tenant Isolation | Finalize still scoped via venue + org; staging paths include org/venue/event IDs. | PASS |
| III. Engineering Rigor | **Primary** — new atomicity tests at render/upload/DB-commit failure points; ≥80% on touched files. | PASS |
| IV. QBO Integration | Out of scope. | N/A |
| V. Ledger State Machine | **Primary** — strengthens atomic finalize; no new mutation paths on frozen events; compensating rule prevents `SETTLED` without final PDF. | PASS |
| VI. Polyglot Contract | No DTO/OpenAPI changes. | N/A |
| VII. EF Core Axioms | Short transaction with `FOR UPDATE` inside commit phase; read paths unchanged. | PASS |
| VIII. Exception Governance | Render/archive/commit failures → granular exceptions; no empty catches; sanitized logs. | PASS |
| IX. UI Iconography | No UI changes. | N/A |

**Post-design re-check (Phase 1)**: [research.md](./research.md), [data-model.md](./data-model.md), and [contracts/settle-finalize-atomicity.md](./contracts/settle-finalize-atomicity.md) confirm stage/promote pattern, transaction boundaries, test matrix, and persistence-guard compatibility. Gates remain PASS. No Complexity Tracking entries required.

## Project Structure

### Documentation (this feature)

```text
specs/043-atomic-settle-pipeline/
├── plan.md              # This file
├── research.md          # Phase 0 — staging/promote, ordering, test strategy
├── data-model.md        # Phase 1 — operational artifact states (no schema)
├── quickstart.md        # Phase 1 — validation scenarios
├── contracts/
│   └── settle-finalize-atomicity.md  # Phase 1 — pipeline + failure contract
├── checklists/
│   └── requirements.md  # From /speckit-specify
└── tasks.md             # Phase 2 (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
apps/api/
├── Configuration/
│   └── SettlementArchiveOptions.cs          # EXTEND — StagingBucketName
├── Services/
│   ├── ISettlementArchiveStore.cs           # EXTEND — StageAsync, PromoteAsync, DeleteStagedAsync
│   ├── GcsSettlementArchiveStore.cs           # EXTEND — staging upload, copy promote, staging delete
│   ├── ISettlementPdfRenderer.cs              # NEW — interface for SettlementPdfRenderer
│   ├── SettlementPdfRenderer.cs             # MODIFY — implement interface
│   └── SettlementService.cs                 # MODIFY — restructure FinalizeAsync phases
├── Program.cs                               # MODIFY — register ISettlementPdfRenderer

apps/api.tests/
├── Integration/
│   ├── InMemorySettlementArchiveStore.cs    # EXTEND — stage/promote/delete + staged object tracking
│   ├── SettlementAtomicityTests.cs          # EXTEND — render + DB-commit failure cases
│   ├── SettlementConcurrencyTests.cs        # VERIFY — loser staging cleanup
│   └── TestSupport/
│       ├── ThrowingSettlementPdfRenderer.cs # NEW — force render failure
│       └── SaveChangesFailureInterceptor.cs # NEW — force DB commit failure (optional)
└── Unit/
    └── SettlementServiceTests.cs            # EXTEND — update fakes for new interfaces
```

**Structure Decision**: Minimal diff focused on `SettlementService.FinalizeAsync` and archive store abstraction. Reuse existing integration test infrastructure (`IntegrationTestBase`, `InMemorySettlementArchiveStore`, Testcontainers). No frontend or OpenAPI regeneration required.

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
| Contract | [contracts/settle-finalize-atomicity.md](./contracts/settle-finalize-atomicity.md) | Complete |
| Quickstart | [quickstart.md](./quickstart.md) | Complete |

**Next**: Run `/speckit-tasks` to generate dependency-ordered `tasks.md`.
