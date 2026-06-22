# Implementation Plan: Root Task Runner Orchestrating Both Stacks

**Branch**: `056-root-taskfile-orchestration` | **Date**: 2026-06-22 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/056-root-taskfile-orchestration/spec.md`

## Summary

**SPLR-50** closes a developer-experience gap: the root `Taskfile.yml` is a placeholder (`echo "Hello, world!"`) while TDD §10.1 requires unified monorepo orchestration. Contributors today `cd` into `apps/api`, `apps/web`, and `tests/e2e` separately — diverging from CI command sequences.

The technical approach:

1. **Replace `Taskfile.yml`** with colon-namespaced tasks delegating to existing package workflows: `api:build|test|dev`, `web:dev|build|test`, `gen:api`, `e2e`, aggregate `build`/`test`, and parallel `dev`.
2. **Mirror CI commands** — same `dotnet`/`npm` invocations as `.github/workflows/ci.yml` (backend-test, frontend-test, contract-type-drift, e2e-matrix) without modifying CI itself.
3. **Document in `README.md`** — prerequisites, task catalog table, quick-start flows (FR-011).
4. **Verify via Vitest contract tests** — `assertTaskfileContract.ts` + `taskfileContract.test.ts` assert task presence, delegation, parallel dev, and placeholder removal (FR-013, Constitution III).

No product API, UI, or database changes.

## Technical Context

**Language/Version**: Taskfile v3 YAML at repo root; C# / .NET 8.0 (`apps/api`, `apps/api.tests`); TypeScript 5.7 + Vite 6 (`apps/web`); Playwright 1.49 (`tests/e2e`).

**Primary Dependencies**: [Task](https://taskfile.dev/) CLI (developer-installed); existing `dotnet`, `npm`, `openapi-typescript` via `apps/web/scripts/gen-api.mjs`; existing Playwright config at `tests/e2e/playwright.config.ts`.

**Storage**: N/A — no persistence. Configuration artifact: `Taskfile.yml`. Documentation artifact: `README.md`.

**Testing**: Vitest contract tests parsing `Taskfile.yml` (`apps/web/tests/deploy/taskfileContract.test.ts`); assertion helper (`apps/web/src/deploy/assertTaskfileContract.ts`). Manual validation via [quickstart.md](quickstart.md). ≥80.0% line/branch coverage on **new/modified frontend verification files** (Constitution III). No backend C# changes expected → backend coverage gate unchanged.

**Target Platform**: Developer workstations (Windows, macOS, Linux) and optional use in CI later.

**Project Type**: Polyglot monorepo (`apps/api` + `apps/web` + `tests/e2e`) with root developer orchestration.

**Performance Goals**: Root tasks add negligible overhead (thin delegation). `task build` + `task test` complete in same wall-clock ballpark as running package commands directly.

**Constraints**: Delegate to existing scripts — no duplicated build logic (FR-009); placeholder Taskfile MUST be fully replaced (FR-012); `gen:api` uses live swagger default `http://localhost:5000/swagger/v1/swagger.json`; `dev` runs API + Vite in parallel; Vite proxies `/api` → port 5000; ≥80.0% coverage on new frontend verification code; CI workflows unchanged; Constitution §X N/A (no new `deploy/` operator scripts — Taskfile is the cross-platform layer).

**Scale/Scope**: ~1 rewritten config (`Taskfile.yml`), ~1 README section, ~2 new frontend test/helper files. Unblocks consistent local dev per TDD §10.1 and SPLR-20 E2E operator path.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Applicable? | Status | Notes |
|---|-----------|-------------|--------|-------|
| I | Core Mathematical Axioms | No | N/A | No monetary computation. |
| II | Multi-Tenant Isolation | No | N/A | No data queries. |
| III | Engineering Rigor & Quality Gates | **Yes** | PASS | Vitest contract tests for Taskfile; ≥80% on new helper/test files. |
| IV | QBO Integration | No | N/A | No QBO code paths. |
| V | Ledger State Machine | No | N/A | No ledger mutations. |
| VI | Polyglot Contract Serialization | **Yes (light)** | PASS | `gen:api` task delegates to existing `gen-api.mjs`; no hand-authored types. |
| VII | EF Core Axioms | No | N/A | No EF queries. |
| VIII | Exception Governance & Logging Privacy | **Yes (light)** | PASS | Task failures surface delegated stderr; no secrets in Taskfile. |
| IX | UI Iconography | No | N/A | No UI changes. |
| X | Dual-Platform Operator Scripts | No | N/A | Taskfile is root dev tooling, not a `deploy/` script. Exempt per research R7. |

**Gate result**: All applicable gates PASS. No violations. Complexity Tracking not required.

## Project Structure

### Documentation (this feature)

```text
specs/056-root-taskfile-orchestration/
├── plan.md              # This file
├── research.md          # Phase 0 — Taskfile design decisions
├── data-model.md        # Phase 1 — command catalog entities
├── quickstart.md        # Phase 1 — validation scenarios
├── contracts/
│   └── root-taskfile.md # Task catalog + verification contract
├── checklists/
│   └── requirements.md  # From /speckit-specify
└── tasks.md             # Phase 2 (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
Taskfile.yml                              # REWRITE — root orchestration (replaces placeholder)

README.md                                 # EXTEND — prerequisites + task catalog

apps/web/src/deploy/
└── assertTaskfileContract.ts             # NEW — parse/assert Taskfile.yml

apps/web/tests/deploy/
└── taskfileContract.test.ts              # NEW — Vitest contract tests (C1–C10)
```

**Structure Decision**: Minimal diff at repository root plus frontend deploy-contract test pattern (consistent with `dockerfileContract.test.ts`, `assertCloudSqlDeployContract.ts`). No `apps/api` changes unless implementation discovers a missing env shim — prefer documenting existing `ASPNETCORE_ENVIRONMENT` / `DB_PASSWORD` in README.

## Complexity Tracking

No constitution violations to justify.

## Post-Design Constitution Re-Check

*Re-evaluated after Phase 1 design artifacts (research.md, data-model.md, contracts/, quickstart.md).*

| # | Principle | Re-Check | Notes |
|---|-----------|----------|-------|
| III | Engineering Rigor | PASS | Contract tests C1–C10 defined; quickstart Scenario 8 validates discoverability. |
| VI | Polyglot Contracts | PASS | `gen:api` task wraps existing script; no new type generation logic. |
| VIII | Logging Privacy | PASS | Taskfile contains no credentials; env vars reference existing dev patterns only. |

**Gate result**: PASS — ready for `/speckit-tasks`.

## Phase Summary

| Phase | Artifact | Status |
|-------|----------|--------|
| 0 | [research.md](research.md) | Complete — all Technical Context decisions resolved |
| 1 | [data-model.md](data-model.md) | Complete |
| 1 | [contracts/root-taskfile.md](contracts/root-taskfile.md) | Complete |
| 1 | [quickstart.md](quickstart.md) | Complete |
| 1 | Agent context | Updated → `specs/056-root-taskfile-orchestration/plan.md` |
| 2 | tasks.md | Pending `/speckit-tasks` |
