---

description: "Task list for Complete Organization & Venue CRUD"
---

# Tasks: Complete Organization & Venue CRUD

**Input**: Design documents from `/specs/011-complete-organization-and/`

**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: REQUIRED per Constitution III. Every user story phase includes automated test tasks; the Polish phase includes the ≥80.0% line/branch coverage gate (backend + frontend independently, CI-enforced).

**Organization**: Tasks are grouped by user story (priority order from spec.md) so each story can be implemented and tested independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: US1–US5 mapping to spec.md user stories
- Exact file paths included in each task

## Path Conventions

Web-application monorepo: backend `apps/api/`, backend tests `apps/api.tests/`, frontend `apps/web/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish a clean baseline; no new dependencies are required (extends existing controllers/services).

- [X] T001 Establish baseline: run `dotnet build` and `dotnet test apps/api.tests`, and `npm run test` in `apps/web`, confirming all existing suites pass before changes
- [X] T002 [P] Confirm contract toolchain: run the API and `npm run gen:api` in `apps/web` to verify `apps/web/src/types/generated-api.ts` regenerates with no diff (baseline for later contract updates)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Schema + shared validation that multiple stories depend on (soft-delete column for US3/US4; name validation for US1/US2/US5).

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T003 Add nullable `ArchivedAt` (`DateTimeOffset?`) property to `apps/api/Models/Organization.cs`
- [X] T004 In `apps/api/Data/ApplicationDbContext.cs`, map the `archived_at` column on `ConfigureOrganization` and extend the `Organization` tenant query filter in `ApplyTenantQueryFilters` to also require `e.ArchivedAt == null` (depends on T003)
- [X] T005 Generate EF Core migration `AddOrganizationArchivedAt` in `apps/api/Data/Migrations/` via `dotnet ef migrations add AddOrganizationArchivedAt --project apps/api`, and verify `ApplicationDbContextModelSnapshot.cs` reflects the additive nullable column (depends on T004)
- [X] T006 [P] Add shared `NameValidation` helper (required + trim + ≤200 chars → `ValidationException`) in `apps/api/Services/NameValidation.cs`, and refactor `CreateOrganizationAsync` (`apps/api/Services/OrganizationService.cs`) and `CreateVenueAsync` (`apps/api/Services/VenueService.cs`) to use it so create enforces the same rule as update (FR-010, FR-011)

**Checkpoint**: Schema + validation ready — user stories can begin.

---

## Phase 3: User Story 1 - Organization admin renames their organization (Priority: P1) 🎯 MVP

**Goal**: An org admin can update their organization's name; non-admins and invalid input are rejected; cross-tenant targets resolve to not-found.

**Independent Test**: Authenticate as an org admin, `PUT /api/organizations/{id}` with a new valid name → 200 with updated org; repeat as a non-admin member → 403 and name unchanged; cross-tenant id → 404.

### Tests for User Story 1 (REQUIRED) ⚠️

> Write first and ensure they FAIL before implementation.

- [X] T007 [US1] Add org-update integration tests to `apps/api.tests/Integration/OrganizationsControllerTests.cs`: admin valid → 200 updated; non-admin → 403; empty/whitespace name → 400; name >200 → 400; cross-tenant/unknown id → 404; same-name no-op → 200 (FR-001, FR-002, FR-010, FR-013, FR-014)

### Implementation for User Story 1

- [X] T008 [US1] Add `UpdateOrganizationRequest(string Name)` record to `apps/api/DTOs/Organizations/OrganizationDtos.cs`
- [X] T009 [US1] Implement `UpdateOrganizationAsync` in `apps/api/Services/OrganizationService.cs`: load tracked org by id from tenant-scoped `Organizations`, throw `NotFoundException` if absent, normalize name via `NameValidation`, save (last-write-wins, no concurrency token), return `OrganizationResponse`, log organization id only (depends on T006, T008)
- [X] T010 [US1] Add `PUT /api/organizations/{organizationId:guid}` action with `[RequirePermission(PermissionNames.ManagePermissions)]` in `apps/api/Controllers/OrganizationsController.cs` returning `Ok(updated)` (depends on T009)
- [X] T011 [US1] Rebuild the API and regenerate `apps/web/src/types/generated-api.ts` via `npm run gen:api` so `UpdateOrganizationRequest` is available (depends on T008)
- [X] T012 [US1] Add `apps/web/src/api/organizations.ts` with a `useUpdateOrganization` TanStack Query mutation using `apiFetch` (PUT) and generated types (depends on T011)
- [X] T013 [US1] Add Vitest test for `useUpdateOrganization` in `apps/web/tests/api/organizations.test.ts` (success + error-mapping via stubbed `fetch`) (depends on T012)

**Checkpoint**: Organization rename works end-to-end and is independently testable (MVP).

---

## Phase 4: User Story 2 - Authorized user updates venue details (Priority: P2)

**Goal**: A user with the manage permission whose scope includes a venue can rename it; missing-permission, out-of-scope, not-found, and invalid input are rejected.

**Independent Test**: As a permitted in-scope user, `PUT /api/venues/{id}` → 200 updated; as a user lacking the permission → 403; as a permitted user whose scope excludes the venue → 404.

### Tests for User Story 2 (REQUIRED) ⚠️

- [X] T014 [US2] Add venue-update integration tests to `apps/api.tests/Integration/VenuesControllerTests.cs`: permitted in-scope → 200 updated; missing permission → 403; out-of-scope venue → 404; cross-tenant/unknown → 404; empty/>200 name → 400; same-name no-op → 200 (FR-003, FR-004, FR-005, FR-010, FR-014) — use `CreateScopedVenueUserAsync` for scope cases

### Implementation for User Story 2

- [X] T015 [US2] Add `UpdateVenueRequest(string Name)` record to `apps/api/DTOs/Venues/VenueDtos.cs`
- [X] T016 [US2] Implement `UpdateVenueAsync` in `apps/api/Services/VenueService.cs`: verify scope via the accessible-venue query / `IsVenueAccessibleAsync` (not accessible → `NotFoundException`), normalize name via `NameValidation`, load tracked venue, save, return `VenueResponse`, log venue id only (depends on T006, T015)
- [X] T017 [US2] Add `PUT /api/venues/{venueId:guid}` action with `[RequirePermission(PermissionNames.ManagePermissions)]` in `apps/api/Controllers/VenuesController.cs` returning `Ok(updated)` (depends on T016)
- [X] T018 [US2] Rebuild the API and regenerate `apps/web/src/types/generated-api.ts` so `UpdateVenueRequest` is available (depends on T015)
- [X] T019 [P] [US2] Add `useUpdateVenue` mutation to `apps/web/src/api/venues.ts` using generated types (depends on T018)
- [X] T020 [P] [US2] Add Vitest test for `useUpdateVenue` in `apps/web/tests/api/venues.test.ts` (depends on T019)

**Checkpoint**: Venue rename works independently alongside US1.

---

## Phase 5: User Story 3 - View the organizations a user belongs to (list) (Priority: P3)

**Goal**: Return the active organizations the authenticated user is a member of; never leak non-member orgs; empty list when none; archived excluded.

**Independent Test**: As a member of ≥1 org, `GET /api/organizations` returns only those orgs; a non-member's orgs never appear; a user with no membership gets `200 []`.

### Tests for User Story 3 (REQUIRED) ⚠️

- [X] T021 [US3] Add org-list integration tests to `apps/api.tests/Integration/OrganizationsControllerTests.cs`: member sees own active org(s); another user's org excluded (tenant isolation); no membership → `200 []`; archived org excluded after delete (FR-006, SC-003)

### Implementation for User Story 3

- [X] T022 [US3] Implement `ListForUserAsync` in `apps/api/Services/OrganizationService.cs`: query `UserOrganizationMappings` for `_tenantContext.UserId`, join to `Organizations` with `IgnoreQueryFilters()`, filter `ArchivedAt == null`, `.AsNoTracking()`, project to `OrganizationResponse` (returns empty list, not error)
- [X] T023 [US3] Add `GET /api/organizations` action in `apps/api/Controllers/OrganizationsController.cs` returning `Ok(list)` (authenticated, any role) (depends on T022)
- [X] T024 [US3] Add `useOrganizations` query hook to `apps/web/src/api/organizations.ts` (GET, `OrganizationResponse[]`) using generated types (depends on T012 — same file)
- [X] T025 [US3] Add Vitest test for `useOrganizations` in `apps/web/tests/api/organizations.test.ts` (depends on T024 — same file as T013)

**Checkpoint**: Org list works independently; archived orgs excluded.

---

## Phase 6: User Story 4 - Organization admin deletes (archives) an organization (Priority: P4)

**Goal**: An admin soft-deletes (archives) an empty org; deletion is blocked with a conflict while the org owns venues or financial data; non-admins and cross-tenant targets are rejected.

**Independent Test**: As admin, delete an org that still has a venue/financial data → 409 and org stays active; empty it (or use an empty org), delete → 204, org absent from reads, records retained; non-admin → 403.

### Tests for User Story 4 (REQUIRED) ⚠️

- [X] T026 [US4] Add org-delete integration tests to `apps/api.tests/Integration/OrganizationsControllerTests.cs`: empty org by admin → 204 then absent from `GET /api/organizations` and `/current` (records retained); org with a venue or financial data → 409; non-admin → 403; cross-tenant/already-archived/unknown id → 404 (FR-007, FR-008, FR-009, FR-013, SC-004) — use `SetupFinancialAdminAsync`/`CreateEventViaApiAsync`/`SeedLineItemDirectAsync` to make an org non-empty

### Implementation for User Story 4

- [X] T027 [US4] Implement `ArchiveOrganizationAsync` in `apps/api/Services/OrganizationService.cs`: load tracked org by tenant-scoped id (absent → `NotFoundException`), block with `ConflictException` if any venue exists OR any event/financial line item exists for the org, else set `ArchivedAt = DateTimeOffset.UtcNow`, save, log organization id only (depends on T003, T004)
- [X] T028 [US4] Add `DELETE /api/organizations/{organizationId:guid}` action with `[RequirePermission(PermissionNames.ManagePermissions)]` in `apps/api/Controllers/OrganizationsController.cs` returning `NoContent()` (depends on T027)
- [X] T029 [US4] Add `useDeleteOrganization` mutation to `apps/web/src/api/organizations.ts` (DELETE, 204) using generated types (depends on T012 — same file)
- [X] T030 [US4] Add Vitest test for `useDeleteOrganization` in `apps/web/tests/api/organizations.test.ts` (depends on T029 — same file)

**Checkpoint**: Soft-delete with conflict-blocking works independently.

---

## Phase 7: User Story 5 - Consistent error contracts and permission gating (Priority: P5)

**Goal**: All tenant endpoints return the standardized `ErrorResponse` shape/status and consistent permission gating; create paths enforce the same name rules as update.

**Independent Test**: Exercise unauthorized, forbidden, not-found, conflict, and validation cases across org (list/update/delete) and venue (update) and confirm identical envelope + status; confirm org/venue create reject >200/empty names like update.

### Tests for User Story 5 (REQUIRED) ⚠️

- [X] T031 [P] [US5] Add cross-cutting error-contract assertions verifying the shared `ErrorResponse` (`type` + HTTP status) across org list/update/delete and venue update for 401 authentication, 403 authorization, 404 not_found, 409 conflict, 400 validation in `apps/api.tests/Integration/OrganizationsControllerTests.cs` and `apps/api.tests/Integration/VenuesControllerTests.cs` (FR-015, SC-006)
- [X] T032 [P] [US5] Add create-path name-validation tests (empty/whitespace → 400, >200 → 400, trimmed persist) for organization create and venue create in the respective controller test files, proving create/update consistency (FR-010, FR-011)

### Implementation for User Story 5

- [X] T033 [US5] Review `apps/api/Services/OrganizationService.cs` and `apps/api/Services/VenueService.cs` to confirm every new endpoint reuses existing `ApiException` types mapped by `ExceptionHandlerMiddleware` (no new error shapes), and that update/delete log only ids (no PII/secrets) per FR-016 / Constitution VIII; adjust any deviations

**Checkpoint**: Uniform contracts and gating verified across the tenant API.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Coverage gate and end-to-end validation.

- [X] T034 [P] Add any unit tests needed in `apps/api.tests/` and `apps/web/tests/` to reach thresholds, then verify ≥80.0% line/branch coverage for new backend (`dotnet test apps/api.tests` coverlet → cobertura) and frontend (`npm run test:coverage` Vitest → lcov) independently; missing/unparseable reports FAIL (SC-007)
- [X] T035 Execute the validation steps in `specs/011-complete-organization-and/quickstart.md` end-to-end (migration applied, backend + frontend suites green, manual smoke of the four endpoints)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies.
- **Foundational (Phase 2)**: depends on Setup; BLOCKS all user stories.
- **User Stories (Phases 3–7)**: all depend on Foundational. US1, US2 are independent of each other. US3 and US4 depend on the foundational `archived_at` schema (T003–T005). US5 verifies the others and is best run after US1–US4 endpoints exist.
- **Polish (Phase 8)**: depends on all desired stories being complete.

### Key Task Dependencies

- T004 → T003; T005 → T004; T006 independent within Phase 2.
- US1: T009 → (T006, T008); T010 → T009; T011 → T008; T012 → T011; T013 → T012.
- US2: T016 → (T006, T015); T017 → T016; T018 → T015; T019 → T018; T020 → T019.
- US3: T023 → T022; T024 → T012 (shared `organizations.ts`); T025 → T024.
- US4: T027 → (T003, T004); T028 → T027; T029 → T012 (shared `organizations.ts`); T030 → T029.
- US5: T031/T032 require the endpoints from US1–US4; T033 reviews US1–US4 service code.

### Shared-file constraints (do NOT parallelize across these)

- `apps/api.tests/Integration/OrganizationsControllerTests.cs` — edited by T007, T021, T026, T031, T032: sequence them.
- `apps/api/Controllers/OrganizationsController.cs` — T010, T023, T028: sequence them.
- `apps/api/Services/OrganizationService.cs` — T006, T009, T022, T027, T033: sequence them.
- `apps/web/src/api/organizations.ts` — T012, T024, T029: sequence them.
- `apps/web/tests/api/organizations.test.ts` — T013, T025, T030: sequence them.

### Parallel Opportunities

- T002 in Setup.
- T006 runs parallel to T003–T005 in Foundational (different files).
- US2 frontend tasks T019/T020 (`venues.ts`/`venues.test.ts`) can run parallel to any org-side work.
- US5 test tasks T031 and T032 are [P] (distinct assertions; coordinate edits to the shared controller test files).
- Because US1, US3, and US4 share `OrganizationService.cs`, the controller, and the frontend org files, the org-side stories are most efficiently delivered sequentially (US1 → US3 → US4); US2 can proceed in parallel by a second developer.

---

## Parallel Example: Foundational Phase

```bash
# T006 (shared name validation) can proceed while the schema tasks run:
Task: "Add NameValidation helper + refactor create paths (apps/api/Services/NameValidation.cs)"
# in parallel with the T003 → T004 → T005 schema chain (Organization.cs → ApplicationDbContext.cs → migration)
```

## Parallel Example: US2 frontend

```bash
Task: "Add useUpdateVenue mutation in apps/web/src/api/venues.ts"
Task: "Add Vitest test for useUpdateVenue in apps/web/tests/api/venues.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Phase 1 Setup → 2. Phase 2 Foundational → 3. Phase 3 US1 → 4. STOP and validate org rename independently → demo.

### Incremental Delivery

Foundation → US1 (rename, MVP) → US2 (venue update) → US3 (org list) → US4 (org delete/archive) → US5 (consistency hardening) → Polish (coverage + quickstart). Each story is independently testable and adds value without breaking prior stories.

### Parallel Team Strategy

After Foundational: Developer A takes the org-side stories sequentially (US1 → US3 → US4, shared files); Developer B takes US2 (venue update, isolated files) in parallel; both converge on US5 + Polish.

---

## Notes

- [P] = different files, no dependency on incomplete tasks.
- Backend-first contracts: add C# DTOs, rebuild, then `npm run gen:api`; never hand-edit `generated-api.ts` (Constitution VI).
- Concurrency is last-write-wins; do NOT add version/ETag or concurrency tokens to org/venue (FR-012).
- All reads use `.AsNoTracking()`; queries stay org-scoped (Constitution II, VII).
- Verify each story's tests fail before implementing; commit after each task or logical group.
