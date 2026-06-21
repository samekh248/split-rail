# Implementation Plan: GCS WORM Retention on Settlement PDFs

**Branch**: `050-gcs-worm-retention` | **Date**: 2026-06-21 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/050-gcs-worm-retention/spec.md` (Linear SPLR-43)

## Summary

Close the SPLR-43 gap where settlement PDF immutability was **assumed** from bucket configuration but not **enforced or verified** in application code or tests. Extend the existing stage → commit → promote pipeline (spec 043) so **every promoted final archive object** receives an explicit **7-year retention lock**, **overwrite of an existing final path is rejected**, and **automated tests prove** overwrite/delete failure on retention-locked objects. Add **production startup validation** that the archive bucket retention policy meets the 7-year requirement and staging storage remains deletable. Coordinate **infrastructure provisioning** (Bucket Lock + Object Retention Policy on `split-rail-settlements-prod`). **Backend-only** — no API DTO, route, or frontend changes.

## Technical Context

**Language/Version**: C# / .NET 8.0 (`apps/api`)

**Primary Dependencies**: Existing ASP.NET Core 8, `Google.Cloud.Storage.V1`, `SettlementService` finalize pipeline (spec 043), `ISettlementArchiveStore` / `GcsSettlementArchiveStore` / `InMemorySettlementArchiveStore`

**Storage**: No database migrations. Operational: WORM archive bucket `gs://split-rail-settlements-prod` (7-year Object Retention + Bucket Lock via infra) + deletable staging bucket `split-rail-settlements-staging`. Application sets per-object retention on promote; staging bucket MUST NOT have retention lock.

**Testing**: xUnit integration (`SettlementArchiveImmutabilityTests` — overwrite/delete rejection, retention metadata present after promote); extend `InMemorySettlementArchiveStore` with retention-lock simulation; unit tests for `GcsSettlementArchiveStore` promote/overwrite paths (mocked or focused); production startup validator tests; ≥80.0% line/branch coverage on touched backend files (Constitution III); no frontend changes

**Target Platform**: GCP Cloud Run API (Linux); GCS via Workload Identity (ADC)

**Project Type**: Web application monorepo — **backend-only hardening** for this feature

**Performance Goals**: Promote adds one optional `GetObject` existence check + retention metadata write (negligible vs existing copy); startup bucket validation once per instance boot (<2s)

**Constraints**: 7-year retention (spec 004 clarification); staging deletable for orphan cleanup (spec 043); no partial freeze (Constitution V); granular domain exceptions only (Constitution VIII); no raw PDF bytes/credentials in logs; GUID final paths prevent collisions but app MUST still reject explicit overwrites (FR-003); ≥80.0% backend coverage on touched files; missing/unparseable coverage reports fail CI

**Scale/Scope**: Extend 2 store implementations + options + 1 startup validator; ~2 test files (~6–8 new cases); 1 infra doc update; 0 migrations, 0 API routes, 0 frontend files

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Relevance | Status |
|-----------|-----------|--------|
| I. Core Mathematical Axioms | No monetary math changes. | N/A |
| II. Multi-Tenant Isolation | Archive paths include org/venue/event IDs; no new unscoped queries. | PASS |
| III. Engineering Rigor | **Primary** — immutability tests (overwrite/delete/retention metadata); startup misconfig guard; ≥80% on touched files. | PASS |
| IV. QBO Integration | Out of scope. | N/A |
| V. Ledger State Machine | Strengthens archive immutability aligned with `settlement_pdf_url` invariant; no new mutation paths on frozen events. | PASS |
| VI. Polyglot Contract | No DTO/OpenAPI changes. | N/A |
| VII. EF Core Axioms | No new EF queries. | N/A |
| VIII. Exception Governance | Retention/archive failures → `SettlementArchiveException`; startup misconfig → explicit failure; sanitized logs. | PASS |
| IX. UI Iconography | No UI changes. | N/A |

**Post-design re-check (Phase 1)**: [research.md](./research.md), [data-model.md](./data-model.md), and [contracts/settlement-archive-retention.md](./contracts/settlement-archive-retention.md) confirm per-object retention on promote, overwrite guard, in-memory retention simulation for CI, and production startup validation. Gates remain PASS. No Complexity Tracking entries required.

## Project Structure

### Documentation (this feature)

```text
specs/050-gcs-worm-retention/
├── plan.md              # This file
├── research.md          # Phase 0 — retention API, overwrite guard, test strategy
├── data-model.md        # Phase 1 — operational retention model (no schema)
├── quickstart.md        # Phase 1 — validation scenarios + infra notes
├── contracts/
│   └── settlement-archive-retention.md  # Phase 1 — promote retention contract
├── checklists/
│   └── requirements.md  # From /speckit-specify
└── tasks.md             # Phase 2 (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
apps/api/
├── Configuration/
│   └── SettlementArchiveOptions.cs          # EXTEND — RetentionYears (default 7), EnforceRetentionValidation
├── Services/
│   ├── ISettlementArchiveStore.cs           # EXTEND — optional retention query for tests/diagnostics
│   ├── GcsSettlementArchiveStore.cs         # MODIFY — pre-promote existence check, apply retention on promote
│   ├── InMemorySettlementArchiveStore.cs    # EXTEND — retention-lock simulation (prod fake in api/)
│   └── SettlementArchiveStartupValidator.cs # NEW — production bucket retention policy check
├── Program.cs                               # MODIFY — register startup validator (Production)

apps/api.tests/
├── Integration/
│   ├── InMemorySettlementArchiveStore.cs    # EXTEND — retention lock + reject overwrite/delete
│   └── SettlementArchiveImmutabilityTests.cs # NEW — overwrite/delete/retention assertions
└── Unit/
    ├── GcsSettlementArchiveStoreTests.cs    # NEW or EXTEND — promote retention + overwrite guard
    └── SettlementArchiveStartupValidatorTests.cs # NEW — misconfig detection
```

**Structure Decision**: Minimal diff on the existing archive store abstraction and promote path. Reuse integration test infrastructure (`IntegrationTestBase`, `InMemorySettlementArchiveStore`, existing finalize tests). Infrastructure bucket provisioning documented in quickstart; `.specify/memory/infrastructure.md` updated to 7-year retention.

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
| Contract | [contracts/settlement-archive-retention.md](./contracts/settlement-archive-retention.md) | Complete |
| Quickstart | [quickstart.md](./quickstart.md) | Complete |

**Next**: Run `/speckit-tasks` to generate dependency-ordered `tasks.md`.
