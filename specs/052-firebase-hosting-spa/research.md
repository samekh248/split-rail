# Research: Firebase Hosting for React Single-Page Application

**Feature**: 052-firebase-hosting-spa (SPLR-45)  
**Date**: 2026-06-21

## R1: SPA deep-link routing on Firebase Hosting

**Decision**: Add a global rewrite rule to `apps/web/firebase.json`:

```json
"rewrites": [{ "source": "**", "destination": "/index.html" }]
```

**Rationale**: Firebase Hosting evaluates static files before rewrites. Existing files under `dist/` (hashed `/assets/*` bundles, `index.html`, favicons) are served directly; all other paths (e.g. `/settings/team`, `/venues/{id}/events/{id}`) fall through to `/index.html`, matching the nginx `try_files $uri $uri/ /index.html` pattern used in preview (spec 051). This is the documented Firebase SPA pattern and requires no custom Cloud Functions.

**Alternatives considered**:

| Alternative | Rejected because |
|-------------|------------------|
| Per-route rewrites mirroring `appRoute.ts` | High maintenance; new routes require config updates; global fallback is standard for client routers |
| Cloud Function URL rewrite | Adds runtime cost and complexity for static SPA fallback |
| `cleanUrls` + `trailingSlash` only | Does not solve deep-link routing for client paths |
| Redirect all 404s to `/` | Loses path information needed by client router |

## R2: Static asset 404 behavior

**Decision**: Rely on Firebase default behavior — rewrites apply only when no matching file exists. Requests for missing hashed assets (stale cache after deploy) return HTTP 404, not the HTML shell.

**Rationale**: Spec edge case requires missing static files to 404 rather than return HTML (prevents browsers misinterpreting a script URL as a page). Firebase file-first resolution satisfies this without extra rules.

**Alternatives considered**:

| Alternative | Rejected because |
|-------------|------------------|
| Explicit `/assets/**` rewrite exclusion | Unnecessary — existing files already win |
| Custom 404 page pointing to shell | Would break asset load failure detection |

## R3: Security headers beyond CSP

**Decision**: **CSP only** in `firebase.json` `hosting.headers` for this milestone, reusing the canonical policy from spec 049. HTTPS/TLS is platform-managed by Firebase Hosting (satisfies FR-001 / SC-005). No additional PRD §5.2 headers are documented beyond CSP in the current contract set.

**Rationale**: Spec 049 contract and PRD §5.2 research focus on `Content-Security-Policy` as the mandated static header. `apps/web/firebase.json` already includes CSP (delivered under spec 049). SPLR-45 adds SPA rewrites and deploy wiring; duplicating HSTS/X-Frame-Options without PRD mandate risks scope creep. Firebase enforces HTTPS redirects on default hosting domains.

**Alternatives considered**:

| Alternative | Rejected because |
|-------------|------------------|
| Add `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` now | Not specified in PRD §5.2 contract; belongs in separate hardening issue if required |
| Remove CSP from firebase.json (API-only) | Violates FR-005 and spec 049 cross-artifact sync contract |

## R4: CSP synchronization with spec 049

**Decision**: Import canonical policy from `apps/web/src/security/contentSecurityPolicy.ts` in contract tests only; keep literal string in `firebase.json` (Firebase config is JSON, not TypeScript). Existing `firebaseHostingCsp.test.ts` and cross-artifact sync tests from spec 049 remain the enforcement mechanism — **extend, do not replace**.

**Rationale**: Spec 049 established three-location sync (C#, TS, firebase.json). This feature must not redefine the policy string. Any CSP change flows through spec 049's canonical constant and fails sync tests if firebase.json is not updated.

## R5: Deploy mechanism

**Decision**: Add `deploy/production/deploy-web-hosting.sh` that:

1. Validates prerequisites (`firebase` CLI, `FIREBASE_PROJECT`, optional `FIREBASE_HOSTING_SITE`)
2. Runs `npm ci && npm run build` in `apps/web` (or accepts pre-built `dist/`)
3. Executes `firebase deploy --only hosting` from `apps/web/` directory

Add `.firebaserc` at repo root or `apps/web/` pointing to GCP project `split-rail` (per `.specify/memory/infrastructure.md`). Add npm script `deploy:hosting` in `apps/web/package.json` as a thin wrapper.

**Rationale**: Matches existing `deploy/preview/` script conventions. Firebase CLI is the standard deploy path for Hosting. Keeping deploy script separate from preview (`deploy-preview.sh`) preserves spec 051 boundary — preview uses containers, production uses Firebase.

**Alternatives considered**:

| Alternative | Rejected because |
|-------------|------------------|
| GitHub Actions deploy on every main merge | Requires Firebase service account secrets not yet in repo; document manual/CI-ready script first |
| `gcloud firebase` REST API | More complex auth; Firebase CLI is idiomatic |
| Deploy from monorepo root with `--config apps/web/firebase.json` | Valid but `cd apps/web` keeps `public: dist` relative paths simple |

## R6: Local validation without production deploy

**Decision**: Use **Firebase Hosting emulator** (`firebase emulators:exec --only hosting`) for optional smoke validation in quickstart; primary CI verification via **static config contract tests** (Vitest parsing `firebase.json`).

**Rationale**: Production deploy requires credentials and a provisioned hosting site — unsuitable for default CI. Config contract tests (SPA rewrite present, CSP matches canonical, `public: dist`) satisfy FR-011/FR-012 in CI. Emulator smoke is documented for engineers with Firebase CLI installed.

**Alternatives considered**:

| Alternative | Rejected because |
|-------------|------------------|
| Live production deploy in CI | Needs secrets + hosting site; out of scope for default pipeline |
| `vite preview` only | Does not validate firebase.json rewrites or CDN headers |
| Playwright against production URL | Requires deployed target; optional post-deploy check in quickstart |

## R7: Firebase project and hosting site identifiers

**Decision**: Default Firebase project ID `split-rail` (from infrastructure blueprint). Hosting site ID configurable via `FIREBASE_HOSTING_SITE` env var; default to project default site (`split-rail` or `{project-id}` per Firebase console provisioning).

**Rationale**: Infrastructure memory documents GCP project ID. Exact hosting site name may vary by console setup — deploy script accepts override rather than hardcoding a site that may not exist yet.

## R8: Testing strategy (Constitution III)

**Decision**:

| Layer | Approach |
|-------|----------|
| Config contract | New `parseFirebaseHostingConfig.ts` + Vitest tests asserting rewrite rule, `public: dist`, CSP header |
| CSP sync | Existing `firebaseHostingCsp.test.ts` + `contentSecurityPolicy.test.ts` (spec 049) — no duplication |
| Emulator smoke | Optional `deploy/production/smoke-firebase-hosting.sh` using hosting emulator |
| Backend | No C# changes expected — backend coverage gate unchanged |
| E2E | No new Playwright spec required; deep-link routes mirror preview nginx scenarios |

**Rationale**: Feature is frontend infra + deploy scripts. Constitution III requires ≥80% coverage on **new/modified** frontend verification code. Follows spec 051 pattern (`parseNginxSpaConfig.ts` + Vitest).
