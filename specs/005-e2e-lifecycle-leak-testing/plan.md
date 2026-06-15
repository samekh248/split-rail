# Implementation Plan: Full-Scale E2E Lifecycle & Cross-Tenant Leak Testing

**Branch**: `005-e2e-lifecycle-leak-testing` | **Date**: 2026-06-15 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/005-e2e-lifecycle-leak-testing/spec.md`

## Summary

This is the **final integration & hardening milestone (SPLR-20)**. It adds no new product features. It assembles the four delivered subsystems — tenant foundation & RBAC (002), ledger grid & math engine (003), QBO read-only pull cache (003), settlement freeze pipeline (004) — into a single, continuously-verified release pipeline that **proves** the three release criteria on every change: **Zero Write Infiltration**, **Zero Cross-Tenant Contamination**, **Audit File Immutability**.

The technical approach has five workstreams:

1. **E2E browser-testing platform** — a new standalone TypeScript Playwright workspace at `tests/e2e/` with three suites (cross-tenant isolation, full lifecycle state machine, write-infiltration & immutability). The matrix runs across Chromium, Firefox, WebKit plus a touch-enabled mobile/tablet emulation, exercising the touchscreen signature flow under touch. Bounded per-test retries (max 2); trace/screenshot/video captured only on post-retry failure.
2. **Hermetic ephemeral preview** — a per-PR Cloud Run deployment of the assembled stack. The QBO dependency is served by an env-toggled **fake connector** (`IQboTransactionClient` + `FakeQboTransactionClient`) seeded with deterministic actuals, so no external Intuit call is ever made and Zero Write Infiltration is provable. An outbound egress recorder (`DelegatingHandler` on the `QboApi` named client) asserts zero mutating (POST/PUT/DELETE) calls.
3. **Quality gates as merge blockers** — a GitHub Actions pipeline: build → backend (xUnit/coverlet `cobertura`) + frontend (Vitest/`@vitest/coverage-v8` `lcov`) with ≥80.0% gates → deploy ephemeral preview → sharded cross-browser/mobile E2E matrix → mandatory teardown → required status checks on `main`. Target wall-clock ≈30 min.
4. **Deterministic seeding/fixtures** — a preview-only seeding surface (test-environment-gated controller + Playwright fixtures) that provisions two isolated organizations, scoped venue users, and a settlement-ready lifecycle event with deterministic financials.
5. **Integration-seam cleanup** — verify consistent route prefixes / `ErrorResponse` contract / status codes across controllers, verify `generated-api.ts` regenerates from `swagger.json` with zero drift (CI check), and produce an optimized deployable build artifact.

No backend domain schema changes are required: the milestone reuses the existing immutability guard (`LedgerService.AssertNotSettledOrReconciled`), WORM settlement archive, tenant query filters, and RBAC. The only backend code additions are the `IQboTransactionClient` seam + fake, the egress-recording handler, and a test-environment-gated seeding controller.

## Technical Context

**Language/Version**: TypeScript 5.7 (E2E workspace `tests/e2e`, Node 22); C# / .NET 8.0 (backend `apps/api`); TypeScript 5.7 + React 18 + Vite 6 (frontend `apps/web`). CI: GitHub Actions YAML.

**Primary Dependencies**: **Playwright** `@playwright/test` (E2E runner, multi-browser, trace/video, request interception); existing ASP.NET Core 8 / EF Core 8 / Npgsql / Swashbuckle backend; existing React 18 / TanStack Query / Vite frontend. New dev deps: `@vitest/coverage-v8` (frontend lcov coverage — **not yet present**); `coverlet.collector` (already present, backend cobertura). Type generation: existing `openapi-typescript` via `apps/web/scripts/gen-api.mjs`. Infra: Google Cloud Run + Artifact Registry + Cloud SQL (preview), provisioned by the GitHub Actions / GCP pipeline.

**Storage**: No new tables, columns, or migrations. The preview uses an ephemeral PostgreSQL 16 instance (Cloud SQL or a containerized Postgres in the preview deploy) seeded per run and destroyed on teardown. The WORM settlement archive in preview is backed by a disposable, non-retention bucket (or the in-process archive fake), since immutability is asserted at the application layer, not via real 7-year GCS retention.

**Testing**: Playwright E2E (three suites described above) is the primary new test surface, run headlessly in CI against the preview. Existing xUnit (unit + Testcontainers integration) and Vitest + RTL loops are retained and their coverage is gated. New backend tests: `IQboTransactionClient` fake/seam unit tests and an egress-recorder unit test asserting mutating verbs are rejected/recorded. New frontend: coverage provider wiring (no behavior change).

**Target Platform**: GitHub Actions Ubuntu runners for build/unit/component/E2E; GCP Cloud Run (Linux container, .NET 8 API + static web) for the ephemeral preview. Playwright browsers run on the CI runner against the deployed preview URL.

**Project Type**: Web application (REST API backend `apps/api` + React frontend `apps/web`) plus a new dedicated E2E test workspace (`tests/e2e`) and CI/infra automation (`.github/workflows`, deploy scripts).

**Performance Goals**: Full PR pipeline (build → unit/component + coverage → ephemeral preview deploy → full cross-browser/mobile E2E matrix → gate) completes in **≈30 minutes**, achieved by sharding the E2E matrix across parallel CI jobs (per browser-project × shard). Per-test bounded retry budget of 2.

**Constraints**: Hermetic preview — no live Intuit dependency (fake connector seeded with deterministic actuals); Zero Write Infiltration proven by asserting no outbound mutating QBO calls (Constitution IV); Zero Cross-Tenant Contamination — every cross-org attempt denied with no foreign data in any response (Constitution II); Audit File Immutability — post-settlement DB mutation leaves the stored settlement document byte-for-byte unchanged and never re-rendered (Constitution V); coverage ≥80.0% independently for backend and frontend, missing/unparseable coverage treated as failing; ephemeral preview always torn down regardless of outcome; diagnostic artifacts (trace/screenshot/video) captured only after retries exhausted; no new product features (FR-022); no manually-authored frontend API types — `generated-api.ts` only (Constitution VI); logs sanitized of PII/tokens/secrets (Constitution VIII).

**Scale/Scope**: Verification-only milestone. ~3 E2E suites × (3 desktop browsers + ≥1 mobile viewport), sharded; 2 seeded organizations + scoped users + 1 lifecycle event per E2E run; one preview environment per PR run, created and destroyed each time.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Applicable? | Status | Notes |
|---|-----------|-------------|--------|-------|
| I | Core Mathematical Axioms | **Yes** | PASS | The lifecycle suite asserts night-of calculations produce **exact base-10** expected results (FR-008). E2E expectations encode money as decimal-string literals; no `double`/`float`/JS `number` is used in any assertion of monetary equality. Backend math is unchanged (`DealMathEngine`, `MidpointRounding.AwayFromZero`). |
| II | Multi-Tenant Isolation | **Yes — primary** | PASS | This milestone's chief purpose is to *prove* isolation. The cross-tenant suite drives two concurrent authenticated org sessions, replays B's identifiers from A, and asserts deny + zero foreign data (FR-003/004/005). No new query paths are added; existing global query filters + `ITenantContext` + `VenueService.IsVenueAccessibleAsync` remain the enforcement. The seeding surface scopes every fixture to an explicit `organization_id`. |
| III | Engineering Rigor & Quality Gates | **Yes — primary** | PASS | Adds the Playwright E2E spec scripts tracking real login/interception states required by Constitution III, and enforces the ≥80.0% coverage CI block as a required merge gate (FR-013/017, SC-005). Backend additions (fake connector, egress recorder, seeding controller) ship with xUnit verification. |
| IV | QBO Integration | **Yes — primary** | PASS | Preview is hermetic via a read-only fake connector seeded with deterministic actuals; the integrity suite asserts **zero** create/modify/delete interactions with QBO (FR-011/011a, SC-004). The egress recorder structurally forbids POST/PUT/DELETE to the Intuit base URL. No mutating Intuit code is introduced. |
| V | Ledger State Machine & Immutability | **Yes — primary** | PASS | The lifecycle suite verifies planning → budget-locked → finalized read-only → reconciliation, field-editability transitions, and the absolute read-only lock (FR-006/007/010). The integrity suite mutates underlying DB values for a settled event and asserts the stored settlement document is byte-for-byte unchanged and never re-rendered (FR-012, SC-003), exercising the existing `AssertNotSettledOrReconciled` guard. |
| VI | Polyglot Contract Serialization | **Yes** | PASS | A CI step regenerates `generated-api.ts` from the compiled `swagger.json` and fails on drift (FR-019, SC-007). No TS interfaces mirroring payloads are hand-authored; any new DTO (seeding request/response) is defined C#-first. Money fields stay decimal-string via existing converters. |
| VII | EF Core Axioms | **Yes (light)** | PASS | The only new query path is the seeding controller; it uses explicit `organization_id`-scoped, eager `.Include()`/`.AsNoTracking()` reads consistent with existing services. No lazy loading. The fake QBO connector performs no DB queries beyond existing append-only sync paths. |
| VIII | Exception Governance & Logging Privacy | **Yes** | PASS | New code (fake connector, egress recorder, seeding) throws granular domain exceptions, never empty-catches or generic `Exception`. CI logs and Playwright artifacts are scrubbed of tokens/PII; seeded credentials use non-secret deterministic test values; the egress recorder logs verb+host only, never auth headers. |

**Gate result**: All gates PASS. No violations. Complexity Tracking not required.

## Project Structure

### Documentation (this feature)

```text
specs/005-e2e-lifecycle-leak-testing/
├── plan.md              # This file
├── research.md          # Phase 0 output — technology & approach decisions
├── data-model.md        # Phase 1 output — test entities, fixtures, gate-result model
├── quickstart.md        # Phase 1 output — validation guide
├── contracts/           # Phase 1 output
│   ├── ci-pipeline.md           # CI stages, gates, branch-protection contract
│   ├── e2e-suites.md            # The three E2E suites: scenarios → assertions
│   ├── preview-environment.md   # Ephemeral preview deploy/teardown + hermetic QBO stub
│   └── seeding-api.md           # Test-env-gated deterministic seeding surface
├── checklists/
│   └── requirements.md  # Spec quality checklist (from /speckit-specify)
└── tasks.md             # Phase 2 output (created by /speckit-tasks)
```

### Source Code (repository root)

```text
tests/
└── e2e/                                          # NEW — standalone Playwright TypeScript workspace
    ├── package.json                              # @playwright/test, scripts (test, test:shard)
    ├── playwright.config.ts                      # projects: chromium/firefox/webkit + mobile; retries=2; trace/screenshot/video on failure; sharding
    ├── tsconfig.json
    ├── fixtures/
    │   ├── auth.ts                               # parallel two-org session fixtures
    │   ├── seed.ts                               # calls preview seeding API for deterministic data
    │   └── api-intercept.ts                      # request capture/replay helpers (cross-tenant replay)
    ├── specs/
    │   ├── isolation/
    │   │   ├── cross-tenant-direct-nav.spec.ts   # US1 / FR-004
    │   │   ├── cross-tenant-replay.spec.ts       # US1 / FR-004 (intercepted-request replay)
    │   │   └── venue-scope.spec.ts               # US1 / FR-005
    │   ├── lifecycle/
    │   │   └── full-lifecycle.spec.ts            # US2 / FR-006..010 (signature under touch viewport)
    │   └── integrity/
    │       ├── zero-write-infiltration.spec.ts   # US3 / FR-011/011a
    │       └── audit-immutability.spec.ts        # US3 / FR-012
    └── README.md

.github/
└── workflows/
    └── ci.yml                                    # NEW — build, coverage gates, preview deploy, sharded E2E matrix, teardown, artifacts

deploy/
└── preview/                                      # NEW — ephemeral preview provisioning/teardown
    ├── deploy-preview.sh                         # build images → push Artifact Registry → Cloud Run deploy → emit URL
    └── teardown-preview.sh                       # delete Cloud Run service + ephemeral DB + bucket (always runs)

apps/
├── api/                                          # ASP.NET Core 8 (existing)
│   ├── Services/
│   │   ├── IQboTransactionClient.cs              # NEW — seam extracted from QboTransactionClient
│   │   ├── FakeQboTransactionClient.cs           # NEW — deterministic-actuals fake (preview/test only)
│   │   └── QboTransactionClient.cs               # EXTEND — implement interface (no behavior change)
│   ├── Http/
│   │   └── QboEgressRecordingHandler.cs          # NEW — DelegatingHandler; records/forbids mutating verbs
│   ├── Controllers/
│   │   └── TestSeedingController.cs              # NEW — env-gated (preview only) deterministic seeding
│   ├── DTOs/Seeding/                             # NEW — seeding request/response DTOs (C#-first)
│   ├── Configuration/
│   │   └── PreviewOptions.cs                     # NEW — UseFakeQboConnector, EnableTestSeeding flags
│   └── Program.cs                                # EXTEND — conditional DI of fake connector + seeding controller + egress handler (preview env only)
│
├── api.tests/                                    # xUnit (existing)
│   └── Unit/
│       ├── FakeQboTransactionClientTests.cs      # NEW — deterministic actuals, read-only
│       └── QboEgressRecordingHandlerTests.cs     # NEW — mutating verbs blocked/recorded
│
└── web/                                          # React + Vite + TS (existing)
    ├── package.json                              # EXTEND — add @vitest/coverage-v8 + test:coverage script
    └── vite.config.ts                            # EXTEND — coverage: provider v8, reporter lcov, thresholds 80
```

**Structure Decision**: Continue the established monorepo conventions (features 002–004). The E2E platform lives in a new top-level `tests/e2e` TypeScript workspace (per the spec assumption) rather than inside `apps/web`, keeping the Playwright toolchain isolated from the Vite/Vitest build. CI and infra automation live in `.github/workflows` and `deploy/preview`. Backend changes are deliberately minimal and **additive seams** (interface extraction, a fake, a recording handler, an env-gated seeding controller) so production behavior is unchanged and the hermetic preview is achievable without touching domain logic. Routes continue the existing non-versioned `api/...` convention; FR-018's "consistent versioning" is satisfied by confirming the uniform prefix and `ErrorResponse` shape already in place across controllers (no `/v1/` segment is introduced, matching the 002–004 normalization decision).

## Complexity Tracking

No constitution violations to justify. The new backend surface is the minimum required to make the preview hermetic and seedable: extracting `IQboTransactionClient` mirrors the existing `ISettlementArchiveStore` seam pattern; the `FakeQboTransactionClient` and `TestSeedingController` are gated to the preview/test environment and never registered in production; the egress recorder is a passive `DelegatingHandler`. No new domain entities, tables, migrations, or product features are added.

## Post-Design Constitution Re-Check

*Re-evaluated after Phase 1 design artifacts (research.md, data-model.md, contracts/, quickstart.md).*

| # | Principle | Re-Check | Notes |
|---|-----------|----------|-------|
| I | Core Mathematical Axioms | PASS | Seeding surface returns precomputed expected results as decimal strings; lifecycle suite asserts exact base-10 equality against those literals (no JS `number` money math). Backend math untouched. |
| II | Multi-Tenant Isolation | PASS | Seeding scopes every fixture to an explicit `organization_id`; isolation suite proves deny + zero foreign sentinels via two parallel sessions, direct-nav + replay + venue-scope (FR-003/004/005). No unscoped queries introduced. |
| III | Engineering Rigor | PASS | Playwright E2E specs with real login/interception added per Constitution III; ≥80% coverage gate (both sides) wired as required merge checks; new backend seams ship with xUnit tests; missing coverage treated as failing. |
| IV | QBO Integration | PASS | Hermetic fake connector (read-only, deterministic actuals) + egress recorder forbidding/recording mutating verbs; integrity suite asserts zero create/modify/delete to Intuit (FR-011/011a, SC-004). |
| V | Ledger State Machine | PASS | Lifecycle + integrity suites exercise the existing `AssertNotSettledOrReconciled` guard; immutability proven byte-for-byte after DB mutation with no re-render (FR-012, SC-003). No new mutation paths. |
| VI | Polyglot Contracts | PASS | Seeding DTOs defined C#-first → `swagger.json` → `generated-api.ts`; CI fails on type drift; E2E fixtures import generated types only (FR-019, SC-007). |
| VII | EF Core Axioms | PASS | Seeding reads are `organization_id`-scoped, eager `.Include()`, `.AsNoTracking()`; no lazy loading; fake connector does no extra DB work. |
| VIII | Exception Governance | PASS | New code throws granular domain exceptions, no empty catches/generic `Exception`; egress recorder logs verb+host only; seeded credentials are non-secret deterministic test values; CI artifacts scrubbed of PII/tokens. |

**Re-check result**: All gates PASS post-design. Ready for `/speckit-tasks`.
