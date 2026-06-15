# Feature Specification: Full-Scale E2E Lifecycle & Cross-Tenant Leak Testing

**Feature Branch**: `005-e2e-lifecycle-leak-testing`

**Created**: 2026-06-15

**Status**: Draft

**Input**: User description: "Full-Scale E2E Lifecycle & Cross-Tenant Leak Testing (SPLR-20) — final integration and hardening milestone that proves the three platform-defining release criteria (Zero Write Infiltration, Zero Cross-Tenant Contamination, Audit File Immutability), stands up an end-to-end browser-testing platform against an ephemeral preview environment, and enforces coverage + E2E quality gates as merge blockers."

## Overview

This is the **final integration and hardening milestone** for the platform. It adds no new user-facing product features. Instead, it assembles the previously delivered capabilities — tenant foundation & RBAC, the financial ledger grid & math engine, the QuickBooks Online (QBO) read-only pull cache, and the night-of settlement freeze pipeline — into a single, automatically verified release pipeline.

The milestone exists to **prove**, with repeatable automated evidence on every code change, the three release criteria the business has committed to:

- **Zero Write Infiltration** — no programmatic path ever creates or edits accounting records in the connected QBO system.
- **Zero Cross-Tenant Contamination** — one organization can never view, scan, enumerate, or verify another organization's data.
- **Audit File Immutability** — once a settlement is signed, later changes to underlying data can never alter or re-render the stored settlement document.

It also cleans up remaining integration seams (consistent route/error contracts, verified contract-to-frontend type synchronization, optimized build assembly) so the assembled product behaves predictably end to end.

## Clarifications

### Session 2026-06-15

- Q: How should QBO data ingestion behave inside the ephemeral E2E preview environment? → A: Use a stubbed/faked QBO connector seeded with deterministic actuals; the preview stays hermetic (no external Intuit dependency), variance assertions are reproducible, and Zero Write Infiltration is proven by asserting no outbound mutating calls.
- Q: What flaky-test / retry policy should the E2E merge gate use? → A: Bounded automatic retries per test (e.g., up to 2); a test passing within the retry budget is green, a test failing persistently blocks the merge.
- Q: What browser / viewport coverage should the blocking E2E matrix target? → A: Full cross-browser (Chromium, Firefox, WebKit) plus mobile/tablet emulation across all suites, ensuring the touchscreen signature flow is exercised under touch-enabled viewports.
- Q: What diagnostic artifacts should the E2E gate capture on failure? → A: On failure only (after retries exhausted), capture an execution trace, screenshot, and video per failed scenario and retain them as CI build artifacts.
- Q: What end-to-end wall-clock target should the full PR pipeline meet? → A: ~30 minutes per PR, achieved by sharding/parallelizing the full cross-browser/mobile E2E matrix.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Cross-Tenant Leak Prevention Is Continuously Proven (Priority: P1)

As the platform owner accountable for tenant data security, I need automated proof that one organization can never reach another organization's data, so that I can release with confidence that customer financial data is strictly isolated.

**Why this priority**: Cross-tenant contamination is a catastrophic, trust-destroying failure for a multi-tenant accounting platform. Proving isolation is the single most important release criterion and must hold on every change.

**Independent Test**: Run the automated cross-organization suite alone: it logs in two separate organizations in parallel browser sessions, has one organization attempt to reach the other's records by direct navigation and by replaying intercepted data requests against the other organization's identifiers, and confirms every such attempt is denied. Delivers standalone value by certifying isolation even before other suites exist.

**Acceptance Scenarios**:

1. **Given** an Admin of Organization A and an Admin of Organization B authenticated in independent parallel sessions, **When** Organization A attempts to load or request Organization B's event and venue records using B's identifiers, **Then** every attempt is rejected (access denied / not found) and no Organization B data is returned in any response.
2. **Given** a user whose access is scoped to a specific subset of venues, **When** that user attempts to access a venue outside their assigned scope, **Then** the attempt is rejected and no out-of-scope venue data is exposed.
3. **Given** a cross-organization access attempt occurs, **When** the response is inspected, **Then** it contains no identifiers, amounts, names, or document references belonging to the other organization.

---

### User Story 2 - Full Lifecycle State Machine Is Verified End to End (Priority: P1)

As the platform owner, I need an automated walkthrough of the complete event lifecycle — from blank planning through signed, immutable settlement and reconciliation — so that I know the whole assembled product works together exactly as the state machine promises.

**Why this priority**: The event lifecycle is the core value of the product. Verifying the full traversal across all assembled subsystems is what makes this an "operational assembly verification" milestone.

**Independent Test**: Run the lifecycle suite alone against a freshly seeded event: it drives the grid from pre-show planning, locks the budget, enters night-of settlement values, confirms calculations, simulates a touchscreen signature, finalizes, and confirms the workspace becomes permanently read-only with a retrievable settlement document. Delivers standalone value by certifying the end-to-end happy path.

**Acceptance Scenarios**:

1. **Given** a new event in the pre-show (planning) state, **When** the lifecycle walkthrough begins, **Then** only planning/proforma fields are editable and settlement fields are not yet editable.
2. **Given** the planning budget is locked, **When** the lock action completes, **Then** planning fields become read-only and settlement fields become editable.
3. **Given** night-of settlement values are entered, **When** the deal calculations run, **Then** the resulting computed payouts and totals match the expected base-10 financial results exactly.
4. **Given** settlement values are confirmed and a touchscreen signature is simulated via pointer/drag input on the signing surface, **When** the settlement is finalized, **Then** the workspace transitions to an absolute read-only state and a settlement document reference points to a retrievable document.
5. **Given** the event is settled and reconciliation data is ingested via the stubbed accounting connector seeded with deterministic actuals, **When** actuals arrive, **Then** the variance display reflects actuals minus settlement values correctly.

---

### User Story 3 - Write-Infiltration & Audit Immutability Are Continuously Proven (Priority: P2)

As the platform owner, I need automated proof that the system never writes to the external accounting system and that signed settlement documents can never be altered after the fact, so that the integrity and legal defensibility of the audit trail are guaranteed.

**Why this priority**: These two release criteria protect the customer's source-of-truth accounting data and the immutability of signed financial documents. They are essential to ship but build on the lifecycle and isolation foundations.

**Independent Test**: Run the integrity suite alone: confirm no client or server path issues a write to the external accounting system (read-only verification), then mutate underlying database values for a settled event and confirm the stored settlement document is byte-for-byte unchanged.

**Acceptance Scenarios**:

1. **Given** the full set of application behaviors exercised during testing, **When** all outbound interactions with the external accounting system are inspected, **Then** none of them create, modify, or delete records in that system.
2. **Given** an event whose settlement has been finalized and its document stored, **When** underlying financial values for that event are later changed in the database, **Then** the stored settlement document remains unchanged and is never re-rendered.
3. **Given** a settled event, **When** any attempt is made to edit its frozen financial records, **Then** the attempt is rejected and the record remains synchronized with the stored document snapshot.

---

### User Story 4 - Quality Gates Block Unsafe Merges (Priority: P2)

As an engineering lead, I need the verification suites and coverage thresholds to automatically block merges when they fail, so that the proven release criteria cannot silently regress between releases.

**Why this priority**: Proof is only durable if it is enforced. Without automated gating, verified guarantees can regress unnoticed. This depends on the suites from the higher-priority stories existing first.

**Independent Test**: Submit a change that intentionally drops coverage below the threshold or breaks an end-to-end scenario, and confirm the pipeline blocks the merge; submit a passing change and confirm it is allowed to proceed.

**Acceptance Scenarios**:

1. **Given** a proposed change, **When** automated test coverage for either the backend or the frontend falls below 80.0%, **Then** the pipeline fails and the merge is blocked.
2. **Given** a proposed change, **When** any end-to-end scenario (isolation leak, lifecycle break, or calculation mismatch) fails against an isolated preview environment, **Then** the pipeline fails, the preview environment is torn down, and the merge is blocked.
3. **Given** a proposed change that passes all suites and coverage thresholds, **When** the pipeline completes, **Then** the merge is permitted to proceed.
4. **Given** any pipeline run, **When** an isolated preview environment is created for end-to-end testing, **Then** that environment is destroyed after the run regardless of pass or fail.

---

### User Story 5 - Integration Seams Are Stabilized (Priority: P3)

As a developer integrating against the platform, I need consistent route and error contracts and a verified contract-to-frontend type pipeline, so that the assembled system is predictable and the frontend always matches the backend.

**Why this priority**: These cleanups improve reliability and developer experience but do not by themselves prove a release criterion. They are valuable polish that supports the higher-priority verification work.

**Independent Test**: Inspect the API surface for consistent versioning, error contracts, and status codes; regenerate frontend contract types from the published API description and confirm the build succeeds with no drift.

**Acceptance Scenarios**:

1. **Given** the assembled API surface, **When** routes and error responses are reviewed, **Then** versioning, error contract shape, and status codes are consistent across controllers.
2. **Given** the published API description, **When** frontend contract types are regenerated, **Then** they match the backend with no manual type drift and the frontend build succeeds.
3. **Given** the production build assembly, **When** it is produced, **Then** it completes successfully and is suitable for deployment to the preview environment.

---

### Edge Cases

- What happens when the two parallel organization sessions share cached state or tokens — does isolation still hold without leakage between sessions?
- How does the system handle an end-to-end scenario that hangs or times out, so the pipeline neither stalls indefinitely nor leaves a preview environment running?
- What happens when the simulated signature input produces an empty or degenerate stroke — is finalization correctly prevented?
- How does the variance check behave when reconciliation actuals have not yet arrived versus partially arrived?
- What happens when coverage data fails to parse or is missing for one side — is that treated as a failing (blocking) condition rather than a pass?
- How does the cross-tenant suite distinguish a legitimate "not found" from an isolation leak that returns empty-but-successful data?
- What happens when the preview environment fails to start — is the run failed cleanly with teardown rather than running tests against a stale environment?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide an automated end-to-end verification suite that drives the real user interface and intercepts network traffic, executed in a dedicated test workspace.
- **FR-001a**: The blocking E2E matrix MUST execute all suites across the major desktop browser engines (Chromium, Firefox, WebKit) and at least one mobile/tablet (touch-enabled) emulated viewport, and the touchscreen signature/finalize flow MUST be exercised under a touch-enabled viewport.
- **FR-002**: The verification suites MUST run against an isolated, ephemeral preview deployment that mirrors the production-style assembled stack, created per run and destroyed afterward.
- **FR-003**: The cross-tenant suite MUST orchestrate two concurrent, independent authenticated sessions belonging to two different organizations.
- **FR-004**: The cross-tenant suite MUST attempt to access one organization's records using the other organization's identifiers via both direct navigation and replayed/intercepted data requests, and MUST assert every attempt is denied with no foreign data returned.
- **FR-005**: The cross-tenant suite MUST verify that a venue-scoped user is denied access to venues outside their assigned scope.
- **FR-006**: The lifecycle suite MUST verify the complete state progression: planning (pre-show) → budget locked / settlement open → finalized & read-only settlement → reconciliation with variance.
- **FR-007**: The lifecycle suite MUST assert field editability transitions at each state (planning fields editable only in pre-show; settlement fields editable only after budget lock; all fields read-only after finalization).
- **FR-008**: The lifecycle suite MUST verify that night-of settlement calculations produce exact expected base-10 financial results.
- **FR-009**: The lifecycle suite MUST simulate a touchscreen signature by generating pointer/drag coordinate input on the signing surface and then finalize the settlement.
- **FR-010**: The lifecycle suite MUST confirm that, after finalization, the workspace is absolutely read-only and the settlement document reference resolves to a retrievable document.
- **FR-011**: The integrity suite MUST verify that no client or server path performs any create, modify, or delete operation against the external accounting system.
- **FR-011a**: Within the ephemeral E2E preview, the external accounting (QBO) dependency MUST be served by a stubbed/faked connector seeded with deterministic actuals so the environment is hermetic; the suite MUST still assert that no outbound mutating calls are issued toward the external accounting system.
- **FR-012**: The integrity suite MUST verify that after a settlement is finalized, subsequent changes to underlying database values leave the stored settlement document unchanged and never trigger re-rendering.
- **FR-013**: The system MUST enforce a coverage quality gate that blocks a merge when either backend or frontend automated test coverage is below 80.0%.
- **FR-014**: The system MUST enforce an end-to-end quality gate that blocks a merge when any isolation, lifecycle, or calculation scenario fails.
- **FR-014a**: The end-to-end gate MUST apply a bounded automatic per-test retry budget (e.g., up to 2 retries) to absorb transient infrastructure flakiness; a scenario that passes within the retry budget is treated as passing, and a scenario that fails after exhausting the budget MUST block the merge.
- **FR-015**: The continuous integration pipeline MUST, on every proposed change: build the backend and frontend, run the unit/component test loops, evaluate coverage, deploy the ephemeral preview, run the end-to-end suites headlessly, and only then permit merge approval.
- **FR-015a**: The full PR pipeline (build → unit/component + coverage → ephemeral preview deploy → full cross-browser/mobile E2E matrix → gate) MUST target completion within approximately 30 minutes, with the E2E matrix sharded/parallelized to stay within that budget.
- **FR-016**: The pipeline MUST tear down the ephemeral preview environment after every run, regardless of outcome.
- **FR-016a**: When an E2E scenario fails after exhausting its retry budget, the pipeline MUST capture an execution trace, screenshot, and video for that scenario and retain them as downloadable CI build artifacts; passing runs need not retain such artifacts.
- **FR-017**: Both the coverage gate and the end-to-end gate MUST be configured as required merge blockers on the protected main branch.
- **FR-018**: The API surface MUST present consistent route versioning, error-contract shape, and status codes across controllers.
- **FR-019**: The system MUST verify that frontend data-contract types are regenerated from the published API description with no manual drift, and that the frontend build succeeds against them.
- **FR-020**: The build assembly MUST be optimized and produce a deployable artifact suitable for the ephemeral preview environment.
- **FR-021**: The verification suites MUST provide reusable seeding/fixtures for multiple organizations and users to support isolation and lifecycle scenarios.
- **FR-022**: This milestone MUST NOT introduce new product features; its scope is limited to integration, hardening, and verification.

### Key Entities *(include if feature involves data)*

- **Organization Test Context**: A fully isolated authenticated session for one organization (with its admin and scoped users), used to assert that no data crosses between organizations.
- **Lifecycle Test Event**: A seeded event used to traverse the full state machine (planning → settlement → reconciliation), including its line items, deal terms, signature, and settlement document reference.
- **Settlement Document Artifact**: The immutable, signed settlement document whose contents must remain unchanged after finalization regardless of later data edits.
- **Ephemeral Preview Environment**: A disposable, isolated deployment of the assembled stack created per pipeline run for end-to-end execution and destroyed afterward.
- **Quality Gate Result**: The pass/fail outcome of coverage evaluation and end-to-end execution that determines whether a merge is blocked or permitted.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of cross-organization access attempts in the isolation suite are denied, with zero responses containing another organization's data.
- **SC-002**: The full lifecycle traversal (planning → settlement → finalized read-only → reconciliation variance) completes successfully end to end in an automated run, including signature simulation and document retrieval.
- **SC-003**: 100% of post-settlement mutation attempts leave the stored settlement document byte-for-byte unchanged.
- **SC-004**: Zero create/modify/delete interactions with the external accounting system are observed across all exercised behaviors.
- **SC-005**: Every proposed change to the main branch is gated such that a merge is blocked whenever backend or frontend coverage is below 80.0% or any end-to-end scenario fails.
- **SC-006**: Every ephemeral preview environment created for a pipeline run is destroyed after the run, with no environments left running.
- **SC-007**: Frontend contract types regenerated from the published API description show no manual drift and the frontend build succeeds.
- **SC-008**: An intentionally failing change (coverage drop or broken scenario) is demonstrably blocked from merging, and a passing change is demonstrably allowed.
- **SC-009**: The full PR pipeline completes within approximately 30 minutes for a typical change, with the cross-browser/mobile E2E matrix executed in parallel.
- **SC-010**: Every E2E scenario that fails after its retry budget produces a downloadable trace, screenshot, and video artifact for diagnosis.

## Assumptions

- The four predecessor milestones (tenant foundation & RBAC, financial ledger grid & math engine, QBO read-only pull cache, and settlement freeze pipeline) are implemented and available to assemble and verify; this milestone integrates and hardens them rather than reimplementing them.
- The end-to-end browser testing platform is implemented with Playwright in a dedicated TypeScript workspace (e.g., `tests/e2e` or within `apps/web`), consistent with the project's testing standards.
- The ephemeral preview environment is provisioned on Google Cloud Run via the GitHub Actions / GCP pipeline, consistent with the project's deployment target.
- Coverage is measured from the existing backend (`cobertura`) and frontend (`lcov`) reports already produced by the unit/component test loops.
- "External accounting system" refers to the connected QuickBooks Online integration, which is read-only by platform mandate.
- The 80.0% coverage threshold applies independently to backend and frontend; either falling below the threshold blocks the merge.
- The protected branch is `main`, where both gates are enforced as required status checks.
- Test data is created via dedicated seeding/fixtures rather than relying on pre-existing production-like data.
- The QBO dependency in the ephemeral preview is served by a stubbed/faked connector seeded with deterministic actuals (not a live Intuit sandbox), keeping the environment hermetic while still proving the read-only (zero-write) guarantee.
- The E2E merge gate permits a bounded automatic per-test retry budget (e.g., up to 2) to absorb transient infrastructure flakiness; persistent failures still block the merge.
- The blocking E2E matrix runs across Chromium, Firefox, and WebKit plus at least one touch-enabled mobile/tablet emulated viewport, and is sharded/parallelized to meet the ~30-minute pipeline budget.
- Diagnostic artifacts (trace, screenshot, video) are captured only for scenarios that fail after exhausting retries.
