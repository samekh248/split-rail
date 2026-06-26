# Implementation Plan: QuickBooks Online Core Integration

**Branch**: `076-qbo-online-sync` | **Date**: 2026-06-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/076-qbo-online-sync/spec.md` — Linear project [QuickBooks Online Sync](https://linear.app/audiodex/project/quickbooks-online-sync-9e3cb33ef2a2/overview) with PRD and TDD documents.

## Summary

Completes the **QuickBooks Online core integration** product surface: Admin-only Settings → Integrations workspace, Class/Tag tracking mappings (Region/Venue/Event), disconnect + optional purge lifecycle, tenant-local 3:00 AM nightly sync dispatch, environment-aware sandbox routing, and state-aware financial UI when disconnected.

**Builds on** specs 003 (pull pipeline + account mapping), 037 (accounting views), 048 (egress write guard), 057 (scheduler OIDC). Does not replace the read-only sync engine — extends OAuth redirect, RBAC, mapping model, scheduler cadence, and frontend surfaces.

**Technical approach** (5 phases):

1. **Integrations shell + OAuth UI** — `IntegrationsSettingsPage`, `QboIntegrationCard`, OAuth callback redirect, venue selector.
2. **Admin RBAC + payload stripping** — `[RequireAdminRole]`, default role matrix update, 403 audit logs, `IQboPayloadFilter`.
3. **Tracking mappings + Quick Assign** — `QboTrackingMapping` migration, `QboMetadataClient`, catalog/CRUD APIs, mapping console, form selectors, sync resolver.
4. **Scheduler timezone + Force Pull + Purge** — `Organization.TimeZoneId`, dispatcher cron, `QboPurgeService`, debounced Force Pull, environment profile.
5. **State-aware surfaces** — ledger column gating, dashboard CTA, event card degradation, accounting overview polish.

## Technical Context

**Language/Version**: C# / .NET 8 (`apps/api`); TypeScript 5.7 + React 18 (`apps/web`); Bash + PowerShell deploy scripts (`deploy/`).

**Primary Dependencies**: Existing `QboSyncService`, `QboTokenService`, `QboMappingService`, `QboOAuthController`; Intuit OAuth + Query API (read-only); GCP Cloud Scheduler OIDC (spec 057); TanStack Query; MHC design tokens (spec 058).

**Storage**: PostgreSQL — new `qbo_tracking_mappings` table; `organizations.time_zone_id`; extend `qbo_venue_credentials` (`company_name`, `is_expired`). No changes to settlement PDF storage.

**Testing**: xUnit unit + WebApplicationFactory integration (Admin RBAC, purge cascade, payload stripping, tracking resolver, nightly dispatch, read-only guard); Vitest + RTL (Integrations card states, modals, Quick Assign, disconnected UI); Playwright E2E (Admin connect flow, non-Admin blocked); deploy contract tests for scheduler cron update; ≥80.0% line/branch coverage on touched backend and frontend code independently (Constitution III); missing/unparseable coverage reports fail CI.

**Target Platform**: Vite SPA + ASP.NET Core API on GCP Cloud Run; Cloud Scheduler in `us-central1`.

**Project Type**: Monorepo web application — `apps/api`, `apps/web`, `deploy/`.

**Performance Goals**: Integrations page load &lt;2s; Force Pull feedback within 1s of click; tracking catalog cached 15 min; nightly dispatch completes within scheduler retry window.

**Constraints**: Read-only Intuit access only (Constitution IV); append-only `qbo_actual_value` until Admin purge (Constitution V); decimal monetary fields only (Constitution I); org-scoped queries on all new entities (Constitution II); types from `generated-api.ts` only (Constitution VI); `.AsNoTracking()` on read paths (Constitution VII); no cleartext tokens in logs (Constitution VIII); Font Awesome for new icons (Constitution IX); paired `.sh`/`.ps1` for scheduler script changes (Constitution X); ≥80.0% coverage gate on changed code.

**Scale/Scope**: ~25 backend files touched/added; ~20 frontend files; 1 EF migration; 3 deploy script pairs updated; 4 contract docs; extends 4 prior QBO specs.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Applicable? | Status | Notes |
|---|-----------|-------------|--------|-------|
| I | Core Mathematical Axioms | **Yes** | PASS | Purge nulls `qbo_actual_value` as decimal; no float math. |
| II | Multi-Tenant Isolation | **Yes** | PASS | `QboTrackingMapping.OrganizationId` + global filter; purge scoped by venue→org. |
| III | Engineering Rigor & Quality Gates | **Yes** | PASS | xUnit + Vitest + Playwright; ≥80% on touched code. |
| IV | QBO Integration Boundaries | **Yes** | PASS | Read-only egress guard retained; `QboMetadataClient` query-only; no Intuit POST/PUT/DELETE. |
| V | Ledger State Machine | **Yes** | PASS | Purge does not mutate proforma/settlement; sync unchanged for SETTLED/RECONCILED guards. |
| VI | Polyglot Contract Serialization | **Yes** | PASS | New DTOs in C# → OpenAPI regen → `generated-api.ts`. |
| VII | EF Core Axioms | **Yes** | PASS | Catalog/mapping reads use `.AsNoTracking()` + explicit includes. |
| VIII | Exception Governance & Logging | **Yes** | PASS | Expired token graceful; 403 audit without tokens/PII. |
| IX | UI Iconography | **Yes** | PASS | Font Awesome for connect, sync, warning, purge. |
| X | Dual-Platform Operator Scripts | **Yes** | PASS | Scheduler cron update in paired `qbo-scheduler-names` scripts. |

**Gate result (pre-research)**: All applicable gates PASS. No violations.

**Post-design re-check**: PASS. Purge is explicit Admin destructive action — does not violate append-only until invoked. Complexity Tracking not required.

## Project Structure

### Documentation (this feature)

```text
specs/076-qbo-online-sync/
├── plan.md              # This file
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/
│   ├── qbo-integration-api.md
│   ├── qbo-integrations-settings-ui.md
│   ├── qbo-scheduler-timezone-dispatch.md
│   └── qbo-disconnected-ui.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
apps/api/
├── Authorization/
│   └── RequireAdminRoleAttribute.cs          # NEW
├── Configuration/
│   └── QboSyncOptions.cs                     # EXTEND — EnvironmentProfile
├── Controllers/
│   ├── QboOAuthController.cs                 # MODIFY — Admin gate, callback redirect
│   └── QboSyncController.cs                  # MODIFY — Admin gate, purge, tracking CRUD, integration DTO
├── DTOs/Qbo/
│   └── QboDtos.cs                            # EXTEND — integration, tracking, summary DTOs
├── Models/
│   ├── QboTrackingMapping.cs                 # NEW
│   ├── Organization.cs                       # EXTEND — TimeZoneId
│   └── QboVenueCredential.cs                 # EXTEND — CompanyName, IsExpired
├── Services/
│   ├── QboMetadataClient.cs                  # NEW — Class/Tag catalog queries
│   ├── QboTrackingMappingService.cs          # NEW — CRUD + resolver
│   ├── QboPurgeService.cs                    # NEW — cascade purge
│   ├── QboPayloadFilter.cs                   # NEW — disconnected DTO stripping
│   ├── QboSyncService.cs                     # MODIFY — tracking resolver, 48h lookback, nightly dispatch
│   ├── QboTokenService.cs                    # MODIFY — expired flag, company name cache
│   ├── OrganizationService.cs                # MODIFY — TimeZoneId default; role seeds Admin-only QBO
│   └── LedgerService.cs / DashboardService.cs  # MODIFY — payload filter integration
├── Data/
│   ├── ApplicationDbContext.cs               # EXTEND — QboTrackingMapping config
│   └── Migrations/                           # NEW migration
└── Program.cs                                # REGISTER new services

apps/api.tests/
├── Unit/
│   ├── QboTrackingMappingResolverTests.cs    # NEW
│   ├── NightlyDispatchSelectorTests.cs       # NEW
│   └── QboPayloadFilterTests.cs              # NEW
└── Integration/
    ├── QboIntegrationAdminRbacTests.cs       # NEW
    ├── QboPurgeCascadeTests.cs               # NEW
    ├── QboTrackingMappingTests.cs            # NEW
    └── QboIntegrationControllerTests.cs      # EXTEND

apps/web/src/
├── pages/
│   └── IntegrationsSettingsPage.tsx          # NEW — replaces placeholder
├── components/qbo/
│   ├── QboIntegrationCard.tsx                # NEW
│   ├── QboDisconnectModal.tsx                # NEW
│   ├── QboPurgeCacheModal.tsx                # NEW
│   ├── QboMappingConsole.tsx                 # NEW
│   ├── QboTrackingMappingTable.tsx           # NEW
│   ├── QboAccountMappingTable.tsx            # NEW
│   ├── QboForcePullButton.tsx                # NEW
│   └── QuickAssignTrackingSelect.tsx         # NEW
├── components/settings/
│   └── SettingsNav.tsx                       # MODIFY — Admin-gated Integrations
├── hooks/
│   ├── useIsAdmin.ts                         # NEW
│   └── useQboConnectionGate.ts               # NEW
├── api/
│   └── qbo.ts                                # EXTEND
├── lib/
│   └── qboConnectionState.ts                 # NEW
├── App.tsx                                   # MODIFY — IntegrationsSettingsPage route
└── (ledger/dashboard/event components)       # MODIFY — disconnected gating per contract

apps/web/tests/
├── pages/IntegrationsSettingsPage.test.tsx   # NEW
├── components/qbo/                           # NEW/EXTEND card, console, Quick Assign tests
└── deploy/deployQboScheduler.test.ts         # MODIFY — cron */15

deploy/lib/
├── qbo-scheduler-names.sh                    # MODIFY — SCHEDULER_CRON
└── qbo-scheduler-names.ps1                   # MODIFY — parity
```

**Structure Decision**: Full-stack vertical slice across API, web, and deploy scheduler libs. Reuse existing QBO services; add focused new services for tracking, purge, and payload filtering.

## Implementation Phases

### Phase 1 — Integrations shell + OAuth UI (PRD §3, §4.1)

1. `IntegrationsSettingsPage` + route swap in `App.tsx`.
2. `QboIntegrationCard` — three visual states wired to `GET …/qbo/integration`.
3. Connect / Reconnect → existing OAuth route; update callback redirect to `/settings/integrations`.
4. Venue selector for multi-venue orgs.
5. Vitest: card states, OAuth return query handling.

**Exit**: Admin completes OAuth from Settings; three card states render.

### Phase 2 — Admin RBAC + payload stripping (PRD §2, §9)

1. `[RequireAdminRole]` on connect, disconnect, purge, tracking CRUD, sync POST, mapping mutations.
2. Update `OrganizationService.CreateDefaultRoles` — remove QBO flags from Venue Manager and External Bookkeeper.
3. Structured 403 audit logging.
4. `SettingsNav` + route guard via `useIsAdmin`.
5. `QboPayloadFilter` + mapper integration for ledger, dashboard, sync-status DTOs.
6. xUnit: RBAC matrix; payload shape when disconnected.

**Exit**: Non-Admin 403 on integration APIs; JSON omits QBO fields when disconnected.

### Phase 3 — Tracking mappings + Quick Assign (PRD §5)

1. EF migration: `QboTrackingMapping`, `Organization.TimeZoneId`, credential extensions.
2. `QboMetadataClient` + catalog endpoint (15 min cache).
3. Tracking mapping CRUD endpoints + `QboTrackingMappingResolver`.
4. Update `QboSyncService` to use resolver (legacy `QboTagName` fallback).
5. `QboMappingConsole` tabs; `QuickAssignTrackingSelect` on Event/Venue/Region forms.
6. Optional migration script for existing `QboTagName` → Event-tier mappings.

**Exit**: Class/Tag bound to Region/Venue/Event; sync matches via effective tracking ref.

### Phase 4 — Scheduler + Force Pull + Purge (PRD §4.2, §6, §7)

1. `QboPurgeService` + purge endpoint + modals.
2. Nightly dispatch selector + internal trigger `mode=nightly` + 48h lookback.
3. Update scheduler cron to `*/15 * * * *` (paired deploy scripts + contract tests).
4. `QboForcePullButton` — 60s debounce + server rate limit.
5. `QboSyncOptions.EnvironmentProfile` — sandbox vs production URLs.
6. xUnit: purge cascade, dispatch timezone boundaries, environment routing.

**Exit**: Nightly sync at org local 3 AM; purge clears cache; Force Pull debounced; dev uses sandbox.

### Phase 5 — State-aware surfaces (PRD §8)

1. `useQboConnectionGate` + org summary endpoint consumer.
2. Ledger column gating (`BlockSection`, `VarianceCell`).
3. Dashboard `FinancialHealthWidget` Admin CTA.
4. `EventCard` / `eventCardSummary` alert suppression.
5. `UnassignedTransactionsBanner` hide when disconnected.
6. Vitest + Playwright coverage for degradation matrix.

**Exit**: Full disconnected UX across overview + workspace.

## Complexity Tracking

> Not required — no constitution violations.

## Phase 0 / Phase 1 Artifacts

| Artifact | Path | Status |
|----------|------|--------|
| Research | [research.md](./research.md) | Complete |
| Data model | [data-model.md](./data-model.md) | Complete |
| API contract | [contracts/qbo-integration-api.md](./contracts/qbo-integration-api.md) | Complete |
| UI contract | [contracts/qbo-integrations-settings-ui.md](./contracts/qbo-integrations-settings-ui.md) | Complete |
| Scheduler contract | [contracts/qbo-scheduler-timezone-dispatch.md](./contracts/qbo-scheduler-timezone-dispatch.md) | Complete |
| Disconnected UI contract | [contracts/qbo-disconnected-ui.md](./contracts/qbo-disconnected-ui.md) | Complete |
| Quickstart | [quickstart.md](./quickstart.md) | Complete |

**Next command**: `/speckit-tasks` to generate dependency-ordered `tasks.md`.
