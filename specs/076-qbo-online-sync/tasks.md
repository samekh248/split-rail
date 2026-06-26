---
description: "Task list for QuickBooks Online Core Integration (076-qbo-online-sync)"
---

# Tasks: QuickBooks Online Core Integration

**Input**: Design documents from `/specs/076-qbo-online-sync/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: REQUIRED per Constitution III. xUnit unit + integration tests for backend services, RBAC, purge, tracking resolver, nightly dispatch, and payload filtering. Vitest + RTL for Integrations UI, mapping console, Quick Assign, Force Pull, and disconnected surfaces. Playwright E2E for Admin connect flow and non-Admin route block. Deploy contract tests for scheduler cron update. Backend ≥80.0% line/branch coverage on touched code; frontend ≥80.0% on touched code.

**Organization**: Tasks grouped by user story (US1–US7). **Both US1 and US2 are P1**; recommended order is **Foundational → US2 (Admin RBAC) → US1 (Integrations UI + OAuth)** so connect endpoints and nav guards are Admin-only before the Settings page ships. US3–US7 follow plan phases 3–5.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1–US7 (maps to user stories in spec.md)
- All paths are repo-relative
- Operator/deploy scripts: when editing `deploy/**/*.sh`, also edit paired `deploy/**/*.ps1` (Constitution §X)

## Path Conventions

- **API**: `apps/api/`, tests in `apps/api.tests/`
- **Web**: `apps/web/src/`, tests in `apps/web/tests/`
- **Deploy**: `deploy/lib/qbo-scheduler-names.sh`, `deploy/lib/qbo-scheduler-names.ps1`
- **Specs**: `specs/076-qbo-online-sync/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm branch, feature pointer, and design artifacts before implementation.

- [X] T001 Verify branch `076-qbo-online-sync` is checked out and `.specify/feature.json` points to `specs/076-qbo-online-sync`
- [X] T002 [P] Review API contract in `specs/076-qbo-online-sync/contracts/qbo-integration-api.md`
- [X] T003 [P] Review UI contract in `specs/076-qbo-online-sync/contracts/qbo-integrations-settings-ui.md`
- [X] T004 [P] Review scheduler contract in `specs/076-qbo-online-sync/contracts/qbo-scheduler-timezone-dispatch.md`
- [X] T005 [P] Review disconnected UI contract in `specs/076-qbo-online-sync/contracts/qbo-disconnected-ui.md`
- [X] T006 [P] Review data model and research decisions in `specs/076-qbo-online-sync/data-model.md` and `specs/076-qbo-online-sync/research.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared models, migration, authorization attribute, DTOs, DI registration, and frontend hooks. **Blocks all user stories.**

**⚠️ CRITICAL**: No user story work begins until this phase completes.

- [X] T007 [P] Create `RequireAdminRoleAttribute` in `apps/api/Authorization/RequireAdminRoleAttribute.cs` with structured 403 audit logging
- [X] T008 [P] Extend `VenueQboIntegrationDto`, `OrganizationQboSummaryDto`, and tracking DTOs in `apps/api/DTOs/Qbo/QboDtos.cs`
- [X] T009 [P] Add `TimeZoneId` property to `apps/api/Models/Organization.cs` (default `America/Denver`)
- [X] T010 [P] Extend `CompanyName` and `IsExpired` on `apps/api/Models/QboVenueCredential.cs`
- [X] T011 [P] Create `QboTrackingMapping` model in `apps/api/Models/QboTrackingMapping.cs`
- [X] T012 Configure `QboTrackingMapping` and `Organization.TimeZoneId` in `apps/api/Data/ApplicationDbContext.cs` (unique index, org query filter)
- [X] T013 Generate and apply EF migration under `apps/api/Data/Migrations/` for tracking mappings, timezone, and credential extensions
- [X] T014 Register service stubs in `apps/api/Program.cs` for `QboMetadataClient`, `QboTrackingMappingService`, `QboPurgeService`, and `IQboPayloadFilter`
- [X] T015 [P] Create `useIsAdmin` hook in `apps/web/src/hooks/useIsAdmin.ts` (reads profile role name)
- [X] T016 [P] Create connection state helpers in `apps/web/src/lib/qboConnectionState.ts`
- [X] T017 [P] Add API client function stubs in `apps/web/src/api/qbo.ts` for integration, summary, tracking, and purge endpoints
- [ ] T018 Run `dotnet build` in `apps/api` and `npm run generate-types` in `apps/web` after DTO changes

**Checkpoint**: Foundation ready — user story implementation can begin

---

## Phase 3: User Story 2 — Only Admins Can Access Integration Management (Priority: P1)

**Goal**: Restrict all integration management (connect, disconnect, purge, mappings, sync) to Admin role; hide Integrations nav from non-Admins; audit 403 attempts.

**Independent Test**: Sign in as Venue Manager — Integrations nav hidden, direct `/settings/integrations` redirect, all integration mutation APIs return 403 with audit log. Admin retains full access.

> **Implement before US1 UI ships** — connect and mapping endpoints must be Admin-gated first.

### Tests for User Story 2 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T019 [P] [US2] Add failing RBAC tests for Promoter/Venue Manager/External Bookkeeper 403 on connect in `apps/api.tests/Integration/QboIntegrationAdminRbacTests.cs`
- [X] T020 [P] [US2] Add failing RBAC tests for 403 on disconnect, sync POST, and mapping mutations in `apps/api.tests/Integration/QboIntegrationAdminRbacTests.cs`
- [X] T021 [P] [US2] Add failing audit log assertion test for 403 attempts in `apps/api.tests/Integration/QboIntegrationAdminRbacTests.cs`
- [X] T022 [P] [US2] Add failing payload stripping tests when disconnected in `apps/api.tests/Unit/QboPayloadFilterTests.cs`
- [X] T023 [P] [US2] Add failing `SettingsNav` hides Integrations for non-Admin in `apps/web/tests/components/settings/SettingsNav.test.tsx`
- [X] T024 [P] [US2] Add failing route guard test for `/settings/integrations` redirect in `apps/web/tests/pages/IntegrationsSettingsPage.test.tsx`

### Implementation for User Story 2

- [X] T025 [US2] Replace `RequirePermission(MapQboAccounts|TriggerQboSync)` with `[RequireAdminRole]` on OAuth and sync mutation actions in `apps/api/Controllers/QboOAuthController.cs`
- [X] T026 [US2] Apply `[RequireAdminRole]` to mapping mutation and sync POST routes in `apps/api/Controllers/QboSyncController.cs`
- [X] T027 [US2] Remove `CanTriggerQboSync` and `CanMapQboAccounts` from Venue Manager and External Bookkeeper defaults in `apps/api/Services/OrganizationService.cs`
- [X] T028 [US2] Implement `QboPayloadFilter` in `apps/api/Services/QboPayloadFilter.cs` and integrate into `apps/api/Services/LedgerService.cs` and `apps/api/Services/DashboardService.cs`
- [X] T029 [US2] Gate Integrations nav item on `useIsAdmin()` in `apps/web/src/components/settings/SettingsNav.tsx`
- [X] T030 [US2] Add Admin route guard redirect in `apps/web/src/App.tsx` for `/settings/integrations` path

**Checkpoint**: Non-Admin blocked on integration APIs and Settings route; payload stripping active

---

## Phase 4: User Story 1 — Admin Connects QuickBooks from Settings Integrations (Priority: P1) 🎯 MVP

**Goal**: Deliver Settings → Integrations workspace with Disconnected / Connected / Expired card states, venue selector, Connect/Reconnect/Disconnect actions, and OAuth callback redirect.

**Independent Test**: Admin navigates Profile Badge → Settings → Integrations, completes sandbox OAuth, lands on connected card with company name, realm id, and last sync timestamp.

### Tests for User Story 1 (REQUIRED) ⚠️

- [X] T031 [P] [US1] Add failing integration endpoint tests in `apps/api.tests/Integration/QboIntegrationControllerTests.cs` for Disconnected/Connected/Expired states
- [ ] T032 [P] [US1] Add failing OAuth callback redirect test to `/settings/integrations` in `apps/api.tests/Integration/QboIntegrationControllerTests.cs`
- [X] T033 [P] [US1] Add failing Vitest tests for three card states in `apps/web/tests/components/qbo/QboIntegrationCard.test.tsx`
- [X] T034 [P] [US1] Add failing page test for OAuth return query handling in `apps/web/tests/pages/IntegrationsSettingsPage.test.tsx`

### Implementation for User Story 1

- [X] T035 [US1] Implement `GetVenueQboIntegrationAsync` with connection state derivation in `apps/api/Services/QboSyncService.cs`
- [X] T036 [US1] Add `GET /api/venues/{venueId}/qbo/integration` endpoint in `apps/api/Controllers/QboSyncController.cs`
- [X] T037 [US1] Extend `QboTokenService` to cache `CompanyName` and set `IsExpired` on refresh failure in `apps/api/Services/QboTokenService.cs`
- [X] T038 [US1] Change OAuth callback redirect to `/settings/integrations?venueId=…&qboConnected=true` in `apps/api/Controllers/QboOAuthController.cs`
- [X] T039 [P] [US1] Implement `useVenueQboIntegration` query hook in `apps/web/src/api/qbo.ts`
- [X] T040 [P] [US1] Create `QboIntegrationCard.tsx` with Disconnected/Connected/Expired states in `apps/web/src/components/qbo/QboIntegrationCard.tsx`
- [X] T041 [P] [US1] Create `QboDisconnectModal.tsx` in `apps/web/src/components/qbo/QboDisconnectModal.tsx`
- [X] T042 [US1] Create `IntegrationsSettingsPage.tsx` with venue selector in `apps/web/src/pages/IntegrationsSettingsPage.tsx`
- [X] T043 [US1] Replace `PlaceholderSettingsPage` with `IntegrationsSettingsPage` for integrations route in `apps/web/src/App.tsx`
- [ ] T044 [US1] Regenerate OpenAPI types and verify `apps/web/src/types/generated-api.ts` includes new DTOs

**Checkpoint**: Admin can connect/disconnect from Settings; three card states render — **MVP complete**

---

## Phase 5: User Story 3 — Admin Maps Classes and Tags to Region, Venue, or Event (Priority: P2)

**Goal**: Unified mapping console listing QBO Classes/Tags with CRUD bindings to Region, Venue, or Event tiers; sync uses most-specific-tier-wins resolver.

**Independent Test**: Bind sandbox Tag to Event via Integrations console; Force Pull updates variance for that event only.

### Tests for User Story 3 (REQUIRED) ⚠️

- [X] T045 [P] [US3] Add failing tier precedence unit tests in `apps/api.tests/Unit/QboTrackingMappingResolverTests.cs`
- [X] T046 [P] [US3] Add failing legacy `QboTagName` fallback test in `apps/api.tests/Unit/QboTrackingMappingResolverTests.cs`
- [X] T047 [P] [US3] Add failing tracking mapping CRUD integration tests in `apps/api.tests/Integration/QboTrackingMappingTests.cs`
- [X] T048 [P] [US3] Add failing catalog endpoint test in `apps/api.tests/Integration/QboTrackingMappingTests.cs`
- [ ] T049 [P] [US3] Add failing mapping console Vitest tests in `apps/web/tests/components/qbo/QboMappingConsole.test.tsx`

### Implementation for User Story 3

- [X] T050 [US3] Implement read-only `QboMetadataClient` for Class/Tag queries in `apps/api/Services/QboMetadataClient.cs`
- [X] T051 [US3] Implement `QboTrackingMappingService` CRUD and resolver in `apps/api/Services/QboTrackingMappingService.cs`
- [X] T052 [US3] Add tracking catalog and mapping CRUD endpoints in `apps/api/Controllers/QboSyncController.cs`
- [X] T053 [US3] Update `QboSyncService` to resolve tracking via `QboTrackingMappingService` with legacy fallback in `apps/api/Services/QboSyncService.cs`
- [X] T054 [P] [US3] Create `QboTrackingMappingTable.tsx` in `apps/web/src/components/qbo/QboTrackingMappingTable.tsx`
- [X] T055 [P] [US3] Create `QboAccountMappingTable.tsx` in `apps/web/src/components/qbo/QboAccountMappingTable.tsx`
- [X] T056 [US3] Create tabbed `QboMappingConsole.tsx` in `apps/web/src/components/qbo/QboMappingConsole.tsx` and wire into `apps/web/src/pages/IntegrationsSettingsPage.tsx`
- [X] T057 [US3] Add `useQboTrackingCatalog` and `useQboTrackingMappings` hooks in `apps/web/src/api/qbo.ts`

**Checkpoint**: Tracking mappings CRUD and sync routing operational

---

## Phase 6: User Story 4 — Admin Uses Quick Assign During Setup (Priority: P2)

**Goal**: In-context typeahead selector on Event, Venue, and Region forms creates tier-appropriate tracking mappings without visiting Settings.

**Independent Test**: Create event, Quick Assign a Tag, save — Event-tier mapping exists in Integrations console.

### Tests for User Story 4 (REQUIRED) ⚠️

- [ ] T058 [P] [US4] Add failing Quick Assign component tests in `apps/web/tests/components/qbo/QuickAssignTrackingSelect.test.tsx`
- [ ] T059 [P] [US4] Add failing form integration test for event save creating mapping in `apps/web/tests/components/events/EventFormPanel.test.tsx`

### Implementation for User Story 4

- [ ] T060 [P] [US4] Create `QuickAssignTrackingSelect.tsx` in `apps/web/src/components/qbo/QuickAssignTrackingSelect.tsx`
- [ ] T061 [US4] Wire Quick Assign into `apps/web/src/components/events/EventFormPanel.tsx` (replace free-text `qboTagName` input)
- [ ] T062 [US4] Wire Quick Assign into venue create/edit in `apps/web/src/pages/CreateVenuePage.tsx` and venue edit panel
- [ ] T063 [US4] Wire Quick Assign into `apps/web/src/components/regions/RegionManagementPanel.tsx`

**Checkpoint**: Quick Assign creates mappings from operational forms

---

## Phase 7: User Story 5 — Admin Disconnects and Optionally Purges Cached Data (Priority: P3)

**Goal**: Disconnect retains cached snapshots; optional purge removes cached QBO metrics and mappings while preserving settlement PDF archives.

**Independent Test**: Disconnect venue — cached actuals remain; purge — actuals cleared, PDF archive retrievable.

### Tests for User Story 5 (REQUIRED) ⚠️

- [X] T064 [P] [US5] Add failing purge precondition test (409 when still connected) in `apps/api.tests/Integration/QboPurgeCascadeTests.cs`
- [X] T065 [P] [US5] Add failing purge cascade test (all cached tables cleared, PDF untouched) in `apps/api.tests/Integration/QboPurgeCascadeTests.cs`
- [ ] T066 [P] [US5] Add failing purge modal Vitest tests in `apps/web/tests/components/qbo/QboPurgeCacheModal.test.tsx`

### Implementation for User Story 5

- [X] T067 [US5] Implement transactional `QboPurgeService` in `apps/api/Services/QboPurgeService.cs` per `specs/076-qbo-online-sync/data-model.md` cascade table
- [X] T068 [US5] Add `POST /api/venues/{venueId}/qbo/purge-cache` endpoint in `apps/api/Controllers/QboSyncController.cs`
- [X] T069 [US5] Extend integration DTO `CanPurgeCache` logic in `apps/api/Services/QboSyncService.cs`
- [X] T070 [P] [US5] Create `QboPurgeCacheModal.tsx` in `apps/web/src/components/qbo/QboPurgeCacheModal.tsx`
- [X] T071 [US5] Wire purge action and `CanPurgeCache` visibility into `apps/web/src/components/qbo/QboIntegrationCard.tsx`

**Checkpoint**: Disconnect + purge lifecycle complete

---

## Phase 8: User Story 6 — Nightly Sync and Admin Force Pull (Priority: P3)

**Goal**: 3:00 AM tenant-local nightly dispatch with 48h lookback; debounced Force Pull; sandbox routing in non-production; scheduler cron updated to `*/15 * * * *`.

**Independent Test**: Unit tests prove org eligibility at local 03:00 across timezones; Force Pull debounced 60s; dev uses sandbox URLs.

### Tests for User Story 6 (REQUIRED) ⚠️

- [X] T072 [P] [US6] Add failing timezone dispatch unit tests in `apps/api.tests/Unit/NightlyDispatchSelectorTests.cs`
- [X] T073 [P] [US6] Add failing internal trigger `mode=nightly` integration test in `apps/api.tests/Integration/QboInternalSyncControllerTests.cs`
- [X] T074 [P] [US6] Add failing Force Pull rate limit test (429) in `apps/api.tests/Integration/QboIntegrationControllerTests.cs`
- [X] T075 [P] [US6] Add failing environment profile unit test in `apps/api.tests/Unit/QboSyncOptionsEnvironmentTests.cs`
- [X] T076 [P] [US6] Update failing scheduler cron contract test to `*/15 * * * *` in `apps/web/tests/deploy/deployQboScheduler.test.ts`

### Implementation for User Story 6

- [X] T077 [US6] Implement nightly org selector and extend internal trigger with `mode=nightly` and optional `organizationId` in `apps/api/Services/QboSyncService.cs` and `apps/api/Controllers/QboSyncController.cs`
- [X] T078 [US6] Set 48-hour lookback window in sync query logic in `apps/api/Services/QboSyncService.cs`
- [X] T079 [US6] Add per-venue 60-second rate limit on sync POST endpoints in `apps/api/Controllers/QboSyncController.cs`
- [X] T080 [US6] Extend `EnvironmentProfile` and wire sandbox vs production Intuit URLs in `apps/api/Configuration/QboSyncOptions.cs` and `apps/api/Program.cs`
- [X] T081 [US6] Update `SCHEDULER_CRON` to `*/15 * * * *` in `deploy/lib/qbo-scheduler-names.sh` and `deploy/lib/qbo-scheduler-names.ps1`
- [ ] T082 [P] [US6] Create `QboForcePullButton.tsx` with 60s debounce and progress ring in `apps/web/src/components/qbo/QboForcePullButton.tsx`
- [ ] T083 [US6] Wire Force Pull into `apps/web/src/components/qbo/QboIntegrationCard.tsx` and event workspace toolbar (Admin only)
- [X] T084 [US6] Implement `GET /api/organizations/{orgId}/qbo/summary` in `apps/api/Controllers/OrganizationsController.cs` or dedicated controller

**Checkpoint**: Nightly dispatch, Force Pull, and environment routing operational

---

## Phase 9: User Story 7 — Financial Views Adapt When Not Connected (Priority: P4)

**Goal**: Ledger, dashboard, and event cards hide QBO columns/actions when disconnected; Admin sees onboarding CTA; false alerts suppressed.

**Independent Test**: Disconnect all venues — ledger shows Proforma + Settlement only; Admin dashboard shows CTA; post-show event card shows sync unavailable.

### Tests for User Story 7 (REQUIRED) ⚠️

- [ ] T085 [P] [US7] Add failing ledger column visibility tests in `apps/web/tests/components/ledger/BlockSection.test.tsx`
- [ ] T086 [P] [US7] Add failing dashboard Admin CTA tests in `apps/web/tests/components/dashboard/FinancialHealthWidget.test.tsx`
- [ ] T087 [P] [US7] Add failing event card degraded state tests in `apps/web/tests/components/dashboard/EventCard.test.tsx`
- [ ] T088 [P] [US7] Add failing alert suppression tests in `apps/web/tests/lib/eventCardSummary.test.ts`

### Implementation for User Story 7

- [X] T089 [US7] Create `useQboConnectionGate` hook in `apps/web/src/hooks/useQboConnectionGate.ts` consuming org summary + venue integration
- [X] T090 [US7] Gate QBO/variance columns in `apps/web/src/components/ledger/BlockSection.tsx` and related row/cell components
- [X] T091 [US7] Add Admin onboarding callout and hide QBO series in `apps/web/src/components/dashboard/FinancialHealthWidget.tsx`
- [ ] T092 [US7] Suppress QBO links and alerts in `apps/web/src/components/dashboard/EventCard.tsx` and `apps/web/src/lib/eventCardSummary.ts`
- [ ] T093 [US7] Hide `UnassignedTransactionsBanner` when disconnected in `apps/web/src/components/qbo/UnassignedTransactionsBanner.tsx`
- [ ] T094 [US7] Extend accounting overview gating in `apps/web/src/pages/AccountingOverviewPage.tsx`

**Checkpoint**: Full disconnected UX across overview and workspace

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: E2E validation, deploy parity, coverage gate, and quickstart verification.

- [ ] T095 [P] Add Playwright E2E spec for Admin connect flow in `apps/web/tests/e2e/qbo-integrations.spec.ts`
- [ ] T096 [P] Add Playwright E2E spec for non-Admin blocked route in `apps/web/tests/e2e/qbo-integrations.spec.ts`
- [ ] T097 Verify read-only Intuit guard — zero mutating HTTP verbs in `apps/api.tests/Integration/QboEgressWriteGuardTests.cs` (extend if needed)
- [X] T098 [P] Add CSS for Integrations page under MHC tokens in `apps/web/src/index.css`
- [ ] T099 Run quickstart scenarios A–I documented in `specs/076-qbo-online-sync/quickstart.md`
- [ ] T100 Verify ≥80.0% line/branch coverage on touched backend code via `dotnet test` with coverlet → cobertura in CI; missing or unparseable reports FAIL
- [ ] T101 Verify ≥80.0% line/branch coverage on touched frontend code via `npm run test:coverage` (Vitest → lcov) in `apps/web`; missing or unparseable reports FAIL

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS all user stories**
- **US2 (Phase 3)**: Depends on Foundational — **recommended before US1**
- **US1 (Phase 4)**: Depends on Foundational + US2 Admin gates
- **US3 (Phase 5)**: Depends on US1 (connected venue for catalog)
- **US4 (Phase 6)**: Depends on US3 (catalog + mapping API)
- **US5 (Phase 7)**: Depends on US1 (disconnect UI); independent of US3/US4
- **US6 (Phase 8)**: Depends on Foundational (`TimeZoneId`); Force Pull UI depends on US1
- **US7 (Phase 9)**: Depends on US6 (`OrganizationQboSummary` endpoint) and US2 (`QboPayloadFilter`)
- **Polish (Phase 10)**: Depends on all desired user stories

### User Story Dependencies

| Story | Priority | Depends on | Independent test |
|-------|----------|------------|------------------|
| US2 | P1 | Foundational | Non-Admin 403 + nav hidden |
| US1 | P1 | Foundational, US2 | Admin OAuth connect flow |
| US3 | P2 | US1 | Mapping + sync routing |
| US4 | P2 | US3 | Quick Assign on forms |
| US5 | P3 | US1 | Disconnect + purge |
| US6 | P3 | Foundational, US1 | Nightly dispatch + Force Pull |
| US7 | P4 | US2, US6 | Disconnected UI degradation |

### Parallel Opportunities

- All Setup tasks (T002–T006) in parallel
- Foundational model/DTO/hook tasks (T007–T011, T015–T017) in parallel before T012–T014
- Within each story: all tests marked [P] in parallel before implementation
- US5 purge backend (T067–T069) parallel with US6 scheduler scripts (T081) after respective tests fail
- US7 component gating tasks (T090–T094) largely parallel after T089

### Parallel Example: User Story 3

```bash
# Tests first (parallel):
T045 QboTrackingMappingResolverTests.cs
T046 legacy fallback test
T047 QboTrackingMappingTests.cs
T048 catalog endpoint test
T049 QboMappingConsole.test.tsx

# Then parallel UI tables:
T054 QboTrackingMappingTable.tsx
T055 QboAccountMappingTable.tsx
```

---

## Implementation Strategy

### MVP First (US2 + US1)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: US2 (Admin RBAC)
4. Complete Phase 4: US1 (Integrations connect)
5. **STOP and VALIDATE** — Admin can connect; non-Admin blocked

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. US2 + US1 → **MVP** (connect flow + security)
3. US3 + US4 → tracking mappings + Quick Assign
4. US5 + US6 → lifecycle + automation
5. US7 → polished disconnected UX
6. Polish → E2E + coverage gate

### Parallel Team Strategy

1. Team completes Setup + Foundational together
2. Backend engineer: US2 RBAC → US3 tracking services → US5 purge → US6 dispatch
3. Frontend engineer: US2 nav guard → US1 Integrations page → US3 console → US4 Quick Assign → US7 gating
4. DevOps: US6 scheduler cron + deploy contract tests

---

## Notes

- Write tests first; confirm they fail before implementation
- Regenerate `apps/web/src/types/generated-api.ts` after every backend DTO change
- Never add hand-written TypeScript API types (Constitution VI)
- All Intuit API calls remain read-only (Constitution IV)
- Purge and disconnect must not touch settlement PDF archives (spec 050)
- Commit after each task or logical group
