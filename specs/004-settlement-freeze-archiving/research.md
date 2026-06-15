# Phase 0 Research: Night-of Settlement Freeze Pipeline & Immutable Archiving

This document records the technology and approach decisions that resolve the open questions for the settlement freeze pipeline. All clarifications from the spec's Clarifications session are reflected here.

## 1. Server-side PDF generation library

- **Decision**: Use **QuestPDF** (`QuestPDF` NuGet package, Community license).
- **Rationale**: Fully managed C# (no native binaries), renders reliably in a Linux Cloud Run container, has a fluent layout API well-suited to embedding a financial table plus a rasterized signature, and produces deterministic byte output for testing. The Community license is free for organizations under the QuestPDF revenue threshold (MVP qualifies). License type is set once at startup (`QuestPDF.Settings.License = LicenseType.Community;`).
- **Alternatives considered**:
  - **DinkToPdf / wkhtmltopdf**: requires a native `libwkhtmltox` binary shipped in the container; fragile on Cloud Run, heavier image, and effectively unmaintained. Rejected.
  - **Headless Chromium (Playwright/Puppeteer print-to-PDF)**: heavyweight runtime dependency, slow cold starts, overkill for a single templated document. Rejected.

## 2. Rendering the touchscreen signature into the PDF

- **Decision**: The frontend serializes the signature as a **base64-encoded JSON vector array** (array of strokes; each stroke an array of `{x, y}` points, normalized to the canvas dimensions). The backend stores this verbatim in `events.artist_signature_data` and, for the PDF, rasterizes the vector path to a small PNG (drawn via `System.Drawing`-free path: QuestPDF `Canvas`/SkiaSharp dynamic image) which is embedded into the document.
- **Rationale**: Storing the vector array (not a flattened image) preserves the legally meaningful raw input and keeps the stored payload compact; rasterizing only at render time keeps the PDF self-contained. QuestPDF's dynamic-image/SkiaSharp surface can draw polylines from the vector points without extra heavy dependencies.
- **Alternatives considered**: Submitting a pre-rasterized PNG data URL from the browser — rejected because the constitution/PRD specify capturing the *vector coordinate array* as the source of truth, and server-side rasterization avoids trusting client-rendered pixels.

## 3. Immutable (WORM) object storage

- **Decision**: Store settlement PDFs in a dedicated **Google Cloud Storage** bucket configured (via infrastructure, not app code) with a **bucket-level Object Retention Policy** enforcing a **7-year minimum retention** (per clarification). The application uploads via **`Google.Cloud.Storage.V1`** behind an `ISettlementArchiveStore` abstraction.
- **Object naming**: `settlements/{organizationId}/{venueId}/{eventId}/{settlementId}.pdf`, where `settlementId` is a freshly generated GUID per finalize. A re-settlement after a reversal generates a new `settlementId`, hence a new object — the original is never overwritten.
- **Rationale**: A bucket Object Retention Policy makes every uploaded object immutable for the retention duration regardless of IAM, satisfying the "cannot overwrite or delete after upload" criterion. Per-object GUID paths guarantee uploads never collide with or overwrite a prior artifact.
- **Atomicity ordering**: render PDF in memory → **upload to GCS first** → then open a DB transaction that sets signature/`settled_at`/`settled_by_user_id`/`settlement_pdf_url`/`status = SETTLED` and commits. If the upload fails, the event is never mutated (no partial freeze). If the DB commit fails *after* a successful upload, the orphaned object is simply never referenced by any event (harmless; cannot be deleted due to WORM but incurs negligible cost). This ordering guarantees the invariant "an event is `SETTLED` ⟹ its `settlement_pdf_url` points to a real immutable object."
- **Alternatives considered**: Uploading after the DB commit — rejected because a post-commit upload failure would leave a `SETTLED` event with a null/dangling PDF URL, violating the no-partial-freeze invariant. Using a generic blob abstraction with local disk in prod — rejected (no WORM guarantee).

## 4. Credentials and signed-URL access

- **Decision**: On Cloud Run, access GCS via **Application Default Credentials backed by Workload Identity** (the service account is granted object create + sign permissions on the bucket). The bucket is **private** (no public objects). Authorized users retrieve the archived PDF through an endpoint that mints a **short-lived V4 signed URL** (default TTL 15 minutes, configurable), gated by the viewer's permission and venue scope (per clarification).
- **Rationale**: Workload Identity avoids long-lived key files in the container; V4 signed URLs keep the bucket private while letting browsers download directly from GCS without proxying bytes through the API. Any explicit secret (e.g., a signing key for local/dev) is sourced from **GCP Secret Manager**, consistent with the QBO feature's secret handling.
- **Alternatives considered**:
  - **Streaming bytes through an authenticated API endpoint**: simpler tenancy story but adds API egress/latency and memory pressure for large files. Kept as a fallback; signed URL chosen as primary.
  - **Public bucket URL stored in `settlement_pdf_url`**: rejected — leaks a permanent, unauthenticated link to a legal financial document.

## 5. Concurrency control on finalize

- **Decision**: Add an **`xmin` optimistic-concurrency token** to the `Event` entity (mirroring the existing pattern on `FinancialLineItem` and `EventArtist` via `RowVersionFormat`). The finalize transaction loads the tracked event, validates `status == PreShow` (+ budget locked), and on `SaveChanges` relies on the `xmin` check; a concurrent second finalize that lost the race throws `DbUpdateConcurrencyException`, surfaced as `ConcurrencyConflictException` → **HTTP 409** (per clarification: first-wins, exactly one PDF).
- **Rationale**: Reuses an established, tested pattern in this codebase; no new locking primitives. Combined with the upload-before-commit ordering, the loser is rejected before referencing a second artifact (the loser's upload, if it occurred, becomes a harmless orphan).
- **Alternatives considered**: `SELECT ... FOR UPDATE` row lock via raw SQL — heavier, awkward with EF, and unnecessary given the existing concurrency-token convention. Application-level mutex/queue — rejected as more complex and not horizontally safe.

## 6. Signature validation

- **Decision**: A `SignatureValidator` decodes the base64 payload, parses it as a JSON vector array, and requires it to be **non-empty and structurally valid with at least one stroke** (per clarification). Missing/empty/non-base64/zero-stroke payloads throw `SignatureValidationException` → **HTTP 400**, before any PDF render or state change.
- **Rationale**: Blocks empty/accidental submissions and guarantees the PDF embeds a real mark, without imposing arbitrary point-count thresholds that could reject legitimate short signatures.

## 7. Reversal model and authorization (super-admin exit)

- **Decision**: Add a dedicated least-privilege permission **`can_reverse_settlement`** (new boolean column on `organization_roles`, granted to the Admin role by default; default `false` for others) rather than overloading `can_manage_permissions`. The reversal endpoint requires this permission, records a `settlement_reversals` audit row (`event_id`, `reversed_by_user_id`, `reason`, `previous_pdf_url`, `reversed_at`), transitions the event back to `PreShow` (budget remains locked so it can be re-settled), and **leaves the original PDF untouched** in the WORM bucket. Re-finalizing produces a new `settlementId`/object.
- **Rationale**: An explicit permission is consistent with the existing per-capability boolean RBAC model and is auditable/least-privilege. Reverting to `PreShow` (budget-locked) re-opens exactly the settlement column for correction without dropping back to proforma editing.
- **Alternatives considered**: Reusing `can_manage_permissions` as the "super-admin" gate — workable but less explicit and conflates concerns. A separate `REVERSED` status — rejected as unnecessary; the audit table plus return-to-`PreShow` captures history without expanding the state enum.

## 8. Where the immutability guard already lives

- **Finding**: `LedgerService.AssertNotSettledOrReconciled(Event)` already throws `LedgerStateException` (→ HTTP 400, logged) and is invoked on every line-item and artist create/update/delete path. `LedgerService.LockBudgetAsync` and `ValidateLineItemColumnEditAsync` also already gate on status. `GetEditability` already returns all-`read-only` for `Settled`/`Reconciled`.
- **Decision**: Reuse this guard as the enforced immutability criterion; the settlement work adds **no new mutable write paths** to `events`/`event_artists`/`financial_line_items` except the finalize and the audited reversal. Integration tests assert every existing mutation path rejects post-settlement edits.

## 9. Test isolation for PDF + storage

- **Decision**: Register `ISettlementArchiveStore` → `GcsSettlementArchiveStore` in `Program.cs`. Integration tests override it (via `WebApplicationFactory.WithWebHostBuilder`, mirroring `CreateFactoryWithQboHandler`) with an **in-memory fake** that records uploaded bytes/paths and can be configured to throw (for the atomicity test). `SettlementPdfRenderer` is exercised directly in unit tests asserting a non-empty PDF byte stream. No external GCS calls in CI.
