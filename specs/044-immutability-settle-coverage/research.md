# Phase 0 Research: Close Immutability Verification Gaps After Full Settlement

This document resolves technical decisions for SPLR-39 — closing xUnit integration coverage gaps where immutability is proven only via helper-seeded `SETTLED`/`RECONCILED` status instead of the real finalize (and reconcile) lifecycle.

## 1. Current coverage gap (audit baseline)

- **Decision**: Treat `FrozenEventMutationAuditTests` as **helper-seeded** coverage (uses `SetEventStatusDirectAsync` after lock-budget). Treat `SettlementImmutabilityTests.PostSettle_MutationsReturn400_AndPdfUnchanged` as the **only** real-finalize immutability test today — and it covers only line-item update + lock-budget + PDF stability.
- **Rationale**: SPLR-19 §8.1 and SPLR-39 explicitly call out the lifecycle seeding gap. Helper seeding skips PDF generation, archive promotion, and settlement metadata population — the production path auditors care about.
- **Alternatives considered**:
  - **Replace helper tests entirely** — rejected; helper tests remain valuable for fast audit-label matrix coverage; this feature **adds** real-finalize counterparts for gap paths.
  - **Duplicate every audit test with real finalize** — rejected as redundant; extend only SPLR-39 gap paths plus PDF byte assertions.

## 2. Shared test seeding strategy

- **Decision**: Add `SeedFinalizedEventAsync` to `IntegrationTestBase` that:
  1. Calls existing `SeedSettlementReadyEventAsync` (event + locked budget + settlement line item).
  2. Optionally creates an artist via API when artist mutation tests need one.
  3. POST `/settle` with `FinalizeSettlementRequest(ValidSignatureBase64(), true)`.
  4. Returns `(EventId, LineItemDto?, EventArtistDto?, storedPath, originalPdfBytes, userId)`.
  5. Guards with `if (!IsQuestPdfSupported()) return;` at test entry (same convention as `SettlementImmutabilityTests`).
- **Rationale**: Single canonical lifecycle seed eliminates drift between test classes; matches spec FR-001.
- **Alternatives considered**:
  - **Per-test inline finalize** — rejected; duplication across ~15 cases.
  - **Test seeding API shortcut** — rejected; bypasses real finalize pipeline under test.

## 3. Test class organization

- **Decision**: Create `SettlementPostFinalizeImmutabilityTests.cs` (`EnableLogCapture => true`) for all new SPLR-39 scenarios. Refactor `SettlementImmutabilityTests` to call shared `SeedFinalizedEventAsync` (optional thin wrapper).
- **Rationale**: Colocates PDF byte assertions + audit log assertions; keeps `FrozenEventMutationAuditTests` focused on helper-fast matrix; avoids a 500-line mega-file.
- **Alternatives considered**:
  - **Extend `SettlementImmutabilityTests` only** — rejected; mixed concerns (audit vs PDF) and growing file size.
  - **Extend `FrozenEventMutationAuditTests`** — rejected; that class intentionally uses helper seeding for speed.

## 4. Mutation path test matrix (real finalize)

- **Decision**: Add integration tests (each: HTTP 400, audit log, PDF bytes unchanged unless noted):

| Priority | Mutation | HTTP route | Audit `Operation` |
|----------|----------|------------|-------------------|
| P1 | Delete line item | `DELETE .../line-items/{id}` | `delete_line_item` |
| P1 | Update artist | `PUT .../artists/{id}` | `update_artist` |
| P1 | Delete artist | `DELETE .../artists/{id}` | `delete_artist` |
| P1 | Create line item | `POST .../line-items` | `create_line_item` |
| P1 | Update event metadata | `PATCH .../events/{id}` | `update_event_metadata` |
| P1 | Delete event | `DELETE .../events/{id}` | `delete_event` |
| P1 | Create artist | `POST .../artists` | `create_artist` |
| P1 | Re-lock budget | `POST .../lock-budget` | `lock_budget` |
| P2 | Update line item (RECONCILED) | `PUT .../line-items/{id}` | `update_line_item` |
| P2 | Update artist (RECONCILED) | `PUT .../artists/{id}` | `update_artist` |
| P2 | Delete artist (RECONCILED) | `DELETE .../artists/{id}` | `delete_artist` |

- **Rationale**: Covers SPLR-39 gap list plus completes FR-003 inventory under real finalize seeding.
- **Alternatives considered**: Parameterized `[Theory]` — acceptable optional refactor; start with explicit `[Fact]` per path for clearer failure diagnosis (matches existing style).

## 5. RECONCILED lifecycle seeding

- **Decision**: For RECONCILED scenarios: `SeedFinalizedEventAsync` → POST `/reconcile` (sanctioned workflow, same as `ReconcileControllerTests`) → attempt mutations. **No** `SetEventStatusDirectAsync`.
- **Rationale**: Spec FR-004 / SC-003 require real reconcile transition after finalize.
- **Alternatives considered**: Helper `RECONCILED` status — rejected by spec.

## 6. Recalculate on frozen events

- **Decision**: Add service-layer guard in `LedgerService.RecalculateAsync` calling `_frozenEventAuditor.RejectIfFrozen` with new operation constant `FrozenEventMutationOperation.Recalculate` (`recalculate`). Integration test: POST `/recalculate` on finalized event → 400 + audit + PDF unchanged.
- **Rationale**: `RecalculateAsync` today calls `RecalculateAndPersistAsync` which modifies `EventArtist.CalculatedNetPayout` on frozen events — a prohibited mutation class. Persistence guard may catch it, but service-layer guard + audit label matches specs 004/039 contract and produces HTTP 400 (not unhandled persistence exception).
- **Alternatives considered**:
  - **Test persistence rejection only** — rejected; no `recalculate` operation label; weaker HTTP contract proof.
  - **Allow recalculate on frozen** — rejected; violates Constitution V (artist payout drift vs PDF snapshot).

## 7. QBO sync on frozen events (constitution exception)

- **Decision**: Split into two verification scenarios:
  1. **Sanctioned actuals refresh (allowed)**: POST `/sync` on finalized event with mocked QBO handler + seeded mappings → **200 OK**; only `QboActualValue`/`UpdatedAt` change; **PDF bytes unchanged**; no immutability audit rejection log.
  2. **Prohibited mutation via sync (rejected)**: Covered indirectly — persistence guard tests in spec 041; optional follow-up if offset correction ever touches non-actuals line-item fields on frozen events (out of scope unless test reveals defect).
- **Rationale**: Constitution IV/V explicitly permit QBO actuals aggregation on frozen events (see `QboSyncService.RecomputeActualsForEventAsync` comment). Spec FR-005 "rejection" applies to **recalculate** and to sync paths that violate immutability — not to sanctioned actuals refresh. SC-001 "QBO sync" gap = prove frozen-event sync does not corrupt archived PDF or settlement snapshot fields.
- **Alternatives considered**:
  - **Reject all sync on frozen** — rejected; breaks constitutionally sanctioned workflow tested in `FrozenEventPersistenceGuardTests.SettledEvent_QboActualsOnlyUpdate_Succeeds`.

## 8. PDF byte stability assertions

- **Decision**: Every blocked-mutation test captures `originalBytes = ArchiveStore.GetStoredPdf(storedPath)` immediately after finalize; after rejected HTTP call, assert `ArchiveStore.GetStoredPdf(storedPath).Should().Equal(originalBytes)` and `ArchiveStore.StoredObjectCount` unchanged.
- **Rationale**: Spec FR-006/FR-007; extends existing pattern in `SettlementImmutabilityTests`.
- **Alternatives considered**: Hash-only fingerprint — rejected; byte equality already used in repo.

## 9. Defect-fix scope boundary

- **Decision**: Primary deliverable is **tests + shared helpers**. Product code changes limited to:
  - `FrozenEventMutationOperation.Recalculate` constant
  - `LedgerService.RecalculateAsync` guard (if not already present)
  - Extend spec 039 contract doc with `recalculate` operation label (implementation phase)
- **Rationale**: Spec assumption: guards exist; tests prove gaps. Recalculate guard is a known missing service-layer check exposed by SPLR-39 audit.
- **Alternatives considered**: Test-only without guard fix — rejected; test would fail or prove wrong layer.

## 10. Frontend / API surface

- **Decision**: **Backend test-only** feature. No DTO, route, OpenAPI, or frontend changes expected.
- **Rationale**: Verification gap closure; immutability behavior already specified in specs 004/039/041.
- **Alternatives considered**: N/A
