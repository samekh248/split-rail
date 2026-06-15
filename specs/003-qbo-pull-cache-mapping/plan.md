# Implementation Plan: QuickBooks Online Pull Cache & Inline Mapping Engine

**Branch**: `003-qbo-pull-cache-mapping` | **Date**: 2026-06-14 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/003-qbo-pull-cache-mapping/spec.md`

## Summary

Build the read-only QuickBooks Online (QBO) transaction integration framework that maps cleared bank transactions to ledger line items via tag-based ingestion. A new `QboAccountMapping` entity and an `unmapped_qbo_transactions` staging table are added, scoped to the existing `organization → venue` tenant boundary via EF Core global query filters. An encrypted Intuit OAuth 2.0 token cache (`.NET Data Protection` / AES-256-GCM, keys from GCP Secret Manager) stores per-venue credentials. A `QboSyncService` ingestion pipeline reads QBO transactions filtered by native tags (matching `events.qbo_tag_name`), resolves account mappings, and aggregates matched amounts into the existing `financial_line_items.qbo_actual_value` column using an append-only strategy. An `IHostedService` 6-hour cron drives scheduled syncs (Cloud Scheduler OIDC trigger in production). A manual sync endpoint (`POST /api/venues/{venueId}/events/{eventId}/sync`) is permission-gated to `can_trigger_qbo_sync`. The React frontend adds an unmapped transaction warning banner, an inline mapping dropdown, and a "Sync Now" control — all consuming auto-generated API types (Constitution VI).

## Technical Context

**Language/Version**: C# / .NET 8.0 (backend); TypeScript 5.x + React 18 + Vite (frontend, existing `apps/web`)

**Primary Dependencies**: ASP.NET Core 8, Entity Framework Core 8, Npgsql.EntityFrameworkCore.PostgreSQL, Swashbuckle.AspNetCore (existing from 001/002); **Microsoft.AspNetCore.DataProtection** + **Microsoft.AspNetCore.DataProtection.Extensions** (token encryption); **IHttpClientFactory** (built-in, for Intuit API calls); **NSubstitute** (mock Intuit HTTP calls in tests); React 18, Vite, TanStack Query (existing from 002)

**Storage**: PostgreSQL 16 (GCP Cloud SQL — `split-rail:us-central1:split-rail-db-prod`). New table `qbo_account_mappings`; new staging table `unmapped_qbo_transactions`. Consumes existing `events.qbo_tag_name` and `financial_line_items.qbo_actual_value` columns from feature 002.

**Testing**: xUnit (unit — `QboSyncService`, token cache, mapping resolution); xUnit + WebApplicationFactory + Testcontainers.PostgreSql + NSubstitute (integration — append-only safety, read-only enforcement, permission gating, tenant isolation); Vitest + React Testing Library (frontend components). Playwright E2E deferred (SPLR-20).

**Target Platform**: GCP Cloud Run (Linux container, .NET 8 runtime) for the API; static build for the web app.

**Project Type**: Web application — REST API backend (`apps/api`) + React frontend (`apps/web`).

**Performance Goals**: Sync processing for a typical venue (~50 events, ~200 transactions per sync batch) completes within 30 seconds. Manual sync endpoint returns within 10 seconds for a single event.

**Constraints**: Strictly read-only QBO integration — zero HTTP POST/PUT/DELETE to Intuit endpoints (Constitution IV); append-only `qbo_actual_value` (Constitution IV); zero cross-tenant data leakage (Constitution II); no cleartext tokens/secrets in logs (Constitution VIII); all monetary DTOs serialized as strings (Constitution VI); eager `.Include()`/`.ThenInclude()` + `.AsNoTracking()` reads (Constitution VII); ≥80% coverage.

**Scale/Scope**: MVP — <1000 organizations, ~100 concurrent users; typical venue has ~50 events and ~500 QBO transactions total.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Applicable? | Status | Notes |
|---|-----------|-------------|--------|-------|
| I | Core Mathematical Axioms | **Yes** | PASS | QBO actual values are `NUMERIC(12,2)` / C# `decimal`. Aggregation uses `decimal` sum. No `double`/`float`/JS `number` in money path. Frontend treats actuals as display strings only. |
| II | Multi-Tenant Isolation | **Yes** | PASS | `QboAccountMapping` scoped via `venue_id → venue.organization_id`; `UnmappedQboTransaction` scoped via `event_id → event.venue.organization_id`. Sync queries constrained to authenticated org via EF Core global query filters and `ITenantContext`. |
| III | Engineering Rigor | **Yes** | PASS | xUnit unit tests for sync logic and token cache; Testcontainers integration tests for append-only safety, read-only enforcement, mapping auto-routing, permission gating; Vitest for frontend components. ≥80% coverage gate. |
| IV | QBO Integration | **Yes — primary** | PASS | This IS the QBO integration feature. Strictly read-only: no HTTP POST/PUT/DELETE to Intuit endpoints; mocked HTTP client tests assert no write verbs. Append-only: historical `qbo_actual_value` never deleted/overwritten; corrections via offset entries only. |
| V | Ledger State Machine | **Yes (consumed)** | PASS | Sync populates `qbo_actual_value` regardless of event status (read-only field). Manual sync does not mutate proforma/settlement columns. Inline mapping writes to `qbo_account_mappings` (not line items). No state machine violations. |
| VI | Polyglot Contract Serialization | **Yes** | PASS | All monetary DTO fields (aggregated actuals, unmapped amounts) serialized as strings via existing `DecimalStringJsonConverter`. Frontend imports from `generated-api.ts` only. |
| VII | EF Core Axioms | **Yes** | PASS | Sync reads use `.AsNoTracking()` + eager `.Include().ThenInclude()` to org. No lazy loading. |
| VIII | Exception Governance | **Yes** | PASS | Granular domain exceptions (`QboTokenRefreshException`, `QboSyncException`, `QboMappingConflictException`); no empty catches or generic `Exception`; no cleartext tokens/PII in logs. |

**Gate result**: All gates PASS. No violations.

## Project Structure

### Documentation (this feature)

```text
specs/003-qbo-pull-cache-mapping/
├── plan.md              # This file
├── research.md          # Phase 0 output — technology & approach decisions
├── data-model.md        # Phase 1 output — entities, enums, state machine
├── quickstart.md        # Phase 1 output — validation guide
├── contracts/           # Phase 1 output — API endpoint contracts
│   ├── sync.md
│   ├── mappings.md
│   └── unmapped.md
└── tasks.md             # Phase 2 output (created by /speckit-tasks)
```

### Source Code (repository root)

```text
apps/
├── api/                                   # ASP.NET Core 8 REST API (existing)
│   ├── Controllers/
│   │   └── QboSyncController.cs           # NEW — sync + mapping + unmapped routes
│   ├── Data/
│   │   ├── ApplicationDbContext.cs         # EXTEND — add DbSets, configs, query filters
│   │   └── Migrations/                     # NEW — AddQboAccountMappings + AddUnmappedQboTransactions
│   ├── DTOs/
│   │   └── Qbo/                            # NEW — sync status, mapping, unmapped transaction DTOs
│   ├── Models/
│   │   ├── QboAccountMapping.cs            # NEW
│   │   └── UnmappedQboTransaction.cs       # NEW
│   ├── Services/
│   │   ├── QboSyncService.cs              # NEW — ingestion pipeline + mapping resolution
│   │   ├── QboTokenService.cs             # NEW — encrypted OAuth token cache
│   │   └── QboTransactionClient.cs        # NEW — read-only Intuit API client
│   ├── BackgroundServices/
│   │   └── QboSyncHostedService.cs        # NEW — 6-hour IHostedService cron
│   ├── Exceptions/ApiExceptions.cs        # EXTEND — QBO domain exceptions
│   └── Program.cs                         # EXTEND — DI registrations + Data Protection + IHostedService
│
├── api.tests/                             # xUnit test project (existing)
│   ├── Unit/
│   │   ├── QboSyncServiceTests.cs         # NEW — append-only, mapping resolution, aggregation
│   │   └── QboTokenServiceTests.cs        # NEW — encryption/decryption, refresh
│   └── Integration/
│       ├── QboSyncControllerTests.cs      # NEW — permission gating, tenant isolation
│       ├── QboAppendOnlyTests.cs          # NEW — append-only safety
│       └── QboReadOnlyTests.cs            # NEW — no write verbs to Intuit
│
└── web/                                   # React + Vite + TypeScript (existing from 002)
    ├── src/
    │   ├── components/qbo/                # NEW — UnmappedBanner, InlineMappingDropdown, SyncNowButton
    │   ├── api/                           # EXTEND — QBO sync/mapping query hooks
    │   └── types/generated-api.ts         # REGENERATED — includes QBO DTOs
    └── tests/
        └── qbo/                           # NEW — Vitest component tests
```

**Structure Decision**: Continue the established monorepo. The backend extends the existing `apps/api` (new models/services/controller/migration; reuse `ITenantContext`, `RequirePermissionAttribute`, `PermissionNames`, exception middleware). The frontend extends `apps/web` (new QBO components, extended API hooks). Routes follow the existing `api/venues/{venueId}/…` convention (no `/v1/` segment — consistent with feature 002 research §3).

## Complexity Tracking

No constitution violations to justify. All decisions reuse existing 001/002 patterns (tenant context, permission policies, EF query filters, domain exceptions, Swashbuckle, decimal-as-string serialization) and add only the QBO sync pipeline, token cache, account mapping, and unmapped transaction handling required by the spec.

## Post-Design Constitution Re-Check

*Re-evaluated after Phase 1 design artifacts (data-model.md, contracts/, quickstart.md).*

| # | Principle | Re-Check | Notes |
|---|-----------|----------|-------|
| I | Core Mathematical Axioms | PASS | All monetary values in `qbo_sync_ledger`, `unmapped_qbo_transactions`, and `qbo_account_mappings` are `NUMERIC(12,2)` / C# `decimal`. Aggregation (`SUM(amount)`) operates in `decimal`. DTO serialization uses `DecimalStringJsonConverter` (strings). No `double`/`float`/JS `number` in any money path. |
| II | Multi-Tenant Isolation | PASS | All four new entities (`QboAccountMapping`, `QboVenueCredential`, `QboSyncLedger`, `UnmappedQboTransaction`) have EF Core global query filters resolving org via venue or event → venue → `OrganizationId`. Sync queries constrained to authenticated org via `ITenantContext`. Manual sync endpoint enforces venue scope. OAuth tokens are per-venue, scoped to the venue's organization. |
| III | Engineering Rigor | PASS | xUnit unit tests for sync logic, token cache, mapping resolution, aggregation; Testcontainers integration tests for append-only safety, read-only enforcement (no write verbs to QBO), permission gating, tenant isolation, self-healing routing; Vitest + RTL for unmapped banner, inline mapping dropdown, sync button. ≥80% coverage gate. |
| IV | QBO Integration | PASS | `QboTransactionClient` exposes only HTTP GET methods — no POST/PUT/DELETE to Intuit endpoints. Integration tests mock the HTTP pipeline and assert zero write verbs. `qbo_sync_ledger` is INSERT-only (no UPDATE/DELETE) — append-only proven by tests. `qbo_actual_value` recomputed as SUM from the append-only ledger. Corrections via offset entries only. |
| V | Ledger State Machine | PASS | Sync populates `qbo_actual_value` (a read-only computed aggregate) regardless of event lifecycle state. Manual sync does not mutate proforma/settlement columns. Inline mapping writes to `qbo_account_mappings` / `qbo_sync_ledger` (not to line item proforma/settlement fields). No state machine violations. |
| VI | Polyglot Contracts | PASS | All monetary DTO fields (amounts in sync responses, unmapped transaction amounts) serialized as strings via `DecimalStringJsonConverter`. Frontend imports from `generated-api.ts` only — no hand-written TypeScript interfaces. |
| VII | EF Core Axioms | PASS | All sync/mapping read queries use `.AsNoTracking()` + eager `.Include().ThenInclude()` to org. No lazy loading configured on any new entity. |
| VIII | Exception Governance | PASS | Granular domain exceptions: `QboTokenRefreshException` (token refresh failure), `QboSyncException` (API errors, rate limits), `QboMappingConflictException` (duplicate mapping). No empty catches. No generic `Exception` in sync/token paths. Cleartext tokens/secrets never logged — encrypted blobs only in Data Protection store; only venue ID and realm ID appear in structured logs. |

**Re-check result**: All gates PASS post-design. Ready for `/speckit-tasks`.
