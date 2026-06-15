# Tasks: QuickBooks Online Pull Cache & Inline Mapping Engine

**Input**: Design documents from `specs/003-qbo-pull-cache-mapping/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included per FR-025/FR-026 and Constitution III — xUnit unit tests (`QboSyncService`, `QboTokenService`), Testcontainers integration tests (append-only, read-only enforcement, mapping auto-routing, permission gating, tenant isolation), Vitest + RTL for QBO UI components.

**Organization**: Tasks grouped by user story. Each story is independently testable after its phase completes.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add packages, configuration, exceptions, and DI scaffolding for QBO integration.

- [X] T001 Add NuGet packages to `apps/api/split-rail-api.csproj` — `Microsoft.AspNetCore.DataProtection.Extensions`, `Microsoft.Extensions.Http.Polly` (retry/backoff for Intuit API)
- [X] T002 Create `QboSyncOptions` configuration class in `apps/api/Configuration/QboSyncOptions.cs` — `IntervalHours` (default 6), `EnableInProcessTimer`, Intuit OAuth client ID/secret/redirect URI from env; bind in `apps/api/appsettings.json` and `apps/api/Program.cs`
- [X] T003 [P] Add QBO domain exceptions in `apps/api/Exceptions/ApiExceptions.cs` — `QboTokenRefreshException`, `QboSyncException`, `QboMappingConflictException`
- [X] T004 [P] Map QBO exceptions to HTTP status in `apps/api/Middleware/ExceptionHandlerMiddleware.cs` — token refresh → 502, sync failure → 502, mapping conflict → 409
- [X] T005 [P] Create QBO DTO records in `apps/api/DTOs/Qbo/QboDtos.cs` — `SyncResultDto`, `SyncStatusDto`, `QboAccountMappingDto`, `CreateMappingRequest`, `UnmappedTransactionDto`, `UnmappedTransactionsResponse`, `UnmappedCountDto`; all monetary fields as `string`
- [X] T006 Configure Data Protection, named `"QboApi"` HttpClient with Polly retry policy, and `QboSyncOptions` binding in `apps/api/Program.cs`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: QBO entities, DbContext, migration, token client, and test helpers. MUST complete before any user story.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T007 Create `QboAccountMapping` entity in `apps/api/Models/QboAccountMapping.cs` per data-model.md — venue FK, qbo_account_id, qbo_account_name, mapped_category_label, mapped_line_item_id (nullable FK), created_at
- [X] T008 [P] Create `QboVenueCredential` entity in `apps/api/Models/QboVenueCredential.cs` per data-model.md — venue FK (unique), realm_id, encrypted_access_token, encrypted_refresh_token, token_expires_at, connected_at, connected_by_user_id
- [X] T009 [P] Create `QboSyncLedger` entity in `apps/api/Models/QboSyncLedger.cs` per data-model.md — event FK, qbo_transaction_id, qbo_account_id, amount, transaction_date, mapped_line_item_id (nullable), sync_batch_id, synced_at; INSERT-only semantics
- [X] T010 [P] Create `UnmappedQboTransaction` entity in `apps/api/Models/UnmappedQboTransaction.cs` per data-model.md — event FK, venue FK (denormalized), qbo_transaction_id, qbo_account_id, qbo_account_name, amount, transaction_date, synced_at
- [X] T011 Update `apps/api/Data/ApplicationDbContext.cs` — add DbSets for all four entities; Fluent API (snake_case, numeric(12,2), unique constraints, indexes); global query filters via `Venue.OrganizationId` or `Event.Venue.OrganizationId`; cascade deletes per data-model.md
- [X] T012 Generate EF Core migration `AddQboIntegrationEntities` in `apps/api/Data/Migrations/` — run `dotnet ef migrations add AddQboIntegrationEntities` from `apps/api/`
- [X] T013 [P] Implement `QboTokenService` in `apps/api/Services/QboTokenService.cs` — encrypt/decrypt tokens via `IDataProtector`; store/retrieve `QboVenueCredential`; refresh expired tokens via Intuit OAuth endpoint; throw `QboTokenRefreshException` on failure; never log cleartext tokens
- [X] T014 [P] Implement read-only `QboTransactionClient` in `apps/api/Services/QboTransactionClient.cs` — `IHttpClientFactory` named client; GET-only methods querying QBO by tag (`events.qbo_tag_name`); parse amounts as `decimal`; exponential backoff via Polly; no POST/PUT/DELETE methods
- [X] T015 [P] Extend `apps/api.tests/Integration/IntegrationTestBase.cs` — seed helpers for QBO credentials, account mappings, sync ledger entries; mock `HttpMessageHandler` factory for Intuit API responses
- [X] T016 Register `QboTokenService` and `QboTransactionClient` as scoped services in `apps/api/Program.cs`

**Checkpoint**: Foundation ready — user story implementation can now begin.

---

## Phase 3: User Story 1 — Ingest QBO transactions and populate actuals via tag-based sync (Priority: P1) 🎯 MVP

**Goal**: Connect a venue to QBO via OAuth, run tag-based ingestion (scheduled + on-demand), aggregate matched transactions into `qbo_actual_value` via append-only sync ledger, and stage unmapped transactions without halting the batch.

**Independent Test**: Configure an event with `qbo_tag_name`, seed a mapping, trigger sync, confirm `qbo_actual_value` updates on matched rows; re-sync with altered upstream data and confirm historical values unchanged; unmapped transactions staged without batch failure — per quickstart Scenarios 1–2.

### Tests for User Story 1

- [X] T017 [P] [US1] Write unit tests in `apps/api.tests/Unit/QboSyncServiceTests.cs` — tag filtering, mapping resolution, append-only idempotent insert, `qbo_actual_value` SUM aggregation, unmapped staging without throw, sync batch grouping
- [X] T018 [P] [US1] Write unit tests in `apps/api.tests/Unit/QboTokenServiceTests.cs` — encrypt/decrypt round-trip, token refresh success/failure throws `QboTokenRefreshException`, no cleartext in exception messages
- [X] T019 [P] [US1] Write integration tests in `apps/api.tests/Integration/QboAppendOnlyTests.cs` — sync then re-sync with altered upstream QBO item; assert `qbo_sync_ledger` rows not updated/deleted and `qbo_actual_value` unchanged
- [X] T020 [P] [US1] Write integration tests in `apps/api.tests/Integration/QboReadOnlyTests.cs` — mock HTTP handler asserts zero POST/PUT/DELETE requests to Intuit endpoints during full sync flow

### Implementation for User Story 1

- [X] T021 [US1] Implement `QboSyncService` in `apps/api/Services/QboSyncService.cs` — `SyncEventAsync(venueId, eventId)` orchestration: fetch QBO transactions by tag, idempotent INSERT into `qbo_sync_ledger`, stage unmapped into `unmapped_qbo_transactions`, recompute `financial_line_items.qbo_actual_value` as SUM from sync ledger; advisory lock per event to prevent concurrent syncs; all reads via `.AsNoTracking()` + `.Include().ThenInclude()`
- [X] T022 [US1] Implement `QboSyncHostedService` in `apps/api/BackgroundServices/QboSyncHostedService.cs` — `BackgroundService` with configurable 6-hour interval (`QboSyncOptions.EnableInProcessTimer`); iterate venues with credentials and sync eligible events; register in `apps/api/Program.cs`
- [X] T023 [US1] Create `QboOAuthController` in `apps/api/Controllers/QboOAuthController.cs` — `GET …/qbo/connect` (redirect to Intuit OAuth with read-only scope), `GET …/qbo/callback` (exchange code, encrypt/store tokens in `QboVenueCredential`), `POST …/qbo/disconnect` (revoke + delete credential); venue scope + org isolation
- [X] T024 [US1] Create `QboSyncController` in `apps/api/Controllers/QboSyncController.cs` — `POST api/venues/{venueId}/events/{eventId}/sync` and `GET …/sync-status` per contracts/sync.md; decorate sync with `[RequirePermission(PermissionNames.TriggerQboSync)]`; venue scope via `VenueService`
- [X] T025 [US1] Add internal trigger endpoint `POST api/internal/qbo-sync-trigger` in `apps/api/Controllers/QboSyncController.cs` — authenticated via GCP OIDC service account policy for Cloud Scheduler; invokes scheduled sync logic
- [X] T026 [US1] Register `QboSyncService` as scoped and `QboSyncHostedService` as hosted service in `apps/api/Program.cs`

**Checkpoint**: MVP complete — QBO transactions ingest into ledger actuals with append-only integrity (SC-001, SC-004).

---

## Phase 4: User Story 2 — Resilient handling of unmapped transactions with inline mapping (Priority: P2)

**Goal**: Surface unmapped transactions in a warning banner, let accountants map QBO accounts to ledger rows inline, persist venue-level mapping rules, and auto-route future transactions (self-healing).

**Independent Test**: Sync with unmapped account → banner shows correct count → map via dropdown → unmapped count drops to zero and `qbo_actual_value` updates → second event at same venue auto-routes same account — per quickstart Scenarios 3–4.

### Tests for User Story 2

- [X] T027 [P] [US2] Write integration tests in `apps/api.tests/Integration/QboMappingTests.cs` — create mapping, assert 409 on duplicate `(venue_id, qbo_account_id)`, re-process unmapped transactions on mapping create, self-healing routing on subsequent sync at same venue
- [X] T028 [P] [US2] Write integration tests in `apps/api.tests/Integration/QboUnmappedTests.cs` — unmapped list/count endpoints return correct data, tenant isolation (cross-org → 404), unmapped batch completes without throw

### Implementation for User Story 2

- [X] T029 [US2] Implement mapping CRUD and re-processing logic in `apps/api/Services/QboMappingService.cs` — `CreateMappingAsync` (INSERT mapping + re-process matching unmapped rows into sync ledger + recompute actuals + delete resolved unmapped rows in one transaction), `GetMappingsAsync`, `UpdateMappingAsync`, `DeleteMappingAsync` (does not alter existing sync ledger entries)
- [X] T030 [US2] Add mapping endpoints to `apps/api/Controllers/QboSyncController.cs` per contracts/mappings.md — `GET/POST api/venues/{venueId}/mappings`, `PUT/DELETE …/mappings/{mappingId}`; gate with `[RequirePermission(PermissionNames.MapQboAccounts)]`
- [X] T031 [US2] Add unmapped endpoints to `apps/api/Controllers/QboSyncController.cs` per contracts/unmapped.md — `GET …/unmapped-transactions`, `GET …/unmapped-count`; gate with `[RequirePermission(PermissionNames.ViewFinancials)]`
- [X] T032 [P] [US2] Regenerate OpenAPI types and create TanStack Query hooks in `apps/web/src/api/qbo.ts` — sync, sync-status, mappings CRUD, unmapped list/count; import types from `apps/web/src/types/generated-api.ts` only
- [X] T033 [US2] Implement `UnmappedBanner` in `apps/web/src/components/qbo/UnmappedBanner.tsx` — inline alert with live unmapped count; expandable list showing account name, amount (via `money.ts`), date; poll via TanStack Query `refetchInterval`
- [X] T034 [US2] Implement `InlineMappingDropdown` in `apps/web/src/components/qbo/InlineMappingDropdown.tsx` — dropdown of event ledger line items; on confirm calls mapping API; optimistically removes item from unmapped list and invalidates ledger query
- [X] T035 [US2] Integrate `UnmappedBanner` and `InlineMappingDropdown` into `apps/web/src/pages/EventLedgerPage.tsx` — render above ledger grid when unmapped count > 0
- [X] T036 [US2] Write component tests in `apps/web/tests/qbo/UnmappedBanner.test.tsx` and `apps/web/tests/qbo/InlineMappingDropdown.test.tsx` — correct count display, list expansion, mapping submit clears item

**Checkpoint**: Unmapped workflow and self-healing routing functional end-to-end (SC-002, SC-003, SC-008).

---

## Phase 5: User Story 3 — Manual "Sync Now" override for live auditing (Priority: P3)

**Goal**: Expose a permission-gated "Sync Now" button that triggers immediate sync with in-progress and success/error feedback; hide for unauthorized roles.

**Independent Test**: Authorized user clicks Sync Now → actuals refresh; unauthorized user sees hidden/disabled button; direct API call without permission → 403; out-of-scope venue → 403/404 — per quickstart Scenario 5 and spec acceptance scenarios.

### Tests for User Story 3

- [X] T037 [P] [US3] Write integration tests in `apps/api.tests/Integration/QboSyncControllerTests.cs` — `POST …/sync` returns 403 without `can_trigger_qbo_sync`, succeeds with permission, returns 403/404 for out-of-scope venue, cross-tenant access rejected

### Implementation for User Story 3

- [X] T038 [US3] Implement `SyncNowButton` in `apps/web/src/components/qbo/SyncNowButton.tsx` — calls `POST …/sync`; loading spinner during request; success/error toast on completion; hidden when user lacks `can_trigger_qbo_sync` (read from auth/role context)
- [X] T039 [US3] Wire `SyncNowButton` into `apps/web/src/pages/EventLedgerPage.tsx` — place in grid toolbar; invalidate ledger and unmapped queries on successful sync
- [X] T040 [US3] Write component tests in `apps/web/tests/qbo/SyncNowButton.test.tsx` — hidden for unauthorized role, shows loading state, triggers sync mutation

**Checkpoint**: Manual sync override functional with permission enforcement (FR-015–FR-017).

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Codegen, coverage, security hardening, and end-to-end validation.

- [X] T041 Regenerate `apps/web/src/types/generated-api.ts` via `apps/web/scripts/gen-api.mjs` after all QBO endpoints are implemented and backend builds cleanly
- [X] T042 [P] Write integration tests in `apps/api.tests/Integration/QboTenantIsolationTests.cs` — cross-org sync, mapping, and unmapped access all return 404
- [X] T043 [P] Add log sanitization assertions in `apps/api.tests/Unit/QboTokenServiceTests.cs` — verify structured logs never contain cleartext token substrings (SC-006)
- [X] T044 Update CSP `connect-src` in frontend hosting config to allow `*.quickbooks.com` and `*.googleapis.com` per FR-027
- [X] T045 Run quickstart validation scenarios 1–6 in `specs/003-qbo-pull-cache-mapping/quickstart.md` and fix any gaps
- [X] T046 Verify ≥80% line/branch coverage for new QBO backend and frontend code via `dotnet test` and `npm test` with coverage reporters

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS all user stories**
- **User Story 1 (Phase 3)**: Depends on Foundational — MVP; no dependency on US2/US3
- **User Story 2 (Phase 4)**: Depends on Foundational + US1 sync pipeline (needs `QboSyncService` staging unmapped transactions)
- **User Story 3 (Phase 5)**: Depends on US1 sync endpoint existing; frontend button is independent of US2
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

| Story | Depends On | Delivers Independently |
|-------|-----------|------------------------|
| US1 (P1) | Foundational | Sync pipeline, OAuth, append-only actuals, unmapped staging |
| US2 (P2) | Foundational + US1 | Mapping API, unmapped UI, self-healing routing |
| US3 (P3) | Foundational + US1 | Sync Now button, permission UX |

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Services before controllers
- Backend endpoints before frontend hooks/components
- Story checkpoint before moving to next priority

### Parallel Opportunities

- **Phase 1**: T003, T004, T005 in parallel
- **Phase 2**: T008, T009, T010 in parallel (entity models); T013, T014, T015 in parallel after migration
- **Phase 3**: T017, T018, T019, T020 in parallel (all test files)
- **Phase 4**: T027, T028 in parallel; T032 parallel with T029–T031 once endpoints exist; T033, T034 in parallel
- **Phase 5**: T037 parallel with T038
- **Phase 6**: T042, T043 in parallel

---

## Parallel Example: User Story 1

```bash
# Launch all US1 tests together:
Task T017: "Write unit tests in apps/api.tests/Unit/QboSyncServiceTests.cs"
Task T018: "Write unit tests in apps/api.tests/Unit/QboTokenServiceTests.cs"
Task T019: "Write integration tests in apps/api.tests/Integration/QboAppendOnlyTests.cs"
Task T020: "Write integration tests in apps/api.tests/Integration/QboReadOnlyTests.cs"

# After tests fail, implement core pipeline sequentially:
Task T021 → T022 → T023 → T024 → T025 → T026
```

---

## Parallel Example: User Story 2

```bash
# Backend mapping + unmapped endpoints (sequential within service):
Task T029 → T030 → T031

# Frontend (parallel once API exists):
Task T032: "Create hooks in apps/web/src/api/qbo.ts"
Task T033: "Implement UnmappedBanner in apps/web/src/components/qbo/UnmappedBanner.tsx"
Task T034: "Implement InlineMappingDropdown in apps/web/src/components/qbo/InlineMappingDropdown.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Run quickstart Scenarios 1–2; confirm append-only and read-only guarantees
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. User Story 1 → Test independently → Deploy/Demo (**MVP** — QBO data flows into ledger)
3. User Story 2 → Test independently → Deploy/Demo (accountants can resolve unmapped transactions)
4. User Story 3 → Test independently → Deploy/Demo (live auditing with Sync Now)
5. Polish → Coverage gate + quickstart validation

### Parallel Team Strategy

With multiple developers after Foundational completes:

- **Developer A**: US1 backend (T017–T026)
- **Developer B**: US2 backend tests + mapping service (T027–T031), then US2 frontend (T032–T036)
- **Developer C**: US3 (T037–T040) once US1 sync endpoint lands

---

## Notes

- All QBO routes follow `api/venues/{venueId}/…` convention — no `/v1/` segment (research.md §6)
- `qbo_sync_ledger` is INSERT-only; never generate UPDATE/DELETE for this table (Constitution IV)
- `QboTransactionClient` exposes GET methods only; integration tests must assert zero write verbs to Intuit (Constitution IV)
- Frontend types from `generated-api.ts` only — no hand-written QBO interfaces (Constitution VI)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
