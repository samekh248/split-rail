# Tasks: Top-Level Tenant Foundation & Granular RBAC

**Input**: Design documents from `specs/001-tenant-rbac-foundation/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Included per Constitution III — every service and controller requires automated verification. Backend tests use xUnit + WebApplicationFactory + Testcontainers.

**Organization**: Tasks grouped by user story. Each story is independently testable after its phase completes.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add required NuGet packages, create test project scaffold, and establish shared infrastructure types.

- [ ] T001 Add NuGet packages to apps/api/split-rail-api.csproj — Microsoft.AspNetCore.Authentication.JwtBearer (8.0.*), BCrypt.Net-Next (4.*), Swashbuckle.AspNetCore (6.*)
- [ ] T002 [P] Create xUnit test project at apps/api.tests/split-rail-api.tests.csproj — reference split-rail-api, add xUnit, Microsoft.AspNetCore.Mvc.Testing, Testcontainers.PostgreSql, Microsoft.NET.Test.Sdk, FluentAssertions
- [ ] T003 [P] Create domain exception hierarchy in apps/api/Exceptions/ — ApiException (base), AuthenticationException, AuthorizationException, ValidationException, ConflictException, NotFoundException, LastAdminException
- [ ] T004 [P] Create JwtSettings configuration class in apps/api/Configuration/JwtSettings.cs — Secret, Issuer, Audience, AccessTokenExpirationMinutes (60), RefreshTokenExpirationDays (7)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: New entity models, DbContext updates, tenant context interface, test infrastructure, and DTO base types. MUST complete before any user story.

**CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T005 Create RefreshToken entity model in apps/api/Models/RefreshToken.cs — Id (UUID PK), UserId (FK), TokenHash (VARCHAR 64), ExpiresAt, IsRevoked, CreatedAt per data-model.md
- [ ] T006 [P] Create Invitation entity model in apps/api/Models/Invitation.cs — Id (UUID PK), OrganizationId (FK), Email, RoleId (FK), TokenHash, Status (pending/accepted/expired), ExpiresAt, CreatedAt per data-model.md
- [ ] T007 [P] Create InvitationVenueScope entity model in apps/api/Models/InvitationVenueScope.cs — InvitationId (PK FK), VenueId (PK FK) per data-model.md
- [ ] T008 Update ApplicationDbContext in apps/api/Data/ApplicationDbContext.cs — add DbSets for RefreshToken, Invitation, InvitationVenueScope; add Fluent API configuration methods with indexes per data-model.md
- [ ] T009 Generate EF Core migration for RefreshToken, Invitation, InvitationVenueScope entities — run `dotnet ef migrations add AddAuthAndInvitationEntities` in apps/api/
- [ ] T010 Create ITenantContext interface and TenantContext scoped implementation in apps/api/Services/ITenantContext.cs and apps/api/Services/TenantContext.cs — OrganizationId (Guid?), UserId (Guid?), SetContext method
- [ ] T011 [P] Create error response DTO and validation helper in apps/api/DTOs/ErrorResponse.cs — Type, Detail, Errors[] fields matching contract error format
- [ ] T012 [P] Configure Swashbuckle OpenAPI generation in apps/api/Program.cs — AddSwaggerGen, UseSwagger, UseSwaggerUI
- [ ] T013 [P] Create IntegrationTestBase class in apps/api.tests/Integration/IntegrationTestBase.cs — Testcontainers PostgreSQL lifecycle, WebApplicationFactory<Program> with test DB override, helper methods for creating authenticated HTTP clients

**Checkpoint**: Foundation ready — user story implementation can now begin.

---

## Phase 3: User Story 3 — User Authentication & Session Management (Priority: P1)

**Goal**: Users register, log in, receive JWT access + refresh tokens, refresh transparently, and log out. Unauthenticated requests to protected endpoints are rejected.

**Independent Test**: Register a user, log in, verify token access, refresh the token, confirm revoked tokens are rejected, confirm unauthenticated requests return 401.

**Why first**: Auth is the gateway to every other story. Registration and login must work before Organizations, RBAC, or any protected endpoint.

### Implementation for User Story 3

- [ ] T014 [P] [US3] Create auth DTOs in apps/api/DTOs/Auth/ — RegisterRequest, LoginRequest, RefreshRequest, AuthResponse (accessToken, refreshToken, expiresIn), RegisterResponse (id, email, createdAt)
- [ ] T015 [US3] Implement TokenService in apps/api/Services/TokenService.cs — GenerateAccessToken (JWT with sub, org_id, exp signed HMAC-SHA256), GenerateRefreshToken (32 random bytes, URL-safe base64), HashToken (SHA-256), ValidateRefreshToken (lookup by hash, check expiry/revocation)
- [ ] T016 [US3] Implement AuthService in apps/api/Services/AuthService.cs — Register (email validation, password policy 8+ chars/upper/lower/digit, BCrypt hash, duplicate check), Login (credential verification, token pair issuance), Refresh (token rotation, old token revocation), Logout (revoke all user refresh tokens)
- [ ] T017 [US3] Configure JWT authentication middleware and register auth services in apps/api/Program.cs — AddAuthentication, AddJwtBearer with TokenValidationParameters (issuer, audience, signing key, clock skew), register TokenService/AuthService as scoped, bind JwtSettings from configuration
- [ ] T018 [US3] Create AuthController in apps/api/Controllers/AuthController.cs — POST /api/auth/register (201/400/409), POST /api/auth/login (200/401), POST /api/auth/refresh (200/401), POST /api/auth/logout [Authorize] (204/401) per contracts/auth.md
- [ ] T019 [P] [US3] Write unit tests in apps/api.tests/Unit/AuthServiceTests.cs — password policy validation, BCrypt hash verification, duplicate email rejection, token generation
- [ ] T020 [US3] Write integration tests in apps/api.tests/Integration/AuthControllerTests.cs — register success, register duplicate 409, register weak password 400, login success, login bad credentials 401, refresh success, refresh revoked token 401, logout revokes tokens, unauthenticated request 401

**Checkpoint**: Users can register, log in, refresh tokens, and log out. Protected endpoints reject unauthenticated requests.

---

## Phase 4: User Story 1 — Organization Creation & Onboarding (Priority: P1)

**Goal**: Authenticated users create an Organization. The system seeds four default roles per the permission matrix and assigns the creator as Admin. Users can view their profile with role info.

**Independent Test**: Register → login → create Organization → verify 4 default roles exist with correct permission flags → verify creator has Admin role via /users/me.

### Implementation for User Story 1

- [ ] T021 [P] [US1] Create organization DTOs in apps/api/DTOs/Organizations/ — CreateOrganizationRequest (name), OrganizationResponse (id, name, createdAt)
- [ ] T022 [P] [US1] Create user DTOs in apps/api/DTOs/Users/ — UserProfileResponse (id, email, organization, role with permissions, venueScopes), UserListResponse (id, email, role, venueScopes)
- [ ] T023 [US1] Implement OrganizationService in apps/api/Services/OrganizationService.cs — CreateOrganization (create org, seed 4 default roles per data-model.md default seed matrix, create UserOrganizationMapping with Admin role for creator, return org)
- [ ] T024 [US1] Create OrganizationsController in apps/api/Controllers/OrganizationsController.cs — POST /api/organizations [Authorize] (201/400/401), GET /api/organizations/current [Authorize] (200/401/403) per contracts/organizations.md
- [ ] T025 [US1] Implement UserService (initial) in apps/api/Services/UserService.cs — GetProfile (load user with org mapping, role, permissions, venue scopes using .Include().ThenInclude() and .AsNoTracking())
- [ ] T026 [US1] Create UsersController (initial) in apps/api/Controllers/UsersController.cs — GET /api/users/me [Authorize] (200/401) per contracts/users.md
- [ ] T027 [US1] Write integration tests in apps/api.tests/Integration/OrganizationsControllerTests.cs — create org success 201, verify 4 default roles with correct permission flags per matrix, verify creator assigned Admin role, get current org 200, create org without auth 401

**Checkpoint**: Full onboarding flow works — register, login, create org, verify admin status and default roles.

---

## Phase 5: User Story 2 — Cross-Tenant Data Isolation (Priority: P1)

**Goal**: All data queries are automatically scoped to the authenticated user's Organization via EF Core global query filters. Users from Org A cannot see, access, or retrieve any Org B data.

**Independent Test**: Create two Organizations with different users. Authenticate as Org A user and verify only Org A data is returned. Attempt direct ID access to Org B resources and verify 404 denial.

### Implementation for User Story 2

- [ ] T028 [US2] Implement TenantContextMiddleware in apps/api/Middleware/TenantContextMiddleware.cs — extract org_id and user_id from JWT claims, populate ITenantContext on each request, reject requests with invalid/missing org_id for protected endpoints
- [ ] T029 [US2] Add EF Core global query filters in apps/api/Data/ApplicationDbContext.cs — apply .HasQueryFilter() on Organization (Id == tenantContext.OrganizationId), Venue, OrganizationRole, UserOrganizationMapping, UserVenueScope (all filtered by OrganizationId); use .IgnoreQueryFilters() only for cross-tenant admin paths (e.g., registration/login)
- [ ] T030 [US2] Register TenantContextMiddleware in request pipeline in apps/api/Program.cs — insert after UseAuthentication/UseAuthorization, before MapControllers
- [ ] T031 [US2] Write integration tests in apps/api.tests/Integration/TenantIsolationTests.cs — create two orgs with users, Org A user sees only Org A data on list endpoints, Org A user gets 404 for Org B venue by direct ID, Org B user sees only Org B roles, no cross-tenant leakage on any tenant-scoped endpoint

**Checkpoint**: Zero cross-tenant data leakage — global query filters enforce isolation on every query.

---

## Phase 6: User Story 4 — Role-Based Permission Enforcement (Priority: P2)

**Goal**: The system enforces permission checks on every protected action based on the user's assigned role. Admins can toggle individual permission flags on roles.

**Independent Test**: Assign different roles to users, verify Admin can perform all actions, Promoter is denied permission management, toggle a permission flag and verify it takes effect.

### Implementation for User Story 4

- [ ] T032 [P] [US4] Create role DTOs in apps/api/DTOs/Roles/ — RoleResponse (id, roleName, all permission booleans), UpdateRoleRequest (nullable booleans for each permission flag)
- [ ] T033 [US4] Create RequirePermissionAttribute and PermissionAuthorizationHandler in apps/api/Authorization/RequirePermissionAttribute.cs and apps/api/Authorization/PermissionAuthorizationHandler.cs — attribute accepts permission name string, handler loads user's role from DB and checks the corresponding boolean flag
- [ ] T034 [US4] Register authorization policies and PermissionAuthorizationHandler in DI in apps/api/Program.cs — AddSingleton<IAuthorizationHandler, PermissionAuthorizationHandler>
- [ ] T035 [US4] Implement RoleService in apps/api/Services/RoleService.cs — ListRoles (all org roles via .AsNoTracking()), UpdateRole (load by ID within org, apply partial permission flag updates, save)
- [ ] T036 [US4] Create RolesController in apps/api/Controllers/RolesController.cs — GET /api/roles [Authorize] (200/401), PATCH /api/roles/{roleId} [Authorize, RequirePermission("can_manage_permissions")] (200/400/401/403/404) per contracts/roles.md
- [ ] T037 [US4] Apply RequirePermission attributes to all protected controller actions across OrganizationsController, VenuesController (when created), UsersController, InvitationsController (when created)
- [ ] T038 [US4] Write integration tests in apps/api.tests/Integration/RolesControllerTests.cs — list roles 200, Admin updates permission flag 200, Promoter denied PATCH 403, toggle permission propagates to all users with that role, non-existent role returns 404

**Checkpoint**: RBAC enforcement active — each role can only perform actions matching its permission flags.

---

## Phase 7: User Story 5 — Venue Management & Venue-Scoped Access (Priority: P2)

**Goal**: Organizations create and manage Venues. Users can be scoped to specific Venues. Users with no explicit scope see all Venues; scoped users see only their assigned Venues. Deleting a Venue cleans up scopes. Last Admin cannot be removed or demoted.

**Independent Test**: Create 3 Venues, scope a user to 1 Venue, verify they see only that Venue. Delete the Venue and verify scope cleanup. Attempt to remove the last Admin and verify denial.

### Implementation for User Story 5

- [ ] T039 [P] [US5] Create venue DTOs in apps/api/DTOs/Venues/ — CreateVenueRequest (name), VenueResponse (id, name, organizationId, createdAt)
- [ ] T040 [P] [US5] Create user management DTOs in apps/api/DTOs/Users/ — ChangeRoleRequest (roleId), UpdateVenueScopesRequest (venueIds[]), ChangeRoleResponse (userId, roleId, roleName), UpdateVenueScopesResponse (userId, venueScopes[])
- [ ] T041 [US5] Implement VenueService in apps/api/Services/VenueService.cs — ListAccessibleVenues (apply venue scope filter: return all if user has no scope rows, else return only scoped venues; use .AsNoTracking()), CreateVenue, GetVenueById (scope-aware, return null if not accessible), DeleteVenue (cascade handled by DB FK, confirm org ownership)
- [ ] T042 [US5] Create VenuesController in apps/api/Controllers/VenuesController.cs — GET /api/venues [Authorize] (200/401), POST /api/venues [Authorize, RequirePermission("can_manage_permissions")] (201/400/401/403), GET /api/venues/{venueId} [Authorize] (200/401/404), DELETE /api/venues/{venueId} [Authorize, RequirePermission("can_manage_permissions")] (204/401/403/404) per contracts/venues.md
- [ ] T043 [US5] Extend UserService in apps/api/Services/UserService.cs — ListOrgUsers (with role and scopes via .Include().ThenInclude(), .AsNoTracking()), ChangeUserRole (validate role exists in org, last-admin guard), UpdateVenueScopes (validate venues exist in org, replace scope rows), RemoveUserFromOrg (last-admin guard, delete mapping and scopes)
- [ ] T044 [US5] Implement last-admin protection guard as private method in UserService — count Admin-role mappings in org, throw LastAdminException if operation would reduce count to zero (FR-013)
- [ ] T045 [US5] Extend UsersController in apps/api/Controllers/UsersController.cs — GET /api/users [Authorize] (200/401), PATCH /api/users/{userId}/role [Authorize, RequirePermission("can_manage_permissions")] (200/400/401/403/404), PUT /api/users/{userId}/venue-scopes [Authorize, RequirePermission("can_manage_permissions")] (200/400/401/403/404), DELETE /api/users/{userId} [Authorize, RequirePermission("can_manage_permissions")] (204/400/401/403/404) per contracts/users.md
- [ ] T046 [US5] Write integration tests in apps/api.tests/Integration/VenuesControllerTests.cs — create venue 201, list venues (unscoped sees all, scoped sees only assigned), get venue by ID (scope-aware 404), delete venue 204 with scope cleanup, non-admin create denied 403
- [ ] T047 [US5] Write integration tests in apps/api.tests/Integration/UsersControllerTests.cs — list org users 200, change role 200, change last admin role 400 (LastAdminException), update venue scopes 200, remove user 204, remove last admin 400, non-admin management actions 403

**Checkpoint**: Full venue management with scoped access, user role/scope management, and last-admin protection.

---

## Phase 8: User Story 6 — Team Invitation & Role Assignment (Priority: P2)

**Goal**: Admins invite users by email with an assigned role and optional venue scope. Invitees accept via a token-based link, creating an account if needed. Invitations expire after 7 days and can be re-sent.

**Independent Test**: Admin sends invitation → invitee accepts → verify new user has correct role and venue scope → non-admin invitation attempt denied → re-send expired invitation.

### Implementation for User Story 6

- [ ] T048 [P] [US6] Create invitation DTOs in apps/api/DTOs/Invitations/ — CreateInvitationRequest (email, roleId, venueIds[]), InvitationResponse (id, email, roleName, status, expiresAt, createdAt), AcceptInvitationRequest (token, password), AcceptInvitationResponse (accessToken, refreshToken, expiresIn, organizationId)
- [ ] T049 [US6] Implement InvitationService in apps/api/Services/InvitationService.cs — SendInvitation (generate 32-byte random token, SHA-256 hash, store invitation + venue scopes, 7-day expiry, check not already a member), AcceptInvitation (validate token hash, check not expired, create account if needed with BCrypt, map user to org with role, apply venue scopes, mark accepted, issue tokens), ResendInvitation (validate not accepted, generate new token, reset expiry), ListInvitations (.AsNoTracking()), CancelInvitation (validate not accepted, delete)
- [ ] T050 [US6] Create InvitationsController in apps/api/Controllers/InvitationsController.cs — POST /api/invitations [Authorize, RequirePermission("can_manage_permissions")] (201/400/401/403/409), GET /api/invitations [Authorize, RequirePermission("can_manage_permissions")] (200/401/403), POST /api/invitations/{id}/resend [Authorize, RequirePermission("can_manage_permissions")] (200/400/401/403/404), POST /api/invitations/accept [AllowAnonymous] (200/400/404/409), DELETE /api/invitations/{id} [Authorize, RequirePermission("can_manage_permissions")] (204/400/401/403/404) per contracts/invitations.md
- [ ] T051 [US6] Write integration tests in apps/api.tests/Integration/InvitationsControllerTests.cs — send invitation 201, accept invitation (new user) 200 with correct role/scopes, accept invitation (existing user) 200, list invitations 200, resend expired invitation 200, cancel pending invitation 204, non-admin send denied 403, expired token returns 404, already-member returns 409, accept sets accepted status

**Checkpoint**: Full team collaboration flow — invite, accept, role assignment, venue scoping on acceptance.

---

## Phase 9: User Story 7 — Workspace Context Switching (Priority: P3)

**Goal**: Users can filter their data view to a specific Venue via an API mechanism. The system returns only data for the selected Venue, respecting venue scope authorization.

**Independent Test**: User with access to 3 Venues sends request with active venue filter → only that Venue's data returned. Scoped user attempts to set active context to unauthorized Venue → denied.

### Implementation for User Story 7

- [ ] T052 [US7] Extend ITenantContext with ActiveVenueId property in apps/api/Services/ITenantContext.cs
- [ ] T053 [US7] Create VenueContextMiddleware in apps/api/Middleware/VenueContextMiddleware.cs — read X-Active-Venue-Id header, validate venue exists in user's org and is within user's venue scope, populate ITenantContext.ActiveVenueId, reject if unauthorized venue
- [ ] T054 [US7] Register VenueContextMiddleware in pipeline after TenantContextMiddleware in apps/api/Program.cs
- [ ] T055 [US7] Update VenueService.ListAccessibleVenues to filter by ActiveVenueId when set in apps/api/Services/VenueService.cs
- [ ] T056 [US7] Write integration tests in apps/api.tests/Integration/VenueContextSwitchingTests.cs — set active venue header returns filtered data, scoped user sets authorized venue succeeds, scoped user sets unauthorized venue denied, no header returns all accessible venues, context switch shows correct venue data

**Checkpoint**: Venue context switching operational via API header.

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Global exception handling, structured logging, OpenAPI validation, and coverage gate.

- [ ] T057 [P] Create global ExceptionHandlerMiddleware in apps/api/Middleware/ExceptionHandlerMiddleware.cs — catch domain exceptions and map to HTTP status codes (AuthenticationException→401, AuthorizationException→403, ValidationException/LastAdminException→400, NotFoundException→404, ConflictException→409), return ErrorResponse DTO, sanitize PII from log output per FR-015 and Constitution VIII
- [ ] T058 [P] Register ExceptionHandlerMiddleware at top of pipeline in apps/api/Program.cs
- [ ] T059 [P] Add structured logging with ILogger across all services — log auth events, org creation, invitation lifecycle, permission changes; never log tokens, passwords, or PII per Constitution VIII
- [ ] T060 Verify Swashbuckle generates complete swagger.json covering all endpoints — run `dotnet build` and check /swagger/v1/swagger.json
- [ ] T061 Run full test suite and verify ≥80% line/branch coverage — `dotnet test --collect:"XPlat Code Coverage"` per SC-008
- [ ] T062 Run quickstart.md validation scenarios end-to-end against running API

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **US3 Auth (Phase 3)**: Depends on Foundational — BLOCKS US1, US2 (auth required for org creation and tenant scoping)
- **US1 Org Creation (Phase 4)**: Depends on US3 (user must be authenticated to create org)
- **US2 Tenant Isolation (Phase 5)**: Depends on US1 (needs multiple orgs to test isolation)
- **US4 RBAC (Phase 6)**: Depends on US1 (roles must exist) and US2 (tenant context required)
- **US5 Venues (Phase 7)**: Depends on US2 (tenant-scoped queries) and US4 (permission enforcement)
- **US6 Invitations (Phase 8)**: Depends on US3 (auth for new users), US4 (permission check on admin), US5 (venue scopes)
- **US7 Context Switching (Phase 9)**: Depends on US5 (venues and scoping must exist)
- **Polish (Phase 10)**: Depends on all desired user stories being complete

### User Story Dependencies

```
Phase 1 (Setup)
    └── Phase 2 (Foundational)
            └── Phase 3 (US3: Auth) ← BLOCKS everything below
                    ├── Phase 4 (US1: Org Creation)
                    │       └── Phase 5 (US2: Tenant Isolation)
                    │               ├── Phase 6 (US4: RBAC)
                    │               │       └── Phase 7 (US5: Venues)
                    │               │               ├── Phase 8 (US6: Invitations)
                    │               │               └── Phase 9 (US7: Context Switching)
                    │               └───────────────────────┘
                    └── Phase 10 (Polish)
```

### Within Each User Story

- DTOs before services
- Services before controllers
- Core implementation before integration/edge cases
- Tests after implementation within the same phase

### Parallel Opportunities

- **Phase 1**: T002, T003, T004 can all run in parallel after T001 (package install)
- **Phase 2**: T005–T007 (models) in parallel, then T008 (DbContext), then T009 (migration). T010–T013 in parallel with models.
- **Phase 3**: T014 (DTOs) in parallel with other phases. T019 (unit tests) in parallel with T018 (controller).
- **Phase 4**: T021, T022 (DTOs) in parallel.
- **Phase 6**: T032 (DTOs) in parallel with earlier work.
- **Phase 7**: T039, T040 (DTOs) in parallel.
- **Phase 8**: T048 (DTOs) in parallel with earlier work.
- **Across stories**: Once Phase 5 (US2) completes, Phase 6 (US4) and Phase 7 (US5) could theoretically overlap if US4 permission infrastructure is committed first.

---

## Parallel Example: Phase 2 (Foundational)

```
# All model files can be created simultaneously:
Task T005: "Create RefreshToken model in apps/api/Models/RefreshToken.cs"
Task T006: "Create Invitation model in apps/api/Models/Invitation.cs"
Task T007: "Create InvitationVenueScope model in apps/api/Models/InvitationVenueScope.cs"

# These are independent of each other and models:
Task T010: "Create ITenantContext in apps/api/Services/ITenantContext.cs"
Task T011: "Create ErrorResponse DTO in apps/api/DTOs/ErrorResponse.cs"
Task T012: "Configure Swashbuckle in apps/api/Program.cs"
Task T013: "Create IntegrationTestBase in apps/api.tests/Integration/IntegrationTestBase.cs"
```

---

## Implementation Strategy

### MVP First (User Stories 1–3 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: US3 — Auth & Session Management
4. Complete Phase 4: US1 — Organization Creation & Onboarding
5. Complete Phase 5: US2 — Cross-Tenant Data Isolation
6. **STOP and VALIDATE**: Run quickstart.md Scenarios 1–3
7. Deploy/demo — authenticated, tenant-isolated multi-org platform

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US3 (Auth) → Users can register and login
3. Add US1 (Org Creation) → Onboarding flow complete → First demo (MVP!)
4. Add US2 (Tenant Isolation) → Security perimeter enforced
5. Add US4 (RBAC) → Permission enforcement active
6. Add US5 (Venues) → Venue management and scoping
7. Add US6 (Invitations) → Team collaboration enabled
8. Add US7 (Context Switching) → UX polish for multi-venue users
9. Polish → Production-ready

### Parallel Team Strategy

With multiple developers after Phase 5 (US2) completes:

1. Team completes Setup → Foundational → US3 → US1 → US2 together
2. Once US2 is done:
   - Developer A: US4 (RBAC) → US5 (Venues)
   - Developer B: US6 (Invitations) — can start service layer while US4/US5 controllers are in progress
3. US7 (Context Switching) after US5 completes

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks in same phase
- [Story] label maps task to specific user story for traceability
- All read queries MUST use `.AsNoTracking()` per Constitution VII
- All eager loading MUST use explicit `.Include()` / `.ThenInclude()` per Constitution VII
- All tenant-scoped queries enforced via EF Core global query filters per Constitution II
- Domain exceptions MUST be granular (no generic `System.Exception`) per Constitution VIII
- No PII, tokens, or secrets in log output per Constitution VIII and FR-015
- DTOs are the API surface — entity models are never exposed to clients per Constitution VI
