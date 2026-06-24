# Contract: Preview Web Container Build & Serve

**Feature**: 051-preview-dockerfile-web (SPLR-44) | **Date**: 2026-06-21

Defines the build and runtime contract for `deploy/preview/Dockerfile.web` and its integration with `deploy/preview/deploy-preview.sh`. Extends spec 005 `preview-environment.md` web build step.

## Build contract (`Dockerfile.web`)

### Inputs

| Input | Source | Required | Notes |
|-------|--------|----------|-------|
| Build context | Repository root `.` | Yes | Changed from `apps/web` |
| `VITE_API_BASE_URL` | build-arg / env | No | Default empty (relative `/api`); set when API origin is known |
| `VITE_E2E_HOOKS` | build-arg | No | Default `false`; CI E2E may set `true` |

### Stages

#### Stage 1 — `contract` (dotnet SDK 8.0)

1. Copy `apps/api/` project files.
2. `dotnet restore && dotnet build -c Release`.
3. Install `Swashbuckle.AspNetCore.Cli` tool.
4. Run:
   ```bash
   dotnet swagger tofile \
     bin/Release/net8.0/split-rail-api.dll \
     /tmp/swagger/v1/swagger.json \
     v1
   ```
5. Fail if output file missing or zero bytes.

**Failure mode (FR-007)**: Exit non-zero with stderr message `OpenAPI contract export failed`.

#### Stage 2 — `build` (node 22-alpine)

1. Copy `apps/web/package.json`, lockfile, scripts, source.
2. Copy swagger artifact from stage 1 → `/tmp/swagger/v1/swagger.json`.
3. `npm ci`
4. `OPENAPI_URL=file:///tmp/swagger/v1/swagger.json npm run gen:api`
5. `npm run build` (`tsc --noEmit` + `vite build`)
6. Fail if `dist/index.html` absent.

#### Stage 3 — `runtime` (nginx 1.27-alpine)

1. Copy `deploy/preview/nginx.web.conf` → `/etc/nginx/conf.d/default.conf`
2. Copy `dist/` → `/usr/share/nginx/html`
3. `EXPOSE 8080`
4. `CMD ["nginx", "-g", "daemon off;"]`

### Outputs

| Output | Tag | Registry path |
|--------|-----|---------------|
| Web container image | `{RUN_ID}` | `{GCP_REGION}-docker.pkg.dev/{GCP_PROJECT}/split-rail/web:{RUN_ID}` |

## Deploy script contract (`deploy-preview.sh` delta)

Replace lines 17–23 with:

```bash
echo "Building web image..."
docker build \
  -t "${WEB_IMAGE}" \
  -f deploy/preview/Dockerfile.web \
  .
docker push "${WEB_IMAGE}"
```

**Removed**: Host-side `npm ci && npm run build` in `apps/web` (self-contained Docker build per FR-005).

**Unchanged**: API image build/push, Cloud Run API deploy, seeding curl, `PREVIEW_BASE_URL` output.

## Runtime serve contract (`nginx.web.conf`)

### SPA fallback

For all locations under `/`:

```nginx
location / {
    root /usr/share/nginx/html;
    index index.html;
    try_files $uri $uri/ /index.html;
}
```

### Required behaviors

| ID | Request | Expected response |
|----|---------|-------------------|
| C1 | `GET /` | `200`, body contains `<div id="root">` |
| C2 | `GET /settings/team` | `200`, same shell (not nginx 404) |
| C3 | `GET /venues/{uuid}/events/{uuid}` | `200`, same shell |
| C4 | `GET /assets/*.js` (hashed bundle) | `200`, `Content-Type: application/javascript` |
| C5 | `GET /nonexistent-file.xyz` | `200`, shell (SPA handles unknown routes client-side) |

### Static asset caching (optional)

Hashed assets under `/assets/` MAY include `Cache-Control: public, max-age=31536000, immutable`. `index.html` MUST NOT be long-cached.

## OpenAPI type generation contract

| Step | Command | Success criterion |
|------|---------|-------------------|
| Export | `dotnet swagger tofile` | Non-empty `swagger.json` |
| Generate | `OPENAPI_URL=file://... npm run gen:api` | Updates `generated-api.ts` in build layer only |
| Compile | `tsc -p tsconfig.app.json --noEmit` | Exit 0 |
| Bundle | `vite build` | `dist/` populated |

**Constitution VI**: No manual edits to `generated-api.ts` in the Docker layer beyond script output.

## Smoke verification contract

Script: `deploy/preview/smoke-web-image.sh` (to be added in implementation)

```bash
# Build local tag
docker build -t splitrail-web-smoke:local -f deploy/preview/Dockerfile.web .

# Run
docker run -d --name splitrail-web-smoke -p 18080:8080 splitrail-web-smoke:local

# Assert C1–C3
curl -sf http://127.0.0.1:18080/ | grep -q 'id="root"'
curl -sf -o /dev/null -w '%{http_code}' http://127.0.0.1:18080/settings/team | grep -q 200
curl -sf -o /dev/null -w '%{http_code}' http://127.0.0.1:18080/venues/00000000-0000-0000-0000-000000000001/events/00000000-0000-0000-0000-000000000002 | grep -q 200

# Teardown
docker rm -f splitrail-web-smoke
```

## Out of scope (explicit)

- Deploying web image to Cloud Run (future wiring).
- Firebase Hosting header sync (spec 049).
- Runtime `/api` reverse proxy in nginx.
