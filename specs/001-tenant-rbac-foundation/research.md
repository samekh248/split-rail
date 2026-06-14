# Research: Top-Level Tenant Foundation & Granular RBAC

**Feature**: 001-tenant-rbac-foundation
**Date**: 2026-06-13

## 1. Authentication Strategy — JWT + BCrypt on ASP.NET Core 8

**Decision**: Use `Microsoft.AspNetCore.Authentication.JwtBearer` for stateless token validation and `BCrypt.Net-Next` for password hashing.

**Rationale**:
- JwtBearer is the first-party ASP.NET Core middleware for validating bearer tokens. It integrates directly with the authorization pipeline (`[Authorize]` attribute) and supports configurable token validation parameters (issuer, audience, lifetime, signing key).
- BCrypt is a purpose-built password hashing algorithm with configurable work factor. Unlike SHA-256 or PBKDF2, BCrypt's cost parameter makes brute-force attacks computationally prohibitive as hardware improves.
- Access tokens are signed with HMAC-SHA256 using a server-side secret. Refresh tokens are opaque random strings stored in the database with expiration tracking.

**Alternatives considered**:
- ASP.NET Identity: Full-featured but heavyweight for this use case. Adds dozens of tables and middleware we don't need. The spec requires a lean, custom RBAC model — not the ASP.NET Identity role/claim system.
- Auth0/Firebase Auth: External IdP adds latency, cost, and vendor lock-in. The spec requires self-hosted auth with full control over the token lifecycle.
- PBKDF2: Viable but BCrypt is more widely adopted for new projects and has a simpler API surface.

**Packages**: `Microsoft.AspNetCore.Authentication.JwtBearer` (8.0.*), `BCrypt.Net-Next` (4.*)

## 2. Token Lifecycle — Access + Refresh Token Pair

**Decision**: Issue a 1-hour JWT access token and a 7-day opaque refresh token on login. Store refresh tokens in a `refresh_tokens` table with user_id, token hash, expiration, and revocation flag.

**Rationale**:
- Per spec FR-004: 1-hour access token, 7-day refresh token.
- Access tokens are stateless JWTs containing `sub` (user_id), `org_id` (active organization), and `exp`. No database lookup required for validation.
- Refresh tokens are hashed before storage (SHA-256) so a database breach doesn't leak usable tokens.
- Token refresh endpoint issues a new access token and rotates the refresh token (old one is revoked).
- Logout revokes all refresh tokens for the user.

**Alternatives considered**:
- Storing access tokens in DB: Defeats the purpose of stateless JWTs. Every request would require a DB lookup.
- Single long-lived token: Violates spec requirements and increases exposure window.

## 3. Tenant Isolation — EF Core Global Query Filters + Middleware

**Decision**: Use EF Core global query filters to automatically append `WHERE organization_id = @orgId` to all tenant-scoped entity queries. Extract `org_id` from the JWT claims via middleware and inject into the DbContext via a scoped `ITenantContext` service.

**Rationale**:
- Constitution II mandates every query must explicitly check organization_id. Global query filters enforce this at the ORM level — developers cannot accidentally write unscoped queries.
- `ITenantContext` is a scoped service populated by middleware on every request. It reads `org_id` from the JWT and makes it available to the DbContext.
- Global filters are applied in `OnModelCreating` for all tenant-scoped entities: Organization (self-filter on Id), Venue, OrganizationRole, UserOrganizationMapping, UserVenueScope.
- Administrative/system queries that need cross-tenant access use `.IgnoreQueryFilters()` explicitly — this makes cross-tenant access auditable and intentional.

**Alternatives considered**:
- Manual WHERE clause on every query: Error-prone, impossible to enforce consistently across a growing codebase.
- Row-Level Security (PostgreSQL RLS): Strong at the DB layer but harder to test, debug, and maintain alongside EF Core. Would require `SET` on every connection which conflicts with connection pooling.
- Schema-per-tenant: Massive operational overhead for a platform expecting <1000 tenants at MVP scale.

## 4. Invitation System — Token-Based Email Invitations

**Decision**: Generate a cryptographically random invitation token (32 bytes, URL-safe base64), store in an `invitations` table with org_id, email, role_id, optional venue_scope_ids, expiration (7 days), and status. Send via email with a link containing the token.

**Rationale**:
- Per spec FR-011: Admins invite by email, assign role and optional venue scope, 7-day expiry, re-sendable.
- Token is hashed (SHA-256) before storage so a database breach doesn't leak usable invitation links.
- Acceptance flow: new user clicks link → validates token → if no account, creates one → maps user to org with assigned role and venue scopes → marks invitation as accepted.
- Re-send generates a new token and resets expiration; old token is invalidated.

**Alternatives considered**:
- Magic link auth: Different use case — magic links replace passwords. We need passwords per spec FR-003.
- Invitation via user ID: Requires the invitee to already have an account, which defeats the onboarding purpose.

## 5. Venue Scoping — Join Table with "No Rows = All Access" Convention

**Decision**: Use the existing `user_venue_scopes` join table. When a user has zero rows in this table for their organization, they have access to all venues. When they have one or more rows, access is restricted to those specific venues.

**Rationale**:
- Per spec FR-010: No explicit venue scope means access to all venues.
- This convention avoids maintaining an "all venues" flag or duplicating venue scope rows on every venue creation.
- Venue-scoped queries: `WHERE venue_id IN (SELECT venue_id FROM user_venue_scopes WHERE user_id = @userId) OR NOT EXISTS (SELECT 1 FROM user_venue_scopes WHERE user_id = @userId)`.
- EF Core implementation: a `VenueScopeFilter` service that builds the expression tree for inclusion in queries.

**Alternatives considered**:
- Boolean `has_all_venue_access` flag: Introduces a second source of truth that can drift out of sync with the scope table.
- Materializing all venue scopes: Requires updating scope rows every time a venue is created, which adds transactional complexity.

## 6. Testing Infrastructure — xUnit + WebApplicationFactory + Testcontainers

**Decision**: Use xUnit as the test framework, `WebApplicationFactory<Program>` for integration tests, and `Testcontainers.PostgreSql` for disposable database instances.

**Rationale**:
- Constitution III mandates xUnit for backend tests and Testcontainers for integration tests.
- `WebApplicationFactory` spins up an in-memory test server with the full ASP.NET Core pipeline — controllers, middleware, DI, EF Core — without needing a separate process.
- `Testcontainers.PostgreSql` provides a real PostgreSQL instance per test run, ensuring migration compatibility and Npgsql-specific behavior is validated.
- Test project: `apps/api.tests/` with `split-rail-api.tests.csproj` referencing the main API project.

**Alternatives considered**:
- In-memory SQLite provider: Fast but doesn't support PostgreSQL-specific features (uuid generation, `gen_random_uuid()`, partial indexes). Would miss real bugs.
- Shared test database: Non-deterministic, requires cleanup, fails in parallel CI.

## 7. Frontend Stack — React + Vite + TypeScript (Deferred Scaffolding)

**Decision**: Frontend is not yet scaffolded. When created, it will use React + Vite + TypeScript at `apps/web/`, with Vitest + React Testing Library for tests.

**Rationale**:
- Constitution III mandates Vitest + React Testing Library for frontend tests.
- Constitution VI mandates auto-generated TypeScript types from swagger — requires NSwag or openapi-typescript to produce `generated-api.ts`.
- Frontend scaffolding is not part of this plan's deliverables but the API contract design must support the future frontend by producing OpenAPI/Swagger specs.

**Alternatives considered**:
- Next.js: SSR adds complexity; this is a SaaS dashboard application where CSR with Vite is simpler and faster to iterate on.
- Angular: Team is invested in React ecosystem per existing constitution.

## 8. OpenAPI Generation — Swashbuckle + NSwag

**Decision**: Use `Swashbuckle.AspNetCore` to generate `swagger.json` from the API at build time. Future frontend will use `openapi-typescript` or NSwag to produce `generated-api.ts`.

**Rationale**:
- Constitution VI mandates all frontend types come from auto-generated swagger output.
- Swashbuckle is the default OpenAPI generator for ASP.NET Core and integrates with `AddEndpointsApiExplorer()` already in `Program.cs`.
- DTOs (Data Transfer Objects) are the contract surface — entities are never exposed directly.

**Alternatives considered**:
- Manual OpenAPI YAML: Error-prone and drifts from implementation.
- gRPC: Overkill for a web dashboard API; no browser-native support without grpc-web proxy.

## 9. Last Admin Protection — Database Constraint + Service Guard

**Decision**: Enforce "last admin" protection in the application service layer with a count check before role change or user removal. Optionally reinforce with a database trigger as a safety net.

**Rationale**:
- Per spec FR-013: System must prevent the last Admin from being removed.
- Service-layer check: before changing a user's role away from Admin or removing a user from an org, count remaining Admin-role users in that org. If count would drop to zero, reject with a domain exception.
- Database trigger (optional hardening): `BEFORE DELETE OR UPDATE ON user_organization_mappings` that raises an exception if the operation would leave zero admin mappings.

**Alternatives considered**:
- Check constraint: PostgreSQL check constraints can't reference other tables, so this isn't feasible at the constraint level.
- Application-only enforcement: Sufficient for MVP, but a trigger adds defense-in-depth.
