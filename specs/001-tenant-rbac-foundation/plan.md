# Implementation Plan: Top-Level Tenant Foundation & Granular RBAC

**Branch**: `001-tenant-rbac-foundation` | **Date**: 2026-06-13 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-tenant-rbac-foundation/spec.md`

## Summary

Establish the multi-tenant security perimeter, JWT authentication layer, organization-scoped RBAC system, venue management with user-level scoping, and team invitation flow. The backend is an ASP.NET Core 8 API using Entity Framework Core with PostgreSQL (GCP Cloud SQL), with tenant isolation enforced via EF Core global query filters and JWT-based stateless authentication using BCrypt password hashing.

## Technical Context

**Language/Version**: C# / .NET 8.0

**Primary Dependencies**: ASP.NET Core 8, Entity Framework Core 8, Npgsql.EntityFrameworkCore.PostgreSQL, Microsoft.AspNetCore.Authentication.JwtBearer, BCrypt.Net-Next

**Storage**: PostgreSQL 16 (GCP Cloud SQL — `split-rail:us-central1:split-rail-db-prod`)

**Testing**: xUnit + WebApplicationFactory + Testcontainers.PostgreSql

**Target Platform**: GCP Cloud Run (Linux container, .NET 8 runtime)

**Project Type**: Web service (REST API backend) — frontend (React + Vite) deferred to future scaffolding

**Performance Goals**: 100 concurrent authenticated users, ≤500ms permission-denied responses (SC-004, SC-005)

**Constraints**: UNIX socket connections on Cloud Run, zero cross-tenant data leakage, ≥80% test coverage, no PII in logs

**Scale/Scope**: <1000 organizations at MVP, ~100 concurrent users

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Applicable? | Status | Notes |
|---|-----------|-------------|--------|-------|
| I | Core Mathematical Axioms | No | PASS | No monetary math in this feature |
| II | Multi-Tenant Isolation | **Yes** | PASS | EF Core global query filters enforce org_id scoping on all tenant entities. `ITenantContext` populated from JWT. See [research.md §3](research.md#3-tenant-isolation--ef-core-global-query-filters--middleware). |
| III | Engineering Rigor | **Yes** | PASS | xUnit + Testcontainers + WebApplicationFactory planned. Test project at `apps/api.tests/`. ≥80% coverage gate. |
| IV | QBO Integration | No | PASS | No QBO interaction in this feature |
| V | Ledger State Machine | No | PASS | No financial records modified |
| VI | Polyglot Contract Serialization | **Yes** | PASS | DTOs are the API surface. Swashbuckle generates swagger.json. Frontend will consume auto-generated types. |
| VII | EF Core Axioms | **Yes** | PASS | `.AsNoTracking()` for read queries, explicit `.Include()` for eager loading. No lazy loading. |
| VIII | Exception Governance | **Yes** | PASS | Domain exceptions for auth/RBAC failures. No PII/tokens in logs. Structured logging via `ILogger`. |

**Gate result**: All gates PASS. No violations.

## Project Structure

### Documentation (this feature)

```text
specs/001-tenant-rbac-foundation/
├── plan.md              # This file
├── research.md          # Phase 0 output — technology decisions
├── data-model.md        # Phase 1 output — entity definitions & relationships
├── quickstart.md        # Phase 1 output — validation guide
├── contracts/           # Phase 1 output — API endpoint contracts
│   ├── auth.md
│   ├── organizations.md
│   ├── venues.md
│   ├── roles.md
│   ├── users.md
│   └── invitations.md
└── tasks.md             # Phase 2 output (created by /speckit-tasks)
```

### Source Code (repository root)

```text
apps/
├── api/                           # ASP.NET Core 8 REST API
│   ├── Controllers/               # API controllers (Auth, Orgs, Venues, Roles, Users, Invitations)
│   ├── Data/
│   │   ├── ApplicationDbContext.cs # EF Core DbContext with global query filters
│   │   └── Migrations/            # EF Core migrations
│   ├── DTOs/                      # Request/response data transfer objects
│   ├── Middleware/                 # TenantContext middleware, JWT extraction
│   ├── Models/                    # Entity models (existing + new)
│   ├── Services/                  # Business logic (AuthService, OrgService, InvitationService, etc.)
│   ├── Exceptions/                # Domain exceptions (AuthException, TenantException, etc.)
│   ├── Program.cs                 # App configuration & DI
│   ├── Dockerfile
│   └── split-rail-api.csproj
│
├── api.tests/                     # xUnit test project
│   ├── Integration/               # WebApplicationFactory + Testcontainers tests
│   ├── Unit/                      # Service-layer unit tests
│   └── split-rail-api.tests.csproj
│
└── web/                           # React + Vite + TypeScript (future — not in this feature)
```

**Structure Decision**: Monorepo with `apps/api` (backend) and future `apps/web` (frontend). Test project at `apps/api.tests/` co-located under `apps/` for proximity to the API it tests.

## Complexity Tracking

No constitution violations to justify. All design decisions align with existing patterns.

## Post-Design Constitution Re-Check

| # | Principle | Re-Check | Notes |
|---|-----------|----------|-------|
| II | Multi-Tenant Isolation | PASS | Global query filters on Organization, Venue, OrganizationRole, UserOrganizationMapping, UserVenueScope. `ITenantContext` injects org_id from JWT. Cross-tenant access requires explicit `.IgnoreQueryFilters()`. |
| III | Engineering Rigor | PASS | Test project planned with xUnit + Testcontainers. Integration tests use real PostgreSQL. Coverage target ≥80%. |
| VI | Polyglot Contracts | PASS | All API endpoints use DTOs. Swashbuckle generates OpenAPI spec. Entity models never exposed to clients. |
| VII | EF Core Axioms | PASS | Read queries use `.AsNoTracking()`. Navigation properties loaded via `.Include()`. No lazy loading configured. |
| VIII | Exception Governance | PASS | Domain exceptions: `AuthenticationException`, `AuthorizationException`, `TenantIsolationException`, `LastAdminException`. Structured logging with `ILogger`. PII sanitization in log output. |
