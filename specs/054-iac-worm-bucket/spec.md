# Feature Specification: Infrastructure-as-Code for Settlement Archive Storage

**Feature Branch**: `054-iac-worm-bucket`

**Created**: 2026-06-21

**Status**: Draft

**Input**: Linear [SPLR-47](https://linear.app/audiodex/issue/SPLR-47/infrastructure-as-code-for-cloud-storage-worm-bucket) — Infrastructure-as-code for Cloud Storage WORM bucket. There is no deploy/IaC config for the settlement PDF bucket; preview uses an in-memory store. TDD §7 requires a cloud object storage bucket with a strict Object Retention Policy (WORM). Pairs with WORM enforcement/verification (SPLR-43 / specs 050).

**Depends on**: Night-of settlement freeze pipeline (SPLR-19 / specs 004), atomic settle pipeline (SPLR-38 / specs 043)

**Pairs with**: GCS WORM retention enforcement (SPLR-43 / specs 050) — application-level retention metadata, overwrite prevention, and immutability tests

## Overview

Settlement PDFs are legally defensible financial records that must be stored in tamper-proof archive storage with a strict retention lock (TDD §7, PRD §5.1). The application already implements stage → commit → promote archive flows and can enforce per-object retention when a real bucket exists (specs 043, 050), but **no repeatable infrastructure provisioning** exists for the settlement archive buckets. Preview deployments use an in-memory archive store, and production archive storage is documented but not codified in deployable infrastructure.

This feature closes that gap by providing repeatable, version-controlled infrastructure definitions that provision environment-appropriate settlement archive and staging buckets, apply the required WORM retention policy on archive buckets, and wire non-preview application deployments to use the real storage backend instead of in-memory substitutes.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Settlement Archive Buckets Are Provisioned via Repeatable Infrastructure (Priority: P1)

As a platform operator responsible for compliance-ready infrastructure, I need settlement archive storage to be created through repeatable, version-controlled infrastructure definitions that apply a strict Object Retention / Bucket Lock policy, so that every environment can be reprovisioned consistently and audit reviewers can trace bucket configuration back to source control rather than manual console changes.

**Why this priority**: Without codified infrastructure, WORM compliance depends on one-off manual setup that drifts across environments and cannot be verified in deploy pipelines. This is the core gap identified in SPLR-47 and a prerequisite for production-grade settlement archiving.

**Independent Test**: Apply the infrastructure definitions to a clean target project or environment; confirm archive bucket(s) exist with Object Retention / Bucket Lock enabled for the configured retention period, standard storage class, encryption at rest, and private access (no public read).

**Acceptance Scenarios**:

1. **Given** infrastructure definitions are applied to a target environment, **When** provisioning completes, **Then** a dedicated settlement **archive** bucket exists with Object Retention / Bucket Lock enforcing a minimum 7-year retention period aligned with specs 004.
2. **Given** archive bucket provisioning completes, **When** bucket security settings are reviewed, **Then** the bucket uses standard storage class, server-side encryption at rest, and denies public access; authorized reads occur only via private object access and short-lived signed URLs (spec 004).
3. **Given** infrastructure definitions are re-applied without configuration changes, **When** the apply operation completes, **Then** existing bucket retention and lock settings remain intact (idempotent, non-destructive to locked objects).
4. **Given** a separate **staging** bucket is provisioned for in-flight finalize uploads (specs 043), **When** its configuration is reviewed, **Then** it does **not** carry the WORM retention lock so staged objects remain deletable for orphan cleanup.

---

### User Story 2 - Non-Preview Deployments Use Real Archive Storage (Priority: P1)

As an engineering lead validating settlement behavior outside preview, I need development and production deployments to read and write settlement PDFs against the provisioned cloud archive storage (not an in-memory substitute), so that finalize, promote, signed-URL retrieval, and immutability behavior reflect real storage semantics before production release.

**Why this priority**: SPLR-47 acceptance criteria require the application (non-preview) to write and read-sign against the real bucket. In-memory storage hides retention, promotion, and signed-URL integration failures until production.

**Independent Test**: Deploy the API to a non-preview environment with infrastructure-provisioned buckets configured; finalize a settlement (or run archive integration tests against the configured backend); confirm the PDF is staged, promoted to the archive bucket, and retrievable via signed URL.

**Acceptance Scenarios**:

1. **Given** a non-preview deployment (development or production) with archive storage configured, **When** a settlement is finalized successfully, **Then** the archived PDF object exists in the provisioned archive bucket at the expected path referenced by the event record.
2. **Given** a finalized settlement in a non-preview environment, **When** an authorized user requests PDF access, **Then** the system generates a short-lived signed URL against the real archive bucket and the PDF downloads successfully.
3. **Given** preview deployments that intentionally use an in-memory archive store for ephemeral testing, **When** preview runs, **Then** preview behavior is unchanged and does not require WORM bucket provisioning for every ephemeral run.
4. **Given** archive storage configuration is missing or points to a non-existent bucket in a non-preview environment, **When** the application starts or a finalize is attempted, **Then** the failure is surfaced clearly rather than silently falling back to in-memory storage.

---

### User Story 3 - Environment-Isolated Buckets with Consistent Security Baseline (Priority: P2)

As the platform owner accountable for data isolation, I need separate settlement archive and staging buckets for development, preview (when used), and production environments, all sharing the same security baseline, so that test data and production legal records never share storage namespaces and environment-specific misconfiguration is detectable.

**Why this priority**: Linear scope explicitly requires separate dev/preview/prod buckets. Isolation prevents accidental cross-environment reads, overwrites, or retention-policy testing against production artifacts.

**Independent Test**: Inspect provisioned buckets per environment; confirm distinct bucket identities, consistent encryption and access controls, and environment-specific configuration bindings in deploy artifacts.

**Acceptance Scenarios**:

1. **Given** infrastructure is applied for development, preview, and production targets, **When** bucket inventories are compared, **Then** each environment has distinct archive and staging bucket identities with no shared object namespace.
2. **Given** deploy configuration for any non-production environment, **When** bucket names and credentials are inspected, **Then** production archive bucket identifiers are not referenced as the active target.
3. **Given** infrastructure definitions encode the 7-year retention requirement, **When** any environment's archive bucket is provisioned, **Then** the configured retention duration matches the canonical 7-year requirement from specs 004 (not a shorter incidental default).
4. **Given** an operator runs infrastructure validation as part of deploy or CI, **When** a bucket lacks required retention lock or public access is enabled, **Then** validation fails with an actionable message before the environment is considered ready.

---

### Edge Cases

- **Bucket Lock irreversibility**: Once Bucket Lock is applied in production, retention duration reductions are impossible; infrastructure definitions must treat production lock settings as deliberate and document operational constraints in planning artifacts.
- **Pre-existing manually created buckets**: Infrastructure apply must either adopt existing compliant buckets safely or fail with guidance when manual configuration conflicts with required retention policy.
- **Preview ephemeral runs**: Preview may continue using in-memory storage for cost/simplicity; optional preview-specific buckets may be provisioned when preview needs real storage for targeted integration tests — preview bucket provisioning is secondary to dev/prod readiness.
- **Staging orphan cleanup**: Staging buckets must remain outside WORM lock; infrastructure must not apply Object Retention / Bucket Lock to staging buckets.
- **Application–infrastructure retention mismatch**: If infrastructure retention period and application-configured retention duration diverge, non-preview startup or health validation must detect the mismatch (aligned with specs 050 FR-007).
- **Credential and signed-URL secrecy**: Infrastructure and deploy outputs must not expose long-lived service account keys or signed URL secrets in public logs or unprotected artifacts (Constitution §8).
- **Concurrent infrastructure apply**: Repeated or parallel applies from CI must be safe and idempotent without weakening lock settings.

## Requirements *(mandatory)*

### Functional Requirements

#### Infrastructure Provisioning

- **FR-001**: System MUST provide repeatable, version-controlled infrastructure definitions that provision settlement **archive** buckets with Object Retention / Bucket Lock enforcing a minimum **7-year** retention period (aligned with specs 004).
- **FR-002**: System MUST provide repeatable infrastructure definitions that provision separate **staging** buckets for in-flight finalize uploads without WORM retention locks (aligned with specs 043).
- **FR-003**: Provisioned archive buckets MUST use standard storage class, server-side encryption at rest, and private access controls (no public read); authorized retrieval remains via application-generated signed URLs.
- **FR-004**: Infrastructure definitions MUST support distinct archive and staging buckets for **development**, **preview** (when real storage is used), and **production** environments without shared object namespaces.
- **FR-005**: Infrastructure apply operations MUST be idempotent: re-applying unchanged definitions does not weaken retention locks or expose buckets to public access.

#### Application & Deploy Integration

- **FR-006**: Non-preview deployments (development and production) MUST configure the application to use the provisioned real archive and staging buckets for settlement PDF stage, promote, and signed-URL operations — not in-memory substitutes.
- **FR-007**: Preview deployments MAY continue using in-memory archive storage; when preview is configured to use real storage, it MUST target preview-isolated buckets only.
- **FR-008**: Non-preview application startup or deploy validation MUST fail fast when required archive or staging bucket configuration is missing, inaccessible, or fails retention-policy validation (consistent with specs 050).
- **FR-009**: Deploy and infrastructure artifacts MUST bind each environment to its correct bucket identifiers and service identity without embedding cleartext long-lived credentials in scripts or public configuration.

#### Verification & Quality

- **FR-010**: System MUST include automated verification (CI check, infrastructure validation script, or integration test) that asserts provisioned archive buckets have active retention lock policy and deny public access.
- **FR-011**: System MUST include automated or scripted verification that non-preview configuration references real bucket targets and that staging buckets are not retention-locked.
- **FR-012**: System MUST achieve ≥80% line/branch coverage across backend and frontend for application code changed by this feature (CI-enforced; Constitution III). Infrastructure-as-code modules may be validated by scripted checks; primary application-path coverage applies to any archive configuration or startup validation code touched.

### Key Entities *(include if feature involves data)*

- **Settlement Archive Bucket**: Environment-specific WORM-protected bucket storing finalized settlement PDFs; enforces Object Retention / Bucket Lock for 7 years; private access with signed-URL reads.
- **Settlement Staging Bucket**: Environment-specific deletable bucket for in-flight finalize uploads prior to promote; no retention lock.
- **Infrastructure Definition Set**: Version-controlled provisioning source (e.g., Terraform module or equivalent repeatable scripts) describing bucket resources, retention policy, encryption, IAM bindings, and environment parameters.
- **Environment Storage Binding**: Deploy-time mapping linking an environment (dev, preview, prod) to its archive bucket, staging bucket, retention duration, and application service identity for read/write/sign operations.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of target environments (development, production) have archive buckets provisioned via repeatable infrastructure definitions with Object Retention / Bucket Lock active for the 7-year retention period (verified by automated or scripted validation).
- **SC-002**: 100% of target environments have distinct staging buckets provisioned without WORM retention locks (verified by validation checks).
- **SC-003**: 100% of non-preview deployment configurations reference real archive and staging buckets; 0 non-preview environments silently use in-memory archive storage (verified by configuration audit and integration test).
- **SC-004**: 100% of successful settlement finalizations in non-preview environments produce retrievable archive objects in the provisioned archive bucket (verified by integration or smoke test).
- **SC-005**: 100% of infrastructure validation runs fail when archive buckets lack retention lock or allow public access (verified by negative test cases in CI or validation scripts).
- **SC-006**: Re-applying infrastructure definitions without changes completes successfully without altering retention lock duration or public access posture (verified by idempotency check).
- **SC-007**: ≥80% line/branch coverage achieved across backend application code touched by this feature (CI-enforced; Constitution III).

## Assumptions

- Settlement freeze (specs 004), atomic settle staging/promote (specs 043), and application-level WORM enforcement (specs 050) are implemented or in progress; this feature provisions the storage layer those features depend on.
- The canonical retention period remains **7 years** per specs 004; production archive bucket naming follows project convention (`split-rail-settlements-prod` or equivalent documented in infrastructure memory).
- Preview deployments may retain in-memory archive storage for ephemeral cost and simplicity; dev and production are the mandatory targets for real bucket wiring per SPLR-47 acceptance criteria.
- Infrastructure tooling choice (Terraform vs. scripted provisioning) is deferred to implementation planning; this spec requires **repeatable, version-controlled** outcomes, not a specific tool.
- IAM and workload identity bindings granting the application service read/write/sign access to environment buckets are included in scope as part of provisioning, coordinated with existing Cloud Run deploy patterns (similar to specs 053).
- Native mobile apps, settlement PDF rendering logic, and QBO integration are out of scope.
- Frontend changes are not expected unless error display for storage misconfiguration requires adjustment; primary scope is infrastructure provisioning and backend/deploy configuration.
