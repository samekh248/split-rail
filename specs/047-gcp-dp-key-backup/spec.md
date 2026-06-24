# Feature Specification: Back Data Protection Keys with Managed Cloud Secret Storage

**Feature Branch**: `047-gcp-dp-key-backup`

**Created**: 2026-06-21

**Status**: Draft

**Input**: Linear [SPLR-40](https://linear.app/audiodex/issue/SPLR-40/back-data-protection-keys-with-gcp-secret-manager-kms) — Back Data Protection keys with GCP Secret Manager / KMS. QBO OAuth tokens are encrypted at rest, but the encryption key ring is stored on the local filesystem. In a scale-to-zero, multi-instance production deployment this causes key loss across restarts and instances, breaking token decryption and violating planned security controls (TDD §5, Constitution §8).

**Depends on**: SPLR-18 (QBO Pull Cache & Inline Mapping — token encryption at rest)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - QBO connections survive service restarts (Priority: P1)

An accounting manager has connected their venue's QuickBooks Online account. After the platform is redeployed, scaled to zero and back up, or restarted for maintenance, scheduled and manual QBO syncs continue to work without requiring the manager to re-authenticate.

**Why this priority**: Without durable encryption keys, every restart invalidates stored QBO tokens and breaks the core read-only accounting integration. This is the primary production failure mode today.

**Independent Test**: Store encrypted QBO tokens, restart the application (or simulate a cold start), trigger a sync, and confirm tokens decrypt and sync completes successfully without a new OAuth flow.

**Acceptance Scenarios**:

1. **Given** a venue with valid encrypted QBO tokens stored, **When** the application process restarts, **Then** the next sync decrypts those tokens and completes without re-authorization.
2. **Given** encrypted tokens were written before restart, **When** the application reads them after restart, **Then** decrypted values match the original token material (round-trip integrity).
3. **Given** token decryption fails because keys are unavailable, **When** a sync is attempted, **Then** the system surfaces a clear operational error and does not log cleartext token material.

---

### User Story 2 - Multiple application instances share one encryption key ring (Priority: P2)

When the platform runs more than one application instance concurrently (typical for Cloud Run under load), any instance can decrypt tokens that were encrypted by another instance. OAuth callbacks, scheduled syncs, and manual syncs behave consistently regardless of which instance handles the request.

**Why this priority**: Multi-instance production is required for availability and autoscaling. Instance-local key storage causes split-brain encryption where tokens written on one instance cannot be read on another.

**Independent Test**: Encrypt tokens on instance A, read and decrypt the same records from instance B (or a second test host configured with the same shared key backing store), and confirm successful decryption and sync.

**Acceptance Scenarios**:

1. **Given** instance A encrypts and persists QBO tokens, **When** instance B handles a sync for the same venue, **Then** instance B decrypts the tokens successfully.
2. **Given** two instances start concurrently on a fresh deployment, **When** both initialize the encryption key ring, **Then** they converge on a single shared key ring without corrupting existing encrypted data.
3. **Given** a new instance joins an existing deployment, **When** it loads the shared key ring, **Then** all previously encrypted QBO tokens remain decryptable.

---

### User Story 3 - Production excludes encryption keys from ephemeral local disk (Priority: P3)

Platform operators deploy to production knowing that encryption key material is not written to ephemeral container-local storage. Key persistence and access follow the organization's managed cloud secret and key-management controls.

**Why this priority**: Local filesystem key storage is acceptable for local development but is not production-grade for a regulated financial integration. This story closes the security gap called out in TDD §5 and Constitution §8.

**Independent Test**: Deploy to a production-like environment, perform encrypt/decrypt operations, and verify no encryption key files appear on the container's local ephemeral filesystem while operations succeed via the managed backing store.

**Acceptance Scenarios**:

1. **Given** a production deployment, **When** the application encrypts or decrypts QBO tokens, **Then** no encryption key ring files are created on ephemeral local disk.
2. **Given** production infrastructure provisions secret and key-management resources, **When** the application starts, **Then** required secret references are resolved at boot without embedding key material in container images or plain configuration files.
3. **Given** an operator audits production storage, **When** they inspect the backing store, **Then** encryption keys are protected by managed cloud access controls and encryption-at-rest policies.

---

### Edge Cases

- **First deploy with no existing key ring**: The system creates an initial key ring in the managed backing store; subsequent encrypt operations use those keys. Existing encrypted tokens from a prior filesystem-backed deployment are not automatically recoverable (migration is a one-time operational cutover).
- **Backing store temporarily unavailable at startup**: Application startup fails fast with a diagnosable error rather than silently falling back to ephemeral local storage in production.
- **Key ring rotation**: New encryption operations may use rotated keys while previously encrypted data remains decryptable via retained key versions in the shared ring.
- **Development and test environments**: Local development may continue using ephemeral or filesystem-backed keys for developer convenience; production behavior MUST NOT depend on local disk persistence.
- **Permission denial to secret store**: Operations fail with a granular domain error; logs MUST NOT contain cleartext tokens, refresh tokens, or raw key material (Constitution §8).
- **Concurrent key ring updates**: Multiple instances starting simultaneously MUST NOT corrupt the shared key ring; last-writer conflicts are handled safely by the backing store integration.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST persist the encryption key ring used for QBO token protection in a durable, shared backing store accessible to all production application instances.
- **FR-002**: System MUST decrypt QBO OAuth tokens encrypted before a process restart using the same key ring after restart without requiring re-authentication.
- **FR-003**: System MUST allow any production application instance to decrypt tokens encrypted by another instance of the same deployment.
- **FR-004**: System MUST NOT write encryption key ring material to ephemeral local filesystem storage in production environments.
- **FR-005**: System MUST resolve required secret and key-management configuration at application startup in production, coordinated with infrastructure provisioning for the managed cloud secret service.
- **FR-006**: System MUST fail startup in production if the shared key backing store is unreachable, rather than silently degrading to local filesystem persistence.
- **FR-007**: System MUST continue to encrypt QBO access and refresh tokens at rest; this feature changes where keys live, not whether tokens are encrypted.
- **FR-008**: System MUST NOT log cleartext QBO tokens, refresh tokens, client secrets, or raw encryption key material in application logs (Constitution §8).
- **FR-009**: System MUST provide automated verification that encrypt/decrypt round-trips succeed across simulated restart and multi-instance scenarios.
- **FR-010**: System MUST achieve ≥80% line/branch coverage across backend and frontend for this feature (CI-enforced; Constitution III).

### Key Entities

- **Encryption Key Ring**: The set of keys used to protect sensitive application data at rest; must be durable, shared across instances, and access-controlled in production.
- **Encrypted QBO Token Record**: Per-venue stored OAuth access and refresh tokens encrypted with the key ring; depends on key ring stability for long-lived connections.
- **Secret Configuration Reference**: Named configuration that points the application to the managed backing store and required credentials at startup, without embedding secrets in images.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of post-restart QBO sync attempts succeed for venues with previously stored tokens in production-like testing, without requiring a new OAuth authorization flow.
- **SC-002**: 100% of cross-instance decrypt tests succeed when one instance writes encrypted tokens and a second instance reads them in production-like testing.
- **SC-003**: Zero encryption key ring files are present on ephemeral local disk in production after encrypt/decrypt operations complete.
- **SC-004**: Application startup in production fails within one health-check cycle when the shared key backing store is unavailable, with an error message actionable by operators (no silent fallback to local disk).
- **SC-005**: No cleartext token or key material appears in structured application logs during normal operation or failure scenarios in security review sampling.
- **SC-006**: ≥80% line/branch coverage achieved across backend and frontend code for this feature (CI-enforced; Constitution III).

## Assumptions

- Production runs on GCP Cloud Run in project `split-rail` (us-central1), consistent with the live infrastructure blueprint.
- GCP Secret Manager and/or Cloud KMS are the approved managed services for key ring persistence and protection, as planned in TDD §5 and referenced by SPLR-40.
- Infrastructure provisioning for secret resources and service identity permissions is handled in coordination with the "Gap: Security, Secrets & Transport Hardening" milestone; this feature wires the application to consume those resources.
- Local development and automated test environments may retain ephemeral or filesystem-backed keys for speed and simplicity; production configuration is distinct and enforced by environment.
- Existing QBO tokens encrypted under a prior filesystem key ring are not migrated automatically; production cutover may require venues to re-authenticate once if keys cannot be transferred.
- Only QBO OAuth token encryption is in scope for this feature; JWT signing secrets and other secrets follow existing Secret Manager patterns where already defined.
- Frontend changes are limited to test coverage for any shared configuration surfaces; the primary deliverable is backend key persistence behavior.
