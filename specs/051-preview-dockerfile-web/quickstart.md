# Quickstart Validation Guide: Preview Web Frontend Container Build

**Feature**: 051-preview-dockerfile-web (SPLR-44) | **Date**: 2026-06-21

Validates that the missing web container build is restored and serves SPA deep links. See [contracts/preview-web-container.md](./contracts/preview-web-container.md) for exact build/serve rules and [research.md](./research.md) for design decisions.

## Prerequisites

- Docker Desktop or Docker Engine installed
- .NET 8 SDK (for local contract-export debugging only)
- Node 22 + npm (for local parity checks only — full build should work inside Docker alone)

## Scenario 1: Docker Build Succeeds (FR-001, SC-001)

From repository root:

```bash
docker build -t splitrail-web:local -f deploy/preview/Dockerfile.web .
```

**Expected**:
- Build completes with exit code 0
- Final stage is nginx-based
- No error referencing missing `Dockerfile.web`
- Build logs show `gen:api` and `vite build` stages

**Failure indicators**:
- `OpenAPI contract export failed` → check API project builds; verify `dotnet swagger tofile` in contract stage
- `npm run build` TypeScript errors → contract/types mismatch; run local `contract-type-drift` CI steps first

---

## Scenario 2: SPA Deep Links Serve Application Shell (FR-003, SC-002)

```bash
docker run -d --rm --name splitrail-web-test -p 18080:8080 splitrail-web:local

curl -sf http://127.0.0.1:18080/ | grep -q 'id="root"'
echo "Root: OK"

curl -sf -o /dev/null -w '%{http_code}\n' http://127.0.0.1:18080/settings/team
# Expected: 200

curl -sf -o /dev/null -w '%{http_code}\n' \
  http://127.0.0.1:18080/venues/11111111-1111-1111-1111-111111111111/events/22222222-2222-2222-2222-222222222222
# Expected: 200

docker stop splitrail-web-test
```

**Expected**: All three routes return HTTP 200; root HTML contains the React mount point.

---

## Scenario 3: Static Assets Load (FR-008)

```bash
docker run -d --rm --name splitrail-web-test -p 18080:8080 splitrail-web:local

# Discover a JS asset from index.html
ASSET=$(curl -sf http://127.0.0.1:18080/ | grep -oP '/assets/[^"]+\.js' | head -1)
curl -sf -o /dev/null -w '%{http_code} %{content_type}\n' "http://127.0.0.1:18080${ASSET}"
# Expected: 200 and application/javascript (or text/javascript)

docker stop splitrail-web-test
```

---

## Scenario 4: OpenAPI Types Generated at Build Time (FR-004, SC-003)

Inspect build output (verbose build):

```bash
docker build --progress=plain -t splitrail-web:local -f deploy/preview/Dockerfile.web . 2>&1 | tee /tmp/web-docker-build.log
grep -E 'gen:api|Generating API types' /tmp/web-docker-build.log
```

**Expected**: Log shows `Generating API types from file:///tmp/swagger/...` before Vite build.

**Local parity check** (optional, mirrors CI):

```bash
dotnet build apps/api/split-rail-api.csproj -c Release
# Start API with postgres per specs/005 quickstart, then:
cd apps/web && OPENAPI_URL=http://127.0.0.1:5000/swagger/v1/swagger.json npm run gen:api && npm run build
```

---

## Scenario 5: deploy-preview.sh Web Step (SC-004)

Requires GCP credentials and Artifact Registry access.

```bash
export GCP_PROJECT=your-project
export GCP_REGION=us-central1
export RUN_ID="local-$(date +%s)"

# API build/push still required by script
./deploy/preview/deploy-preview.sh
```

**Expected**:
- `Building web image...` step succeeds
- Web image pushed to `{GCP_REGION}-docker.pkg.dev/{GCP_PROJECT}/split-rail/web:{RUN_ID}`
- No host-side `npm ci` in `apps/web` before docker build (after implementation)

Run teardown when finished:

```bash
./deploy/preview/teardown-preview.sh
```

---

## Scenario 6: Automated Tests (Constitution III)

After implementation adds Vitest coverage for nginx SPA rules:

```bash
cd apps/web && npm run test -- tests/deploy/
```

**Expected**: All tests green; touched files maintain ≥80% line/branch coverage.

---

## Troubleshooting

| Symptom | Likely cause | Action |
|---------|--------------|--------|
| `swagger tofile` fails in Docker | API startup requires DB | Set dummy connection string build-arg in contract stage |
| Deep link returns 404 | Missing `try_files` fallback | Verify `nginx.web.conf` |
| Blank page, assets 404 | Wrong `root` path | Confirm `dist/` copied to `/usr/share/nginx/html` |
| Types compile error in build | Stale committed types vs API | Fix backend DTO first; regen locally |
| Build context huge/slow | Missing `.dockerignore` entries | Exclude `node_modules`, `bin`, `obj` |
