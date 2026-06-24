# Quickstart Validation Guide: Firebase Hosting for React SPA

**Feature**: 052-firebase-hosting-spa (SPLR-45) | **Date**: 2026-06-21

Validates SPA routing configuration, security headers, and deploy wiring. See [contracts/firebase-hosting.md](./contracts/firebase-hosting.md) for exact config shape and [research.md](./research.md) for design decisions.

## Prerequisites

- Node 22 + npm (for build and Vitest)
- Firebase CLI (`npm install -g firebase-tools` or use `npx firebase-tools`)
- Authenticated Google account with deploy access to project `split-rail` (production deploy scenarios only)
- Optional: Java (Firebase emulator dependency)

---

## Scenario 1: Hosting Config Contract Tests Pass (FR-011, FR-012)

From repository root:

```powershell
cd apps/web
npm ci
npm run test -- tests/deploy/firebaseHostingSpa.test.ts tests/security/firebaseHostingCsp.test.ts
```

**Expected**:
- All tests pass
- SPA rewrite rule `**` → `/index.html` is present
- `hosting.public` is `dist`
- CSP header matches `PRODUCTION_CONTENT_SECURITY_POLICY`

**Failure indicators**:
- Missing rewrite → add `rewrites` array per contract
- CSP mismatch → update `firebase.json` to match spec 049 canonical string

---

## Scenario 2: Production Build Succeeds (FR-004)

```powershell
cd apps/web
npm ci
npm run build
Test-Path dist/index.html
```

**Expected**: `True`; `dist/assets/` contains hashed JS/CSS bundles.

---

## Scenario 3: Firebase Hosting Emulator — SPA Deep Links (FR-002, SC-001)

Requires Firebase CLI and built bundle (Scenario 2).

```powershell
cd apps/web
npm run build

# Start hosting emulator (separate terminal or background)
firebase emulators:start --only hosting --project split-rail
```

In another shell (default emulator port 5000):

```powershell
# Root
curl -sf http://127.0.0.1:5000/ | Select-String 'id="root"'

# Settings deep link
curl -sf -o $null -w '%{http_code}' http://127.0.0.1:5000/settings/team
# Expected: 200

# Workspace deep link
curl -sf -o $null -w '%{http_code}' http://127.0.0.1:5000/venues/11111111-1111-1111-1111-111111111111/events/22222222-2222-2222-2222-222222222222
# Expected: 200
```

**Expected**: All routes return HTTP 200; root HTML contains React mount point.

---

## Scenario 4: Static Assets Not Rewritten to Shell (FR-003, SC-004)

With emulator running and bundle built:

```powershell
cd apps/web
$asset = (Select-String -Path dist/index.html -Pattern '/assets/[^"]+\.js' -AllMatches).Matches[0].Value
curl -sf -o $null -w '%{http_code} %{content_type}' "http://127.0.0.1:5000$asset"
# Expected: 200 and javascript content type

curl -sf -o $null -w '%{http_code}' http://127.0.0.1:5000/assets/does-not-exist.js
# Expected: 404
```

---

## Scenario 5: Security Headers on Static Responses (FR-005, SC-002)

Against emulator or production deploy:

```powershell
curl -sI http://127.0.0.1:5000/ | Select-String 'Content-Security-Policy'
curl -sI http://127.0.0.1:5000/ | Select-String "object-src 'none'"
```

**Expected**: Header present with canonical policy including `object-src 'none'`.

Repeat for a JS asset URL — CSP header MUST also be present on static asset responses.

---

## Scenario 6: Production Deploy (FR-009, SC-003)

**Requires**: Firebase deploy permissions for project `split-rail`.

```powershell
# From repository root
$env:FIREBASE_PROJECT = "split-rail"
./deploy/production/deploy-web-hosting.sh
```

Or via npm wrapper:

```powershell
cd apps/web
npm run build
npm run deploy:hosting
```

**Expected**:
- Script exits 0
- CLI outputs hosting URL
- Loading production URL serves updated bundle
- Deep links and CSP headers pass Scenarios 3 and 5 against production URL

---

## Scenario 7: Coverage Gate (FR-014, SC-006)

```powershell
cd apps/web
npm run test:coverage
```

**Expected**: Global frontend coverage remains ≥80%. New/modified deploy verification files (`parseFirebaseHostingConfig.ts`, `firebaseHostingSpa.test.ts`) meet ≥80% line/branch coverage.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Deep link returns 404 | Missing `rewrites` in `firebase.json` | Add global rewrite per contract |
| Asset URL returns HTML | Incorrect rewrite precedence | Ensure file exists in `dist/`; verify `public: dist` |
| CSP header missing on emulator | Emulator version or config path | Confirm `firebase.json` in `apps/web/`; restart emulator |
| `firebase deploy` auth error | Not logged in | Run `firebase login` or set service account |
| CSP sync test fails | Policy drift from spec 049 | Align `firebase.json` with `contentSecurityPolicy.ts` |

---

## CI parity

Default CI runs Scenario 1 and Scenario 7 via `npm run test:coverage` in `frontend-test` job (includes `tests/deploy/firebaseHostingSpa.test.ts`, `tests/deploy/deployWebHostingScript.test.ts`, and `tests/security/firebaseHostingCsp.test.ts`).

**Manual pre-release checks** (require Firebase CLI + credentials):
- Scenarios 3–5: Firebase Hosting emulator (`deploy/production/smoke-firebase-hosting.sh`)
- Scenario 6: Production deploy (`deploy/production/deploy-web-hosting.sh`)

Firebase CLI prerequisite: install globally with `npm install -g firebase-tools` (see Prerequisites above).
