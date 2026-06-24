# Data Model: Firebase Hosting for React Single-Page Application

**Feature**: 052-firebase-hosting-spa (SPLR-45) | **Date**: 2026-06-21

This feature is **infrastructure-only** — no database tables, migrations, or domain entities. The model describes **hosting configuration and deploy-time artifacts**.

## Entities

### StaticHostingConfiguration

| Field | Type | Description |
|-------|------|-------------|
| `configPath` | path | `apps/web/firebase.json` |
| `publicRoot` | path | `dist` (Vite build output relative to config) |
| `spaRewriteSource` | string | `**` (global fallback) |
| `spaRewriteDestination` | path | `/index.html` |
| `globalHeadersSource` | string | `/**` |
| `contentSecurityPolicy` | string | Canonical PRD §5.2 policy (synced with spec 049) |

**Validation (VR-001)**:
- `publicRoot` MUST equal `dist`
- `rewrites` MUST contain `{ source: "**", destination: "/index.html" }`
- Global `/**` headers MUST include `Content-Security-Policy` matching `PRODUCTION_CONTENT_SECURITY_POLICY`

**State transitions**:

```text
[partial — CSP only] → rewrites_added → deploy_wired → production_deployed
```

Current repo state: `[partial — CSP only]` (headers present, rewrites absent, no deploy script).

---

### FirebaseProjectBinding

| Field | Type | Description |
|-------|------|-------------|
| `projectId` | string | GCP/Firebase project (default: `split-rail`) |
| `rcFilePath` | path | `apps/web/.firebaserc` or repo-root `.firebaserc` |
| `hostingSiteId` | string | Firebase Hosting site identifier (env override) |

**Validation (VR-002)**:
- `projectId` MUST be non-empty before deploy
- `hostingSiteId` MAY default to Firebase project default site

---

### StaticApplicationBundle

| Field | Type | Description |
|-------|------|-------------|
| `outputDir` | path | `apps/web/dist/` |
| `entryHtml` | file | `index.html` (application shell) |
| `assets` | file[] | Hashed JS/CSS under `assets/` |

**Relationships**: Produced by `npm run build`; consumed by `firebase deploy --only hosting`.

**Validation (VR-003)**:
- `dist/index.html` MUST exist before deploy
- Deploy MUST fail non-zero if bundle missing

---

### ProductionWebDeployRun

| Field | Type | Description |
|-------|------|-------------|
| `firebaseProject` | string | From `FIREBASE_PROJECT` or `.firebaserc` default |
| `hostingSite` | string | From `FIREBASE_HOSTING_SITE` (optional) |
| `bundleVersion` | string | Vite asset hash fingerprint (post-build) |
| `deployTimestamp` | datetime | UTC deploy completion |

**Relationships**: One deploy run publishes one bundle to one hosting site.

**Validation (VR-004)**:
- Authenticated Firebase CLI session or `GOOGLE_APPLICATION_CREDENTIALS` MUST be present
- Deploy script MUST exit non-zero on `firebase deploy` failure

---

### CanonicalProductionPolicy

| Field | Type | Description |
|-------|------|-------------|
| `policyString` | string | PRD §5.2 CSP literal |
| `ownerFeature` | ref | spec 049 (SPLR-42) |
| `syncLocations` | path[] | C# options, TS constant, `firebase.json` header |

**Validation (VR-005)** — inherited from spec 049:
- All three sync locations MUST hold identical policy strings (whitespace-normalized)
- This feature MUST NOT alter the policy definition — only ensure hosting config includes it

---

## Entity Relationships

```text
StaticApplicationBundle ──build──> ProductionWebDeployRun
StaticHostingConfiguration ──configures──> ProductionWebDeployRun
FirebaseProjectBinding ──targets──> ProductionWebDeployRun
CanonicalProductionPolicy ──referenced by──> StaticHostingConfiguration
```

## Invariants

1. **VR-101**: Firebase rewrites MUST NOT override existing static files (platform default — file-first resolution).
2. **VR-102**: CSP in `firebase.json` MUST match spec 049 canonical string at all times.
3. **VR-103**: Preview container hosting (spec 051) and production Firebase hosting are parallel paths — changes here MUST NOT modify `deploy/preview/*`.
4. **VR-104**: Deep-link routes exercised in quickstart MUST include at least one workspace path matching `appRoute.ts` pattern (`/venues/{id}/events/{id}`).
