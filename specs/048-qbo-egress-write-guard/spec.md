# Feature Specification: Always-On QuickBooks Egress Write Guard

**Feature Branch**: `048-qbo-egress-write-guard`

**Created**: 2026-06-21

**Status**: Draft

**Input**: Linear [SPLR-41](https://linear.app/audiodex/issue/SPLR-41/always-on-qbo-egress-write-guard-in-production) — Always-on QBO egress write-guard in production

**Linear Issue**: [SPLR-41](https://linear.app/audiodex/issue/SPLR-41/always-on-qbo-egress-write-guard-in-production)

**Depends on**: E2E lifecycle leak testing / preview egress guard (SPLR-5 / specs 005), QuickBooks Online pull cache & mapping (SPLR-18 / specs 003)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Production enforces zero write infiltration to QuickBooks accounting data (Priority: P1)

As a compliance stakeholder, I need the platform to block any outbound attempt to create, update, or delete data in a connected organization's QuickBooks Online accounting records during normal production operation, so that the read-only integration guarantee cannot be bypassed by a code defect or misconfiguration.

**Why this priority**: The zero write infiltration guarantee is a constitutional and product requirement, but today it is enforced only in preview and test environments. Production traffic to QuickBooks accounting endpoints has no equivalent runtime barrier, leaving a direct path for accidental or unauthorized mutations to reach customer books.

**Independent Test**: Deploy or exercise the production QuickBooks integration client configuration (outside preview/test mode) and attempt a mutating operation toward the accounting API; confirm the operation is rejected before any data change can occur at QuickBooks, with a logged security-domain failure.

**Acceptance Scenarios**:

1. **Given** the application is running in production with a real QuickBooks connector, **When** any code path attempts to send a create, update, or delete request to the QuickBooks accounting API, **Then** the request is blocked with an explicit domain error and no accounting data is modified at QuickBooks.
2. **Given** the application is running in production, **When** a legitimate read-only sync or query operation requests accounting data from QuickBooks, **Then** the operation proceeds without being blocked by the write guard.
3. **Given** the application is running in any non-preview environment (including production), **When** the QuickBooks integration client is initialized, **Then** the egress write guard is active on every outbound accounting API call — not only when preview or test modes are enabled.

---

### User Story 2 - OAuth lifecycle operations remain permitted (Priority: P1)

As a platform operator, I need token exchange, refresh, and revocation calls to QuickBooks identity endpoints to continue working while accounting mutations remain blocked, so that organizations can connect, maintain, and disconnect QuickBooks without disabling the write guard.

**Why this priority**: A blanket block on all non-read traffic would break authentication and disconnect flows. The guard must distinguish accounting data endpoints from sanctioned identity/OAuth endpoints.

**Independent Test**: Complete a full OAuth connect and token refresh cycle in a non-preview environment while the write guard is active, and confirm identity endpoints succeed while a parallel mutating accounting request is still rejected.

**Acceptance Scenarios**:

1. **Given** the egress write guard is active in production, **When** the system exchanges an authorization code or refreshes an access token through sanctioned OAuth endpoints, **Then** the identity request completes successfully.
2. **Given** the egress write guard is active, **When** the system revokes a QuickBooks connection through sanctioned OAuth endpoints, **Then** the revocation request completes successfully.
3. **Given** the egress write guard is active, **When** a request targets a QuickBooks accounting endpoint with a mutating operation, **Then** it is blocked regardless of whether OAuth operations are also in flight.

---

### User Story 3 - Blocked write attempts are observable for security review (Priority: P2)

As a security reviewer, I need every blocked mutating egress attempt to produce a structured, sanitized log entry identifying the operation class and destination host, so that infiltration attempts are traceable without exposing credentials or request payloads.

**Why this priority**: Silent blocking would hide regressions; overly verbose logging would violate financial privacy rules. Observable, sanitized rejection records close the production observability gap.

**Independent Test**: Trigger a blocked mutating accounting request in a non-preview environment and confirm a structured log entry is emitted containing operation verb and host only — no tokens, secrets, or request bodies.

**Acceptance Scenarios**:

1. **Given** a mutating request to a QuickBooks accounting endpoint is blocked, **When** the guard rejects the operation, **Then** a structured log entry records the HTTP verb and destination host without logging authorization headers, tokens, or request body content.
2. **Given** a permitted read-only accounting request, **When** the guard allows the operation, **Then** no security-violation error is raised (routine debug-level egress logging may occur).
3. **Given** multiple blocked attempts in a single request lifecycle, **When** each is rejected, **Then** each attempt produces its own observable log entry.

---

### Edge Cases

- **PATCH and lesser-used verbs**: Mutating operations beyond POST, PUT, and DELETE (including PATCH) toward accounting endpoints must be blocked with the same enforcement as other write verbs.
- **Relative vs absolute URLs**: Requests constructed with either fully qualified or base-address-relative accounting paths must be evaluated consistently — a relative path resolving to an accounting host must not bypass the guard.
- **Preview mode parity**: Preview and test environments retain existing egress recording and zero-write assertions; extending the guard to production must not weaken preview enforcement.
- **Retry policies**: Transient-error retry logic on the accounting client must not re-attempt a blocked mutating request — the guard rejection is immediate and final for that call.
- **Concurrent read and blocked write**: A blocked write attempt on one thread must not interfere with concurrent permitted read operations on separate requests.
- **OAuth vs accounting host confusion**: Requests to identity hosts (token, revoke) must remain allowlisted even when they use POST; requests to accounting hosts must be blocked for all mutating verbs regardless of payload intent.

## Requirements *(mandatory)*

### Functional Requirements

#### Universal Egress Write Guard

- **FR-001**: The platform MUST register an egress write guard on the production QuickBooks accounting integration client in all environments, not only when preview or fake-connector modes are enabled.
- **FR-002**: The guard MUST block any mutating HTTP operation (create, update, delete, and patch semantics) directed at QuickBooks accounting API endpoints before the outbound request is transmitted.
- **FR-003**: The guard MUST permit read-only operations (query and fetch semantics) directed at QuickBooks accounting API endpoints to proceed normally.
- **FR-004**: The guard MUST maintain an explicit allowlist of sanctioned QuickBooks identity/OAuth endpoints (token exchange, refresh, and revocation) that remain callable with mutating verbs required by the OAuth protocol.

#### Error Handling and Observability

- **FR-005**: Blocked mutating accounting requests MUST surface an explicit, unswallowed domain exception classified as a zero-write-infiltration violation — never a generic or empty failure.
- **FR-006**: Blocked attempts MUST emit structured logs containing only the HTTP verb and destination host; logs MUST NOT include access tokens, refresh tokens, client secrets, authorization headers, or request body content.
- **FR-007**: Permitted read operations MUST NOT emit zero-write-infiltration violation errors.

#### Verification

- **FR-008**: Automated verification MUST assert the egress write guard is active when the application runs outside preview/fake-connector mode and rejects a mutating accounting API request.
- **FR-009**: Automated verification MUST assert sanctioned OAuth identity requests remain permitted while mutating accounting requests are rejected in the same configuration.
- **FR-010**: Automated verification MUST assert read-only accounting requests are not blocked by the guard in non-preview mode.
- **FR-011**: System MUST achieve ≥80% line/branch coverage across backend and frontend for this feature (CI-enforced; Constitution III).

### Key Entities

- **Egress Write Guard**: A runtime policy applied to all outbound QuickBooks accounting integration traffic that permits reads, allowlists identity endpoints, and rejects mutating accounting operations before they leave the platform.
- **QuickBooks Accounting Endpoint**: Any destination host and path used to read or (if permitted) mutate a connected organization's books, invoices, purchases, accounts, or other accounting entities.
- **Sanctioned Identity Endpoint**: QuickBooks OAuth endpoints used exclusively for connection lifecycle (authorize callback handling, token exchange, refresh, revocation) — not for accounting data mutation.
- **Zero Write Infiltration Violation**: A classified security-domain failure indicating an attempt to mutate QuickBooks accounting data was intercepted and blocked at the egress boundary.
- **Integration Mode**: The runtime configuration distinguishing preview/test (fake connector, seeding surfaces) from production (real connector, live QuickBooks traffic). The write guard must be active in both.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of automated verification cases confirm mutating requests to QuickBooks accounting endpoints are rejected when the application runs outside preview/fake-connector mode.
- **SC-002**: 100% of automated verification cases confirm read-only accounting requests and sanctioned OAuth identity requests succeed with the guard active in non-preview mode.
- **SC-003**: Zero successful mutating QuickBooks accounting API calls originate from production deployments after this feature ships (verified via guard logs and absence of write-infiltration incidents over the first 90 days post-release).
- **SC-004**: 100% of blocked mutating attempts in verification produce structured log entries containing verb and host only, with no credential leakage in log payloads.
- **SC-005**: ≥80% line/branch coverage achieved across backend and frontend code for this feature (CI-enforced; Constitution III).

## Assumptions

- The existing egress write guard implementation used in preview mode (specs 005) provides the behavioral baseline; this feature extends its registration to production rather than inventing a separate guard mechanism.
- The platform's QuickBooks integration is constitutionally read-only (Constitution IV); no legitimate production workflow requires mutating accounting API calls, making a hard block the correct default.
- OAuth token exchange, refresh, and revocation use distinct identity hosts from accounting data hosts; the allowlist can be maintained by host/path classification without per-request business logic.
- Frontend changes are out of scope unless error surfacing is needed for operator-facing diagnostics; the primary deliverable is backend egress enforcement.
- Egress recording (method, host, timestamp inventory for test seeding) may remain a preview-only diagnostic surface; production guard enforcement does not require exposing egress records to operators.
- Retry and resilience policies on the accounting client apply only to permitted read operations; guard rejections are not retriable.
