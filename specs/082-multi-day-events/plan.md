# Implementation Plan: Multi-Day Events (Festivals)

**Branch**: `082-multi-day-events` | **Date**: 2026-08-14 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/082-multi-day-events/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Introduce festival mode as a progressive enhancement of the existing single-day `Event`: a festival **is an `Event`** extended with an `EventType` discriminator and an `EndDate` (≤3 days), so it inherits org/venue scoping, the master financial matrix (`FinancialLineItem`), the QBO master tag (`Event.QboTagName`), calendar presence, and the settled/reconciled freeze machinery for free. New tables hang off the wrapper: `StageZone` (per-event stages, default auto-created), `ProgrammingBlock` (the schedule unit — day date, stage, times, category, status, settlement flag), `FestivalArtist` (per-festival artist identity linking multiple appearances), `RevenueBucket` + `RevenueAllocation` (flag-gated allocation of master revenue into block deals), `ExpenseAllocation` (rule-based splits of master-ledger expenses and imported QBO transactions down to day/stage/block, overhead by default), block-level settlement fields + line items (isolated sub-settlements), and a generic `FestivalAuditEntry` trail. Sub-settlement finalization reuses the proven two-phase atomic pipeline from `SettlementService.FinalizeAsync` (stage PDF → short locked DB transaction → promote), extended with allocation over-allocation re-checks inside the transaction. Deal math extends `DealMathEngine` (decimal, `MidpointRounding.AwayFromZero`) with caps/floors/bonuses and bucket-basis calculations plus a deterministic penny-remainder rule. The multi-track itinerary (time × stages) is a hand-built CSS-grid timeline with native HTML5 drag-and-drop per repo convention, with server-side same-stage conflict validation as the authority. Permissions add distinct flags (schedule / allocate / adjust / finalize / override / publish) to the existing role model plus `StageZoneAssignment` for stage-scoped authority. Standard events are untouched — `EventType.Standard` is the default and festival UI stays hidden until opted in.

## Technical Context

**Language/Version**: TypeScript 5.7 (React 18.3, Vite) for the frontend; C# / .NET 8 (ASP.NET Core, EF Core) for the backend

**Primary Dependencies**: React + @tanstack/react-query (existing hook patterns in `apps/web/src/api/*`), native HTML5 Drag and Drop API for the timeline (no new npm dependency — repo convention per spec 081 research D1/D2, drag payload kept in component state for jsdom testability), `@fortawesome/free-solid-svg-icons` for new itinerary/settlement icons (Constitution IX); EF Core via existing `ApplicationDbContext`, existing `DealMathEngine`/`CustomFormulaEvaluator`, `ISettlementPdfRenderer` + `ISettlementArchiveStore` (GCS-backed) reused for block settlement PDFs, `FrozenEventMutationAuditor`/EF `SaveChanges` interceptor (spec 041) extended to finalized block settlements

**Storage**: PostgreSQL via EF Core. One additive migration: new tables `stage_zones`, `programming_blocks`, `festival_artists`, `revenue_buckets`, `revenue_allocations`, `expense_allocations`, `block_settlement_line_items`, `block_settlement_revisions`, `stage_zone_assignments`, `festival_audit_entries`; new `Event` columns (`EventType`, `EndDate`); new permission flag columns on `OrganizationRole`; new `ReviewState` column on `unmapped_qbo_transactions`. No changes to existing rows' semantics — `EventType.Standard` is the default and all existing behavior is preserved.

**Testing**: xUnit + `IntegrationTestBase`/WebApplicationFactory + Testcontainers for backend (block CRUD/conflicts, allocation math + over-allocation races, atomic finalize incl. injected PDF/archive failures, org-isolation); Vitest + React Testing Library for frontend (timeline rendering/drag, conflict dialogs, preflight panel, bucket/split editors, view toggle); Playwright E2E for the multi-user flows Constitution III triggers on (stage-manager scoped finalize vs. finance full visibility, publish permission, tenant isolation of festival data); ≥80.0% line/branch coverage gate enforced independently per stack via CI

**Target Platform**: Web. Settlement execution is tablet-first (iPad-class Safari/Chrome, portrait + landscape, touch targets); back-office allocation/reporting is desktop-oriented; phones get read/review surfaces. Responsive web only — no native app, no offline finalization.

**Project Type**: Web application (existing `apps/web` frontend + `apps/api` backend monorepo) — this feature touches both, plus one EF migration

**Performance Goals**: At v1 scale (3 days, 5–8 stages, 150–250 blocks/event, 50–100/day): itinerary filter/view switches and drag feedback under 1s perceived (spec SC-003); same-stage conflict validation is a single indexed overlap query (<300ms server-side); report endpoints are single `AsNoTracking` aggregate queries — no caching/materialization layer at this scale

**Constraints**: All monetary math in C# `decimal` with `MidpointRounding.AwayFromZero`, rounding only at final payable lines with a deterministic penny-remainder rule (Constitution I; PRD "round half up" coincides with away-from-zero for the positive amounts settlements handle); every new query org-scoped through wrapper `Event → Venue → OrganizationId` (Constitution II); QBO stays strictly read-only — the master tag is a locally generated string the bookkeeper applies inside QBO (Constitution IV); finalized block settlements get the same interceptor-enforced immutability as settled events, and festival-level closeout reuses `EventStatus` (Constitution V); all new DTOs defined C#-first, `swagger.json` regenerated, frontend imports only from `generated-api.ts` (Constitution VI); eager loading with `.Include/.ThenInclude` + `.AsNoTracking()` on all read/report paths (Constitution VII); typed domain exceptions, no PII/token logging (Constitution VIII); Font Awesome Free icons only (Constitution IX); no new `deploy/` operator scripts (Constitution X N/A); no allocation above 100% of a bucket without explicit override; finalization blocked offline and all-or-nothing including PDF + dispatch handoff

**Scale/Scope**: The largest feature to date — delivered incrementally by the spec's 8 prioritized user stories. Backend: ~11 new tables, 4 new controllers (`FestivalsController`, `FestivalFinancialsController`, `BlockSettlementsController`, `FestivalReportsController`), ~6 new services, extensions to `DealMathEngine`, `QboMappingService`, role/permission plumbing. Frontend: 4 new pages (itinerary, festival ledger, block settlement, festival reports), ~15 new components under `components/festival/`, 3 new api modules, routing + event-workspace entry points

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Applicability | Assessment |
|---|---|---|
| I. Core Mathematical Axioms | Applies | All bucket/allocation/deal/settlement math is C# `decimal`; `DealMathEngine.RoundMoney` (`AwayFromZero`, 2dp) is the single rounding primitive; rounding applied only at final payable line items; penny variance resolved by a deterministic remainder-to-largest-allocation rule or an explicit adjustment line (research D7). No monetary math in TypeScript — frontend renders server-computed strings per the existing money-string contract (spec 012). |
| II. Multi-Tenant Isolation | Applies | Every new entity reaches `OrganizationId` through the wrapper `Event → Venue`; all new service queries filter through the tenant context + venue scope exactly like `EventService`/`SettlementService` today; `StageZoneAssignment` and allocation targets are validated same-org/same-festival before write. Integration tests include cross-org denial cases for every new controller. |
| III. Engineering Rigor & Quality Gates | Applies | xUnit integration suites per new controller/service; Vitest+RTL per new component/page; Playwright specs for multi-user permission tiers and tenant isolation (this feature *does* trigger the Playwright mandate — scoped stage manager vs. finance vs. itinerary-only); ≥80% both stacks. |
| IV. QBO Integration Boundaries | Applies | Read-only preserved: master tag is generated locally into `Event.QboTagName` for the bookkeeper to apply in QBO; imported transactions are never mutated — festival attribution lives in new Split-Rail-side allocation tables; `qbo_actual_value` stays append-only with corrections via existing offset entries. No new QBO write path of any kind. |
| V. Ledger State Machine & Immutability | Applies | Festival-level closeout reuses `EventStatus` Settled/Reconciled guards on the wrapper. New guard: mutations to a `ProgrammingBlock`'s settlement data once `BlockSettlementStatus.Finalized` throw `InvalidOperationException`/400 unless an authorized reopen context is active — enforced in services **and** in the spec-041 EF `SaveChanges` interceptor extended to block-settlement entities. Reopens create revisions; history is never overwritten. |
| VI. Polyglot Contract & Serialization | Applies | All new DTOs (festival, stage, block, bucket, allocation, settlement, report) defined in `apps/api/DTOs/Festivals/*` first; `npm run gen:api` regenerates `generated-api.ts`; zero hand-written TS mirrors. |
| VII. EF Core Axioms | Applies | No lazy loading; itinerary/report/settlement reads use explicit `.Include/.ThenInclude` + `.AsNoTracking()`; finalize paths load tracked aggregates with the same xmin/locking pattern as `SettlementService`. Balance checks (`SUM` of allocations) computed in SQL, re-checked inside the finalize transaction to close check-then-act races. |
| VIII. Exception Governance & Logging Privacy | Applies | New typed exceptions (`BlockConflictException` reusing 409 semantics, `AllocationConflictException`, `SettlementStateException` reuse, `FestivalValidationException` as needed) — no bare `System.Exception`; finalize failures log step + reason without payload PII; audit entries store user ids, not tokens/PII beyond names already in-domain. |
| IX. UI Iconography | Applies | New icons from free-solid only (e.g., `faGripVertical` drag, `faLayerGroup` stages, `faEye`/`faEyeSlash` view toggle, `faFileInvoiceDollar` settlement, `faTriangleExclamation` conflicts), imported per-icon. |
| X. Dual-Platform Operator Scripts | N/A | No new `deploy/` operator scripts; schema changes ride the existing EF-migration deploy flow (spec 053). |

**Result**: PASS — no violations; Complexity Tracking not required. Re-checked after Phase 1 design: still PASS (design artifacts introduce no new violations).

## Project Structure

### Documentation (this feature)

```text
specs/082-multi-day-events/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   ├── festival-structure-endpoints.md
│   ├── festival-financials-endpoints.md
│   ├── block-settlement-endpoints.md
│   └── festival-reporting-and-views.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
apps/api/
├── Models/
│   ├── Event.cs                                  # + EventType, EndDate
│   ├── StageZone.cs                              # New
│   ├── ProgrammingBlock.cs                       # New (incl. settlement fields)
│   ├── FestivalArtist.cs                         # New
│   ├── RevenueBucket.cs                          # New
│   ├── RevenueAllocation.cs                      # New
│   ├── ExpenseAllocation.cs                      # New (ledger-line & QBO-transaction splits)
│   ├── BlockSettlementLineItem.cs                # New (deductions/adjustments)
│   ├── BlockSettlementRevision.cs                # New (reopen history)
│   ├── StageZoneAssignment.cs                    # New (stage-manager scoping)
│   ├── FestivalAuditEntry.cs                     # New (generic festival audit trail)
│   ├── UnmappedQboTransaction.cs                 # + ReviewState
│   ├── OrganizationRole.cs                       # + festival permission flags
│   └── Enums/                                    # EventType, BlockCategory, BlockScheduleStatus,
│                                                 #   BlockSettlementStatus, AllocationMethod,
│                                                 #   AllocationTargetType, QboReviewState
├── Data/                                          # ApplicationDbContext config + one additive migration
├── DTOs/Festivals/                                # All new DTOs, C#-first (Constitution VI)
├── Services/
│   ├── FestivalService.cs                        # New — wrapper create/convert, stages, 3-day cap
│   ├── ProgrammingBlockService.cs                # New — block CRUD, conflict validation, status/audit
│   ├── FestivalAllocationService.cs              # New — buckets, allocations, splits, balances, penny rule
│   ├── BlockSettlementService.cs                 # New — preflight + two-phase atomic finalize + reopen
│   ├── FestivalReportService.cs                  # New — P&L, day/stage rollups, status/variance/unreconciled
│   ├── DealMathEngine.cs                         # + caps/floors/bonus + bucket-basis payout
│   ├── QboMappingService.cs                      # + festival split targets + ReviewState exceptions
│   └── FrozenEventMutationAuditor.cs             # + finalized-block-settlement guard surface
├── Controllers/
│   ├── FestivalsController.cs                    # New — structure + itinerary + blocks
│   ├── FestivalFinancialsController.cs           # New — buckets/allocations/splits/exceptions
│   ├── BlockSettlementsController.cs             # New — sheet/preflight/finalize/reopen/rollup
│   └── FestivalReportsController.cs              # New — report layers
└── apps/api.tests/
    ├── Integration/Festivals*.cs                 # New suites per controller
    └── Unit/DealMathEngineFestivalTests.cs        # + allocation/penny/cap-floor unit coverage

apps/web/
├── src/
│   ├── pages/
│   │   ├── FestivalItineraryPage.tsx             # New — multi-track timeline (US2/US3/US6)
│   │   ├── FestivalLedgerPage.tsx                # New — master ledger, buckets, splits (US4/US7)
│   │   ├── BlockSettlementPage.tsx               # New — tablet-first settlement (US5)
│   │   ├── FestivalReportsPage.tsx               # New — report layers (US8)
│   │   └── EventWorkspacePage.tsx                # + "festival mode" entry/convert affordance (US1)
│   ├── components/festival/                      # TimelineGrid, StageRow, BlockCard, BlockEditorDrawer,
│   │                                             #   ConflictDialog, ScheduleHistoryPanel, ViewToggle,
│   │                                             #   BucketTable, AllocationEditor, SplitEditor,
│   │                                             #   FinalizePreflightPanel, ReopenDialog, ArtistRollupPanel,
│   │                                             #   TransactionMappingDrawer, ReportCards
│   ├── api/festivals.ts                          # New hooks (structure/blocks/itinerary)
│   ├── api/festivalFinancials.ts                 # New hooks (buckets/allocations/splits)
│   ├── api/blockSettlements.ts                   # New hooks (sheet/finalize/reopen/rollup)
│   ├── api/festivalReports.ts                    # New hooks (report layers)
│   ├── App.tsx                                   # New routes
│   ├── types/generated-api.ts                    # Regenerated (never hand-edited)
│   └── index.css                                 # Timeline grid, block cards, tablet settlement styles
└── tests/                                        # Mirrored Vitest suites per new page/component

tests/                                             # Playwright: festival permission tiers + tenant isolation
```

**Structure Decision**: Existing `apps/web` + `apps/api` monorepo, no new projects/packages. Backend organized as four new vertical slices (structure, financials, block settlements, reports) following the existing controller/service/DTO layering; frontend adds a `components/festival/` family and four pages wired into the existing router and event workspace. Delivery is story-by-story per the spec's priorities (US1→US8), each slice independently testable behind the festival-mode entry point.

## Complexity Tracking

*No Constitution violations — this section is not applicable.*
