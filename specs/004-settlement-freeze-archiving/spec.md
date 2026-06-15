# Feature Specification: Night-of Settlement Freeze Pipeline & Immutable Archiving

**Feature Branch**: `004-settlement-freeze-archiving`

**Created**: 2026-06-14

**Status**: Draft

**Input**: Linear SPLR-19 — Lock down show financials upon contract execution and compile permanent, un-editable legal artifacts. When a tour manager applies their touchscreen signature, the platform freezes the settlement numbers, renders an immutable PDF snapshot server-side, streams it to a Write-Once-Read-Many (WORM) cloud bucket, and transitions the event lifecycle to a read-only state.

**Depends on**: SPLR-16 (Tenant Foundation & RBAC), SPLR-17 (Financial Ledger Grid & Math Engine)

## Clarifications

### Session 2026-06-14

- Q: What retention period should the WORM Object Retention Policy enforce on settlement PDFs? → A: 7 years retention lock (aligns with US financial/tax record retention)
- Q: How do authorized users retrieve the archived settlement PDF? → A: Short-lived signed URL generated on demand, gated by permission + venue scope (bucket stays private)
- Q: Can a SETTLED event ever be reopened/reversed? → A: Yes — a super-admin may reverse a settlement via an explicit, audited reversal; the original archived PDF is never deleted/altered, and re-finalizing produces a new PDF
- Q: What makes a submitted signature valid enough to freeze the settlement? → A: Require a non-empty, parseable base64 vector array containing at least one stroke (presence + structural validity)
- Q: How should two finalize requests racing against the same PRE_SHOW event be handled? → A: First-wins via row-level lock / optimistic concurrency on events.status; concurrent loser rejected (HTTP 409/400), exactly one PDF produced

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Freeze settlement with touchscreen signature and immutable PDF archive (Priority: P1)

At the end of a show, the on-site general manager opens the event's Night-of Settlement column and enters the actual ticket tier counts and bar revenue. The system applies artist deduction flags to strip overhead from gross revenue before computing contract percentages, producing the final deal-math payout. Once both parties agree, the tour manager signs on a touchscreen. On submission, the platform atomically: captures the signature, snapshots all settlement financial values, renders a permanent PDF embedding the signature and the full financial block, streams that PDF to a Write-Once-Read-Many cloud bucket, records the permanent file path, and transitions the event to a `SETTLED` (read-only) state. The settlement becomes a verifiable, legally defensible historical record that cannot drift from the underlying data.

**Why this priority**: This is the core legal-artifact pipeline. Without the atomic freeze-sign-render-archive transition, there is no immutable settlement record. Everything else in this milestone builds on this transition.

**Independent Test**: Configure an event in `PRE_SHOW` with a locked budget, enter night-of actuals, submit a signature via the finalize endpoint, and confirm the event becomes `SETTLED` with `settled_at`, `settled_by_user_id`, `artist_signature_data`, and a non-null `settlement_pdf_url` pointing to a stored, non-overwritable PDF that embeds the signature and financial block.

**Acceptance Scenarios**:

1. **Given** an event in `PRE_SHOW` state with a locked budget and night-of actuals entered, **When** an authorized user submits the finalize-settlement request with a valid base64 signature vector, **Then** the event transitions to `SETTLED`, and `settled_at`, `settled_by_user_id`, `artist_signature_data`, and `settlement_pdf_url` are all persisted.
2. **Given** the deal includes line items flagged `is_artist_deduction`, **When** the settlement is finalized, **Then** flagged overhead is stripped from gross revenue before contract percentages are computed, and the resulting `calculated_net_payout` is captured in the PDF snapshot.
3. **Given** the finalize pipeline is in progress, **When** the PDF render or WORM upload step fails, **Then** the event remains in its prior (non-`SETTLED`) state, no partial freeze occurs, and a granular domain exception is raised (never a generic `System.Exception` or empty catch).
4. **Given** a settlement PDF has been uploaded to the WORM bucket, **When** any actor attempts to overwrite or delete that object, **Then** the storage retention policy rejects the operation and the original artifact is preserved.

---

### User Story 2 - Immutability guardrails reject post-settlement edits (Priority: P1)

After an event is settled, the entire workspace becomes read-only. Any attempt — through any endpoint, service method, or query — to mutate the event, its artists, or its financial line items is rejected immediately with an explicit, logged error, ensuring the stored PDF snapshot can never drift out of sync with the database.

**Why this priority**: This is the release criterion of the milestone (PRD §6 — Audit File Immutability). A frozen settlement that can still be edited is legally worthless. This guardrail is as critical as the freeze itself.

**Independent Test**: Settle an event, then attempt to mutate `events`, `event_artists`, and `financial_line_items` rows for that event through each mutation path; confirm every attempt is rejected with an explicit error (HTTP 400 / `InvalidOperationException`), the attempt is logged, and the stored PDF object is unchanged and not re-rendered.

**Acceptance Scenarios**:

1. **Given** an event in `SETTLED` or `RECONCILED` state, **When** any code path attempts to update a row in `events`, `event_artists`, or `financial_line_items` for that event, **Then** the path throws an explicit, unswallowed `InvalidOperationException` or returns HTTP 400 Bad Request, and the rejected attempt is logged.
2. **Given** a settled event with an archived PDF, **When** underlying database values are forcibly mutated (e.g., via a test harness bypassing the API), **Then** the stored object-storage PDF is not re-rendered or altered — the snapshot remains the source of legal truth.
3. **Given** an event in `PRE_SHOW` state, **When** a mutation is attempted, **Then** the mutation proceeds normally (the guardrail blocks only post-settlement states).

---

### User Story 3 - Touchscreen signature capture and instant field locking (Priority: P2)

The tour manager signs on an HTML5 canvas that captures pointer/touch/mouse strokes as a vector coordinate array, serialized to base64 for submission. The UI provides clear/redo controls and an explicit "Finalize Settlement" confirmation. Upon a successful finalize, every settlement input selector across the workspace instantly switches to a read-only, visibly "Settled / Locked" state, and a link to the stored settlement PDF is surfaced. Signature and finalize controls are hidden or disabled for users lacking the `can_sign_settlement` permission.

**Why this priority**: This is the operator-facing surface of the freeze. It is essential for usability but depends on the P1 backend pipeline already existing to accept the signature and return the locked state.

**Independent Test**: Render the settlement workspace as an authorized user, draw a signature on the canvas, confirm it serializes to a base64 vector array, submit finalize, and confirm all inputs render read-only with a "Settled / Locked" indicator and a visible PDF link. Render as an unauthorized user and confirm the signature/finalize controls are hidden.

**Acceptance Scenarios**:

1. **Given** the settlement workspace is open for an authorized user, **When** the user draws on the signature canvas, **Then** the strokes are captured and serialized to a base64 vector coordinate array suitable for submission.
2. **Given** a captured signature, **When** the user confirms "Finalize Settlement" and the backend returns success, **Then** every settlement input instantly switches to read-only with a visible "Settled / Locked" indicator and a link to the `settlement_pdf_url`.
3. **Given** a user lacking the `can_sign_settlement` permission, **When** the settlement workspace renders, **Then** the signature canvas and finalize controls are hidden or disabled.
4. **Given** the signature canvas, **When** the user taps clear/redo, **Then** the in-progress signature is reset before submission.

---

### Edge Cases

- **Partial-failure atomicity**: If signature persistence, line-item snapshot, PDF render, WORM upload, or URL persistence fails at any step, the transition must roll back fully — the event must NOT be left `SETTLED` and no orphaned/partial PDF may be treated as the record of truth.
- **Double finalize**: A finalize request against an already-`SETTLED` or `RECONCILED` event must be rejected (idempotency / no re-freeze, no PDF overwrite).
- **Concurrent finalize race**: Two finalize requests arriving simultaneously for the same `PRE_SHOW` event must resolve first-wins via a row lock / optimistic concurrency check on `events.status`; the losing request is rejected (HTTP 409/400) and exactly one PDF is produced.
- **Empty or malformed signature**: A finalize request whose signature is missing, empty, not valid base64, or contains zero strokes must be rejected with a clear validation error (HTTP 400) and must not produce a PDF or change event state.
- **Out-of-scope venue**: A finalize request for a venue outside the caller's authenticated organization must be rejected with HTTP 403/404.
- **Unauthorized role**: A finalize request from a role lacking `can_sign_settlement` must be rejected with HTTP 403.
- **Budget not locked**: Finalizing an event whose budget is not yet locked (still proforma-only) must be rejected — settlement requires the State 1 → State 2 transition first.
- **Sensitive-data logging**: Raw signature payloads, PII, and storage credentials must never be written to logs.
- **Cross-tenant access**: A user from one organization must never read or finalize another organization's settlement, signature, or PDF.
- **Immutability drift**: No update/override routine may let financial records drift out of sync with the rendered `settlement_pdf_url` snapshot.
- **Settlement reversal**: Only a super-admin may reverse a settlement; the operation is fully audited, the original WORM PDF is preserved (never deleted/re-rendered), and re-settlement generates a new PDF artifact. A reversal attempt by a non-super-admin must be rejected with HTTP 403.

## Requirements *(mandatory)*

### Functional Requirements

#### Lifecycle State Machine

- **FR-001**: System MUST model an `event_status` enum with values `PRE_SHOW`, `SETTLED`, and `RECONCILED`, defaulting new events to `PRE_SHOW`.
- **FR-002**: System MUST own the State 2 (Settlement) → State 3 (Reconciliation) transition: a finalize-settlement action moves `events.status` to `SETTLED`, and a later QBO-sync milestone moves it to `RECONCILED`.
- **FR-003**: System MUST require that an event's budget is locked (State 1 → State 2 already complete) before a settlement can be finalized.

#### Atomic Finalize-Settlement Transition

- **FR-004**: System MUST expose a finalize-settlement endpoint (`POST /api/v1/venues/{venueId}/events/{eventId}/settle`) accepting a base64 signature vector array plus a final settlement confirmation.
- **FR-004a**: System MUST validate the submitted signature before freezing: it MUST be a non-empty, parseable base64-encoded vector coordinate array containing at least one stroke. A missing, empty, or structurally malformed signature MUST be rejected with a clear validation error (HTTP 400) and MUST NOT produce a PDF or alter event state.
- **FR-005**: System MUST perform the finalize transition atomically — validate state, persist signature data plus `settled_by_user_id` and `settled_at`, snapshot all `financial_line_items` settlement values and `event_artists.calculated_net_payout`, render the PDF, upload to the WORM bucket, persist `settlement_pdf_url`, and set `status = SETTLED`. If any step fails, the event MUST NOT be marked `SETTLED` (no partial freeze).
- **FR-006**: System MUST evaluate `is_artist_deduction` flags to strip flagged overhead from gross revenue before computing contract percentages, delegating deal math to the existing `DealMathEngine` (SPLR-17).
- **FR-007**: System MUST reject finalize requests against events already in `SETTLED` or `RECONCILED` state (no re-freeze, no PDF overwrite).
- **FR-007a**: System MUST serialize concurrent finalize requests for the same event using a row-level lock or optimistic-concurrency check on `events.status`, guaranteeing exactly one successful freeze and exactly one PDF artifact. Any concurrent losing request MUST be rejected (HTTP 409 Conflict or 400) without producing a second PDF or partial state.

#### PDF Generation & Immutable Archiving

- **FR-008**: System MUST render the settlement PDF server-side, embedding the decoded vector signature, the complete settlement financial block, and deal-math outputs into a single document.
- **FR-009**: System MUST stream the rendered PDF directly to a locked Google Cloud Storage bucket configured with an Object Retention Policy (WORM) enforcing a minimum retention period of 7 years, such that the object is non-writable and non-overwritable for the duration of the retention lock.
- **FR-010**: System MUST persist the permanent object-storage path to `events.settlement_pdf_url`.
- **FR-010a**: System MUST keep the WORM bucket private (no public object access) and serve the archived PDF to authorized users via a short-lived signed URL generated on demand, gated by the viewer's permission and venue scope. The stored `settlement_pdf_url` MUST NOT be a publicly accessible link.
- **FR-011**: System MUST NOT provide any routine that re-renders, overwrites, or replaces an archived settlement PDF, nor any path that lets financial records drift out of sync with the stored snapshot.

#### Immutability Guardrails

- **FR-012**: System MUST prepend a state-validation conditional block to any method, query, or command that mutates `events`, `event_artists`, or `financial_line_items`.
- **FR-013**: System MUST, when the target event status is `SETTLED` or `RECONCILED`, immediately throw an explicit, unswallowed `InvalidOperationException` (or return HTTP 400 Bad Request) and log the rejected mutation attempt.
- **FR-013a**: System MUST provide exactly one sanctioned exit from a frozen state: an explicit settlement-reversal operation restricted to a super-admin elevated permission. The reversal MUST (a) record a full audit trail (who, when, reason), (b) transition the event back to an editable state so it can be re-settled, and (c) leave the original archived PDF untouched in the WORM bucket (never deleted, overwritten, or re-rendered within its retention lock). Re-finalizing after a reversal MUST produce a NEW PDF artifact at a new object path rather than mutating the original.
- **FR-013b**: The settlement-reversal operation MUST be the only code path permitted to move an event out of `SETTLED`; all other mutation paths remain subject to FR-012/FR-013. The reversal MUST be tenant-scoped to the authenticated `organization_id` and return HTTP 403 for non-super-admins.

#### Authorization & Tenant Isolation

- **FR-014**: System MUST gate the finalize-settlement endpoint by the `can_sign_settlement` permission (Admin, Venue Manager/GM per the roles matrix) AND venue scope enforcement on `{venueId}`.
- **FR-015**: System MUST return HTTP 403 for roles lacking `can_sign_settlement` and HTTP 403/404 for out-of-scope venues.
- **FR-016**: System MUST constrain all reads/writes to the authenticated `organization_id` via `Event → Venue → OrganizationId`, eager-loading with `.Include()` / `.ThenInclude()` and applying `.AsNoTracking()` on read paths.

#### Exception & Logging Governance

- **FR-017**: System MUST wrap PDF, storage, and signature failures in granular domain exceptions — no empty catch blocks and no generic `System.Exception` in financial processing paths.
- **FR-018**: System MUST NOT log raw signature payloads, PII, or storage credentials to any logging output.

#### Frontend

- **FR-019**: Frontend MUST provide an HTML5 `<canvas>` that captures the tour manager's signature from mouse, pointer, and touch input and serializes it to a base64 vector coordinate array for submission.
- **FR-020**: Frontend MUST provide clear/redo controls and an explicit "Finalize Settlement" confirmation.
- **FR-021**: Frontend MUST, upon a successful finalize, instantly switch every settlement input selector to read-only with a visible "Settled / Locked" indicator and surface a link that retrieves the archived PDF via an on-demand short-lived signed URL (never a permanent public link).
- **FR-022**: Frontend MUST hide or disable the signature and finalize controls for roles lacking `can_sign_settlement`.
- **FR-023**: Frontend MUST NOT hand-write TypeScript payload interfaces; all data contracts MUST be imported from the auto-generated `/apps/web/src/types/generated-api.ts`.

#### Contracts & Quality

- **FR-024**: System MUST include automated tests covering: state-constraint rejection on `events`/`event_artists`/`financial_line_items` mutations after settlement; finalize authorization (403 for missing permission and out-of-scope venues); successful finalize field population; atomicity (forced PDF/storage failure leaves event not `SETTLED`); and immutability proof (post-settlement DB mutation does not re-render the stored PDF).
- **FR-025**: Frontend MUST include automated tests covering signature canvas capture/serialization, post-finalize read-only locking, and control hiding for unauthorized roles.
- **FR-026**: System MUST achieve ≥80% line/branch coverage across backend and frontend for this feature (CI-enforced).

#### Infrastructure & Security

- **FR-027**: System MUST source Google Cloud Storage credentials via GCP Secret Manager, encrypt data at rest with AES-256, and enforce TLS 1.3 in transit.

### Key Entities *(include if feature involves data)*

- **Event** (extended): Immutable audit footprint columns on the `events` table: `status` (`event_status` enum, default `PRE_SHOW`), `is_budget_locked` (boolean, default false), `settled_at` (timestamptz), `settled_by_user_id` (UUID FK → users), `artist_signature_data` (text; base64 vector coordinate array of touchscreen input), `settlement_pdf_url` (text; permanent object-storage path to the frozen PDF).
- **FinancialLineItem** (consumed/snapshotted): Proforma/settlement values captured point-in-time into the PDF at finalize; `is_artist_deduction` flag drives overhead stripping before contract-percentage computation.
- **EventArtist** (consumed/snapshotted): `calculated_net_payout` captured point-in-time into the PDF snapshot.
- **Settlement PDF Artifact**: The rendered, immutable PDF stored in the WORM GCS bucket and referenced by `events.settlement_pdf_url`; the legally defensible record of truth.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of successful finalize operations result in an event with `status = SETTLED` and populated `settled_at`, `settled_by_user_id`, `artist_signature_data`, and a non-null `settlement_pdf_url` (proven by tests).
- **SC-002**: 100% of finalize operations that encounter a PDF-render or storage failure leave the event in its prior non-`SETTLED` state with no partial freeze (atomicity proven by forced-failure tests).
- **SC-003**: 100% of post-settlement mutation attempts against `events`, `event_artists`, or `financial_line_items` are rejected with an explicit, logged error (HTTP 400 / `InvalidOperationException`).
- **SC-004**: After settlement, forcibly mutating underlying database values does not re-render or alter the stored PDF object — the archived snapshot is byte-stable (immutability proven by tests).
- **SC-005**: 100% of finalize attempts by roles lacking `can_sign_settlement` or against out-of-scope venues are rejected with HTTP 403/404.
- **SC-006**: 0 settlement PDF objects in the WORM bucket can be overwritten or deleted within the 7-year retention lock window (retention policy enforced), including after a settlement reversal (the original artifact is always preserved).
- **SC-006a**: 100% of settlement-reversal attempts by non-super-admins are rejected with HTTP 403, and 100% of successful reversals record a complete audit trail and leave the original archived PDF intact (proven by tests).
- **SC-007**: No raw signature payloads, PII, or storage credentials appear in any log output (proven by log-sanitization tests).
- **SC-008**: After a successful finalize, 100% of settlement inputs render read-only with a "Settled / Locked" indicator and a working PDF link.
- **SC-009**: ≥80% line/branch coverage achieved across backend and frontend code for this feature.

## Assumptions

- The Tenant Foundation & RBAC feature (SPLR-16) is complete, providing `ITenantContext`, the `can_sign_settlement` permission, permission enforcement, and EF Core tenant isolation.
- The Financial Ledger Grid & Math Engine feature (SPLR-17) is complete, providing the `events`, `financial_line_items`, and `event_artists` entities, the `DealMathEngine`, the `is_artist_deduction` flag, `calculated_net_payout`, and the budget-lock (State 1 → State 2) transition.
- The `event_status` enum and the `events` audit columns may already exist from SPLR-17; if absent, this feature adds them via migration.
- A Google Cloud Storage bucket with a strict Object Retention Policy (WORM) is provisioned, and its credentials are available via GCP Secret Manager.
- The server-side PDF library (e.g., QuestPDF or DinkToPdf) is an acceptable implementation choice; the specific library is a planning decision.
- QBO ingestion that populates State 3 actuals (SPLR-18), full Playwright E2E lifecycle traversal (SPLR-20), native mobile signature apps, and direct QBO writes are out of scope.
