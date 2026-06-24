---
description: "Task list for Complete Content Security Policy via HTTP Response Headers (SPLR-42)"
---

# Tasks: Complete Content Security Policy via HTTP Response Headers

**Input**: Design documents from `/specs/049-csp-http-response-header/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/csp-http-response-header.md, quickstart.md

**Tests**: Integration tests in `ContentSecurityPolicyMiddlewareTests` use in-memory EF via `WebApplicationFactory<Program>` (no Docker). Playwright E2E in `csp-response-header.spec.ts` requires running web + API stack.

**Organization**: Tasks grouped by user story (US1–US3). Primary product change is dual-path header delivery — ASP.NET Core middleware for API responses and Firebase Hosting `headers` for static web responses — using a single PRD §5.2 canonical policy string.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1–US3 (maps to user stories in spec.md)
- All paths are repo-relative

## Path Conventions

- API middleware (new): `apps/api/Middleware/ContentSecurityPolicyMiddleware.cs`
- API options (new): `apps/api/Configuration/ContentSecurityPolicyOptions.cs`
- DI registration: `apps/api/Program.cs`
- Legacy meta tag: `apps/web/index.html`
- Static hosting config (new): `apps/web/firebase.json`
- Frontend policy constant (new): `apps/web/src/security/contentSecurityPolicy.ts`
- Backend unit tests: `apps/api.tests/Unit/ContentSecurityPolicyOptionsTests.cs`
- Backend integration tests: `apps/api.tests/Integration/ContentSecurityPolicyMiddlewareTests.cs`
- Frontend unit tests: `apps/web/tests/security/contentSecurityPolicy.test.ts`
- Frontend firebase contract test (new): `apps/web/tests/security/firebaseHostingCsp.test.ts`
- E2E spec (new): `tests/e2e/specs/integrity/csp-response-header.spec.ts`
- Contract: `specs/049-csp-http-response-header/contracts/csp-http-response-header.md`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm branch, prerequisites, and CSP contract before implementation.

- [x] T001 Verify branch `049-csp-http-response-header` and design docs in `specs/049-csp-http-response-header/` per plan.md
- [x] T002 [P] Review canonical policy string and delivery contract in `specs/049-csp-http-response-header/contracts/csp-http-response-header.md`
- [x] T003 [P] Review delivery-path and meta-tag decisions in `specs/049-csp-http-response-header/research.md` and environment matrix in `specs/049-csp-http-response-header/data-model.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish shared canonical policy constants and document the legacy gap. **Blocks all user stories.**

**⚠️ CRITICAL**: No user story work begins until the PRD §5.2 literal is defined in both backend and frontend constants and the current meta-tag gap is documented.

- [x] T004 Audit legacy meta-tag CSP in `apps/web/index.html` — confirm missing `object-src 'none'`, presence of dev-only `style-src 'unsafe-inline'`, and absence of HTTP header delivery
- [x] T005 [P] Create `ContentSecurityPolicyOptions` with `ProductionPolicy` literal matching contract in `apps/api/Configuration/ContentSecurityPolicyOptions.cs`
- [x] T006 [P] Create `PRODUCTION_CONTENT_SECURITY_POLICY` export matching contract in `apps/web/src/security/contentSecurityPolicy.ts`
- [x] T007 [P] Create test skeleton `ContentSecurityPolicyOptionsTests` in `apps/api.tests/Unit/ContentSecurityPolicyOptionsTests.cs`
- [x] T008 [P] Create test skeleton `contentSecurityPolicy.test.ts` in `apps/web/tests/security/contentSecurityPolicy.test.ts`

**Checkpoint**: Canonical policy string exists in C# and TypeScript; legacy gap documented

---

## Phase 3: User Story 1 — Production Responses Enforce CSP via HTTP Headers (Priority: P1) 🎯 MVP

**Goal**: Every production HTTP response from API and static web delivery includes `Content-Security-Policy` header matching PRD §5.2.

**Independent Test**: `dotnet test apps/api.tests --filter "FullyQualifiedName~ContentSecurityPolicy"` returns green for swagger, 401, and 404 responses; `firebase.json` and Playwright spec confirm static/API header presence.

### Tests for User Story 1 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T009 [P] [US1] Add failing unit test `ProductionPolicy_MatchesContractLiteral` in `apps/api.tests/Unit/ContentSecurityPolicyOptionsTests.cs` — assert C# constant equals contract string from `specs/049-csp-http-response-header/contracts/csp-http-response-header.md`
- [x] T010 [P] [US1] Add failing unit test `ProductionPolicy_MatchesContractLiteral` in `apps/web/tests/security/contentSecurityPolicy.test.ts` — assert TS export equals same contract literal
- [x] T011 [P] [US1] Create `ContentSecurityPolicyMiddlewareTests` skeleton with in-memory EF factory pattern (mirror `apps/api.tests/Integration/QboEgressWriteGuardProductionTests.cs`) in `apps/api.tests/Integration/ContentSecurityPolicyMiddlewareTests.cs`
- [x] T012 [US1] Add failing integration test `ProductionConfig_SwaggerIndex_IncludesCanonicalCspHeader` in `apps/api.tests/Integration/ContentSecurityPolicyMiddlewareTests.cs` — `GET /swagger/index.html` → 200 with canonical `Content-Security-Policy` (contract verification matrix)
- [x] T013 [US1] Add failing integration test `ProductionConfig_UnauthenticatedApi_IncludesCanonicalCspHeader` in `apps/api.tests/Integration/ContentSecurityPolicyMiddlewareTests.cs` — `GET /api/organizations` → 401 with canonical header
- [x] T014 [US1] Add failing integration test `ProductionConfig_NotFound_IncludesCanonicalCspHeader` in `apps/api.tests/Integration/ContentSecurityPolicyMiddlewareTests.cs` — `GET /api/nonexistent` → 404 with canonical header
- [x] T015 [P] [US1] Add failing contract test `firebaseJson_HostingHeaders_MatchesCanonicalPolicy` in `apps/web/tests/security/firebaseHostingCsp.test.ts` — parse `apps/web/firebase.json` and assert `/**` rule CSP value matches contract
- [x] T016 [P] [US1] Create failing Playwright spec `csp-response-header.spec.ts` in `tests/e2e/specs/integrity/csp-response-header.spec.ts` — document response and proxied API response include `Content-Security-Policy` header

### Implementation for User Story 1

- [x] T017 [US1] Implement `ContentSecurityPolicyMiddleware` using `Response.OnStarting` to append header on all responses in `apps/api/Middleware/ContentSecurityPolicyMiddleware.cs`
- [x] T018 [US1] Register `ContentSecurityPolicyOptions` and `ContentSecurityPolicyMiddleware` as first middleware after `app.Build()` in `apps/api/Program.cs`
- [x] T019 [P] [US1] Create `apps/web/firebase.json` with `hosting.headers` applying canonical CSP to `/**` per contract shape in `specs/049-csp-http-response-header/contracts/csp-http-response-header.md`
- [x] T020 [US1] Run US1 tests until green: `dotnet test apps/api.tests --filter "FullyQualifiedName~ContentSecurityPolicy"` and `npm run test -- tests/security/` in `apps/web`

**Checkpoint**: MVP — API and static hosting config emit canonical CSP header on representative responses

---

## Phase 4: User Story 2 — Policy Blocks Plugin/Object Injection (`object-src 'none'`) (Priority: P1)

**Goal**: Production header explicitly includes `object-src 'none'` and all PRD §5.2 required directives.

**Independent Test**: Automated tests assert header contains `object-src 'none'` and full directive set (`default-src`, `script-src`, `connect-src`, `object-src`) on API and cross-artifact sync locations.

### Tests for User Story 2 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL if `object-src 'none'` is missing**

- [x] T021 [P] [US2] Add failing unit test `ProductionPolicy_ContainsObjectSrcNone` in `apps/api.tests/Unit/ContentSecurityPolicyOptionsTests.cs`
- [x] T022 [P] [US2] Add failing unit test `ProductionPolicy_ContainsAllRequiredDirectives` in `apps/api.tests/Unit/ContentSecurityPolicyOptionsTests.cs` — assert `default-src`, `script-src`, `connect-src`, `object-src` per contract checklist
- [x] T023 [P] [US2] Add failing unit test `productionPolicy contains object-src 'none'` in `apps/web/tests/security/contentSecurityPolicy.test.ts`
- [x] T024 [US2] Add failing integration test `ProductionConfig_Header_ContainsObjectSrcNone` in `apps/api.tests/Integration/ContentSecurityPolicyMiddlewareTests.cs` — parse response header and assert `object-src 'none'` substring
- [x] T025 [P] [US2] Extend `tests/e2e/specs/integrity/csp-response-header.spec.ts` with failing assertion that header value contains `object-src 'none'`

### Implementation for User Story 2

- [x] T026 [US2] Verify `ProductionPolicy` in `apps/api/Configuration/ContentSecurityPolicyOptions.cs` and `PRODUCTION_CONTENT_SECURITY_POLICY` in `apps/web/src/security/contentSecurityPolicy.ts` include `object-src 'none'` — adjust literals if tests still fail
- [x] T027 [US2] Run US2 tests until green: `dotnet test apps/api.tests --filter "FullyQualifiedName~ContentSecurityPolicy"` and targeted Vitest/Playwright filters

**Checkpoint**: `object-src 'none'` present in all three sync locations (C#, TS, firebase.json) and verified on live API responses

---

## Phase 5: User Story 3 — Dev Allowances Do Not Leak to Production (Priority: P2)

**Goal**: Production responses match PRD §5.2 exactly with no dev-only directives; legacy meta tag removed; Development may optionally append `style-src 'unsafe-inline'` for local tooling only.

**Independent Test**: Production-config integration tests confirm header excludes `unsafe-inline`; Development-config test confirms optional dev suffix; `apps/web/index.html` has no CSP meta tag.

### Tests for User Story 3 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL if dev policy leaks or meta tag remains**

- [x] T028 [P] [US3] Add failing unit test `ProductionPolicy_DoesNotContainUnsafeInline` in `apps/api.tests/Unit/ContentSecurityPolicyOptionsTests.cs`
- [x] T029 [P] [US3] Add failing unit test `DevelopmentPolicy_MayAppendStyleSrcUnsafeInline` in `apps/api.tests/Unit/ContentSecurityPolicyOptionsTests.cs` — assert Development policy differs only by optional `style-src 'self' 'unsafe-inline'` suffix
- [x] T030 [US3] Add failing integration test `ProductionEnvironment_Header_ExcludesUnsafeInline` in `apps/api.tests/Integration/ContentSecurityPolicyMiddlewareTests.cs` — factory with `UseEnvironment(Production)`
- [x] T031 [P] [US3] Add failing integration test `DevelopmentEnvironment_Header_MayIncludeStyleSrcUnsafeInline` in `apps/api.tests/Integration/ContentSecurityPolicyMiddlewareTests.cs` — factory with `UseEnvironment(Development)`
- [x] T032 [P] [US3] Extend `tests/e2e/specs/integrity/csp-response-header.spec.ts` with failing assertion that production-mode header does NOT contain `unsafe-inline`

### Implementation for User Story 3

- [x] T033 [US3] Implement environment-based policy selection (`IsProduction()` → canonical only; Development → optional dev suffix) in `apps/api/Middleware/ContentSecurityPolicyMiddleware.cs` using `ContentSecurityPolicyOptions` from `apps/api/Configuration/ContentSecurityPolicyOptions.cs`
- [x] T034 [US3] Remove legacy `<meta http-equiv="Content-Security-Policy">` tag from `apps/web/index.html` — header is authoritative per FR-006
- [x] T035 [US3] Run US3 tests until green and smoke local dev UI for style regressions per `specs/049-csp-http-response-header/quickstart.md` §6

**Checkpoint**: Production header is strict PRD §5.2; dev relaxations scoped to Development only; meta tag removed

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Cross-artifact sync, regression safety, coverage gate, and quickstart validation.

- [x] T036 [P] Add cross-artifact sync test asserting C# `ProductionPolicy`, TS `PRODUCTION_CONTENT_SECURITY_POLICY`, and `apps/web/firebase.json` header value are identical in `apps/web/tests/security/contentSecurityPolicy.test.ts`
- [x] T037 [P] Run Playwright regression: `npx playwright test specs/integrity/csp-response-header.spec.ts` in `tests/e2e`
- [x] T038 [P] Run quickstart validation steps 1–6 from `specs/049-csp-http-response-header/quickstart.md`
- [x] T039 Verify ≥80.0% line/branch coverage on touched backend files via `dotnet test apps/api.tests /p:CollectCoverage=true --filter "FullyQualifiedName~ContentSecurityPolicy"` (coverlet → cobertura); missing/unparseable report = FAIL
- [x] T040 Verify ≥80.0% line/branch coverage on touched frontend files via `npm run test:coverage` in `apps/web` (Vitest → lcov); missing/unparseable report = FAIL
- [x] T041 [P] Run existing E2E integrity regression `tests/e2e/specs/integrity/zero-write-infiltration.spec.ts` to confirm QBO `connect-src` compatibility (SC-005)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS all user stories**
- **User Story 1 (Phase 3)**: Depends on Foundational — **MVP**
- **User Story 2 (Phase 4)**: Depends on US1 implementation (policy string must be wired to middleware/firebase)
- **User Story 3 (Phase 5)**: Depends on US1 middleware existing; independently testable via env-gating tests
- **Polish (Phase 6)**: Depends on US1–US3 completion

### User Story Dependencies

| Story | Depends on | Independent test |
|-------|------------|------------------|
| US1 (P1) | Foundational | API integration + firebase.json + Playwright header presence |
| US2 (P1) | US1 policy wired | Directive assertion tests (`object-src 'none'`, full PRD set) |
| US3 (P2) | US1 middleware | Production vs Development env tests; meta tag removed |

### Parallel Opportunities

- **Phase 1**: T002 ∥ T003
- **Phase 2**: T005 ∥ T006 ∥ T007 ∥ T008 (after T004 audit)
- **Phase 3 tests**: T009 ∥ T010 ∥ T011; T015 ∥ T016 (after T011)
- **Phase 3 impl**: T019 ∥ T017 (after tests fail)
- **Phase 4 tests**: T021 ∥ T022 ∥ T023 ∥ T025 (after US1 green)
- **Phase 5 tests**: T028 ∥ T029 ∥ T032 (after US2 green)
- **Phase 6**: T036 ∥ T037 ∥ T038 ∥ T041

---

## Parallel Example: User Story 1

```bash
# Launch failing tests together (after T011 skeleton):
dotnet test apps/api.tests --filter "FullyQualifiedName~ContentSecurityPolicy"
cd apps/web && npm run test -- tests/security/contentSecurityPolicy.test.ts tests/security/firebaseHostingCsp.test.ts
cd tests/e2e && npx playwright test specs/integrity/csp-response-header.spec.ts

# Launch parallel implementation (after tests fail):
# Developer A: apps/api/Middleware/ContentSecurityPolicyMiddleware.cs + Program.cs
# Developer B: apps/web/firebase.json
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (canonical policy constants)
3. Complete Phase 3: User Story 1 (API middleware + firebase.json + header presence tests)
4. **STOP and VALIDATE**: Run quickstart §1–§4; confirm headers on API and static config
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → shared policy constants ready
2. US1 → header delivery on both paths → **MVP**
3. US2 → `object-src 'none'` and directive completeness verified
4. US3 → env gating + meta tag removal
5. Polish → coverage gate + E2E regression

### Suggested MVP Scope

**User Story 1 only** (Phase 1–3): Delivers the core SPLR-42 acceptance criteria — production HTTP header on API and static hosting with PRD §5.2 policy string. US2/US3 tighten directive assertions and dev/prod separation.

---

## Notes

- Canonical policy literal (copy exactly): `default-src 'self'; script-src 'self'; connect-src 'self' *.quickbooks.com *.googleapis.com; object-src 'none';`
- Use `Response.OnStarting` in middleware so 4xx/5xx from `ExceptionHandlerMiddleware` still receive the header (research R6)
- Firebase headers apply only when deployed via Firebase Hosting — local Vite dev relies on API middleware for proxied `/api` calls; static asset header validation uses firebase.json contract test + Playwright against preview/deploy target
- No DTO/OpenAPI changes — Constitution VI unaffected
- Commit after each task or logical group

---

## Task Summary

| Phase | Tasks | Story |
|-------|-------|-------|
| Setup | T001–T003 (3) | — |
| Foundational | T004–T008 (5) | — |
| US1 — Header delivery | T009–T020 (12) | US1 |
| US2 — object-src 'none' | T021–T027 (7) | US2 |
| US3 — Dev/prod separation | T028–T035 (8) | US3 |
| Polish | T036–T041 (6) | — |
| **Total** | **41 tasks** | |

**Format validation**: All tasks use `- [ ] [TaskID] [P?] [Story?] Description with file path` ✓
