---
description: "Task list for Firebase Hosting for React SPA (SPLR-45)"
---

# Tasks: Firebase Hosting for React Single-Page Application

**Input**: Design documents from `/specs/052-firebase-hosting-spa/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/firebase-hosting.md, quickstart.md

**Tests**: REQUIRED per Constitution III. Vitest contract tests in `apps/web/tests/deploy/` and `apps/web/tests/security/` verify `firebase.json` SPA rewrites, public root, and CSP sync with spec 049. Optional shell smoke script `deploy/production/smoke-firebase-hosting.sh` validates emulator deep-link behavior. No backend C# changes expected — backend coverage gate runs for regression only; frontend ≥80.0% line/branch coverage required on new/modified helper and test files.

**Organization**: Tasks grouped by user story (US1–US3). Primary deliverables are extended `apps/web/firebase.json` (SPA rewrites + headers), `.firebaserc`, and `deploy/production/deploy-web-hosting.sh`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1–US3 (maps to user stories in spec.md)
- All paths are repo-relative

## Path Conventions

- Hosting config (edit): `apps/web/firebase.json`
- Project binding (new): `apps/web/.firebaserc`
- Parser helper (new): `apps/web/src/deploy/parseFirebaseHostingConfig.ts`
- Vitest SPA tests (new): `apps/web/tests/deploy/firebaseHostingSpa.test.ts`
- Vitest deploy script tests (new): `apps/web/tests/deploy/deployWebHostingScript.test.ts`
- Existing CSP sync test (reuse): `apps/web/tests/security/firebaseHostingCsp.test.ts`
- Deploy script (new): `deploy/production/deploy-web-hosting.sh`
- Emulator smoke (new): `deploy/production/smoke-firebase-hosting.sh`
- npm script (edit): `apps/web/package.json`
- Contract: `specs/052-firebase-hosting-spa/contracts/firebase-hosting.md`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm branch, feature pointer, and design artifacts before implementation.

- [x] T001 Verify branch `052-firebase-hosting-spa` is checked out and `.specify/feature.json` points to `specs/052-firebase-hosting-spa`
- [x] T002 [P] Review hosting/deploy contract in `specs/052-firebase-hosting-spa/contracts/firebase-hosting.md`
- [x] T003 [P] Review SPA rewrite, CSP coordination, and deploy decisions in `specs/052-firebase-hosting-spa/research.md` and validation scenarios in `specs/052-firebase-hosting-spa/quickstart.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared parser helper, test skeletons, and deploy directory. **Blocks all user stories.**

**⚠️ CRITICAL**: No user story work begins until parser helper and Vitest skeletons exist.

- [x] T004 Create `deploy/production/` directory if absent
- [x] T005 [P] Create `parseFirebaseHostingConfig` helper exporting `assertSpaRewrite`, `assertPublicRoot`, and `parseFirebaseHostingConfig` in `apps/web/src/deploy/parseFirebaseHostingConfig.ts`
- [x] T006 [P] Create Vitest skeleton importing parser helper in `apps/web/tests/deploy/firebaseHostingSpa.test.ts`
- [x] T007 [P] Create Vitest skeleton with deploy script read helpers (`readDeployScript`, `assertDeployScriptPrerequisites`) in `apps/web/tests/deploy/deployWebHostingScript.test.ts`
- [x] T008 [P] Create executable skeleton `deploy/production/smoke-firebase-hosting.sh` with `set -euo pipefail`, build step, and placeholder emulator curl assertions per contract smoke section

**Checkpoint**: Test harness and deploy directory ready — user story implementation can begin

---

## Phase 3: User Story 1 — Deep-linked Workspace URLs Load in Production (Priority: P1) 🎯 MVP

**Goal**: `apps/web/firebase.json` includes global SPA rewrite so client-routed paths return the application shell (FR-002, SC-001).

**Independent Test**: `cd apps/web && npm run test -- tests/deploy/firebaseHostingSpa.test.ts` green; optional emulator smoke returns HTTP 200 for `/settings/team` and workspace deep link.

### Tests for User Story 1 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T009 [P] [US1] Add failing test `firebaseJson_hasSpaRewrite` in `apps/web/tests/deploy/firebaseHostingSpa.test.ts` — parse `apps/web/firebase.json` and assert rewrite `{ source: "**", destination: "/index.html" }` (contract FH-001)
- [x] T010 [P] [US1] Add failing test `firebaseJson_publicRootIsDist` in `apps/web/tests/deploy/firebaseHostingSpa.test.ts` — assert `hosting.public` equals `dist` (contract FH-002)
- [x] T011 [US1] Add failing build+emulator step to `deploy/production/smoke-firebase-hosting.sh` — curl `/settings/team` and workspace path return 200 with HTML containing mount point (will fail until rewrites added)

### Implementation for User Story 1

- [x] T012 [US1] Extend `apps/web/firebase.json` — add `ignore` array and `rewrites: [{ "source": "**", "destination": "/index.html" }]` per `specs/052-firebase-hosting-spa/contracts/firebase-hosting.md`; preserve existing `headers` block unchanged
- [x] T013 [US1] Run Vitest until green: `cd apps/web && npm run test -- tests/deploy/firebaseHostingSpa.test.ts`
- [x] T014 [US1] Complete `deploy/production/smoke-firebase-hosting.sh` emulator deep-link assertions for `/`, `/settings/team`, and `/venues/{uuid}/events/{uuid}` per quickstart Scenario 3

**Checkpoint**: MVP — SPA rewrite configured; deep links return application shell via Firebase Hosting rules

---

## Phase 4: User Story 2 — Security Headers Enforced on Static Hosting Responses (Priority: P1)

**Goal**: All static hosting responses carry canonical Content-Security-Policy synced with spec 049; config shape matches contract (FR-005, FR-008, SC-002).

**Independent Test**: `cd apps/web && npm run test -- tests/security/firebaseHostingCsp.test.ts tests/security/contentSecurityPolicy.test.ts` green; `firebase.json` global `/**` header includes `object-src 'none'`.

### Tests for User Story 2 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T015 [P] [US2] Add failing test `firebaseJson_hasGlobalHeaderRule` in `apps/web/tests/deploy/firebaseHostingSpa.test.ts` — assert `hosting.headers` contains rule with `source: "/**"`
- [x] T016 [P] [US2] Add failing test `firebaseJson_cspIncludesObjectSrcNone` in `apps/web/tests/deploy/firebaseHostingSpa.test.ts` — assert CSP header value contains `object-src 'none'`
- [x] T017 [US2] Verify existing test `firebaseJson_HostingHeaders_MatchesCanonicalPolicy` in `apps/web/tests/security/firebaseHostingCsp.test.ts` remains green after US1 rewrite changes — fix `firebase.json` if regression

### Implementation for User Story 2

- [x] T018 [US2] Add `assertGlobalCspHeader` to `apps/web/src/deploy/parseFirebaseHostingConfig.ts` — validate `/**` rule exists and CSP value matches `PRODUCTION_CONTENT_SECURITY_POLICY` import from `apps/web/src/security/contentSecurityPolicy.ts`
- [x] T019 [US2] Confirm `apps/web/firebase.json` `headers` block matches contract exactly — do not alter canonical policy string; only add `ignore`/rewrites if not already present from US1
- [x] T020 [US2] Run Vitest until green: `cd apps/web && npm run test -- tests/deploy/firebaseHostingSpa.test.ts tests/security/firebaseHostingCsp.test.ts tests/security/contentSecurityPolicy.test.ts`

**Checkpoint**: Static hosting config delivers mandated CSP on all paths; cross-artifact sync with spec 049 intact

---

## Phase 5: User Story 3 — Engineering Can Deploy the Web Bundle Repeatably (Priority: P2)

**Goal**: Documented deploy procedure publishes built bundle to Firebase Hosting with explicit prerequisites (FR-009, FR-010, SC-003).

**Independent Test**: `./deploy/production/deploy-web-hosting.sh` exits 0 when Firebase CLI authenticated and bundle built; Vitest deploy script contract tests green.

### Tests for User Story 3 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T021 [P] [US3] Add failing test `deployScript_existsAtExpectedPath` in `apps/web/tests/deploy/deployWebHostingScript.test.ts` — assert file `deploy/production/deploy-web-hosting.sh` exists
- [x] T022 [P] [US3] Add failing test `firebaserc_bindsSplitRailProject` in `apps/web/tests/deploy/deployWebHostingScript.test.ts` — parse `apps/web/.firebaserc` and assert `projects.default` equals `split-rail`
- [x] T023 [P] [US3] Add failing test `packageJson_hasDeployHostingScript` in `apps/web/tests/deploy/deployWebHostingScript.test.ts` — assert `apps/web/package.json` scripts include `deploy:hosting` invoking `firebase deploy --only hosting`

### Implementation for User Story 3

- [x] T024 [US3] Create `apps/web/.firebaserc` with `{ "projects": { "default": "split-rail" } }` per contract
- [x] T025 [US3] Create `deploy/production/deploy-web-hosting.sh` — validate `firebase` CLI, build `dist/` if missing (`npm ci && npm run build` in `apps/web`), run `firebase deploy --only hosting --project "${FIREBASE_PROJECT:-split-rail}"`; exit non-zero on failure; support optional `FIREBASE_HOSTING_SITE`
- [x] T026 [US3] Add `"deploy:hosting": "firebase deploy --only hosting"` script to `apps/web/package.json`
- [x] T027 [US3] Run Vitest until green: `cd apps/web && npm run test -- tests/deploy/deployWebHostingScript.test.ts`

**Checkpoint**: Repeatable deploy path documented and scriptable; release engineering can publish web bundle

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Coverage gate, quickstart validation, and documentation alignment.

- [x] T028 [P] Add `firebase-tools` as devDependency in `apps/web/package.json` OR document global Firebase CLI prerequisite in `specs/052-firebase-hosting-spa/quickstart.md` — choose one approach per research R5
- [x] T029 Run full frontend test suite: `cd apps/web && npm run test -- tests/deploy/ tests/security/firebaseHostingCsp.test.ts`
- [x] T030 Verify ≥80.0% line/branch coverage on new/modified frontend files via `cd apps/web && npm run test:coverage`; confirm `parseFirebaseHostingConfig.ts` and deploy test files meet gate; missing or unparseable lcov FAIL
- [x] T031 Run quickstart validation scenarios 1–2 and 7 from `specs/052-firebase-hosting-spa/quickstart.md`; document emulator (3–5) and production deploy (6) as manual pre-release checks
- [x] T032 Confirm no changes under `deploy/preview/` — preview pipeline (spec 051) MUST remain unaffected (VR-103)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS all user stories**
- **User Story 1 (Phase 3)**: Depends on Foundational — **MVP**
- **User Story 2 (Phase 4)**: Depends on Foundational; integrates with US1 `firebase.json` edits but CSP tests independently verifiable
- **User Story 3 (Phase 5)**: Depends on Foundational; deploy assumes US1/US2 config complete
- **Polish (Phase 6)**: Depends on US1–US3 completion

### User Story Dependencies

| Story | Priority | Depends on | Independent test |
|-------|----------|------------|------------------|
| US1 | P1 | Phase 2 | Vitest SPA rewrite tests + optional emulator smoke |
| US2 | P1 | Phase 2 (+ US1 firebase.json file) | CSP sync Vitest suite (spec 049) |
| US3 | P2 | Phase 2 | Deploy script + `.firebaserc` contract tests |

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Config/parser changes before deploy script (US3 last)
- Story checkpoint before next priority

### Parallel Opportunities

- **Phase 1**: T002 ∥ T003
- **Phase 2**: T005 ∥ T006 ∥ T007 ∥ T008 (after T004)
- **Phase 3**: T009 ∥ T010 (before T011); T012 after tests fail
- **Phase 4**: T015 ∥ T016 (before T018)
- **Phase 5**: T021 ∥ T022 ∥ T023 (before T024–T026)
- **Cross-story**: US1 and US2 test authoring can overlap after Phase 2; US3 starts after US1 `firebase.json` shape stabilizes

---

## Parallel Example: User Story 1

```bash
# Launch failing contract tests together:
Task T009: firebaseJson_hasSpaRewrite in apps/web/tests/deploy/firebaseHostingSpa.test.ts
Task T010: firebaseJson_publicRootIsDist in apps/web/tests/deploy/firebaseHostingSpa.test.ts

# After T012 implementation:
cd apps/web && npm run test -- tests/deploy/firebaseHostingSpa.test.ts
```

---

## Parallel Example: User Story 3

```bash
# Launch failing deploy contract tests together:
Task T021: deployScript_existsAtExpectedPath
Task T022: firebaserc_bindsSplitRailProject
Task T023: packageJson_hasDeployHostingScript

# Then implement T024–T026 in sequence (shared firebase.json/package.json awareness)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1 (SPA rewrites)
4. **STOP and VALIDATE**: Vitest green + optional emulator smoke
5. Deep links work on Firebase Hosting config — headers already partially present from spec 049

### Incremental Delivery

1. Setup + Foundational → test harness ready
2. US1 → SPA rewrites → Validate (MVP)
3. US2 → CSP contract hardening → Validate sync tests
4. US3 → deploy script + `.firebaserc` → Validate deploy contract tests
5. Polish → coverage gate + quickstart

### Parallel Team Strategy

1. Team completes Setup + Foundational together
2. Developer A: US1 (rewrites + smoke script)
3. Developer B: US2 (CSP assertions + parser extensions) — coordinate on `firebase.json`
4. Developer C: US3 (deploy script + `.firebaserc`) — starts after US1 config merged

---

## Notes

- Do **not** modify `deploy/preview/*` (spec 051 boundary)
- Do **not** redefine CSP policy string — import/compare against `apps/web/src/security/contentSecurityPolicy.ts` (spec 049)
- Existing `apps/web/firebase.json` has CSP headers but no rewrites — US1 is the primary functional gap
- Production deploy (quickstart Scenario 6) requires Firebase credentials — not default CI
- `[P]` tasks = different files, no incomplete-task dependencies
- Commit after each task or logical group

---

## Task Summary

| Phase | Tasks | Story |
|-------|-------|-------|
| Setup | T001–T003 (3) | — |
| Foundational | T004–T008 (5) | — |
| US1 SPA routing | T009–T014 (6) | US1 |
| US2 Security headers | T015–T020 (6) | US2 |
| US3 Deploy wiring | T021–T027 (7) | US3 |
| Polish | T028–T032 (5) | — |
| **Total** | **32 tasks** | |

**Suggested MVP scope**: Phase 1 + Phase 2 + Phase 3 (User Story 1) — 14 tasks

**Format validation**: All tasks use `- [ ] [TaskID] [P?] [Story?] Description with file path` checklist format.
