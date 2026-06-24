# Contract: Firebase Hosting Configuration & Deploy

**Feature**: 052-firebase-hosting-spa (SPLR-45) | **Date**: 2026-06-21

Defines the hosting configuration shape, SPA routing contract, header requirements, and deploy script integration. CSP policy string is **owned by** [spec 049 contract](../049-csp-http-response-header/contracts/csp-http-response-header.md) — this contract references but does not redefine it.

## Hosting configuration (`apps/web/firebase.json`)

### Required shape

```json
{
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "/**",
        "headers": [
          {
            "key": "Content-Security-Policy",
            "value": "default-src 'self'; script-src 'self'; connect-src 'self' *.quickbooks.com *.googleapis.com; object-src 'none';"
          }
        ]
      }
    ]
  }
}
```

### SPA routing contract

| Rule | Requirement |
|------|-------------|
| Rewrite source | `**` (global) |
| Rewrite destination | `/index.html` |
| File-first resolution | Platform MUST serve existing static files before applying rewrite |
| Deep-link paths | All client routes from `apps/web/src/lib/appRoute.ts` MUST resolve to application shell when no static file exists |

**Representative deep-link paths for verification**:

| Path | Expected behavior |
|------|-------------------|
| `/` | Serve `index.html` (direct file) |
| `/settings/team` | Rewrite → `/index.html` (200) |
| `/venues/new` | Rewrite → `/index.html` (200) |
| `/venues/{uuid}/events/{uuid}` | Rewrite → `/index.html` (200) |
| `/assets/{hash}.js` (existing) | Serve file directly (200, `application/javascript`) |
| `/assets/missing.js` (non-existent) | HTTP 404 (NOT HTML shell) |

### Header contract

| Header | Scope | Value source |
|--------|-------|--------------|
| `Content-Security-Policy` | `/**` | spec 049 canonical production policy |

**Sync invariant**: Header value MUST equal `PRODUCTION_CONTENT_SECURITY_POLICY` from `apps/web/src/security/contentSecurityPolicy.ts`. Enforced by existing `firebaseHostingCsp.test.ts`.

### Public root contract

| Field | Value | Rationale |
|-------|-------|-----------|
| `public` | `dist` | Vite default output directory |

---

## Project binding (`.firebaserc`)

```json
{
  "projects": {
    "default": "split-rail"
  }
}
```

| Input | Env var | Default | Required |
|-------|---------|---------|----------|
| Firebase project | `FIREBASE_PROJECT` | `split-rail` | Yes |
| Hosting site | `FIREBASE_HOSTING_SITE` | Firebase default site for project | No |

---

## Deploy script contract (`deploy/production/deploy-web-hosting.sh`)

### Prerequisites

| Prerequisite | Validation |
|--------------|------------|
| Firebase CLI (`firebase`) | `firebase --version` succeeds |
| Authenticated session | `firebase projects:list` or `GOOGLE_APPLICATION_CREDENTIALS` |
| Web bundle | `apps/web/dist/index.html` exists (build if absent) |

### Steps

1. `cd apps/web`
2. If `dist/index.html` missing: `npm ci && npm run build`
3. `firebase deploy --only hosting --project "${FIREBASE_PROJECT:-split-rail}"`
4. Exit non-zero on deploy failure

### npm script wrapper

Add to `apps/web/package.json`:

```json
"deploy:hosting": "firebase deploy --only hosting"
```

Deploy script MAY invoke `npm run deploy:hosting` after env validation.

### Outputs

| Output | Description |
|--------|-------------|
| Hosting URL | Firebase console / CLI output (e.g. `https://{site}.web.app`) |
| Deploy version | Firebase release hash (CLI output) |

---

## Verification contract (Vitest)

New tests in `apps/web/tests/deploy/firebaseHostingSpa.test.ts`:

| Test ID | Assertion |
|---------|-----------|
| FH-001 | `firebase.json` contains SPA rewrite `**` → `/index.html` |
| FH-002 | `firebase.json` `hosting.public` equals `dist` |
| FH-003 | CSP header matches canonical policy (existing test — do not duplicate) |

Helper module: `apps/web/src/deploy/parseFirebaseHostingConfig.ts`

---

## Emulator smoke contract (optional)

Script: `deploy/production/smoke-firebase-hosting.sh`

1. Build web bundle
2. `firebase emulators:exec --only hosting --project split-rail "curl ..."` against emulator port
3. Assert deep-link path returns 200 with HTML containing mount point

**Not required in default CI** — documented for local/pre-deploy validation.

---

## Out of scope

- API middleware CSP (spec 049)
- Preview nginx container (spec 051)
- Custom domain / DNS
- Firebase Hosting channel previews (separate from PR preview pipeline)
- CI job with production deploy secrets (future infrastructure work)

## Compatibility

- Extends spec 049 Firebase header delivery — MUST NOT remove or weaken existing CSP config
- Parallel to spec 051 preview nginx SPA rules — route behavior MUST be equivalent for deep links
