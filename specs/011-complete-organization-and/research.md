# Phase 0 Research: Complete Organization & Venue CRUD

All Technical Context items were resolvable from the existing codebase and spec clarifications; no open `NEEDS CLARIFICATION` remain. Decisions below record the chosen approach, rationale, and rejected alternatives.

## 1. Soft-delete representation for Organization

- **Decision**: Add a nullable `archived_at` (`DateTimeOffset?`) column to `organizations`. `NULL` = active, non-null timestamp = archived. Exclude archived organizations from the EF Core tenant query filter so all existing reads (`GetCurrent`, list) transparently hide them while underlying records (venues, financial data, mappings) are retained.
- **Rationale**: Matches the spec's soft-delete + record-retention requirement (FR-007), is purely additive (nullable column, no data backfill), and centralizes exclusion in `ApplicationDbContext.ApplyTenantQueryFilters` so individual queries don't each re-implement the filter. A timestamp doubles as an audit signal for when the archive occurred.
- **Alternatives considered**:
  - Boolean `is_archived` — rejected: loses the archive timestamp and is no simpler.
  - Hard delete with cascade — rejected: violates record-retention/financial-integrity (Constitution V, FR-007) and would destroy ledger history.
  - Separate `archived_organizations` table — rejected: heavy, complicates tenant filters and membership queries for no benefit at this scale.

## 2. Routing for organization update/delete and cross-tenant safety

- **Decision**: Address organization update/delete by id: `PUT /api/organizations/{organizationId}` and `DELETE /api/organizations/{organizationId}`. Resolve the target through the tenant-filtered `Organizations` set, so any id outside the caller's organization (or already archived) returns `404 not_found`. Gate both with `[RequirePermission(PermissionNames.ManagePermissions)]`.
- **Rationale**: The existing EF tenant query filter (`e.Id == _tenantContext.OrganizationId`) means a cross-tenant id is invisible and naturally yields not-found without leaking existence (FR-013, SC-005), directly satisfying the "update/delete a different organization B → rejected" acceptance scenarios. Reusing `RequirePermission(ManagePermissions)` matches how venue create/delete, roles, and invitations are gated (no new permission type — spec assumption).
- **Alternatives considered**:
  - `PUT/DELETE /api/organizations/current` — rejected: cannot express the "target a different org B" scenarios and is less RESTful for a CRUD surface.
  - Manual `organization_id` equality checks in the service — rejected: duplicates the tenant filter and risks drift; the global filter is the enforced isolation boundary (Constitution II).

## 3. Organization list scoping (membership vs. tenant filter)

- **Decision**: Implement list as a membership query: from `UserOrganizationMappings` for the authenticated `UserId`, join to `Organizations`, exclude archived (`ArchivedAt == null`), project to `OrganizationResponse`, `.AsNoTracking()`. Use `IgnoreQueryFilters()` on the organization read for the join (since the single-org tenant filter would otherwise hide other member orgs) while still constraining strictly to the user's own membership rows.
- **Rationale**: A user may belong to more than one organization, but the JWT carries a single active `org_id`; the spec defines "list" as the organizations the user is a member of (assumption + FR-006), not the single active tenant. Filtering by the user's own membership rows keeps it tenant-safe (only the caller's memberships, never global) and returns an empty list (not an error) when there are none (FR-006, SC-003).
- **Alternatives considered**:
  - Apply the default tenant filter (active org only) — rejected: would return at most one org and contradicts the membership definition.
  - Global `Organizations` scan filtered by membership without `IgnoreQueryFilters` — rejected: the active-org filter would drop legitimate member orgs.

## 4. Organization delete-block ("empty organization" definition)

- **Decision**: Block archiving (return `409 conflict` via `ConflictException`) when the organization still owns **any venue** or **any event/financial line item**; permit archiving only when empty. Check existence with scoped `AnyAsync` (venues by `organization_id`; events/line items via the venue→event chain) before setting `archived_at`.
- **Rationale**: Venues are the parent of all financial data (events → financial_line_items), so a venue-existence check covers the common case; additionally checking events/line items makes the rule explicit and future-proof (FR-008, SC-004). Returning `ConflictException` maps to HTTP 409 in the existing middleware, consistent with other conflict cases.
- **Alternatives considered**:
  - Allow archiving regardless and cascade-archive children — rejected: spec explicitly blocks deletion of non-empty orgs to protect financial integrity.
  - Check only venues — acceptable but less explicit; we also assert no financial data to make intent and tests unambiguous.

## 5. Concurrency model (last-write-wins)

- **Decision**: No optimistic-concurrency token for organization/venue name updates. Load the tracked entity (scoped by id), set the trimmed name, `SaveChangesAsync`. Concurrent updates both succeed; the latest write wins.
- **Rationale**: Spec clarification mandates last-write-wins with no version/ETag and no version-conflict error (FR-012). `Organization`/`Venue` have no `Xmin` concurrency token today (unlike `Event`/`FinancialLineItem`), so this is the natural default — no schema change needed for concurrency.
- **Alternatives considered**:
  - Add `xmin` concurrency token to org/venue — rejected: directly contradicts the clarified requirement and would raise conflict errors the spec forbids.

## 6. Name validation (required, trimmed, ≤200 chars)

- **Decision**: Introduce one shared validation helper (e.g., `NameValidation.Normalize(string, fieldLabel)`) that trims, rejects empty/whitespace-only with `ValidationException`, and rejects length > 200 (measured after trim). Apply it in `CreateOrganizationAsync`, `UpdateOrganizationAsync`, `CreateVenueAsync`, and `UpdateVenueAsync`. Keep the existing DB column length (255) unchanged; enforce 200 at the application layer.
- **Rationale**: Single source of truth for the rule guarantees consistency across create and update for both resources (FR-010, FR-011). Application-layer enforcement avoids a risky column-narrowing migration on existing data while still meeting the 200-char contract; the DB max length (255) acts as a safety backstop, not the primary gate.
- **Alternatives considered**:
  - Narrow DB columns to 200 — rejected: risk of failing on any pre-existing >200 row and offers no added value over app-layer validation already covered by tests.
  - Data-annotation `[MaxLength]`/`[Required]` on DTOs — rejected: the project validates in services and surfaces `ValidationException` through the shared middleware; a helper keeps behavior identical to existing create paths and centralizes the trim.

## 7. Venue update authorization (permission + scope)

- **Decision**: Gate `PUT /api/venues/{venueId}` with `[RequirePermission(PermissionNames.ManagePermissions)]` (same as venue create/delete) and additionally enforce venue-scope accessibility via the existing `VenueService.IsVenueAccessibleAsync`/accessible-venue query. Not-accessible/out-of-org venue → not-found (no existence leak); lacking permission → forbidden.
- **Rationale**: Reuses the proven create/delete gating plus the existing scope rule (spec assumption, FR-003–FR-005). The accessible-venue query already enforces both org tenancy and per-user `UserVenueScopes`, so out-of-scope and cross-tenant both resolve safely.
- **Alternatives considered**:
  - New venue-specific permission — rejected: spec says no new permission type is introduced.
  - Skip scope check and rely only on the permission — rejected: would let an in-org permitted user edit a venue outside their scope, violating FR-005/SC-002.

## 8. Error-contract consistency

- **Decision**: Reuse the existing `ApiException` hierarchy and `ExceptionHandlerMiddleware` mapping: `ValidationException`→400 `validation`, `AuthorizationException`→403 `authorization`, `NotFoundException`→404 `not_found`, `ConflictException`→409 `conflict`, and 401 for unauthenticated. No new exception types or response shapes.
- **Rationale**: Guarantees the standardized contract across all tenant endpoints required by Story 5 (FR-015, SC-006) with zero new surface area. `[Authorize]`/`[RequirePermission]` already produce the standard 401/403 paths.
- **Alternatives considered**:
  - Per-endpoint ad-hoc error shapes — rejected: defeats the consistency goal of the feature.

## 9. Contract regeneration & frontend hooks

- **Decision**: Define `UpdateOrganizationRequest` and `UpdateVenueRequest` C# DTOs first, rebuild the API to refresh `swagger.json`, run `pnpm/npm run gen:api` (`apps/web/scripts/gen-api.mjs`) to regenerate `apps/web/src/types/generated-api.ts`, then add thin TanStack Query hooks (`useOrganizations`, `useUpdateOrganization`, `useDeleteOrganization`, `useUpdateVenue`) that import generated types.
- **Rationale**: Backend-first contract flow is mandated by Constitution VI; the existing `gen:api` script and `apiFetch` client (with 204 handling for delete) already support this pattern.
- **Alternatives considered**:
  - Hand-write TS interfaces for the new payloads — rejected: explicitly prohibited (Constitution VI).

## 10. Testing approach & coverage

- **Decision**: Backend — extend `OrganizationsControllerTests` and `VenuesControllerTests` (xUnit + `IntegrationTestBase` Testcontainers Postgres) covering authorized success, unauthorized (non-admin / missing permission), out-of-scope (venue), not-found (cross-tenant / archived / unknown id), conflict (non-empty org delete), validation (empty/whitespace/>200), idempotent no-op update, and archived-exclusion-from-reads. Frontend — Vitest tests for the new hooks (success + error mapping) using the `apiFetch` client with stubbed `fetch`. Maintain ≥80.0% line/branch per stack.
- **Rationale**: Mirrors existing integration-test patterns and helpers (`SetupAdminClientAsync`, `CreateScopedVenueUserAsync`, `SetupFinancialAdminAsync`) and satisfies Constitution III + FR-017/SC-007.
- **Alternatives considered**:
  - Unit-only service tests — rejected: integration tests through `WebApplicationFactory` validate routing, authz policies, query filters, and error contracts end-to-end, which is where the isolation/consistency requirements live.
