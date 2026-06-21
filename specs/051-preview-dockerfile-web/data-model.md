# Data Model: Preview Web Frontend Container Build

**Feature**: 051-preview-dockerfile-web (SPLR-44) | **Date**: 2026-06-21

This feature is **infrastructure-only** — no database tables, migrations, or domain entities. The model below describes **build-time and deploy-time artifacts** referenced by the preview pipeline.

## Entities

### PreviewRun

| Field | Type | Description |
|-------|------|-------------|
| `runId` | string | Unique pipeline identifier (`RUN_ID` env var) |
| `gcpProject` | string | GCP project ID |
| `gcpRegion` | string | Artifact Registry region |
| `apiImageTag` | string | `{region}-docker.pkg.dev/{project}/split-rail/api:{runId}` |
| `webImageTag` | string | `{region}-docker.pkg.dev/{project}/split-rail/web:{runId}` |
| `previewBaseUrl` | string (output) | Cloud Run URL for API service (existing script output) |

**Relationships**: One PreviewRun produces exactly one API image and one web image tagged with the same `runId` (FR-006, spec 005).

**Validation**:
- `runId`, `gcpProject`, `gcpRegion` MUST be non-empty before deploy script executes.

---

### WebFrontendContainerDefinition

| Field | Type | Description |
|-------|------|-------------|
| `dockerfilePath` | path | `deploy/preview/Dockerfile.web` |
| `buildContext` | path | Repository root (`.`) |
| `nginxConfigPath` | path | `deploy/preview/nginx.web.conf` |
| `stages` | enum[] | `contract`, `build`, `runtime` |

**State transitions**:

```text
[missing] → build_started → contract_exported → types_generated → bundle_built → image_published
```

Failure at any stage MUST abort with non-zero exit (FR-007 on contract export failure).

---

### OpenApiContractArtifact

| Field | Type | Description |
|-------|------|-------------|
| `source` | URI | `file:///tmp/swagger/v1/swagger.json` (in-container) or live swagger URL in CI |
| `generator` | string | Swashbuckle via `dotnet swagger tofile` |
| `version` | string | `v1` |

**Validation**:
- MUST be produced before `npm run gen:api` in the container build stage.
- If export fails or file is empty, build MUST fail (FR-007).

---

### FrontendContractTypes

| Field | Type | Description |
|-------|------|-------------|
| `outputPath` | path | `apps/web/src/types/generated-api.ts` |
| `generator` | string | `openapi-typescript` via `apps/web/scripts/gen-api.mjs` |
| `postProcess` | script | `append-schema-exports.mjs` (decimal string normalization) |

**Validation**:
- Generated during Docker build; not hand-edited (Constitution VI).
- Must compile cleanly with `tsc --noEmit` before `vite build`.

---

### StaticApplicationBundle

| Field | Type | Description |
|-------|------|-------------|
| `outputDir` | path | `apps/web/dist/` |
| `entryHtml` | file | `index.html` (application shell) |
| `assets` | file[] | Hashed JS/CSS chunks from Vite |

**Validation**:
- `dist/index.html` MUST exist after build stage.
- Asset references MUST use relative or absolute paths resolvable by nginx.

---

### SpaRoutingPolicy

| Field | Type | Description |
|-------|------|-------------|
| `fallbackFile` | file | `/index.html` |
| `deepLinkPatterns` | regex[] | See contract `preview-web-container.md` |

**Representative routes** (from `apps/web/src/lib/appRoute.ts`):

| Route | Purpose |
|-------|---------|
| `/` | Dashboard / login shell |
| `/settings/team` | Settings deep link |
| `/venues/{venueId}/events/{eventId}` | Event workspace deep link |

**Validation**: nginx MUST return `index.html` with HTTP 200 for these paths when no static file exists (FR-003).

---

## No Persistence

No new database tables, EF entities, or migrations. PreviewRun and image tags exist only in CI/GCP for the lifetime of the pipeline run (spec 005 teardown).
