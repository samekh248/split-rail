# Feature Specification: Managed Database Provisioning and Schema Migration in Deploy

**Feature Branch**: `053-cloud-sql-ef-migrations`

**Created**: 2026-06-21

**Status**: Draft

**Input**: User description: "Cloud SQL Postgres provisioning + run EF migrations in deploy (SPLR-46) — the preview deploy script deploys Cloud Run with environment variables only; no managed database provisioning and no schema migration step. TDD §7 requires a managed Cloud SQL for PostgreSQL instance, and migrations must run before the app serves traffic."

**Linear**: [SPLR-46](https://linear.app/audiodex/issue/SPLR-46/cloud-sql-postgres-provisioning-run-ef-migrations-in-deploy)

## Overview

The platform's preview and production deployment pipelines currently publish the backend to Cloud Run with environment variables but **do not provision or connect a managed PostgreSQL database** and **do not apply schema migrations** before the application accepts traffic. As a result, preview end-to-end verification (spec 005) cannot reach a fully functional stack, and production releases cannot start against a migrated schema as required by the technical design (TDD §7).

This feature closes that infrastructure gap by ensuring every deploy provisions or connects to the appropriate managed PostgreSQL instance, applies pending schema migrations automatically before traffic is served, and configures secure connectivity and credential handling for both preview and production environments.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Deploy Applies Schema Migrations Before the App Serves Traffic (Priority: P1)

As an engineering lead responsible for release safety, I need every deployment to apply pending database schema migrations before the application begins serving requests, so that the running service always matches the code's data model expectations and avoids runtime failures from missing tables or columns.

**Why this priority**: Without automatic migration application, deploys can succeed while the database schema is stale — causing immediate production or preview failures on first data access. This is the core acceptance criterion from SPLR-46.

**Independent Test**: Trigger a deploy against an environment whose database is one migration behind; confirm migrations run as an explicit deploy step, the application starts only after migrations succeed, and the service responds to health or API requests without schema-related errors.

**Acceptance Scenarios**:

1. **Given** a deploy pipeline run with pending schema migrations, **When** the deploy executes its database preparation step, **Then** all pending migrations are applied to the target database before the application service is marked ready.
2. **Given** migrations complete successfully, **When** the application service starts and receives its first request, **Then** no errors attributable to missing schema objects occur.
3. **Given** a migration step fails (e.g., incompatible schema state), **When** the deploy pipeline evaluates the result, **Then** the deploy fails clearly, the application does not serve traffic against a partially migrated database, and the failure is surfaced in pipeline output.

---

### User Story 2 - Preview Environments Connect to a Disposable Managed Database (Priority: P1)

As a QA engineer running end-to-end tests against ephemeral preview stacks, I need each preview deploy to provision or connect to an isolated managed PostgreSQL database with a migrated schema, so that lifecycle, isolation, and integrity test suites can exercise real persistence instead of failing on missing database connectivity.

**Why this priority**: Spec 005's preview contract explicitly requires an ephemeral database per run ID and migration application before seeding. The current preview script deploys API-only Cloud Run without database wiring — blocking the E2E merge gate.

**Independent Test**: Run the preview deploy script with standard inputs (`GCP_PROJECT`, `GCP_REGION`, `RUN_ID`); confirm a database is available, migrations are applied, seeding succeeds, and `PREVIEW_BASE_URL` returns API responses that require persisted data.

**Acceptance Scenarios**:

1. **Given** a preview deploy with a unique run identifier, **When** the deploy script completes, **Then** the Cloud Run service is configured to connect to a managed PostgreSQL instance appropriate for that preview run.
2. **Given** a successful preview deploy, **When** the seeding endpoint is invoked, **Then** deterministic test data is persisted and retrievable through API calls.
3. **Given** preview teardown runs (including on deploy failure), **When** teardown completes, **Then** ephemeral database resources tied to the run identifier are removed or marked for cleanup without affecting production data.

---

### User Story 3 - Production Deploy Uses Managed Database with Secure Credentials (Priority: P2)

As the platform owner accountable for data security, I need production deployments to connect to the designated managed PostgreSQL instance using credentials stored in secure secret management, so that database passwords never appear in deploy scripts, environment variable dumps, or public configuration artifacts.

**Why this priority**: Production database connectivity is required for TDD §7 but must meet security expectations for credential handling. This story ensures the production path is complete and safe, not only preview.

**Independent Test**: Execute a production-oriented deploy (or dry-run validation of its configuration); confirm the application connects via the managed database connector path, credentials are sourced from secret management rather than inline values, and connection succeeds against the production instance tier specified in TDD §7.

**Acceptance Scenarios**:

1. **Given** a production deploy configuration, **When** the Cloud Run service is deployed, **Then** it is wired to connect to the production managed PostgreSQL instance in the designated region and project.
2. **Given** deploy artifacts and service configuration are inspected, **When** credential values are searched, **Then** no cleartext database passwords appear in scripts, logs, or publicly accessible configuration.
3. **Given** the production application is running after deploy, **When** authenticated API requests requiring persistence are made, **Then** responses succeed against the migrated production schema.

---

### Edge Cases

- What happens when two concurrent preview deploys use different run identifiers — are database resources fully isolated per run?
- What happens when a deploy retries after a partial migration failure — does the pipeline fail safely without leaving the service serving traffic on a broken schema?
- What happens when the managed database instance already exists (production) versus must be created (preview) — does the deploy handle both connect-only and provision paths?
- What happens when migration application takes longer than the default service startup window — is ordering enforced so traffic is not accepted prematurely?
- What happens when secret management values are missing or misconfigured — does the deploy fail fast with an actionable error before migrations run?
- What happens when teardown runs against a preview whose database was never fully provisioned — is teardown idempotent?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The preview deploy pipeline MUST provision or connect to an isolated managed PostgreSQL database for each unique preview run identifier before the application serves traffic.
- **FR-002**: The production deploy pipeline MUST connect the application service to the designated production managed PostgreSQL instance (TDD §7: `us-central1`, entry-tier instance class appropriate for MVP scale).
- **FR-003**: Every deploy pipeline (preview and production) MUST apply all pending schema migrations to the target database as an explicit step that completes before the application service is considered ready.
- **FR-004**: If schema migration application fails, the deploy MUST fail and the application MUST NOT serve traffic against a partially migrated database.
- **FR-005**: The application service MUST connect to the managed database through the platform's supported secure connector mechanism (not a publicly exposed database endpoint).
- **FR-006**: Database credentials MUST be supplied through secure secret management; cleartext passwords MUST NOT appear in deploy scripts, committed configuration, or routine deploy logs.
- **FR-007**: After a successful preview deploy and migration step, the existing preview seeding surface MUST succeed without schema-related errors (aligned with spec 005 preview contract).
- **FR-008**: Preview teardown MUST remove or schedule cleanup of ephemeral database resources associated with the preview run identifier without affecting production database resources.
- **FR-009**: Deploy pipeline steps MUST emit clear, actionable status output when database provisioning, connection configuration, or migration application fails.
- **FR-010**: System MUST achieve ≥80% line/branch coverage across backend and frontend for this feature (CI-enforced; Constitution III).

### Key Entities

- **Managed Database Instance**: A cloud-hosted PostgreSQL instance; production uses the long-lived production instance; preview uses ephemeral or run-scoped instances tied to `RUN_ID`.
- **Schema Migration**: A versioned change to the relational schema maintained by the application's persistence layer; applied in order during deploy.
- **Deploy Run**: A single pipeline execution identified by `RUN_ID` (preview) or a production release identifier; owns the lifecycle of ephemeral resources.
- **Database Credential Secret**: A securely stored username/password or connection secret referenced at deploy time, not embedded in artifacts.
- **Application Service**: The Cloud Run-hosted backend that requires a migrated schema before accepting API traffic.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of successful preview deploys complete schema migration before the seeding endpoint accepts requests (verifiable by pipeline ordering and seed success rate).
- **SC-002**: Preview end-to-end test suites that depend on persisted data (spec 005) can run against a freshly deployed preview without database connectivity or schema errors.
- **SC-003**: Production deploy completes with the application service connected to the managed production database and responding to persistence-dependent API calls within the standard release window (under 10 minutes for database preparation plus service rollout).
- **SC-004**: Zero cleartext production database passwords appear in committed repository files or standard deploy log output (verified by automated secret-scan or configuration audit in CI).
- **SC-005**: Failed migration steps block the merge or release gate — no deploy marked successful when migrations did not complete.
- **SC-006**: Preview teardown removes ephemeral database resources for the run identifier in under 5 minutes when teardown executes (aligned with spec 005 SC-006 expectations).
- **SC-007**: ≥80% line/branch coverage achieved across backend and frontend code for this feature (CI-enforced; Constitution III).

## Assumptions

- The production managed PostgreSQL instance target is `split-rail:us-central1:split-rail-db-prod` with database name `split-rail-db`, as documented in project infrastructure memory; this feature wires deploy pipelines to that instance rather than redefining production topology.
- Preview environments use entry-tier (`db-f1-micro` or equivalent MVP sizing per TDD §7) managed instances or equivalent ephemeral provisioning — cost-conscious sizing acceptable for preview.
- Schema migrations are already authored in the application codebase (Entity Framework Core migrations); this feature does not add new domain tables — it automates applying existing migrations at deploy time.
- The preview deploy script (`deploy/preview/deploy-preview.sh`) and teardown script (`deploy/preview/teardown-preview.sh`) are the primary integration surfaces; production deploy follows parallel conventions under `deploy/production/`.
- Preview continues to use fake QBO connector and test seeding flags as defined in spec 005; this feature adds database layer only.
- Web frontend hosting (Firebase Hosting, spec 052) is out of scope — this feature addresses backend database connectivity for Cloud Run only.

## Dependencies

- **Spec 005** (E2E preview contract): defines ephemeral DB per `RUN_ID`, migration before seeding, and teardown expectations — this feature implements the currently missing database and migration steps.
- **Spec 001** (tenant RBAC foundation): existing EF Core migrations and `ApplicationDbContext` schema are the migration source of truth.
- **Spec 051** (preview Dockerfile.web): preview web image build is independent; API deploy database wiring is the gap addressed here.
- **TDD §7**: mandates managed Cloud SQL PostgreSQL and migration-before-traffic ordering for production.

## Out of Scope

- Authoring new domain schema migrations or data model changes.
- Web frontend Cloud Run deployment or Firebase Hosting configuration.
- Database backup, point-in-time recovery policy, or cross-region failover (operational concerns beyond initial provisioning).
- Local developer database setup (documented separately in feature quickstarts).
- Changing application business logic or API contracts.
