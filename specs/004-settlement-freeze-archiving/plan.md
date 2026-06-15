# Implementation Plan: Night-of Settlement Freeze Pipeline & Immutable Archiving

**Branch**: `004-settlement-freeze-archiving` | **Date**: 2026-06-14 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/004-settlement-freeze-archiving/spec.md`

## Summary

Implement the **State 2 (Settlement) → State 3 (Reconciliation)** lifecycle transition: an atomic finalize-settlement pipeline that captures a tour manager's touchscreen signature, snapshots the settlement financials, renders an immutable PDF server-side, streams it to a Write-Once-Read-Many (WORM) Google Cloud Storage bucket (7-year retention), persists the object path, and flips the event to `SETTLED` (read-only). The constitution's immutability guard (`LedgerService.AssertNotSettledOrReconciled`, already wired into every line-item/artist mutation path) becomes the enforced release criterion; the only sanctioned exit from a frozen state is a super-admin **settlement reversal** that is fully audited and never deletes or re-renders the original archived PDF. The backend adds a `POST /api/venues/{venueId}/events/{eventId}/settle` endpoint (gated by `can_sign_settlement` + venue scope), a `SettlementService`, a `SettlementPdfRenderer` (QuestPDF), an `ISettlementArchiveStore` abstraction (GCS WORM implementation + in-memory test fake) that also mints short-lived V4 signed URLs, two new `events` columns (`artist_signature_data`, `settlement_pdf_url`) plus an `xmin` optimistic-concurrency token, a `settlement_reversals` audit table, and a new `can_reverse_settlement` permission. The React frontend adds a touchscreen `<canvas>` signature pad, a finalize-confirmation flow, instant workspace read-only locking, and a permission-gated signed-URL PDF link — all consuming auto-generated API types (Constitution VI).

## Technical Context

**Language/Version**: C# / .NET 8.0 (backend `apps/api`); TypeScript 5.7 + React 18 + Vite 6 (frontend `apps/web`).

**Primary Dependencies**: ASP.NET Core 8, EF Core 8, Npgsql.EntityFrameworkCore.PostgreSQL, Swashbuckle (existing); **QuestPDF** (server-side PDF rendering — MIT, fully managed, Linux/Cloud Run friendly); **Google.Cloud.Storage.V1** (WORM upload + V4 signed URLs); existing `Microsoft.AspNetCore.DataProtection`; React 18, TanStack Query (existing). Tests: xUnit + WebApplicationFactory + Testcontainers.PostgreSql + NSubstitute (backend); Vitest + React Testing Library (frontend).

**Storage**: PostgreSQL 16 (GCP Cloud SQL). Migration adds `events.artist_signature_data` (TEXT), `events.settlement_pdf_url` (TEXT), `events.xmin` concurrency token (existing system column, mapped), and a new `settlement_reversals` audit table. Object storage: locked GCS bucket with Object Retention Policy (WORM), 7-year minimum retention, configured via infrastructure (not app code).

**Testing**: xUnit unit (`SettlementService` state/atomicity logic, signature validation, `SettlementPdfRenderer` produces non-empty PDF); xUnit + Testcontainers integration (finalize happy path, permission/venue gating → 403, post-settlement mutation rejection across `events`/`event_artists`/`financial_line_items`, atomicity via forced archive-store failure, concurrent finalize → 409, reversal authz + original-PDF preservation, immutability proof); Vitest + RTL (signature canvas capture/serialize, post-finalize read-only lock, control hiding for unauthorized roles). Playwright E2E deferred (SPLR-20).

**Target Platform**: GCP Cloud Run (Linux container, .NET 8) for the API with Workload Identity for GCS/Secret Manager access; static build for the web app.

**Project Type**: Web application — REST API backend (`apps/api`) + React frontend (`apps/web`).

**Performance Goals**: Finalize endpoint (validate → snapshot → render PDF → upload → commit) completes within 10 seconds for a typical event (~30 line items, a few artists). Signed-URL minting returns within 1 second.

**Constraints**: Atomic transition — no partial freeze (Constitution V); strict immutability — `SETTLED`/`RECONCILED` reject all mutations with explicit logged 400 (Constitution V); WORM object never overwritten/deleted within retention (7 years); first-wins concurrency via optimistic-concurrency token on `events`; no raw signature payloads, PII, or storage credentials in logs (Constitution VIII); granular domain exceptions only (Constitution VIII); monetary values are `decimal`/`NUMERIC(12,2)` and serialized as strings (Constitution I, VI); eager `.Include()`/`.AsNoTracking()` reads (Constitution VII); frontend types from `generated-api.ts` only (Constitution VI); ≥80% coverage.

**Scale/Scope**: MVP — <1000 organizations, ~100 concurrent users; one settlement PDF per event finalize (plus a new PDF per reversal+re-settle cycle).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Applicable? | Status | Notes |
|---|-----------|-------------|--------|-------|
| I | Core Mathematical Axioms | **Yes** | PASS | Snapshot/PDF render reads `decimal` line-item + `calculated_net_payout` values; deal math delegates to existing `DealMathEngine` (`MidpointRounding.AwayFromZero`). No `double`/`float`/JS `number` in money path; DTO money fields serialized as strings. |
| II | Multi-Tenant Isolation | **Yes** | PASS | Finalize/reversal/PDF endpoints resolve org via `Event → Venue → OrganizationId` using existing EF Core global query filters + `ITenantContext`; venue scope enforced via existing `VenueService.IsVenueAccessibleAsync`. `settlement_reversals` filtered through `Event`. |
| III | Engineering Rigor | **Yes** | PASS | xUnit unit + Testcontainers integration for state constraints, atomicity, authz, concurrency, immutability proof; Vitest + RTL for signature canvas, read-only lock, role gating. ≥80% coverage gate. |
| IV | QBO Integration | **No (out of scope)** | N/A | This milestone does not touch QBO ingestion (SPLR-18). Reconciliation/`RECONCILED` transition driven later by QBO; no Intuit calls added. |
| V | Ledger State Machine | **Yes — primary** | PASS | This IS the freeze milestone. Finalize sets `SETTLED` atomically. Existing `AssertNotSettledOrReconciled` guard (already on all line-item/artist mutations) is the enforced criterion. The only `SETTLED`-exit is the audited super-admin reversal, which preserves the original WORM PDF (no drift between records and snapshot). |
| VI | Polyglot Contract Serialization | **Yes** | PASS | New DTOs (settle request/response, reversal, signed-URL) defined in C# first; `swagger.json` regenerated → `generated-api.ts`. Frontend imports types only; money fields use `DecimalStringJsonConverter`. |
| VII | EF Core Axioms | **Yes** | PASS | Read paths (`GetEditability`, PDF link, snapshot load) use `.AsNoTracking()` where read-only + eager `.Include().ThenInclude()` to org. Mutation load uses tracked query + optimistic concurrency token. No lazy loading. |
| VIII | Exception Governance | **Yes** | PASS | New granular domain exceptions (`SettlementStateException`, `SettlementArchiveException`, `SignatureValidationException`); reuse `ConcurrencyConflictException`, `AuthorizationException`. No empty catches, no generic `Exception`. Signature payloads, PII, and GCS credentials never logged — only event/venue IDs and object names (non-secret). |

**Gate result**: All gates PASS. No violations. (Complexity Tracking not required.)

## Project Structure

### Documentation (this feature)

```text
specs/004-settlement-freeze-archiving/
├── plan.md              # This file
├── research.md          # Phase 0 output — technology & approach decisions
├── data-model.md        # Phase 1 output — schema deltas, entities, state machine
├── quickstart.md        # Phase 1 output — validation guide
├── contracts/           # Phase 1 output — API endpoint contracts
│   ├── settle.md
│   ├── reversal.md
│   └── settlement-pdf.md
├── checklists/
│   └── requirements.md  # Spec quality checklist (from /speckit-specify)
└── tasks.md             # Phase 2 output (created by /speckit-tasks)
```

### Source Code (repository root)

```text
apps/
├── api/                                        # ASP.NET Core 8 REST API (existing)
│   ├── Controllers/
│   │   └── SettlementController.cs              # NEW — settle, reverse, pdf-link routes
│   ├── Configuration/
│   │   └── SettlementArchiveOptions.cs          # NEW — GCS bucket name, signed-URL TTL
│   ├── Data/
│   │   ├── ApplicationDbContext.cs              # EXTEND — Event columns + SettlementReversal config + filter
│   │   └── Migrations/                          # NEW — AddSettlementArchiveColumns + SettlementReversals + can_reverse_settlement
│   ├── DTOs/
│   │   └── Settlement/                          # NEW — SettlementDtos.cs (settle req/resp, reversal, pdf link)
│   ├── Models/
│   │   ├── Event.cs                             # EXTEND — ArtistSignatureData, SettlementPdfUrl, Xmin
│   │   ├── OrganizationRole.cs                  # EXTEND — CanReverseSettlement
│   │   └── SettlementReversal.cs                # NEW — audit entity
│   ├── Services/
│   │   ├── SettlementService.cs                # NEW — atomic finalize + reversal orchestration
│   │   ├── SettlementPdfRenderer.cs            # NEW — QuestPDF document (signature + financial block)
│   │   ├── SignatureValidator.cs               # NEW — base64 vector parse + ≥1 stroke check
│   │   └── ISettlementArchiveStore.cs +         # NEW — abstraction
│   │       GcsSettlementArchiveStore.cs         # NEW — WORM upload + V4 signed URL
│   ├── Authorization/PermissionAuthorization.cs # EXTEND — ReverseSettlement case
│   ├── Exceptions/ApiExceptions.cs             # EXTEND — settlement domain exceptions
│   ├── Middleware/ExceptionHandlerMiddleware.cs # EXTEND — map new exceptions
│   └── Program.cs                              # EXTEND — QuestPDF license, DI, options, policy
│
├── api.tests/                                  # xUnit test project (existing)
│   ├── Unit/
│   │   ├── SettlementServiceTests.cs           # NEW — state validation, atomicity, snapshot
│   │   ├── SignatureValidatorTests.cs          # NEW — valid/empty/malformed signatures
│   │   └── SettlementPdfRendererTests.cs       # NEW — produces non-empty PDF embedding data
│   └── Integration/
│       ├── SettlementFinalizeTests.cs          # NEW — happy path, field population
│       ├── SettlementAuthorizationTests.cs     # NEW — 403 perm/venue scope
│       ├── SettlementImmutabilityTests.cs      # NEW — post-settle mutation rejection + PDF unchanged
│       ├── SettlementAtomicityTests.cs         # NEW — forced archive failure → not SETTLED
│       ├── SettlementConcurrencyTests.cs       # NEW — concurrent finalize → 409
│       └── SettlementReversalTests.cs          # NEW — super-admin only, original PDF preserved
│
└── web/                                        # React + Vite + TS (existing)
    ├── src/
    │   ├── components/settlement/              # NEW — SignaturePad, FinalizeSettlementPanel, SettlementLockedBanner
    │   ├── api/
    │   │   ├── settlement.ts                   # NEW — useFinalizeSettlement, useSettlementPdfLink, useReverseSettlement
    │   │   └── user.ts                         # EXTEND — useCanSignSettlement hook
    │   └── types/generated-api.ts              # REGENERATED — includes settlement DTOs
    └── tests/
        └── settlement/                         # NEW — Vitest component tests
```

**Structure Decision**: Continue the established monorepo and feature-002/003 conventions. Reuse `ITenantContext`, `RequirePermissionAttribute`/`PermissionAuthorizationHandler`, `VenueService.IsVenueAccessibleAsync`, the existing `events` audit columns, `LedgerService.AssertNotSettledOrReconciled` / `GetEditability`, `DealMathEngine`, `DecimalStringJsonConverter`, and `ExceptionHandlerMiddleware`. Routes follow the existing `api/venues/{venueId:guid}/events/{eventId:guid}/...` convention (no `/v1/` segment — consistent with features 002/003). The settle endpoint path in the spec (`/api/v1/...`) is normalized to the project's existing non-versioned convention.

## Complexity Tracking

No constitution violations to justify. New surface area (PDF renderer, archive store, settlement service, reversal audit, one new permission) is the minimum required by the spec. PDF and GCS access are isolated behind `SettlementPdfRenderer` and `ISettlementArchiveStore` so integration tests run without external services. Optimistic concurrency reuses the existing `xmin`/`RowVersionFormat` pattern already used by `FinancialLineItem` and `EventArtist`.

## Post-Design Constitution Re-Check

*Re-evaluated after Phase 1 design artifacts (data-model.md, contracts/, quickstart.md).*

| # | Principle | Re-Check | Notes |
|---|-----------|----------|-------|
| I | Core Mathematical Axioms | PASS | Snapshot values copied as `decimal`; PDF renders pre-computed `decimal` figures formatted as strings. No floating point introduced. |
| II | Multi-Tenant Isolation | PASS | `SettlementReversal` global query filter resolves org via `Event → Venue → OrganizationId`. All three endpoints enforce venue accessibility + tenant filter. Signed URLs minted only after tenant+permission checks. |
| III | Engineering Rigor | PASS | Full unit + integration + component matrix defined in data-model/quickstart; ≥80% gate. Atomicity and immutability proven by dedicated integration tests. |
| IV | QBO Integration | N/A | No Intuit interaction added. |
| V | Ledger State Machine | PASS | Atomic `PreShow → Settled` via optimistic concurrency; immutability guard enforced + tested; reversal is the single audited exit and preserves the original WORM artifact (no record/snapshot drift). |
| VI | Polyglot Contracts | PASS | All settlement DTOs C#-first; money/string serialization via existing converters; frontend imports from `generated-api.ts` only. |
| VII | EF Core Axioms | PASS | Read paths `.AsNoTracking()` + eager includes; mutation path tracked with `xmin` concurrency token; no lazy loading. |
| VIII | Exception Governance | PASS | Granular `SettlementStateException`/`SettlementArchiveException`/`SignatureValidationException`; rejected mutations logged (IDs only); signatures/credentials never logged. |

**Re-check result**: All gates PASS post-design. Ready for `/speckit-tasks`.
