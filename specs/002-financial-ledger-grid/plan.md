# Implementation Plan: Core Financial Ledger Grid & Base-10 Math Engine

**Branch**: `002-financial-ledger-grid` | **Date**: 2026-06-14 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/002-financial-ledger-grid/spec.md`

## Summary

Build the unified financial ledger grid (3 blocks × 5 columns) and its base-10 calculation backend on top of the existing ASP.NET Core 8 + EF Core + PostgreSQL foundation delivered in feature 001. New `events`, `financial_line_items`, and `event_artists` entities are added, scoped to the existing `organization → venue` tenant boundary via EF Core global query filters. A `DealMathEngine` performs all monetary arithmetic in native `decimal` with `MidpointRounding.AwayFromZero`, and a `CustomFormulaEvaluator` wraps sandboxed `NCalcSync` expression evaluation for custom artist deals. A nested REST surface under `api/venues/{venueId}/events/{eventId}/…` exposes ledger reads, line-item/artist CRUD, budget locking, and recalculation, with all monetary DTO fields serialized as strings for clean OpenAPI → TypeScript codegen. A React + Vite spreadsheet-style grid (the first `apps/web` feature) renders the ledger with lifecycle/permission-driven editability, variance highlighting, and a per-artist formula configuration panel.

## Technical Context

**Language/Version**: C# / .NET 8.0 (backend); TypeScript 5.x + React 18 + Vite (frontend, new `apps/web`)

**Primary Dependencies**: ASP.NET Core 8, Entity Framework Core 8, Npgsql.EntityFrameworkCore.PostgreSQL, Swashbuckle.AspNetCore (existing); **NCalcSync 5.12.x** (new — sandboxed formula evaluation); React 18, Vite, TanStack Query, openapi-typescript (frontend codegen)

**Storage**: PostgreSQL 16 (GCP Cloud SQL — `split-rail:us-central1:split-rail-db-prod`). All monetary columns `NUMERIC(12,2)`; percentage columns `NUMERIC(5,2)`.

**Testing**: xUnit (unit — `DealMathEngine`, `CustomFormulaEvaluator`); xUnit + WebApplicationFactory + Testcontainers.PostgreSql (integration — tenant isolation, state machine, recalculation); Vitest + React Testing Library (frontend components). Playwright E2E lifecycle deferred (per spec scope).

**Target Platform**: GCP Cloud Run (Linux container, .NET 8 runtime) for the API; static build for the web app.

**Project Type**: Web application — REST API backend (`apps/api`) + React frontend (`apps/web`).

**Performance Goals**: Recalculation < 1s and full ledger grid load < 2s for a typical event (≤100 line items, ≤20 artists) — SC-009.

**Constraints**: Zero floating-point in the money path (Constitution I); zero cross-tenant data leakage (Constitution II); no mutations once `status` is `SETTLED`/`RECONCILED` (Constitution V); optimistic concurrency on line-item/artist writes (FR-036); decimal DTO fields serialized as strings (Constitution VI / FR-032); eager `.Include()`/`.ThenInclude()` + `.AsNoTracking()` reads (Constitution VII); ≥80% coverage; no PII/secrets in logs (Constitution VIII).

**Scale/Scope**: MVP — <1000 organizations, ~100 concurrent users; typical event ≤100 line items and ≤20 artists.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Applicable? | Status | Notes |
|---|-----------|-------------|--------|-------|
| I | Core Mathematical Axioms | **Yes** | PASS | `DealMathEngine` and `CustomFormulaEvaluator` use only `decimal` + `MidpointRounding.AwayFromZero`. No `double`/`float`/JS `number` in money path. NCalc configured for decimal evaluation; result re-rounded. See [research.md §1–§2](research.md). |
| II | Multi-Tenant Isolation | **Yes** | PASS | New entities (`Event`, `FinancialLineItem`, `EventArtist`) get EF Core global query filters resolving org via `event → venue → organization_id` from `ITenantContext`. No unscoped queries. See [research.md §4](research.md). |
| III | Engineering Rigor | **Yes** | PASS | xUnit unit tests for documented math edge cases; Testcontainers integration tests for isolation + state machine + recalculation; Vitest for grid components. ≥80% coverage gate. |
| IV | QBO Integration | **Yes (read-only)** | PASS | No QBO HTTP writes. `qbo_actual_value` is a read-only cached field defaulting to `0.00`; treated as append-only. See [research.md §6](research.md). |
| V | Ledger State Machine | **Yes** | PASS | State-validation guard on every mutation; `SETTLED`/`RECONCILED` → HTTP 400 via domain exception. Lifecycle gates column editability. See [data-model.md](data-model.md) + [contracts/events-lifecycle.md](contracts/events-lifecycle.md). |
| VI | Polyglot Contract Serialization | **Yes** | PASS | All decimal DTO fields serialized as strings via a `decimal`→string `JsonConverter`. Swashbuckle emits string schema; `apps/web` consumes generated types only. See [research.md §5](research.md). |
| VII | EF Core Axioms | **Yes** | PASS | Ledger reads use `.AsNoTracking()` + eager `.Include().ThenInclude()` to org. No lazy loading. |
| VIII | Exception Governance | **Yes** | PASS | Granular domain exceptions (`LedgerStateException`, `FormulaEvaluationException`, `ConcurrencyConflictException`); no empty catches or generic `Exception` in financial paths; no PII/secrets logged. |

**Gate result**: All gates PASS. No violations.

## Project Structure

### Documentation (this feature)

```text
specs/002-financial-ledger-grid/
├── plan.md              # This file
├── research.md          # Phase 0 output — technology & approach decisions
├── data-model.md        # Phase 1 output — entities, enums, state machine
├── quickstart.md        # Phase 1 output — validation guide
├── contracts/           # Phase 1 output — API endpoint contracts
│   ├── ledger.md
│   ├── line-items.md
│   ├── artists.md
│   └── events-lifecycle.md
├── checklists/
│   └── requirements.md  # Spec quality checklist (from /speckit-specify)
└── tasks.md             # Phase 2 output (created by /speckit-tasks)
```

### Source Code (repository root)

```text
apps/
├── api/                                   # ASP.NET Core 8 REST API (existing)
│   ├── Controllers/
│   │   └── LedgerController.cs             # NEW — nested ledger/line-item/artist/lifecycle routes
│   ├── Data/
│   │   ├── ApplicationDbContext.cs         # EXTEND — add DbSets, configs, query filters
│   │   └── Migrations/                     # NEW — AddFinancialLedgerEntities migration
│   ├── DTOs/
│   │   └── Ledger/                          # NEW — LedgerGridResponse, LineItem/Artist DTOs, DecimalString converter
│   ├── Models/
│   │   ├── Event.cs                         # NEW
│   │   ├── FinancialLineItem.cs             # NEW
│   │   ├── EventArtist.cs                   # NEW
│   │   └── Enums/ (EventStatus, BlockType, DealType)
│   ├── Services/
│   │   ├── LedgerService.cs                 # NEW — CRUD + lifecycle orchestration + isolation
│   │   ├── DealMathEngine.cs                # NEW — decimal-only deal arithmetic
│   │   └── CustomFormulaEvaluator.cs        # NEW — sandboxed NCalc wrapper
│   ├── Exceptions/ApiExceptions.cs          # EXTEND — ledger/formula/concurrency domain exceptions
│   ├── Serialization/DecimalStringJsonConverter.cs  # NEW
│   └── Program.cs                           # EXTEND — DI registrations + converter
│
├── api.tests/                             # xUnit test project (existing)
│   ├── Unit/
│   │   ├── DealMathEngineTests.cs           # NEW — math edge cases
│   │   └── CustomFormulaEvaluatorTests.cs   # NEW — sanitizer + eval edge cases
│   └── Integration/
│       ├── LedgerControllerTests.cs         # NEW — CRUD + variance
│       ├── LedgerStateMachineTests.cs       # NEW — lock/settle gating
│       └── LedgerTenantIsolationTests.cs    # NEW — cross-tenant 403/404
│
└── web/                                   # React + Vite + TypeScript (NEW — first frontend feature)
    ├── src/
    │   ├── components/ledger/               # LedgerGrid, BlockSection, LedgerRow, VarianceCell
    │   ├── components/artists/              # ArtistDealPanel, FormulaEditor
    │   ├── types/generated-api.ts           # openapi-typescript output (generated, not hand-written)
    │   ├── api/                             # typed client hooks (TanStack Query)
    │   └── lib/money.ts                      # decimal-string display helpers (no float math)
    └── tests/                               # Vitest + RTL component tests
```

**Structure Decision**: Continue the established monorepo. The backend extends the existing `apps/api` (new models/services/controller/migration; reuse `ITenantContext`, `RequirePermissionAttribute`, `PermissionNames`, exception middleware). This feature also bootstraps `apps/web` (React + Vite) as the first frontend, consuming OpenAPI-generated types only (Constitution VI). Routes follow the existing `api/venues/{venueId}/…` convention (no `/v1/` segment — see [research.md §3](research.md)).

## Complexity Tracking

No constitution violations to justify. All decisions reuse existing 001 patterns (tenant context, permission policies, EF query filters, domain exceptions, Swashbuckle) and add only the math engine, formula evaluator, ledger entities, and the new frontend app required by the spec.

## Post-Design Constitution Re-Check

*Re-evaluated after Phase 1 design artifacts (data-model.md, contracts/, quickstart.md).*

| # | Principle | Re-Check | Notes |
|---|-----------|----------|-------|
| I | Core Mathematical Axioms | PASS | `DealMathEngine` + `CustomFormulaEvaluator` operate only on `decimal`; rounding via `MidpointRounding.AwayFromZero` at documented steps. NCalc set to decimal mode; result re-rounded. No `double`/`float`/JS `number` in money path; frontend treats money as display strings only. |
| II | Multi-Tenant Isolation | PASS | Global query filters on `Event`/`FinancialLineItem`/`EventArtist` resolve org via `Venue.OrganizationId` from `ITenantContext`; `LedgerService` adds `UserVenueScope` enforcement. Cross-tenant access → 404. No unscoped queries. |
| III | Engineering Rigor | PASS | xUnit unit tests for all documented math edge cases; Testcontainers integration tests for isolation/state-machine/recalculation; Vitest + RTL for grid. ≥80% coverage gate. |
| IV | QBO Integration | PASS | No QBO HTTP writes. `qbo_actual_value` read-only, default `0.00`, append-only when sync ships. No manual-entry path (clarification Q5). |
| V | Ledger State Machine | PASS | Every mutation handler prepends state guard; `SETTLED`/`RECONCILED` → `LedgerStateException` → HTTP 400. Editability matrix enforced server-side and surfaced in `GET /ledger`. |
| VI | Polyglot Contracts | PASS | `DecimalStringJsonConverter` serializes all monetary/percentage fields as strings; Swashbuckle emits `type: string`; `apps/web` consumes `generated-api.ts` only (no hand-written interfaces). |
| VII | EF Core Axioms | PASS | Ledger reads use `.AsNoTracking()` + eager `.Include().ThenInclude()` to org; no lazy loading. |
| VIII | Exception Governance | PASS | Granular domain exceptions (`LedgerStateException`, `FormulaEvaluationException`, `ConcurrencyConflictException`); no empty catches / generic `Exception` in financial paths; no PII/secrets in logs. |

**Re-check result**: All gates PASS post-design. Ready for `/speckit-tasks`.
