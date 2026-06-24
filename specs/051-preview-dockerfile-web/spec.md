# Feature Specification: Preview Web Frontend Container Build

**Feature Branch**: `051-preview-dockerfile-web`

**Created**: 2026-06-21

**Status**: Draft

**Input**: User description: "Add deploy/preview/Dockerfile.web for the React SPA (SPLR-44) — the preview deployment script references a web frontend container definition that is missing, breaking the ephemeral preview pipeline needed for end-to-end verification. Deliver a repeatable build that produces a deployable web frontend artifact with correct single-page application routing and contract-synchronized frontend types at build time."

**Linear**: [SPLR-44](https://linear.app/audiodex/issue/SPLR-44/add-deploypreviewdockerfileweb-for-the-react-spa)

## Overview

The platform's per-pull-request preview environment (defined in spec 005) assembles a disposable stack so automated end-to-end tests can prove release criteria before merge. The preview deployment script already builds and publishes a backend image, then attempts to build a web frontend image from a container definition that **does not exist**. As a result, preview provisioning fails before end-to-end tests can run.

This feature closes that gap by supplying the missing web frontend build definition and ensuring the preview pipeline can produce a working web frontend that serves the single-page application with correct client-side routing and types that match the backend contract.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Preview Pipeline Builds the Web Frontend Successfully (Priority: P1)

As an engineering lead responsible for merge gates, I need the preview deployment script to complete the web frontend build step without error, so that pull requests can reach the end-to-end verification stage instead of failing on a missing build artifact.

**Why this priority**: Without a successful web build, the entire preview environment and E2E merge gate (spec 005) is blocked. This is the root cause fix.

**Independent Test**: Run the preview deployment script with required environment variables in a clean workspace; confirm the web frontend build step completes and produces a tagged image or artifact ready for deployment.

**Acceptance Scenarios**:

1. **Given** a clean checkout with no pre-built web bundle, **When** the preview deployment script runs through its web build steps, **Then** the step that references the web frontend container definition succeeds without "file not found" or equivalent build failures.
2. **Given** a successful preview web build, **When** the resulting image or artifact is published, **Then** it is tagged consistently with the run identifier used by the backend image in the same pipeline run.
3. **Given** the preview deployment script's documented inputs (`GCP_PROJECT`, `GCP_REGION`, `RUN_ID`), **When** the script executes end-to-end through web image push, **Then** no manual intervention is required beyond those inputs.

---

### User Story 2 - Preview Web App Serves Single-Page Application Routing (Priority: P1)

As a QA engineer running end-to-end tests against the preview environment, I need the deployed web frontend to serve deep-linked routes correctly, so that browser tests can navigate directly to workspace URLs without receiving blank pages or server errors.

**Why this priority**: End-to-end suites navigate to venue and event workspace paths directly. A static file server that does not fall back to the application shell breaks the lifecycle and isolation test flows.

**Independent Test**: Deploy or run the built web frontend against a reachable backend, request a deep link such as a venue/event workspace path, and confirm the application shell loads and client routing initializes (not a 404 from the static server).

**Acceptance Scenarios**:

1. **Given** a running preview web frontend, **When** a user or automated browser requests the application root, **Then** the login or authenticated shell loads successfully.
2. **Given** a running preview web frontend, **When** a request is made to a client-routed path that does not correspond to a physical static file (e.g., a venue/event workspace URL), **Then** the application shell is returned and the client router can render the intended view.
3. **Given** static assets (scripts, styles, fonts) referenced by the built application, **When** those asset URLs are requested, **Then** they are served with correct content types and without cross-origin blocking that would prevent the app from loading.

---

### User Story 3 - Frontend Contract Types Are Synchronized at Build Time (Priority: P2)

As a developer merging API and frontend changes, I need the preview web build to use frontend types generated from the current backend contract, so that the preview environment reflects the same API surface the tests expect and manual type drift cannot silently break the build.

**Why this priority**: The platform constitution requires frontend data contracts to mirror the backend OpenAPI description. Preview builds must not ship with stale generated types when the backend contract has changed.

**Independent Test**: Trigger a web frontend container build in a pipeline context where the backend contract is available; confirm generated frontend types are produced or validated as part of the build and the compilation step succeeds.

**Acceptance Scenarios**:

1. **Given** the backend contract description is available at build time (via a configurable source URL or bundled artifact), **When** the web frontend image is built, **Then** frontend contract types are regenerated or verified against that description before the production bundle is produced.
2. **Given** the backend contract and frontend source are in sync, **When** the web frontend build runs, **Then** the build completes with zero type-compilation errors attributable to contract mismatch.
3. **Given** the backend contract has changed since the last build, **When** the web frontend build runs with access to the updated contract, **Then** the generated types reflect the new shapes and the bundle still compiles successfully.

---

### Edge Cases

- What happens when the backend contract source is unreachable during the web image build — does the build fail fast with a clear error rather than silently using stale types?
- What happens when the preview script runs `npm ci` and `npm run build` on the host **before** invoking the container build — is the container build idempotent and not dependent on host-only artifacts that would be missing in CI?
- What happens when a deep-linked route contains special characters or trailing slashes — does the static server still return the application shell?
- What happens when the web image is built on a machine with no cached node modules — does the multi-stage build remain self-contained?
- What happens when concurrent preview runs build web images with the same run identifier namespace — are tags unique per run as defined in spec 005?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The repository MUST include a web frontend container build definition at the path expected by `deploy/preview/deploy-preview.sh` so the preview deployment script no longer fails on a missing file.
- **FR-002**: The web frontend container build MUST produce a production-ready static bundle of the single-page application suitable for serving in the ephemeral preview environment.
- **FR-003**: The deployed web frontend MUST serve client-routed URLs by returning the application shell for paths that do not map to static assets, enabling deep-link navigation used by end-to-end tests.
- **FR-004**: The web frontend build MUST incorporate frontend contract types synchronized with the backend OpenAPI description before the production bundle is compiled, consistent with Constitution VI (polyglot contract governance).
- **FR-005**: The web frontend container build MUST be self-contained in CI (multi-stage or equivalent) so it does not rely on pre-existing host-only build outputs that may be absent in a clean pipeline runner.
- **FR-006**: The preview deployment script MUST continue to tag and push the web image using the same run identifier convention as the backend image in spec 005, without requiring script changes beyond what is necessary to align with the new build definition.
- **FR-007**: When the backend contract source is unavailable during build, the build MUST fail with an explicit error rather than proceeding with unchecked stale types.
- **FR-008**: Static assets produced by the build MUST be served in a way that allows the application to load and execute in the preview environment (correct MIME types, no blocking misconfiguration for required scripts and styles).
- **FR-009**: The feature MUST achieve ≥80% line/branch coverage across backend and frontend for all new or modified code paths introduced by this work (CI-enforced; Constitution III).

### Key Entities

- **Preview Run**: A uniquely identified pipeline execution (`RUN_ID`) that tags both backend and web frontend images and provisions an ephemeral environment (from spec 005).
- **Web Frontend Container Definition**: The build recipe referenced by the preview deployment script that transforms application source into a deployable web frontend image.
- **Frontend Contract Types**: Auto-generated TypeScript definitions derived from the backend OpenAPI description; the single source of truth for frontend data shapes (Constitution VI).
- **Application Shell**: The HTML entry point and bundled scripts that bootstrap client-side routing for all deep-linked paths.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The preview deployment script completes the web frontend build and push steps successfully in a clean CI workspace on the first attempt, with zero "missing build definition" failures.
- **SC-002**: At least three representative deep-linked client routes (root, a settings path, and a venue/event workspace path) load the application shell when requested against the built web frontend, verified manually or by an automated smoke check.
- **SC-003**: A web frontend container build triggered after a backend contract change completes with regenerated types and zero contract-related compilation failures.
- **SC-004**: End-to-end preview provisioning (spec 005) can proceed past the web build step without manual fixes, unblocking the E2E merge gate for pull requests.
- **SC-005**: ≥80% line/branch coverage achieved across backend and frontend code for this feature (CI-enforced; Constitution III).

## Assumptions

- The existing preview deployment script (`deploy/preview/deploy-preview.sh`) remains the orchestrator; this feature supplies the missing web build definition rather than redesigning the full preview architecture.
- The backend API container build (`apps/api/Dockerfile`) is unchanged and continues to be built separately; this feature covers only the web frontend side.
- Preview environments use the same single-page application as production; no separate preview-only UI fork is required.
- The backend OpenAPI description can be made available during web build either by fetching from a running API, from a checked-in or CI-produced swagger artifact, or by a build stage that compiles the API project first — the planning phase will choose the approach.
- Firebase Hosting configuration (spec 049) is a separate delivery path; this feature focuses on the containerized web image used by the preview pipeline, though the static bundle output may be structurally similar.
- Node dependency installation and production compilation follow the existing `apps/web` package scripts unless planning identifies a necessary adjustment for container self-containment.

## Dependencies

- **Spec 005** (E2E lifecycle & preview environment): Defines the preview deployment contract, run identifier tagging, and teardown expectations this feature unblocks.
- **Spec 049** (CSP HTTP response headers): Static hosting headers for Firebase are out of scope here but the preview web server should not introduce a policy that breaks application loading.
- **Constitution VI**: Frontend types must not be hand-authored; they must derive from the backend contract description.

## Out of Scope

- Redesigning `deploy/preview/deploy-preview.sh` to deploy the web image to Cloud Run alongside the API (current script deploys API only; web image push may precede a future wiring step).
- Production Firebase Hosting deployment pipeline changes.
- New user-facing product features in the web application.
- Ephemeral database, QBO stub, or seeding behavior (covered by spec 005).
