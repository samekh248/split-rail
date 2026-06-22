# Implementation Plan: Firebase Hosting for React Single-Page Application

**Branch**: `052-firebase-hosting-spa` | **Date**: 2026-06-21 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/052-firebase-hosting-spa/spec.md`

## Summary

**SPLR-45** closes the production static hosting gap called out in TDD §7: the React SPA needs Firebase Hosting configuration with SPA rewrite rules, security headers (coordinated with spec 049), and a repeatable deploy path.

Current state: `apps/web/firebase.json` exists with CSP headers (from spec 049) but **lacks SPA rewrites** and **no deploy script** is wired.

The technical approach:

1. **Extend `apps/web/firebase.json`** — add global `rewrites: [{ source: "**", destination: "/index.html" }]`; preserve existing CSP `headers` block (spec 049 sync).
2. **Add `.firebaserc`** — bind to GCP project `split-rail`.
3. **Add `deploy/production/deploy-web-hosting.sh`** — build `dist/` if needed, run `firebase deploy --only hosting`.
4. **Add config contract tests** — `parseFirebaseHostingConfig.ts` + Vitest (mirror spec 051 nginx pattern); reuse existing `firebaseHostingCsp.test.ts`.
5. **Optional emulator smoke script** — local deep-link validation without production credentials.
6. **Verify** — Vitest contract tests in CI; ≥80% coverage on new frontend verification code (Constitution III). No backend C# changes expected.

## Technical Context

**Language/Version**: JSON hosting config (`firebase.json`); TypeScript 5.7 + Node 22 (`apps/web` tests/helpers); Bash/PowerShell deploy scripts; Firebase CLI (`firebase-tools`).

**Primary Dependencies**: Existing Vite 6 build (`apps/web/dist/`); Firebase Hosting platform (HTTPS/TLS managed); canonical CSP from `apps/web/src/security/contentSecurityPolicy.ts` (spec 049); Firebase CLI for deploy.

**Storage**: N/A — no database. Artifacts: `apps/web/dist/` static bundle, Firebase Hosting release.

**Testing**: Vitest contract tests for `firebase.json` SPA rewrites + public root (`apps/web/tests/deploy/`); existing CSP sync tests (`firebaseHostingCsp.test.ts`, `contentSecurityPolicy.test.ts`); optional `deploy/production/smoke-firebase-hosting.sh` with hosting emulator; no new Playwright spec required. ≥80.0% line/branch coverage on **new/modified frontend verification files** (Constitution III); no backend changes → backend coverage gate unchanged.

**Target Platform**: Firebase Hosting (production static CDN for `split-rail` GCP project); local validation via Firebase Hosting emulator.

**Project Type**: Monorepo web application (`apps/web`) + deploy scripts under `deploy/production/`.

**Performance Goals**: Static CDN delivery — no application runtime on hosting layer; deploy completes within standard release window (<5 min for typical bundle size).

**Constraints**: SPA deep links MUST return application shell (FR-002); static assets MUST NOT be incorrectly rewritten (FR-003); CSP MUST remain synced with spec 049 (FR-008); deploy script MUST be repeatable with documented env vars (FR-010); preview pipeline (`deploy/preview/*`) MUST NOT be modified (spec 051 boundary); ≥80.0% coverage on new/modified frontend verification code; missing/unparseable coverage reports fail CI.

**Scale/Scope**: ~1 config file edit (`firebase.json`), ~2 new files (`.firebaserc`, deploy script), ~2 new frontend files (parser + Vitest), ~1 optional smoke script, ~1 npm script. Unblocks production web releases per TDD §7.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Applicable? | Status | Notes |
|---|-----------|-------------|--------|-------|
| I | Core Mathematical Axioms | No | N/A | No monetary computation. |
| II | Multi-Tenant Isolation | No | N/A | No new data queries or API paths. |
| III | Engineering Rigor & Quality Gates | **Yes** | PASS | Vitest contract tests for firebase.json; optional emulator smoke; ≥80% coverage on new verification code. |
| IV | QBO Integration | No | N/A | No QBO code paths. |
| V | Ledger State Machine | No | N/A | No ledger mutations. |
| VI | Polyglot Contract Serialization | No | N/A | No API type changes; deploy uses existing build output. |
| VII | EF Core Axioms | No | N/A | No EF queries. |
| VIII | Exception Governance & Logging Privacy | **Yes (light)** | PASS | Deploy script fails explicitly; no secrets in firebase.json. |
| IX | UI Iconography | No | N/A | No UI changes. |

**Gate result**: All applicable gates PASS. No violations. Complexity Tracking not required.

## Project Structure

### Documentation (this feature)

```text
specs/052-firebase-hosting-spa/
├── plan.md              # This file
├── research.md          # Phase 0 — SPA rewrites, deploy, CSP coordination
├── data-model.md        # Phase 1 — hosting/deploy artifact entities
├── quickstart.md        # Phase 1 — validation scenarios
├── contracts/
│   └── firebase-hosting.md   # Config shape, deploy script, verification contract
├── checklists/
│   └── requirements.md  # From /speckit-specify
└── tasks.md             # Phase 2 (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
apps/
└── web/
    ├── firebase.json                    # EXTEND — add SPA rewrites + ignore
    ├── .firebaserc                      # NEW — project binding (split-rail)
    ├── package.json                     # EXTEND — deploy:hosting script
    ├── src/
    │   └── deploy/
    │       └── parseFirebaseHostingConfig.ts   # NEW — config assertions
    └── tests/
        └── deploy/
            └── firebaseHostingSpa.test.ts      # NEW — Vitest SPA rewrite tests

deploy/
└── production/
    ├── deploy-web-hosting.sh            # NEW — build + firebase deploy
    └── smoke-firebase-hosting.sh        # NEW (optional) — emulator smoke
```

**Structure Decision**: Continue monorepo conventions. Hosting config lives in `apps/web/` (alongside Vite `dist/` output). Deploy scripts under `deploy/production/` (parallel to `deploy/preview/`). Verification in `apps/web/tests/deploy/` following spec 051 nginx test pattern. No `apps/api` changes.

## Complexity Tracking

No constitution violations to justify.

## Post-Design Constitution Re-Check

*Re-evaluated after Phase 1 design artifacts (research.md, data-model.md, contracts/, quickstart.md).*

| # | Principle | Re-Check | Notes |
|---|-----------|----------|-------|
| III | Engineering Rigor | PASS | Contract tests + optional emulator smoke defined in quickstart; coverage target on new parser/test files. |
| VIII | Logging Privacy | PASS | No secrets in config; deploy auth via standard Firebase CLI credentials. |

**Gate result**: PASS — ready for `/speckit-tasks`.

## Phase Summary

| Phase | Artifact | Status |
|-------|----------|--------|
| 0 | [research.md](research.md) | Complete — SPA rewrites, deploy mechanism, CSP coordination resolved |
| 1 | [data-model.md](data-model.md) | Complete |
| 1 | [contracts/firebase-hosting.md](contracts/firebase-hosting.md) | Complete |
| 1 | [quickstart.md](quickstart.md) | Complete |
| 1 | Agent context | Updated → `specs/052-firebase-hosting-spa/plan.md` |
| 2 | tasks.md | **Not created** — run `/speckit-tasks` |
