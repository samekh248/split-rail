# Tasks: Night-of Settlement Freeze Pipeline & Immutable Archiving

**Input**: Design documents from `specs/004-settlement-freeze-archiving/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included per FR-024/FR-025/FR-026 and Constitution III — xUnit unit tests (`SettlementService`, `SignatureValidator`, `SettlementPdfRenderer`), Testcontainers integration tests (finalize, authorization, atomicity, concurrency, immutability, reversal, tenant isolation), Vitest + RTL for settlement UI components.

**Organization**: Tasks grouped by user story. Each story is independently testable after its phase completes.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add packages, configuration, exceptions, DTOs, and DI scaffolding for the settlement freeze pipeline.

- [X] T001 Add NuGet packages to `apps/api/split-rail-api.csproj` — `QuestPDF`, `Google.Cloud.Storage.V1`
- [X] T002 Create `SettlementArchiveOptions` in `apps/api/Configuration/SettlementArchiveOptions.cs` — `BucketName`, `SignedUrlTtlMinutes` (default 15); bind section in `apps/api/appsettings.json` and `apps/api/Program.cs`
- [X] T003 [P] Add settlement domain exceptions in `apps/api/Exceptions/ApiExceptions.cs` — `SettlementStateException`, `SettlementArchiveException`, `SignatureValidationException`
- [X] T004 [P] Map settlement exceptions to HTTP status in `apps/api/Middleware/ExceptionHandlerMiddleware.cs` — `SettlementStateException`/`SignatureValidationException` → 400, `SettlementArchiveException` → 502
- [X] T005 [P] Create settlement DTO records in `apps/api/DTOs/Settlement/SettlementDtos.cs` — `FinalizeSettlementRequest`, `SettlementResultDto`, `ReverseSettlementRequest`, `SettlementPdfLinkDto`; monetary fields as `string` where applicable
- [X] T006 Configure QuestPDF Community license, `SettlementArchiveOptions` binding, and `ISettlementArchiveStore` → `GcsSettlementArchiveStore` registration in `apps/api/Program.cs`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Schema deltas, entities, migration, signature validation, archive-store abstraction, and test helpers. MUST complete before any user story.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T007 Extend `Event` model in `apps/api/Models/Event.cs` — add `ArtistSignatureData`, `SettlementPdfUrl`, `Xmin` concurrency token, `ICollection<SettlementReversal> Reversals`
- [X] T008 [P] Create `SettlementReversal` entity in `apps/api/Models/SettlementReversal.cs` per data-model.md — event FK, reversed_by_user_id, reason, previous_pdf_url, reversed_at
- [X] T009 [P] Extend `OrganizationRole` in `apps/api/Models/OrganizationRole.cs` — add `CanReverseSettlement`; add `PermissionNames.ReverseSettlement` in `apps/api/Services/PasswordValidator.cs`; add policy + handler case in `apps/api/Authorization/PermissionAuthorization.cs` and `apps/api/Program.cs`
- [X] T010 Update `apps/api/Data/ApplicationDbContext.cs` — map new `Event` columns (`artist_signature_data`, `settlement_pdf_url`, `xmin` concurrency token); configure `SettlementReversal` table, indexes, and tenant query filter via `Event.Venue.OrganizationId`
- [X] T011 Generate EF Core migration `AddSettlementArchiveColumns` in `apps/api/Data/Migrations/` — `events` columns + `settlement_reversals` table + `can_reverse_settlement` on `organization_roles`; seed Admin role with `CanReverseSettlement = true`
- [X] T012 [P] Implement `SignatureValidator` in `apps/api/Services/SignatureValidator.cs` — decode base64, parse JSON vector array, require ≥1 stroke; throw `SignatureValidationException` on missing/empty/malformed/zero-stroke input
- [X] T013 [P] Define `ISettlementArchiveStore` in `apps/api/Services/ISettlementArchiveStore.cs` — `UploadAsync(objectPath, pdfBytes)` and `CreateSignedUrlAsync(objectPath, ttl)`; implement `GcsSettlementArchiveStore` in `apps/api/Services/GcsSettlementArchiveStore.cs` (WORM upload + V4 signed URL); implement `InMemorySettlementArchiveStore` in `apps/api.tests/Integration/InMemorySettlementArchiveStore.cs` for Testcontainers tests
- [X] T014 [P] Extend `apps/api.tests/Integration/IntegrationTestBase.cs` — helpers to lock budget, seed settlement-ready event (budget locked + settlement values), override `ISettlementArchiveStore` via `WebApplicationFactory`, and read stored PDF bytes from fake store
- [X] T015 Register `SignatureValidator` and `SettlementPdfRenderer` as scoped services in `apps/api/Program.cs`

**Checkpoint**: Foundation ready — user story implementation can now begin.

---

## Phase 3: User Story 1 — Freeze settlement with touchscreen signature and immutable PDF archive (Priority: P1) 🎯 MVP

**Goal**: Atomic finalize pipeline — validate state + signature, snapshot financials, render immutable PDF, upload to WORM bucket, persist audit fields, transition event to `SETTLED`.

**Independent Test**: `POST …/settle` on a budget-locked `PRE_SHOW` event with a valid signature → `200`; event `status=SETTLED` with `settled_at`, `settled_by_user_id`, `artist_signature_data`, and non-null `settlement_pdf_url`; PDF retrievable via signed URL — per quickstart Scenario A.

### Tests for User Story 1

- [X] T016 [P] [US1] Write unit tests in `apps/api.tests/Unit/SignatureValidatorTests.cs` — valid vector passes; missing/empty/non-base64/zero-stroke signatures throw `SignatureValidationException`
- [X] T017 [P] [US1] Write unit tests in `apps/api.tests/Unit/SettlementPdfRendererTests.cs` — renders non-empty PDF bytes embedding signature strokes and settlement financial block from snapshot DTO
- [X] T018 [P] [US1] Write unit tests in `apps/api.tests/Unit/SettlementServiceTests.cs` — rejects finalize when budget not locked, already `SETTLED`, or `confirmed=false`; snapshot captures settlement values and `calculated_net_payout`
- [X] T019 [P] [US1] Write integration tests in `apps/api.tests/Integration/SettlementFinalizeTests.cs` — happy path populates all settled fields and stores one PDF object in fake archive store
- [X] T020 [P] [US1] Write integration tests in `apps/api.tests/Integration/SettlementAuthorizationTests.cs` — `403` without `can_sign_settlement`; `404`/`403` for out-of-scope venue; `400` for malformed signature and unlocked budget
- [X] T021 [P] [US1] Write integration tests in `apps/api.tests/Integration/SettlementAtomicityTests.cs` — forced archive-store upload failure leaves event not `SETTLED` with null `settlement_pdf_url` (HTTP 502)
- [X] T022 [P] [US1] Write integration tests in `apps/api.tests/Integration/SettlementConcurrencyTests.cs` — two parallel finalizes → one `200`, one `409`; exactly one stored PDF object

### Implementation for User Story 1

- [X] T023 [US1] Implement `SettlementPdfRenderer` in `apps/api/Services/SettlementPdfRenderer.cs` — QuestPDF document with event/venue header, settlement financial table (line items + artist payouts + deal-math summary), and rasterized vector signature; all money formatted from `decimal`
- [X] T024 [US1] Implement `SettlementService.FinalizeAsync` in `apps/api/Services/SettlementService.cs` — validate `PreShow` + budget locked + signature; snapshot line items/artists; render PDF; upload-before-commit to `settlements/{org}/{venue}/{event}/{settlementId}.pdf`; DB transaction sets signature/`settled_at`/`settled_by_user_id`/`settlement_pdf_url`/`status=SETTLED` with `xmin` concurrency; never log raw signature payloads
- [X] T025 [US1] Create `SettlementController` in `apps/api/Controllers/SettlementController.cs` — `POST api/venues/{venueId}/events/{eventId}/settle` per contracts/settle.md; `[RequirePermission(PermissionNames.SignSettlement)]`; venue scope via `VenueService`
- [X] T026 [US1] Add `GET api/venues/{venueId}/events/{eventId}/settlement-pdf` to `apps/api/Controllers/SettlementController.cs` per contracts/settlement-pdf.md — mint short-lived signed URL; `[RequirePermission(PermissionNames.ViewFinancials)]`
- [X] T027 [US1] Register `SettlementService` as scoped in `apps/api/Program.cs`; extend `EventService.ToEventResponse` / `LedgerService.BuildLedgerGrid` in `apps/api/Services/EventService.cs` and `apps/api/Services/LedgerService.cs` to surface `settledAt` and settlement-PDF availability in responses where needed

**Checkpoint**: MVP complete — settlement freeze pipeline functional with atomicity and signed-URL retrieval (SC-001, SC-002, SC-005, SC-006).

---

## Phase 4: User Story 2 — Immutability guardrails reject post-settlement edits (Priority: P1)

**Goal**: Prove and enforce that `SETTLED`/`RECONCILED` events reject all mutations with explicit logged errors; provide the audited super-admin reversal exit that preserves the original WORM PDF.

**Independent Test**: Settle an event, attempt line-item/artist/event mutations → all `400`; stored PDF bytes unchanged; super-admin reversal audited and original PDF preserved; non-super-admin reversal → `403` — per quickstart Scenarios B and D.

### Tests for User Story 2

- [X] T028 [P] [US2] Write integration tests in `apps/api.tests/Integration/SettlementImmutabilityTests.cs` — after settle, `PUT/POST/DELETE` on line items and artists via `LedgerController` all return `400` (`ledger_state`); `POST lock-budget` rejected; `PRE_SHOW` mutations still succeed on a non-settled control event; archive-store fake confirms PDF bytes unchanged
- [X] T029 [P] [US2] Write integration tests in `apps/api.tests/Integration/SettlementReversalTests.cs` — `403` without `can_reverse_settlement`; `200` for Admin writes `settlement_reversals` audit row with `previous_pdf_url`; event returns to `PRE_SHOW` (budget still locked); original PDF object preserved; re-finalize creates distinct second object

### Implementation for User Story 2

- [X] T030 [US2] Audit all `events` mutation paths in `apps/api/Services/EventService.cs` and `apps/api/Services/LedgerService.cs` — confirm `AssertNotSettledOrReconciled` (or equivalent status guard) prepends every write to `events`, `event_artists`, and `financial_line_items`; add guard to any uncovered path discovered during T028
- [X] T031 [US2] Implement `SettlementService.ReverseAsync` in `apps/api/Services/SettlementService.cs` — validate `SETTLED`; require non-empty reason; INSERT `settlement_reversals` audit row; transition `status=PreShow` (keep `is_budget_locked=true`); clear `settlement_pdf_url` without deleting GCS object; log reversal with event/user IDs only
- [X] T032 [US2] Add `POST api/venues/{venueId}/events/{eventId}/reverse-settlement` to `apps/api/Controllers/SettlementController.cs` per contracts/reversal.md — `[RequirePermission(PermissionNames.ReverseSettlement)]`

**Checkpoint**: Immutability guard proven; audited reversal functional with original PDF preserved (SC-003, SC-004, SC-006a).

---

## Phase 5: User Story 3 — Touchscreen signature capture and instant field locking (Priority: P2)

**Goal**: HTML5 signature canvas with clear/redo, finalize confirmation, instant read-only workspace lock, PDF link, and permission-gated controls.

**Independent Test**: Authorized user draws signature → serializes to base64 vector → finalizes → inputs read-only with "Settled / Locked" banner and PDF link; unauthorized user sees hidden controls — per quickstart Scenario C.

### Tests for User Story 3

- [X] T033 [P] [US3] Write component tests in `apps/web/tests/settlement/SignaturePad.test.tsx` — captures pointer strokes, serializes to base64 vector JSON, clear/redo resets canvas
- [X] T034 [P] [US3] Write component tests in `apps/web/tests/settlement/FinalizeSettlementPanel.test.tsx` — requires confirmation checkbox; calls finalize mutation with signature payload; shows pending/error states
- [X] T035 [P] [US3] Write component tests in `apps/web/tests/settlement/SettlementLockedBanner.test.tsx` — renders "Settled / Locked" when status is `SETTLED`; shows PDF link that fetches signed URL; hidden when not settled

### Implementation for User Story 3

- [X] T036 [P] [US3] Regenerate OpenAPI types and create TanStack Query hooks in `apps/web/src/api/settlement.ts` — `useFinalizeSettlement`, `useSettlementPdfLink`, `useReverseSettlement`; import types from `apps/web/src/types/generated-api.ts` only
- [X] T037 [P] [US3] Add `useCanSignSettlement` hook in `apps/web/src/api/user.ts` — reads `canSignSettlement` from `UserProfileResponse`
- [X] T038 [US3] Implement `SignaturePad` in `apps/web/src/components/settlement/SignaturePad.tsx` — HTML5 `<canvas>` with mouse/pointer/touch capture; exports base64-encoded JSON vector array; clear/redo controls
- [X] T039 [US3] Implement `FinalizeSettlementPanel` in `apps/web/src/components/settlement/FinalizeSettlementPanel.tsx` — embeds `SignaturePad`, explicit "Finalize Settlement" confirmation, calls `POST …/settle`; hidden/disabled when `useCanSignSettlement()` is false
- [X] T040 [US3] Implement `SettlementLockedBanner` in `apps/web/src/components/settlement/SettlementLockedBanner.tsx` — visible when `ledger.status === 'SETTLED'`; fetches signed PDF URL on demand; opens link in new tab
- [X] T041 [US3] Integrate settlement components into `apps/web/src/pages/EventLedgerPage.tsx` — render `FinalizeSettlementPanel` when budget locked and not settled; render `SettlementLockedBanner` after settle; invalidate ledger query on successful finalize so `editability` switches to read-only instantly
- [X] T042 [US3] Verify `apps/web/src/components/ledger/LedgerGrid.tsx` respects `ledger.editability` read-only states for settlement column after finalize (extend if any input bypasses editability flags)

**Checkpoint**: Operator-facing settlement UX complete with permission gating (SC-008, FR-019–FR-022).

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Codegen, tenant isolation, log sanitization, and end-to-end validation.

- [X] T043 Regenerate `apps/web/src/types/generated-api.ts` via `apps/web/scripts/gen-api.mjs` after all settlement endpoints are implemented and backend builds cleanly
- [X] T044 [P] Write integration tests in `apps/api.tests/Integration/SettlementTenantIsolationTests.cs` — cross-org finalize, PDF link, and reversal access all return 404
- [X] T045 [P] Add log sanitization assertions in `apps/api.tests/Unit/SettlementServiceTests.cs` — verify structured logs never contain raw signature substrings or GCS credential material (SC-007)
- [X] T046 Run quickstart validation scenarios A–D in `specs/004-settlement-freeze-archiving/quickstart.md` and fix any gaps
- [X] T047 Verify ≥80% line/branch coverage for new settlement backend and frontend code via `dotnet test` and `npm test` with coverage reporters

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS all user stories**
- **User Story 1 (Phase 3)**: Depends on Foundational — MVP; no dependency on US2/US3
- **User Story 2 (Phase 4)**: Depends on Foundational + US1 finalize endpoint (needs a settled event to test immutability and reversal)
- **User Story 3 (Phase 5)**: Depends on US1 backend endpoints (`settle`, `settlement-pdf`); frontend can start hooks/components once T043 types exist
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

| Story | Depends On | Delivers Independently |
|-------|-----------|------------------------|
| US1 (P1) | Foundational | Atomic finalize, PDF render/archive, signed-URL retrieval |
| US2 (P1) | Foundational + US1 | Immutability proof, audited reversal, original PDF preserved |
| US3 (P2) | US1 backend | Signature canvas, finalize UX, instant read-only lock |

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Services before controllers
- Backend endpoints before frontend hooks/components
- Story checkpoint before moving to next priority

### Parallel Opportunities

- **Phase 1**: T003, T004, T005 in parallel
- **Phase 2**: T008, T009 in parallel (entities); T012, T013, T014 in parallel after migration
- **Phase 3**: T016, T017, T018, T019, T020, T021, T022 in parallel (all test files)
- **Phase 4**: T028, T029 in parallel
- **Phase 5**: T033, T034, T035 in parallel; T036, T037, T038 in parallel once backend ready
- **Phase 6**: T044, T045 in parallel

---

## Parallel Example: User Story 1

```bash
# Launch all US1 tests together:
Task T016: "Unit tests in apps/api.tests/Unit/SignatureValidatorTests.cs"
Task T017: "Unit tests in apps/api.tests/Unit/SettlementPdfRendererTests.cs"
Task T018: "Unit tests in apps/api.tests/Unit/SettlementServiceTests.cs"
Task T019: "Integration tests in apps/api.tests/Integration/SettlementFinalizeTests.cs"
Task T020: "Integration tests in apps/api.tests/Integration/SettlementAuthorizationTests.cs"
Task T021: "Integration tests in apps/api.tests/Integration/SettlementAtomicityTests.cs"
Task T022: "Integration tests in apps/api.tests/Integration/SettlementConcurrencyTests.cs"

# After tests fail, implement pipeline sequentially:
Task T023 → T024 → T025 → T026 → T027
```

---

## Parallel Example: User Story 3

```bash
# Component tests in parallel:
Task T033: "SignaturePad.test.tsx"
Task T034: "FinalizeSettlementPanel.test.tsx"
Task T035: "SettlementLockedBanner.test.tsx"

# Frontend implementation in parallel (after T043 codegen):
Task T036: "hooks in apps/web/src/api/settlement.ts"
Task T037: "useCanSignSettlement in apps/web/src/api/user.ts"
Task T038: "SignaturePad.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Run quickstart Scenario A; confirm atomic finalize + signed PDF link
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. Add US1 → atomic freeze pipeline (MVP!)
3. Add US2 → immutability proof + audited reversal
4. Add US3 → operator-facing signature UX
5. Polish → coverage + tenant isolation + quickstart validation

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: US1 backend (tests → service → controller)
   - Developer B: US2 tests (can scaffold against US1 branch); reversal after US1 merges
   - Developer C: US3 frontend (starts after US1 endpoints land; mocks until then)
3. Polish phase shared

---

## Notes

- Routes use existing `api/venues/{venueId}/events/{eventId}/…` convention (no `/v1/` segment).
- `LedgerService.AssertNotSettledOrReconciled` already guards line-item/artist mutations — US2 primarily proves coverage and adds reversal.
- `InMemorySettlementArchiveStore` enables all integration tests without external GCS.
- Reversal preserves original WORM PDF; re-finalize uses a new `settlementId` object path.
- Do not log raw `artist_signature_data` or storage credentials anywhere.
