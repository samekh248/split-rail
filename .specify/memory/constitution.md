<!--
Sync Impact Report
- Version: 1.1.0 → 1.2.0 (MINOR: new dual-platform operator script principle)
- Added: §X Dual-Platform Operator Scripts
- Templates: plan-template.md ✅, tasks-template.md ✅, infrastructure.md ✅
- Ratified: 2026-06-13 | Last Amended: 2026-06-22
-->

# Accounting-First Venue Platform Constitution

## Core Principles

### I. Core Mathematical Axioms

- Strictly prohibited from utilizing floating-point operations (`double`, `float`, or JavaScript `number`) for computing or evaluating monetary properties.
- All monetary math operations inside the C# backend layer MUST map strictly to the base-10 native `decimal` system primitive.
- All decimal arithmetic rounding calculations MUST explicitly declare `MidpointRounding.AwayFromZero` precision rules to match traditional professional ledger math patterns.

### II. Multi-Tenant Multi-Venue Isolation Boundary Mandates

- Every data persistence retrieval command, Entity Framework query hook, or raw SQL data command MUST explicitly check context-aware isolation parameters against the current user's authenticated `organization_id`.
- Reject any prompt or attempt to write a query fetching data blocks without an explicit `organization_id` lookup constraint parameter.
- Never write open, unscoped database inquiry operations.

### III. Engineering Rigor and Quality Gates

- No component, route, or application service file is considered complete unless accompanied by an explicit automated verification block.
- Backend additions must be verified via xUnit unit tests or xUnit WebApplicationFactory database integration loops using Testcontainers.
- Frontend interface components must use Vitest + React Testing Library.
- Multi-user workflows and tenant isolation validations require a Playwright E2E spec script tracking real login interception states.
- Global coverage metrics MUST equal or exceed 80.0% to bypass the continuous integration build check blocks.

### IV. QuickBooks Online Integration and Synchronization Boundaries

- STRICTLY prohibited from generating any C# methods, endpoint routes, or utility functions that attempt to perform HTTP POST, PUT, or DELETE mutations against the Intuit QuickBooks Online API endpoints.
- The application integration model is completely read-only. The Intuit request context must remain isolated to data parsing.
- Synced data blocks committed to `financial_line_items.qbo_actual_value` must be treated as append-only. Never generate code that deletes, overrides, or alters historical ledger entries directly. Corrections must be handled exclusively through additional offset balancing entries.

### V. Ledger State Machine and Immutability Guardrails

- If a method, query, or data command alters a record inside `events`, `event_artists`, or `financial_line_items`, MUST explicitly prepend a state-validation conditional block.
- If the target show status equals `event_status.SETTLED` or `event_status.RECONCILED`, the execution track MUST instantly throw an explicit, unswallowed `InvalidOperationException` or return an HTTP 400 Bad Request.
- Never generate an entry path or update override routine that allows financial records to drift out of synchronization with the server-rendered `settlement_pdf_url` binary snapshot.

## Contract and Serialization Governance

### VI. Polyglot Contract and Model Serialization

- STRICTLY prohibited from manually defining or hardcoding TypeScript interfaces, types, or object schemas inside the `/apps/web` directory that mirror API payloads or data models.
- All frontend data contracts MUST be imported directly from the automatically compiled `/apps/web/src/types/generated-api.ts` spec directory.
- If an API payload change is required, implement it inside the C# ASP.NET Core Data Transfer Object (DTO) model first, compile the project to regenerate the `swagger.json` metadata specification, and allow the spec-kit runner to cascade type updates down to the frontend.

### VII. Database Persistence & Entity Framework Core Axioms

- When writing queries to pull financial data via Entity Framework Core, strictly prohibited from utilizing lazy-loading models.
- MUST explicitly declare eager-loading compilation strings utilizing the `.Include()` and `.ThenInclude()` LINQ methods to aggregate parent Organizations, child Venues, Events, and Line Items cleanly into a single, optimized SQL query loop.
- All data-fetching transactions targeted for dashboard rendering or ledger grid display must append `.AsNoTracking()` to the execution context to bypass memory-allocation overhead and maximize query throughput.

## Exception Governance and Logging Privacy

### VIII. Financial Exception Governance

- Strictly prohibited from implementing empty catch blocks or throwing generic base-type `System.Exception` errors within core financial processing paths.
- All data pipeline failures, QBO token authentication drops, and custom formula parsing errors must be explicitly captured, wrap the contextual root failure, and throw a granular domain exception.
- When generating structured application logs destined for GCP Cloud Logging, MUST sanitize output payloads. Strictly prohibited from writing cleartext user PII, QuickBooks access tokens, refresh tokens, client secrets, or raw cryptographic database connection handle strings to the logging stream.

## Governance

- This constitution supersedes all other development practices and AI-generated suggestions.
- All pull requests, code reviews, and AI-generated code must verify compliance with every section above.
- Amendments require documentation of the change rationale, team approval, and a migration plan for existing code that may be affected.
- The Spec-Driven Development (SDD) lifecycle (`specify → plan → tasks → implement → verify`) is the mandatory workflow for all feature development.
- Architecture Guard and CI Guard extensions enforce compliance automatically during the development loop.

### IX. UI Iconography (Font Awesome Free)

- Frontend UI MUST use **Font Awesome Free** icons (`@fortawesome/free-solid-svg-icons`, `@fortawesome/react-fontawesome`) wherever a suitable standard icon exists.
- STRICTLY prohibited from introducing hand-drawn SVG icons, Unicode symbol placeholders, or ad-hoc letter glyphs for navigation and common controls when a free Font Awesome equivalent is available.
- Icon imports MUST be tree-shaken per-icon from free packages only; paid Pro icon packages require explicit approval.
- See `.specify/memory/iconography.md` for setup, exceptions, and reference mappings (e.g. navigation pin/unpin → `faThumbtack` / `faThumbtackSlash`).

### X. Dual-Platform Operator Scripts

- Any operator-facing script under `deploy/` that must be run manually or from CI/CD (provisioning, validation, migration, deploy, teardown) MUST ship as a **paired implementation**: a Bash script (`.sh`) for Linux/macOS/CI runners and a PowerShell script (`.ps1`) for Windows.
- Paired scripts MUST expose equivalent behavior, environment variables, and exit-code semantics; documentation (spec `quickstart.md`, `plan.md`, `.specify/memory/infrastructure.md`) MUST reference both entry points.
- Shared logic SHOULD be extracted into dot-sourced libraries (`deploy/lib/*.sh` and `deploy/lib/*.ps1`) rather than duplicating business rules inline.
- PowerShell scripts MUST begin with `#Requires -Version 5.1`, set `$ErrorActionPreference = 'Stop'`, and use the shared `deploy/lib/gcloud-invoke.ps1` helpers for `gcloud` calls where applicable.
- Bash scripts MUST use `set -euo pipefail` and MUST NOT echo cleartext secrets (see §VIII).
- Features that add a new runnable deploy script MUST include automated contract verification that both variants exist and remain behaviorally aligned (Constitution III).
- **Exempt**: one-off smoke helpers invoked only inside Docker/Linux CI with no Windows operator path, and generated artifacts — exemptions MUST be documented in the feature spec Assumptions section.

**Version**: 1.2.0 | **Ratified**: 2026-06-13 | **Last Amended**: 2026-06-22