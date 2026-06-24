# Feature Specification: Scheduled QBO Sync Trigger for Deployed Environments

**Feature Branch**: `057-qbo-scheduler-oidc-sync`

**Created**: 2026-06-22

**Status**: Draft

**Input**: Linear [SPLR-49](https://linear.app/audiodex/issue/SPLR-49/cloud-scheduler-6-hour-oidc-trigger-for-qbo-sync) — Cloud Scheduler 6-hour OIDC trigger for QBO sync. The application exposes an internal sync trigger route and disables the in-process timer in production, but no external scheduler is configured to invoke it. TDD §5/§7 require a managed scheduler to fire an authenticated request to the sync route every 6 hours.

**Depends on**: QuickBooks Online pull cache & inline mapping (SPLR-18 / specs 003), GCP secret management for QBO/JWT (SPLR-48 / specs 055)

## Overview

Accounting teams rely on periodic QuickBooks Online (QBO) transaction ingestion to keep ledger actuals current against cleared bank data. The platform already supports a 6-hour sync cycle in development via an in-process timer and exposes a dedicated internal trigger route for production, where the in-process timer is intentionally disabled. However, **no managed scheduler is provisioned** in deployed environments to invoke that route — meaning production and non-preview deployments never receive automated QBO syncs unless a user manually triggers one.

This feature closes that operational gap by provisioning a managed 6-hour scheduler job in deployed environments, securing the internal trigger so only the scheduler's authorized identity can invoke it, and providing repeatable infrastructure definitions so the job can be created consistently across development and production targets.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Automated QBO Sync Runs Every 6 Hours in Deployed Environments (Priority: P1)

As an accounting manager using the platform in a deployed environment, I need QBO transaction ingestion to run automatically on a 6-hour cadence without manual intervention, so that ledger actuals stay reasonably current between live auditing sessions and I do not depend on someone clicking "Sync Now."

**Why this priority**: Without automated scheduling, the core read-only QBO integration delivers no ongoing value in production. This is the primary gap identified in SPLR-49 and the central TDD §5/§7 requirement.

**Independent Test**: Deploy to a non-local environment with QBO credentials configured; wait for or simulate a scheduled trigger at the 6-hour interval; confirm eligible events receive a sync and QBO actuals update without any user action.

**Acceptance Scenarios**:

1. **Given** a deployed environment (development or production) with active QBO connections, **When** the 6-hour schedule elapses, **Then** the internal sync trigger is invoked and eligible events are synchronized.
2. **Given** the in-process sync timer is disabled in production, **When** the managed scheduler fires, **Then** the same sync logic used for manual triggers executes successfully.
3. **Given** a deployed environment where no QBO venues are connected, **When** the scheduler fires, **Then** the trigger completes without error and reports zero events synced (no spurious failures).
4. **Given** local development with the in-process timer enabled, **When** a developer works locally, **Then** automated sync behavior is unchanged and does not require managed scheduler provisioning.

---

### User Story 2 - Internal Sync Trigger Rejects Unauthorized Callers (Priority: P1)

As the platform owner accountable for integration security, I need the internal sync trigger to accept requests only from the authorized scheduler identity, so that external actors cannot force expensive or abusive sync operations against customer QBO data.

**Why this priority**: An unauthenticated or weakly authenticated internal route is a security and reliability risk. SPLR-49 explicitly requires locking the endpoint to the scheduler's service identity.

**Independent Test**: Attempt to invoke the internal sync trigger without the scheduler's authorized identity; confirm rejection. Invoke with the authorized identity; confirm acceptance and sync execution.

**Acceptance Scenarios**:

1. **Given** a request to the internal sync trigger from the authorized scheduler identity, **When** the request is processed, **Then** the sync is accepted and runs.
2. **Given** a request to the internal sync trigger with no valid scheduler identity (anonymous, user session token, or arbitrary shared secret), **When** the request is processed, **Then** the system rejects it without executing a sync.
3. **Given** an unauthorized trigger attempt, **When** the rejection occurs, **Then** no QBO API calls are made and no sync-side effects occur.
4. **Given** deploy configuration is inspected, **When** credential or identity values are reviewed, **Then** no long-lived shared secrets required solely for scheduler authentication appear in cleartext in scripts, logs, or publicly accessible artifacts.

---

### User Story 3 - Scheduler Job Is Provisioned via Repeatable Infrastructure (Priority: P2)

As a platform operator responsible for environment consistency, I need the 6-hour scheduler job to be created through repeatable, version-controlled infrastructure definitions, so that every environment can be provisioned identically and the schedule can be audited, updated, or recreated without manual console steps.

**Why this priority**: Manual one-off scheduler setup drifts across environments and cannot be verified in deploy pipelines. SPLR-49 scope explicitly includes IaC/script for the job.

**Independent Test**: Apply infrastructure definitions to a clean target environment; confirm the scheduler job exists with a 6-hour cadence targeting the internal sync trigger URL; re-apply unchanged definitions and confirm idempotent behavior.

**Acceptance Scenarios**:

1. **Given** infrastructure definitions are applied to a target deployed environment, **When** provisioning completes, **Then** a scheduler job exists with a 6-hour recurrence targeting the internal sync trigger route on the deployed application service.
2. **Given** the scheduler job is provisioned, **When** its authentication configuration is reviewed, **Then** it uses the designated scheduler service identity (OIDC) rather than a static shared key.
3. **Given** infrastructure definitions are re-applied without configuration changes, **When** the apply operation completes, **Then** the existing scheduler job remains correctly configured (idempotent, non-destructive).
4. **Given** an operator runs infrastructure validation as part of deploy or CI, **When** the scheduler job is missing, misconfigured, or points to the wrong target URL, **Then** validation fails with an actionable message.

---

### Edge Cases

- **Scheduler fires during an in-flight sync**: A trigger received while a previous sync is still running must not cause concurrent duplicate sync batches for the same scope; the system should debounce, queue, or no-op safely.
- **Application service scaled to zero**: The scheduler trigger must reach a running application instance; if the service is cold-starting, the trigger should either retry within scheduler limits or surface a failure that does not silently drop the sync cycle.
- **QBO token refresh failure at scheduled time**: Sync failures due to expired or revoked QBO credentials must produce structured, sanitized logs (no cleartext tokens) and must not crash the application or leave partial inconsistent state.
- **Environment without QBO configured**: Scheduled triggers in environments with no connected venues must complete gracefully with zero events synced.
- **Preview/ephemeral deployments**: Preview stacks may omit the managed scheduler if they rely on manual or in-process sync for short-lived runs; non-preview development and production targets must have the scheduler provisioned.
- **Clock skew and schedule drift**: The 6-hour cadence must be consistent across re-provisions; changing infrastructure definitions must not accidentally create duplicate scheduler jobs targeting the same route.
- **Cross-environment isolation**: Development scheduler jobs must target development application endpoints only; production jobs must not reference development URLs.

## Requirements *(mandatory)*

### Functional Requirements

#### Scheduled Sync Operations

- **FR-001**: Deployed non-preview environments (development and production) MUST have an automated mechanism that invokes the internal QBO sync trigger on a **6-hour** recurrence aligned with the existing sync interval configuration.
- **FR-002**: Each scheduled invocation MUST execute the same sync logic used by the internal trigger route — syncing all eligible events across connected venues — without requiring user authentication or manual action.
- **FR-003**: Local development environments MAY continue using the in-process sync timer; managed scheduler provisioning is required for deployed non-preview targets only.
- **FR-004**: When a scheduled sync finds no eligible events or no connected QBO venues, the trigger MUST complete successfully with a zero-count result rather than failing.

#### Trigger Endpoint Security

- **FR-005**: The internal sync trigger MUST accept requests only from the authorized scheduler service identity using platform-managed OIDC authentication.
- **FR-006**: The internal sync trigger MUST reject requests that lack a valid scheduler identity, including anonymous requests, end-user session tokens, and unauthorized shared secrets.
- **FR-007**: Unauthorized trigger attempts MUST NOT initiate QBO API calls or produce sync side effects.
- **FR-008**: Authentication configuration for the scheduler identity MUST NOT expose long-lived secrets in cleartext deploy artifacts, pipeline logs, or publicly accessible configuration (Constitution §VIII).

#### Infrastructure Provisioning

- **FR-009**: System MUST provide repeatable, version-controlled infrastructure definitions that provision the 6-hour scheduler job for each deployed non-preview environment.
- **FR-010**: Provisioned scheduler jobs MUST target the correct internal sync trigger URL for the corresponding environment's application service.
- **FR-011**: Provisioned scheduler jobs MUST authenticate using the designated scheduler service identity (OIDC), not a static shared key as the primary production authentication mechanism.
- **FR-012**: Infrastructure apply operations MUST be idempotent: re-applying unchanged definitions does not create duplicate jobs or weaken authentication settings.
- **FR-013**: Deploy or CI validation MUST detect missing, misconfigured, or cross-environment-mismatched scheduler jobs and fail with actionable errors.

#### Quality & Observability

- **FR-014**: Scheduled sync executions MUST produce structured logs sufficient for operators to confirm success, failure, and events-synced counts without exposing cleartext QBO tokens or user PII (Constitution §VIII).
- **FR-015**: System MUST achieve ≥80% line/branch coverage across backend and frontend for this feature (CI-enforced; Constitution III).

### Key Entities

- **Scheduler Job**: A managed recurring job that fires every 6 hours, targets the internal sync trigger URL, and authenticates with a designated service identity.
- **Scheduler Service Identity**: The authorized platform identity whose OIDC tokens the application accepts for internal sync triggers.
- **Internal Sync Trigger**: The non-user-facing route that initiates a full eligible-event QBO sync when invoked by an authorized caller.
- **Sync Execution Record** (logical): The outcome of a single trigger invocation — success or failure, count of events synced, and timestamp — observable via logs and monitoring.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In deployed non-preview environments, QBO actuals update from automated sync at least once per 6-hour window without manual user action, verifiable by comparing ledger timestamps or sync logs across two consecutive schedule intervals.
- **SC-002**: 100% of unauthorized attempts to invoke the internal sync trigger are rejected before any QBO API activity occurs, verifiable by security integration tests.
- **SC-003**: Operators can provision or verify the scheduler job for a target environment using only version-controlled infrastructure definitions, with no manual console-only steps required for initial setup.
- **SC-004**: Re-applying unchanged infrastructure definitions produces no duplicate scheduler jobs and does not alter the 6-hour cadence or authentication binding.
- **SC-005**: Scheduled sync failures (e.g., QBO credential issues) are detectable in operational logs within one schedule interval, with sanitized error context and no cleartext secrets.
- **SC-006**: ≥80% line/branch coverage achieved across backend and frontend code for this feature (CI-enforced; Constitution III).

## Assumptions

- The internal sync trigger route and `QboSyncService` orchestration logic already exist (specs 003); this feature adds external scheduling and hardens authentication — it does not redesign the ingestion pipeline.
- The in-process sync timer remains disabled in production as currently configured; the managed scheduler replaces that timer for deployed environments.
- TDD §5/§7 mandate a 6-hour cadence; no configurable interval is required beyond alignment with the existing `IntervalHours` default of 6.
- Preview/ephemeral deployments may omit managed scheduler provisioning when their short lifespan makes automated sync unnecessary; development and production deployed targets are in scope.
- A dedicated scheduler service identity per environment (or per project) is acceptable; cross-environment identity sharing is out of scope.
- The application service URL for each environment is known at infrastructure apply time (from existing deploy outputs or configuration).
- Replacing or supplementing any interim shared-key authentication on the internal trigger with OIDC scheduler identity is in scope for this feature.
- Operator-facing provisioning scripts follow Constitution §X dual-platform requirements (paired Bash and PowerShell) when added under `deploy/`.
