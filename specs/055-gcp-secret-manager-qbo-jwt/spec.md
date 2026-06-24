# Feature Specification: Centralized Secret Management for Production Credentials

**Feature Branch**: `055-gcp-secret-manager-qbo-jwt`

**Created**: 2026-06-22

**Status**: Draft

**Input**: Linear [SPLR-48](https://linear.app/audiodex/issue/SPLR-48/wire-gcp-secret-manager-for-qbodbjwt-secrets) — Wire GCP Secret Manager for QBO/DB/JWT secrets. The application reads QuickBooks client credentials, database passwords, and JWT signing keys from plain environment variables; production deploy does not yet source all sensitive values from managed secret storage as required by TDD §7 and Constitution §8.

**Depends on**: SPLR-46 (managed database deploy — partial `DB_PASSWORD` binding exists in production deploy); SPLR-40 (Data Protection key backup — Secret Manager reserved for boot-time application secrets, distinct from encryption key ring storage)

## Overview

Production deployments must not rely on cleartext secrets in committed configuration, container images, or deploy scripts. Today the backend resolves several security-sensitive values from inline configuration or ad hoc environment variables at runtime. Database password injection via managed secret storage was introduced in the Cloud SQL deploy feature, but JWT signing material and QuickBooks OAuth application credentials are not yet fully provisioned and bound through the same production secret-management path.

This feature ensures every security-sensitive credential required for production API operation is stored in the organization's managed secret service, injected into the Cloud Run service at boot, and absent from the repository and deploy artifacts. Local development retains convenient non-production configuration without weakening production controls.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Production Service Boots with All Sensitive Credentials from Managed Secret Storage (Priority: P1)

As the platform owner accountable for production security, I need the API service to receive its database password, JWT signing key, and QuickBooks application credentials from managed secret storage when it starts in production, so that no production secret is baked into images, committed files, or inline deploy environment variables.

**Why this priority**: This is the core gap identified in SPLR-48 and TDD §7. Without centralized secret injection at boot, credential leakage risk remains and rotation requires code or image changes.

**Independent Test**: Deploy (or validate) the production Cloud Run configuration; confirm each required secret is bound from managed secret storage, the service starts successfully, authenticated API requests succeed, and QuickBooks integration can obtain client credentials without reading committed configuration.

**Acceptance Scenarios**:

1. **Given** a production Cloud Run deployment, **When** the service container starts, **Then** database password, JWT signing key, QuickBooks client identifier, and QuickBooks client secret are supplied from managed secret storage rather than inline cleartext deploy values.
2. **Given** the production service is running, **When** a user authenticates and receives an access token, **Then** token validation succeeds using the signing key sourced from secret storage.
3. **Given** the production service is running with a venue configured for QuickBooks, **When** a sync or OAuth flow requires application credentials, **Then** the service resolves QuickBooks client identifier and secret from the injected environment without reading placeholder values from committed configuration files.
4. **Given** a required secret is missing or the service account lacks access, **When** the container starts, **Then** startup fails fast with a diagnosable error and no fallback to hardcoded production secrets.

---

### User Story 2 - Repository and Deploy Artifacts Contain No Production Plaintext Secrets (Priority: P1)

As an engineer reviewing pull requests and deploy scripts, I need assurance that production JWT signing keys, database passwords, and QuickBooks credentials never appear as cleartext in the repository or standard deploy scripts, so that accidental exposure through version control or log output is prevented.

**Why this priority**: SPLR-48 acceptance criteria explicitly require no plaintext secrets in the repo or deploy scripts. This is independently verifiable and blocks compliance with Constitution §8 logging and secret-handling expectations.

**Independent Test**: Run automated repository and deploy-script audits; confirm no production credential literals remain in committed application configuration intended for production, and production deploy bindings reference secret names only.

**Acceptance Scenarios**:

1. **Given** the committed application configuration intended for production, **When** searched for JWT signing key, database password, or QuickBooks client secret placeholders with real values, **Then** no production cleartext secrets are present.
2. **Given** the production deploy script and related deploy contracts, **When** inspected, **Then** sensitive values are referenced by secret name or runtime variable only — not literal passwords or signing keys.
3. **Given** a CI secret-scan or deploy-contract verification step, **When** executed on the main branch, **Then** violations for hardcoded production credentials fail the build.

---

### User Story 3 - Operators Can Rotate Secrets Without Application Code Changes (Priority: P2)

As a platform operator responsible for credential hygiene, I need to rotate JWT signing keys, database passwords, or QuickBooks application secrets in managed secret storage and roll the Cloud Run service, so that credential rotation does not require modifying application source code or rebuilding solely to change secret values.

**Why this priority**: Centralized secret management delivers operational value only if rotation is decoupled from code releases. This validates the production secret-binding model is sustainable.

**Independent Test**: Update a non-production or staging secret version in managed secret storage, redeploy or restart the service with the new secret reference, and confirm the application reads the updated value without code changes.

**Acceptance Scenarios**:

1. **Given** a new secret version is published in managed secret storage, **When** the Cloud Run service is updated to reference the latest version, **Then** the application uses the new credential on next cold start without source changes.
2. **Given** a JWT signing key rotation, **When** the service restarts with the new key, **Then** newly issued tokens validate correctly; previously issued tokens behave according to the platform's documented rotation policy (existing sessions may require re-authentication after rotation).
3. **Given** deploy or startup logs during secret resolution, **When** reviewed, **Then** no cleartext JWT keys, database passwords, QuickBooks client secrets, or OAuth tokens appear (Constitution §8).

---

### Edge Cases

- What happens when only a subset of secrets is bound (e.g., database password present but JWT key missing) — does startup fail before serving traffic?
- What happens when the migration step before Cloud Run deploy needs the database password — is it fetched from managed secret storage for the one-off migration command without writing the password into the deploy script?
- What happens in local development — can engineers continue using development configuration files and local environment variables without requiring production secret access?
- What happens in preview/ephemeral environments — are disposable credentials provisioned separately from production secrets without reusing production secret values?
- What happens when QuickBooks redirect URI or internal trigger values are configuration versus secrets — are non-secret configuration values still supplied as ordinary environment variables?
- What happens when secret access is denied due to IAM misconfiguration — is the error actionable without leaking secret material in logs?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Production Cloud Run deployment MUST bind database password, JWT signing key, QuickBooks client identifier, and QuickBooks client secret from managed secret storage at container boot (TDD §7).
- **FR-002**: The production application MUST resolve JWT signing key from injected secret values in production; committed production-oriented configuration MUST NOT contain a usable signing key literal.
- **FR-003**: The production application MUST resolve QuickBooks OAuth application credentials (client identifier and client secret) from injected secret values in production; committed production-oriented configuration MUST NOT contain usable QuickBooks credential literals.
- **FR-004**: Database password injection for production Cloud Run MUST continue to use managed secret storage (extending the partial implementation from the Cloud SQL deploy feature); cleartext passwords MUST NOT appear in deploy scripts or committed configuration.
- **FR-005**: If any required production secret is unavailable or access is denied at startup, the application MUST fail fast with a diagnosable error and MUST NOT fall back to hardcoded or placeholder production secrets.
- **FR-006**: Deploy pipelines, startup logs, and routine operational output MUST NOT emit cleartext database passwords, JWT signing keys, QuickBooks client secrets, or OAuth tokens (Constitution §8).
- **FR-007**: Local development and automated test environments MAY use non-production configuration sources (development settings, test fixtures, disposable preview credentials) without requiring production secret access.
- **FR-008**: Automated verification MUST assert production deploy bindings for all required secrets and reject committed cleartext production credentials in deploy scripts and production configuration surfaces.
- **FR-009**: System MUST achieve ≥80% line/branch coverage across backend and frontend for this feature (CI-enforced; Constitution III).

### Key Entities

- **Managed Secret**: A named credential stored in the organization's cloud secret service (e.g., JWT signing key, database password, QuickBooks client identifier, QuickBooks client secret); referenced by deploy configuration, not embedded in artifacts.
- **Secret Binding**: The association between an environment variable expected by the application and a managed secret version injected at Cloud Run container startup.
- **Production Application Service**: The Cloud Run-hosted backend running with `Production` environment semantics; subject to full secret-management requirements.
- **Deploy Pipeline**: The scripted sequence that may fetch secrets for one-off steps (e.g., schema migration) and bind secrets for the long-running service without persisting cleartext values in the repository.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of required production sensitive credentials (database password, JWT signing key, QuickBooks client identifier, QuickBooks client secret) are sourced from managed secret storage on Cloud Run startup (verifiable by deploy configuration audit).
- **SC-002**: Zero cleartext production values for the above credentials appear in committed repository files or production deploy scripts (verifiable by automated CI contract tests and secret scanning).
- **SC-003**: Production deploy completes and the API accepts authenticated requests and QuickBooks credential-dependent operations without reading secrets from committed configuration placeholders.
- **SC-004**: Secret resolution or access failures during production startup block the service from serving traffic and produce actionable errors without logging secret material.
- **SC-005**: Operators can rotate at least one managed secret and roll the service to pick up the new version without modifying application source code.
- **SC-006**: ≥80% line/branch coverage achieved across backend and frontend code for this feature (CI-enforced; Constitution III).

## Assumptions

- GCP Secret Manager is the designated managed secret service for this project, consistent with TDD §7, spec 047 research, and existing production `DB_PASSWORD` binding pattern (`db-password` secret).
- Project-standard secret names will follow existing conventions where already established (e.g., `db-password`); additional secrets for JWT and QuickBooks credentials will use stable, documented names provisioned in infrastructure (exact names are an implementation detail left to planning).
- QuickBooks redirect URI and similar non-sensitive OAuth configuration may remain ordinary environment variables; only client identifier, client secret, and other values treated as secrets by Intuit and Constitution §8 are in scope for managed secret storage.
- QuickBooks internal trigger keys used for scheduled sync authentication, if required in production, follow the same managed-secret pattern; preview environments may use disposable values.
- The partial `DB_PASSWORD` Secret Manager binding in `deploy/production/deploy-api.sh` (from spec 053) is the baseline; this feature completes the remaining JWT and QuickBooks bindings and removes production placeholders from committed configuration.
- Data Protection encryption key ring persistence (GCS/KMS, spec 047) remains orthogonal — this feature addresses application boot secrets only.
- Preview deploy may continue using ephemeral credentials for disposable databases; preview is not required to reuse production secret values.
- Web frontend hosting is out of scope — secrets in scope are backend API credentials only.
