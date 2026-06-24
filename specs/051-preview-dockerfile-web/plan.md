# Implementation Plan: Preview Web Frontend Container Build

**Branch**: `051-preview-dockerfile-web` | **Date**: 2026-06-21 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/051-preview-dockerfile-web/spec.md`

## Summary

**SPLR-44** closes a blocking gap in the ephemeral preview pipeline (spec 005): `deploy/preview/deploy-preview.sh` references `deploy/preview/Dockerfile.web`, which does not exist, so the web image build fails before E2E tests can run.

The technical approach:

1. **Add `deploy/preview/Dockerfile.web`** — a three-stage build: export OpenAPI from the compiled API (`dotnet swagger tofile`), regenerate frontend types (`npm run gen:api`), produce the Vite static bundle, and serve it with **nginx** SPA fallback (`try_files → /index.html`).
2. **Change Docker build context to repository root** so the contract stage can access `apps/api` and the web stage can access `apps/web`.
3. **Add `deploy/preview/nginx.web.conf`** — deep-link routing for `/`, `/settings/*`, and `/venues/{id}/events/{id}` per `apps/web/src/lib/appRoute.ts`.
4. **Align `deploy-preview.sh`** — remove redundant host-side `npm ci && npm run build`; invoke self-contained Docker build with context `.`.
5. **Verify** — Vitest tests for nginx SPA routing rules + optional `smoke-web-image.sh` local smoke script; ≥80% coverage on new frontend test files (Constitution III). No backend C# changes expected.

## Technical Context

**Language/Version**: Dockerfile multi-stage; C# / .NET 8.0 (`apps/api` contract export only); TypeScript 5.7 + React 18 + Vite 6 (`apps/web`); nginx 1.27-alpine (runtime); Bash (`deploy/preview/*.sh`).

**Primary Dependencies**: Existing `Swashbuckle.AspNetCore` + **Swashbuckle.AspNetCore.Cli** (contract export in Docker); existing `openapi-typescript` via `apps/web/scripts/gen-api.mjs`; nginx alpine base image; Artifact Registry push via existing `deploy-preview.sh`.

**Storage**: N/A — no database or persistent state. Build artifacts: in-container `swagger.json`, ephemeral `dist/`, pushed container image tagged with `RUN_ID`.

**Testing**: Vitest unit tests for nginx SPA fallback config parsing (`apps/web/tests/deploy/`); optional shell smoke script `deploy/preview/smoke-web-image.sh`; existing Playwright E2E (spec 005) consumes preview once GCP deploy is wired. ≥80.0% line/branch coverage on **touched frontend test/helper files** (Constitution III); no backend changes → backend coverage gate unchanged.

**Target Platform**: Linux containers (GCP Artifact Registry + future Cloud Run static serve); local Docker validation on developer/CI machines.

**Project Type**: Monorepo web application (`apps/api` + `apps/web`) + deploy/infra scripts under `deploy/preview/`.

**Performance Goals**: Web Docker build completes in CI within the existing ≈30 min PR pipeline budget (spec 005); nginx static serve adds negligible runtime overhead vs `vite preview`.

**Constraints**: Self-contained Docker build — no dependency on host `npm run build` (FR-005); OpenAPI types regenerated before bundle compile (Constitution VI); fail fast if contract export unavailable (FR-007); SPA deep links must return application shell (FR-003); image tag uses same `RUN_ID` as API (FR-006); ≥80.0% coverage on new/modified frontend verification code; no new product features; web Cloud Run deploy wiring remains out of scope.

**Scale/Scope**: ~4 new files (`Dockerfile.web`, `nginx.web.conf`, smoke script, Vitest tests), ~1 script edit (`deploy-preview.sh`), `.dockerignore` extension. Unblocks spec 005 preview web image push.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Applicable? | Status | Notes |
|---|-----------|-------------|--------|-------|
| I | Core Mathematical Axioms | No | N/A | No monetary computation in this feature. |
| II | Multi-Tenant Isolation | No | N/A | No new data queries or API paths. |
| III | Engineering Rigor & Quality Gates | **Yes** | PASS | New nginx config parser tests via Vitest; smoke script for end-to-end container validation; ≥80% coverage on touched frontend files. |
| IV | QBO Integration | No | N/A | No QBO code paths. |
| V | Ledger State Machine | No | N/A | No ledger mutations. |
| VI | Polyglot Contract Serialization | **Yes** | PASS | Docker build runs `npm run gen:api` against Swashbuckle-exported `swagger.json` before `vite build`. No hand-authored API types. |
| VII | EF Core Axioms | No | N/A | No EF queries. Contract export stage may use dummy connection string if needed — no runtime DB access. |
| VIII | Exception Governance & Logging Privacy | **Yes (light)** | PASS | Build failures emit explicit stderr; no secrets in Dockerfile layers or nginx config. |
| IX | UI Iconography | No | N/A | No UI changes. |

**Gate result**: All applicable gates PASS. No violations. Complexity Tracking not required.

## Project Structure

### Documentation (this feature)

```text
specs/051-preview-dockerfile-web/
├── plan.md              # This file
├── research.md          # Phase 0 — Dockerfile, nginx, contract export decisions
├── data-model.md        # Phase 1 — build/deploy artifact entities
├── quickstart.md        # Phase 1 — validation scenarios
├── contracts/
│   └── preview-web-container.md   # Build/serve/deploy script contract
├── checklists/
│   └── requirements.md  # From /speckit-specify
└── tasks.md             # Phase 2 (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
deploy/
└── preview/
    ├── deploy-preview.sh           # EXTEND — repo-root docker build; remove host npm build
    ├── teardown-preview.sh         # unchanged
    ├── Dockerfile.web              # NEW — contract → node build → nginx
    ├── nginx.web.conf              # NEW — SPA try_files fallback
    └── smoke-web-image.sh          # NEW — local curl smoke (optional CI)

apps/
└── web/
    └── tests/
        └── deploy/
            └── nginxSpaRouting.test.ts   # NEW — Vitest: assert nginx SPA rules

.dockerignore                       # EXTEND — exclude node_modules, bin, obj for root context
```

**Structure Decision**: Continue monorepo conventions. All deliverables live under `deploy/preview/` (infra) and `apps/web/tests/deploy/` (Constitution III frontend verification). No changes to `apps/api` source unless `dotnet swagger tofile` requires a design-time connection string shim (prefer build-arg env override only).

## Complexity Tracking

No constitution violations to justify.

## Post-Design Constitution Re-Check

*Re-evaluated after Phase 1 design artifacts (research.md, data-model.md, contracts/, quickstart.md).*

| # | Principle | Re-Check | Notes |
|---|-----------|----------|-------|
| III | Engineering Rigor | PASS | Vitest nginx contract tests + smoke script defined in quickstart; coverage target on new test files. |
| VI | Polyglot Contracts | PASS | Three-stage Dockerfile regenerates `generated-api.ts` from exported swagger before compile; mirrors CI `contract-type-drift` semantics offline. |
| VIII | Logging Privacy | PASS | No runtime logging added; build logs contain no secrets. |

**Gate result**: PASS — ready for `/speckit-tasks`.

## Phase Summary

| Phase | Artifact | Status |
|-------|----------|--------|
| 0 | [research.md](research.md) | Complete — all Technical Context unknowns resolved |
| 1 | [data-model.md](data-model.md) | Complete |
| 1 | [contracts/preview-web-container.md](contracts/preview-web-container.md) | Complete |
| 1 | [quickstart.md](quickstart.md) | Complete |
| 1 | Agent context | Updated → `specs/051-preview-dockerfile-web/plan.md` |
| 2 | tasks.md | **Not created** — run `/speckit-tasks` |
