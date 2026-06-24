# Research: Preview Web Frontend Container Build

**Feature**: 051-preview-dockerfile-web (SPLR-44) | **Date**: 2026-06-21

## 1. Missing Dockerfile and Current Script Behavior

**Decision**: Add `deploy/preview/Dockerfile.web` as a **multi-stage** build (contract export → Node build → static server) and change the Docker build **context to the repository root** (`.`), not `apps/web`.

**Rationale**: `deploy/preview/deploy-preview.sh` line 23 references `deploy/preview/Dockerfile.web` with context `apps/web`, but the file does not exist. A context limited to `apps/web` cannot access `apps/api` to produce `swagger.json` for `npm run gen:api` (Constitution VI). The script currently runs a **redundant** host-side `npm ci && npm run build` (lines 17–21) before the missing Docker step — that host build is not self-contained (FR-005) and will be removed once the Dockerfile performs the full build internally.

**Alternatives considered**:
- **nginx-only Dockerfile copying pre-built `dist/`**: Minimal, but violates FR-005 (depends on host `npm run build`) and duplicates work already attempted in the script.
- **Keep `apps/web` context + committed `swagger.json`**: Would drift from the backend contract; conflicts with Constitution VI and the existing `contract-type-drift` CI job.
- **Fetch swagger from a running API container during `docker build`**: Requires orchestrating a sidecar API in the build — fragile in Cloud Build and slower than offline export.

## 2. OpenAPI Contract Export Without a Running Server

**Decision**: In the Dockerfile **contract stage**, `dotnet build` the API project, install `Swashbuckle.AspNetCore.Cli` as a global tool, and run `dotnet swagger tofile` against the compiled assembly to emit `/tmp/swagger/v1/swagger.json`. Pass that file to the Node stage via `OPENAPI_URL=file:///tmp/swagger/v1/swagger.json npm run gen:api`.

**Rationale**: Matches the CI `contract-type-drift` job semantics (types from the same Swashbuckle pipeline the running API exposes) without requiring PostgreSQL during the image build. `dotnet swagger tofile` loads the compiled app for document generation; it does not need a live DB connection if startup does not eagerly connect (verify during implementation — if connection is required, set a dummy `ConnectionStrings__DefaultConnection` build-arg for the contract stage only).

**Alternatives considered**:
- **Start API + curl swagger in deploy script before docker build**: Works locally but adds orchestration complexity and still leaves the Dockerfile non-self-contained.
- **Reuse committed `generated-api.ts` without regen**: Violates FR-004/FR-007 and Constitution VI.
- **Check in a static `swagger.json` artifact**: Drifts from backend; rejected by existing project policy.

## 3. Static Server and SPA Deep-Link Routing

**Decision**: Final stage uses **`nginx:1.27-alpine`** with a dedicated `deploy/preview/nginx.web.conf` that serves `dist/` and applies `try_files $uri $uri/ /index.html` for all non-file routes.

**Rationale**: Vite production output is static files. E2E tests (spec 005) deep-link to `/`, `/settings/team`, and `/venues/{venueId}/events/{eventId}` (History API client routing in `apps/web/src/lib/appRoute.ts`). nginx `try_files` is the standard, battle-tested SPA fallback pattern and satisfies FR-003/SC-002 without adding Node at runtime.

**Alternatives considered**:
- **`vite preview` in container**: Requires Node runtime, larger image, and proxy config duplication; rejected for production-like preview images.
- **Cloud Run static hosting / Firebase only**: Out of scope for this feature (spec Out of Scope); preview script pushes a container image to Artifact Registry today.
- **Caddy / http-server**: Less common in existing GCP/docker patterns; nginx aligns with industry defaults and minimal image size.

## 4. API Proxying in Preview Web Container

**Decision**: The preview web nginx config serves **static assets only**; API calls from the browser target the API origin configured at **build time** via `VITE_API_BASE_URL` (or existing env pattern in `apps/web`). The current `deploy-preview.sh` deploys **API-only** Cloud Run and does not wire the web image into Cloud Run yet (spec Out of Scope). E2E CI today runs API on `:5000` and web via `vite preview` on `:5173` with separate origins — the container image must support the same split-origin model until future wiring.

**Rationale**: Changing deploy topology is explicitly out of scope. The web image must be buildable/pushable and runnable standalone (e.g., `docker run -p 8080:8080`) for smoke tests. Build-time API base URL injection matches Vite conventions.

**Alternatives considered**:
- **nginx reverse-proxy `/api` to backend**: Better single-origin UX but requires runtime backend URL (envsubst) and changes preview networking — defer to a follow-up when web Cloud Run deploy is wired.

## 5. deploy-preview.sh Alignment

**Decision**: Minimal script changes:
1. Change web Docker build to: `docker build -t "${WEB_IMAGE}" -f deploy/preview/Dockerfile.web .`
2. **Remove** host-side `pushd apps/web; npm ci; npm run build; popd` block (Dockerfile is self-contained).
3. Optional build-args: `VITE_API_BASE_URL` defaulting to empty string (same-origin relative `/api`) or preview API URL when known.

**Rationale**: Satisfies FR-001, FR-005, FR-006 with the smallest diff. Tag/push convention unchanged.

**Alternatives considered**:
- **No script changes**: Dockerfile paths would not resolve correctly with `apps/web` context.
- **Full Cloud Run web deploy in same PR**: Out of scope per spec.

## 6. Verification and Coverage Strategy

**Decision**:
- Add Vitest unit tests for **nginx SPA fallback rules** (parse `nginx.web.conf` and assert `try_files` + `index.html` for representative routes) under `apps/web/tests/deploy/` or `deploy/preview/__tests__/`.
- Add a **shell smoke script** `deploy/preview/smoke-web-image.sh` (build image locally, `curl` root + deep link + asset path) documented in quickstart — not gated in CI if Docker unavailable, but runnable locally/ in GCP Cloud Build.
- No backend C# changes expected → backend coverage N/A; frontend coverage applies to new test files only (Constitution III ≥80% on touched frontend files).

**Rationale**: Infrastructure files (Dockerfile, nginx.conf) need behavioral verification without brittle Dockerfile string-matching alone. Vitest satisfies Constitution III for the frontend test project.

**Alternatives considered**:
- **Playwright-only verification**: Heavier; defer full browser smoke to spec 005 E2E once preview deploy uses the image.
- **No automated tests**: Violates Constitution III for any new testable logic (nginx config parser).

## 7. Docker Ignore and Build Context

**Decision**: Add root-level patterns to `.dockerignore` (or a `deploy/preview/.dockerignore` referenced via `# syntax=docker/dockerfile:1` if needed) excluding `**/node_modules`, `**/bin`, `**/obj`, `.git`, coverage artifacts — while **including** `apps/api`, `apps/web`, and `deploy/preview`.

**Rationale**: Repo-root context increases build context size; `.dockerignore` keeps layer cache efficient.

**Alternatives considered**:
- **Duplicate API sources into web context**: Maintenance burden; rejected.
