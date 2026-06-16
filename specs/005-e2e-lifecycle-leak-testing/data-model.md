# Phase 1 Data Model: Full-Scale E2E Lifecycle & Cross-Tenant Leak Testing

This milestone introduces **no new persisted domain entities, columns, or migrations**. The "entities" here are *test/verification constructs* (seed fixtures, captured requests, gate results) and the deterministic seed dataset that makes isolation, lifecycle, and integrity assertions reproducible. Existing domain tables (`organizations`, `venues`, `events`, `event_artists`, `financial_line_items`, `qbo_*`, `settlement_reversals`) are reused exactly as delivered in features 002–004.

---

## 1. Seeded verification dataset (deterministic)

Provisioned per E2E run by the seeding surface (see `contracts/seeding-api.md`). All identifiers and amounts are fixed sentinels so cross-tenant negative-assertions and exact-math assertions are reproducible.

### Organization Test Context (×2)

| Field | Org A | Org B | Notes |
|-------|-------|-------|-------|
| Org name | `E2E Org Alpha` | `E2E Org Bravo` | distinct sentinels for leak scanning |
| Admin user | `alpha-admin@e2e.test` | `bravo-admin@e2e.test` | full-permission org admin |
| Scoped user | `alpha-scoped@e2e.test` | `bravo-scoped@e2e.test` | venue-scoped to a subset only |
| Venue (in-scope) | `Alpha Main Hall` | `Bravo Main Hall` | scoped user CAN access |
| Venue (out-of-scope) | `Alpha Side Room` | `Bravo Side Room` | scoped user must be DENIED (FR-005) |

**Invariants**: each context is fully isolated (own `organization_id`); no shared rows; sentinel strings/amounts of Org B never appear in any Org A response and vice-versa (US1, SC-001).

### Lifecycle Test Event (in Org A, `Alpha Main Hall`)

| Aspect | Seeded value | Used by |
|--------|--------------|---------|
| Initial status | `PreShow` (planning), budget unlocked | FR-006/007 |
| Planning line items | fixed `proforma_value` decimals | editability assertions |
| Settlement values | fixed `settlement_value` decimals | FR-008 exact base-10 result |
| Expected computed payout/totals | precomputed decimal-string literals | FR-008 / SC-002 assertion |
| Signature | simulated touch pointer-drag stroke | FR-009 |
| Settlement document | produced at finalize, hashed for immutability | FR-010/012, SC-003 |
| Deterministic QBO actuals | fixed amounts per mapped account | FR-011a variance, US2 #5 |

**State transitions verified** (existing state machine, no new code):

```
PreShow ──lock-budget──▶ (budget locked, settlement editable) ──settle(signature)──▶ SETTLED (absolute read-only)
                                                                                          │
                                                                  reconciliation actuals ingested (fake QBO)
                                                                                          ▼
                                                                                   variance displayed
```

Field-editability rules asserted at each state (FR-007): planning fields editable only in `PreShow`; settlement fields editable only after budget lock; **all** fields read-only after finalization.

---

## 2. Verification constructs (not persisted)

### Captured API Request (cross-tenant replay)
- **Fields**: method, URL/path, headers (auth stripped/swapped), body, captured-from-org.
- **Lifecycle**: captured from Org A session → identifiers rewritten to Org B's IDs → replayed under Org A auth.
- **Assertion**: response is `403`/`404` AND body contains zero Org-B sentinels (FR-004, D9).

### Cross-Tenant Attempt Result
- **Fields**: attempt kind (`direct-nav` | `replay` | `venue-scope`), target foreign ID, response status, `foreignDataLeaked: boolean` (derived from deep sentinel scan).
- **Invariant**: `foreignDataLeaked` MUST be `false` for 100% of attempts (SC-001).

### Settlement Document Snapshot
- **Fields**: retrieved bytes, content hash (pre-mutation), content hash (post-mutation).
- **Invariant**: pre-hash == post-hash; no re-render observed (FR-012, SC-003).

### Egress Record (from `QboEgressRecordingHandler`)
- **Fields**: HTTP method, target host, timestamp (no auth header, no body — Constitution VIII).
- **Invariant**: zero records with method ∈ {POST, PUT, DELETE} toward the Intuit base URL across all exercised behaviors (FR-011, SC-004).

---

## 3. Quality Gate Result (CI evaluation model)

| Field | Type | Source | Blocking rule |
|-------|------|--------|---------------|
| `backendCoveragePct` | decimal | coverlet cobertura | `< 80.0` ⇒ FAIL (FR-013) |
| `frontendCoveragePct` | decimal | vitest lcov | `< 80.0` ⇒ FAIL (FR-013) |
| `coverageReportPresent` | bool (per side) | report parse | missing/unparseable ⇒ FAIL (spec edge case) |
| `e2eResult` | pass/fail | Playwright matrix | any scenario failing after retry budget ⇒ FAIL (FR-014/014a) |
| `typeDriftClean` | bool | `git diff` on generated-api.ts | drift ⇒ FAIL (FR-019) |
| `frontendBuildOk` | bool | `tsc` + `vite build` | failure ⇒ FAIL (FR-020/SC-007) |
| `previewTornDown` | bool | teardown step | always executed regardless of outcome (FR-016/SC-006) |

**Merge decision**: merge is permitted only when every blocking rule passes; the coverage gate job and the E2E gate job are configured as **required status checks** on `main` (FR-017, SC-008). The preview teardown runs unconditionally (`if: always()`), independent of the merge decision (FR-016, SC-006).

---

## 4. Reused existing entities (reference only — unchanged)

`Organization`, `Venue`, `Event` (+ `Status`, `IsBudgetLocked`, `ArtistSignatureData`, `SettlementPdfUrl`, `xmin`), `EventArtist`, `FinancialLineItem` (+ `ProformaValue`, `SettlementValue`, `QboActualValue`), `OrganizationRole` (+ `CanSignSettlement`, `CanReverseSettlement`, scoped-venue membership), `QboVenueCredential`, `QboAccountMapping`, `QboSyncLedger`, `SettlementReversal`. No schema deltas in this milestone (FR-022).
