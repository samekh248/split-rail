# Implementation Plan: Complete Organization & Venue CRUD

**Branch**: `011-complete-organization-and` | **Date**: 2026-06-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/011-complete-organization-and/spec.md`

## Summary

Complete the tenant-management CRUD surface by adding the missing endpoints on top of the existing organization create/get-current and venue list/create/get/delete:

- **Organization update** (admin-only) — rename the caller's organization.
- **Organization list** — return the organizations the authenticated user is a member of, excluding archived organizations.
- **Organization delete** (admin-only) — soft-delete (archive) the organization; blocked with a conflict when the organization still owns venues or financial data.
- **Venue update** (manage-permission + venue-scope) — rename a venue within the caller's accessible scope.
- **Consistency pass** — name validation (required, trimmed, ≤200 chars) applied uniformly across create and update for organizations and venues, and standardized error contracts/permission gating reused across all tenant endpoints.

Implementation extends the existing `OrganizationsController`/`OrganizationService` and `VenuesController`/`VenueService`, adds an `archived_at` soft-delete column to `Organization` (with a tenant query filter update to hide archived organizations from reads), and adds update-request DTOs. The C# DTOs are the contract source of truth; `swagger.json` regenerates and cascades to `apps/web/src/types/generated-api.ts` (Constitution VI). Backend gets xUnit + Testcontainers integration tests; the thin frontend API hooks get Vitest coverage to keep both stacks at ≥80.0% line/branch.

## Technical Context

**Language/Version**: C# 12 / .NET 9 (backend, `apps/api`); TypeScript 5.x / React 18 (frontend, `apps/web`)

**Primary Dependencies**: ASP.NET Core, Entity Framework Core (Npgsql); React 18 + Vite + TanStack Query (frontend)

**Storage**: PostgreSQL (Npgsql provider); EF Core migrations. Test runs use `Testcontainers.PostgreSql` (postgres:16)

**Testing**: xUnit + `WebApplicationFactory` + Testcontainers for backend integration tests; Vitest + React Testing Library for frontend. ≥80.0% line/branch coverage gate enforced independently per stack via CI (missing/unparseable coverage reports treated as failing).

**Target Platform**: Linux server (containerized API) + browser SPA

**Project Type**: Web application (monorepo): `apps/api` backend + `apps/web` frontend

**Performance Goals**: Standard CRUD latency (<200ms p95 per endpoint under normal load); list/read queries use `.AsNoTracking()`; no N+1 (eager `.Include()` where parent/child aggregation is needed per Constitution VII)

**Constraints**:
- ≥80.0% line/branch coverage on backend and frontend independently (CI-enforced; missing/unparseable coverage reports treated as failing).
- Every persistence read/update/delete MUST be scoped by `organization_id` (Constitution II); no unscoped queries.
- No floating-point money math (Constitution I) — N/A to this feature's name-only fields but observed.
- Frontend data contracts MUST be imported from `apps/web/src/types/generated-api.ts` (Constitution VI); no hand-written payload interfaces.
- EF Core: no lazy loading; `.AsNoTracking()` on read paths; `.Include()`/`.ThenInclude()` for aggregation (Constitution VII).
- Exception governance: reuse granular domain exceptions (`ValidationException`, `AuthorizationException`, `ConflictException`, `NotFoundException`); no empty catches, no generic `System.Exception`; sanitized logs with no PII/secrets (Constitution VIII).

**Scale/Scope**: Tenant-management surface — 2 controllers, 2 services, 1 additive migration (organization `archived_at`), update DTOs for org + venue, a shared name validator, generated-type regeneration, and the corresponding backend integration tests + frontend hook tests.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Relevance | Status |
|-----------|-----------|--------|
| I. Core Mathematical Axioms (no float for money) | Feature touches name-only fields; no monetary math introduced | PASS (N/A) |
| II. Multi-Tenant/Venue Isolation | All org/venue read/update/delete scoped to caller's `organization_id`; org list filters by membership; cross-tenant target resolves as not-found via tenant query filter | PASS (primary design rule) |
| III. Engineering Rigor & Quality Gates | New endpoints accompanied by xUnit + Testcontainers integration tests (authorized, unauthorized, out-of-scope, not-found, conflict, invalid-input) and Vitest tests for new frontend hooks; ≥80% gate maintained per stack | PASS |
| IV. QBO Read-Only | No QBO mutations; org delete is blocked while financial/QBO data exists and is soft-delete only | PASS (N/A) |
| V. Ledger Immutability | Soft-delete archives the org and is blocked while it owns financial data; no `events`/`financial_line_items` mutation or settlement drift introduced | PASS |
| VI. Polyglot Contract Serialization | New `UpdateOrganizationRequest`/`UpdateVenueRequest` DTOs defined in C# first; swagger regenerated; frontend consumes `generated-api.ts` | PASS (design rule) |
| VII. EF Core Axioms | Reads use `.AsNoTracking()`; no lazy loading; delete-block existence checks use scoped `AnyAsync`; update loads tracked entity by scoped id | PASS |
| VIII. Exception Governance & Logging Privacy | Reuse existing granular `ApiException` types mapped by `ExceptionHandlerMiddleware`; audit logs record ids only (no PII/secrets) | PASS |

No violations. No entries required in Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/011-complete-organization-and/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   ├── organizations.md # Organization list/update/delete request+response+error contract
│   └── venues.md        # Venue update request+response+error contract
├── checklists/
│   └── requirements.md  # Existing spec-quality checklist
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created here)
```

### Source Code (repository root)

```text
apps/api/
├── Controllers/
│   ├── OrganizationsController.cs   # ADD: GET (list), PUT (update), DELETE (soft-delete) by org id
│   └── VenuesController.cs          # ADD: PUT /{venueId} (update)
├── Services/
│   ├── OrganizationService.cs       # ADD: ListForUser, UpdateOrganization, ArchiveOrganization; align create name validation
│   ├── VenueService.cs              # ADD: UpdateVenue (scope-checked); align create name validation
│   └── (NameValidation helper)      # ADD: shared required/trim/≤200 name validation
├── DTOs/
│   ├── Organizations/OrganizationDtos.cs  # ADD: UpdateOrganizationRequest
│   └── Venues/VenueDtos.cs                 # ADD: UpdateVenueRequest
├── Models/
│   └── Organization.cs              # ADD: ArchivedAt (nullable) for soft delete
├── Data/
│   ├── ApplicationDbContext.cs      # ADD: archived_at mapping; exclude archived orgs from query filter
│   └── Migrations/                  # ADD: additive migration for organizations.archived_at
└── ...

apps/api.tests/
└── Integration/
    ├── OrganizationsControllerTests.cs   # ADD: list/update/delete cases (authz, conflict, not-found, validation)
    └── VenuesControllerTests.cs          # ADD: update cases (authz, out-of-scope, not-found, validation)

apps/web/
├── src/
│   ├── api/
│   │   ├── organizations.ts         # ADD: useOrganizations (list), useUpdateOrganization, useDeleteOrganization
│   │   └── venues.ts                # ADD: useUpdateVenue mutation
│   └── types/generated-api.ts       # REGENERATED from swagger (contract source of truth)
└── tests/
    └── api/                          # ADD: Vitest tests for new org/venue hooks
```

**Structure Decision**: Web-application monorepo. Backend changes are additive extensions to the existing `OrganizationsController`/`OrganizationService` and `VenuesController`/`VenueService`; the only schema change is an additive nullable `organizations.archived_at` column plus a query-filter update to hide archived organizations. Organization update/delete are addressed by organization id (`/api/organizations/{organizationId}`) so cross-tenant targets naturally resolve to not-found via the existing tenant query filter, satisfying the "update/delete a different organization B" scenarios without leaking existence. Organization list bypasses the single-org tenant filter and instead filters by `UserOrganizationMappings` membership for the authenticated user (excluding archived orgs). Frontend adds thin TanStack Query hooks consuming generated types; no contract is hand-mirrored.

## Complexity Tracking

> No constitution violations. Section intentionally empty.
