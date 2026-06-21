# Feature Specification: Firebase Hosting for React Single-Page Application

**Feature Branch**: `052-firebase-hosting-spa`

**Created**: 2026-06-21

**Status**: Draft

**Input**: Linear [SPLR-45](https://linear.app/audiodex/issue/SPLR-45/firebase-hosting-config-for-react-spa-routing-headers) — Firebase Hosting config for React SPA (routing + headers)

**Linear Issue**: [SPLR-45](https://linear.app/audiodex/issue/SPLR-45/firebase-hosting-config-for-react-spa-routing-headers)

**Project Milestone**: Gap: GCP Infrastructure & Deployment

## Overview

The platform's production web experience is a client-routed single-page application. Today there is no hosting configuration that serves the built static bundle over HTTPS with correct deep-link behavior and mandated security headers. Users who bookmark or share workspace URLs, and automated tests that navigate directly to venue or event paths, cannot rely on production hosting until this gap is closed.

This feature delivers production static hosting configuration and a repeatable deploy path so the React application is published with working client-side routing, transport encryption, and security headers aligned with the product security baseline (PRD §5.2).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Deep-linked workspace URLs load in production (Priority: P1)

As a venue operator or accountant, I need to open a bookmarked or shared link to a specific workspace route in the production web application, so that I land on the intended screen instead of a blank page or "not found" error from the hosting layer.

**Why this priority**: Client-side routing is fundamental to every post-login workflow. Without a hosting fallback to the application shell, production deep links are broken regardless of application code quality.

**Independent Test**: Deploy the built web bundle to the production hosting target, request a client-routed path that has no matching physical file (for example a venue or event workspace URL), and confirm the application shell loads and the client router can render the intended view.

**Acceptance Scenarios**:

1. **Given** the production web application is deployed to static hosting, **When** a user requests the application root, **Then** the login or authenticated shell loads successfully over HTTPS.
2. **Given** the production web application is deployed, **When** a user or browser requests a deep-linked client route that does not correspond to a static file on disk, **Then** the hosting layer returns the application shell so client routing can initialize.
3. **Given** static assets referenced by the built application (scripts, styles, fonts, images), **When** those asset URLs are requested directly, **Then** they are served as distinct files with correct content and are not incorrectly rewritten to the application shell.

---

### User Story 2 - Security headers are enforced on all static hosting responses (Priority: P1)

As a security and compliance stakeholder, I need every response from the production static hosting layer to include the mandated security headers (including the complete Content Security Policy), so that browser enforcement applies at the edge for HTML shells and static assets without relying on page markup alone.

**Why this priority**: PRD §5.2 and TDD §7 require security headers on static delivery. Header-based policy at the hosting layer is the authoritative enforcement path for scripts, styles, and the HTML entry point served to end users.

**Independent Test**: After deployment, inspect response headers on the application entry page and on representative static assets; confirm mandated security headers (including Content-Security-Policy matching PRD §5.2) are present on all sampled responses.

**Acceptance Scenarios**:

1. **Given** the production static hosting configuration is active, **When** a client requests the main application entry page, **Then** the response includes a Content-Security-Policy header matching the canonical production policy defined in PRD §5.2.
2. **Given** the production static hosting configuration is active, **When** a client requests JavaScript, CSS, or font assets, **Then** those responses also include the same mandated Content-Security-Policy header.
3. **Given** the canonical production policy from PRD §5.2, **When** hosting header configuration is validated, **Then** it includes all required directives including `object-src 'none'` and the QuickBooks and Google API connect allowances.

---

### User Story 3 - Engineering can deploy the web bundle repeatably (Priority: P2)

As a release engineer, I need a documented, automatable deploy step that publishes the built React bundle to production static hosting, so that each release can promote the web frontend without manual file uploads or ad-hoc configuration.

**Why this priority**: Configuration alone does not deliver value until the deploy path is wired. A repeatable deploy step closes the infrastructure gap called out in TDD §7 and unblocks production web releases.

**Independent Test**: From a clean workspace with a successful web build, run the documented deploy procedure using project-standard credentials; confirm the hosting target serves the newly built bundle with updated static asset hashes.

**Acceptance Scenarios**:

1. **Given** a successful production build of the web application, **When** the deploy procedure runs with required project credentials, **Then** the static hosting target is updated without manual intervention beyond documented inputs.
2. **Given** a completed deploy, **When** a user loads the production web URL, **Then** they receive the newly deployed bundle (verified by build artifact identifiers or content change).
3. **Given** deploy documentation, **When** an engineer follows the steps in a staging or production-equivalent environment, **Then** the procedure completes without undocumented prerequisites.

---

### Edge Cases

- **Direct asset URLs vs. application routes**: Requests for paths that match real static files (hashed JavaScript bundles, stylesheets, images) must be served as files; only non-file paths fall back to the application shell.
- **Trailing slashes and encoded paths**: Deep links with trailing slashes or URL-encoded segments must still resolve to a loadable application shell.
- **404 on missing static assets**: Requests for non-existent static files (for example a stale hashed script after a new deploy) should return a clear not-found response rather than the application shell, so browsers do not misinterpret a missing script as a routable page.
- **Header consistency after deploy**: Security headers must remain present after redeploy and cache invalidation; a new bundle version must not regress header delivery.
- **CSP coordination**: If the canonical Content Security Policy is updated in the security baseline feature (spec 049), hosting header configuration must stay synchronized so production static responses do not diverge from API responses.
- **Preview vs. production hosting**: Ephemeral preview environments (spec 005, spec 051) may use container-based web delivery; this feature targets the long-lived production static hosting path defined in TDD §7 without blocking preview pipelines.

## Requirements *(mandatory)*

### Functional Requirements

#### Static Hosting Configuration

- **FR-001**: The platform MUST define production static hosting configuration that publishes the built web application bundle over HTTPS with platform-managed TLS.
- **FR-002**: The hosting configuration MUST route requests for client-side application paths to the application shell so deep-linked URLs load successfully in production.
- **FR-003**: The hosting configuration MUST continue to serve physical static assets (scripts, styles, fonts, images) as distinct files without incorrectly rewriting them to the application shell.
- **FR-004**: The hosting configuration MUST designate the correct build output directory as the public root for deployed static content.

#### Security Headers

- **FR-005**: The static hosting configuration MUST attach the complete Content-Security-Policy mandated by PRD §5.2 to all hosted paths, including the application shell and static assets.
- **FR-006**: The Content-Security-Policy applied at the hosting layer MUST include `object-src 'none'` and the required `connect-src` allowances for QuickBooks and Google API endpoints.
- **FR-007**: Where additional security headers are specified in PRD §5.2 for static delivery, the hosting configuration MUST apply them consistently on all responses from the static hosting layer.
- **FR-008**: The hosting-layer Content-Security-Policy MUST remain synchronized with the canonical production policy maintained by the Content Security Policy feature (spec 049); divergence between delivery channels is not permitted in production.

#### Deployment

- **FR-009**: The platform MUST provide a repeatable deploy procedure that publishes the built web bundle to the production static hosting target.
- **FR-010**: The deploy procedure MUST be documentable with explicit prerequisites (project identity, authentication, build artifact location) so release engineering can execute it without tribal knowledge.
- **FR-011**: Automated verification MUST confirm hosting configuration includes SPA fallback rules and mandated security headers before or after deploy (static configuration validation acceptable for header and rewrite rules).

#### Verification and Quality

- **FR-012**: Automated verification MUST confirm deep-linked client routes return the application shell when deployed to the hosting target (or via hosting-configuration contract tests plus post-deploy smoke checks).
- **FR-013**: Automated verification MUST confirm mandated security headers are present on representative static hosting responses.
- **FR-014**: The feature MUST achieve ≥80% line/branch coverage across backend and frontend for all new or modified hosting configuration, deploy wiring, and verification code (CI-enforced; Constitution III).

### Key Entities

- **Static Hosting Configuration**: The declarative settings that define where the built web bundle is served from, how non-file routes are handled, and which security headers are applied at the edge.
- **Application Shell**: The primary HTML entry point that bootstraps the client-side router; returned for deep-linked routes that have no matching static file.
- **Deploy Procedure**: The repeatable steps and credentials required to publish a new web build to the production hosting target.
- **Canonical Production Policy**: The single mandated Content Security Policy string defined in PRD §5.2, shared across static hosting and other delivery channels.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of sampled deep-linked client routes on production static hosting return a loadable application shell (verified by automated navigation or hosting smoke tests).
- **SC-002**: 100% of sampled production static hosting responses (entry page and static assets) include a Content-Security-Policy header matching PRD §5.2 exactly.
- **SC-003**: A release engineer can complete the documented deploy procedure end-to-end in one session without undocumented manual steps (verified by following quickstart documentation in a clean environment).
- **SC-004**: Static asset URLs continue to resolve as distinct files after SPA fallback is enabled — zero regression where script or style requests incorrectly receive HTML shell content.
- **SC-005**: Production web URLs are served exclusively over HTTPS with valid platform-managed certificates (verified by TLS inspection on the hosting endpoint).
- **SC-006**: ≥80% line/branch coverage achieved across backend and frontend code for this feature (CI-enforced; Constitution III).

## Assumptions

- Firebase Hosting is the designated production static hosting platform per TDD §7; SSL/TLS termination is provided by the platform without custom certificate management for this milestone.
- The web application build output is produced by the existing frontend build pipeline and lands in a predictable directory suitable as the hosting public root.
- The canonical Content Security Policy string is defined in PRD §5.2 and maintained as a single source of truth coordinated with spec 049; this feature applies that policy at the static hosting layer rather than redefining it.
- Production API delivery continues to emit the same security headers via backend middleware (spec 049); static hosting headers complement but do not replace API header delivery.
- Preview and pull-request environments may continue using container-based web delivery (spec 051); they are not required to use Firebase Hosting for this milestone.
- Firebase project and hosting site identifiers already exist or will be provisioned as part of broader GCP infrastructure setup outside this feature's core scope.

## Dependencies

- TDD §7 (Firebase Hosting for static React bundle with SSL, SPA rewrites, security headers)
- PRD §5.2 (canonical security headers including Content-Security-Policy)
- Spec 049 (Content Security Policy via HTTP response headers — policy string synchronization)
- Spec 005 (preview environment and E2E merge gates — must not regress preview web delivery)
- Spec 051 (preview web container build — parallel delivery path for ephemeral environments)
- Linear issue SPLR-45 under milestone "Gap: GCP Infrastructure & Deployment"

## Out of Scope

- Defining or amending the canonical Content Security Policy string (owned by spec 049 / PRD §5.2)
- Backend API middleware header delivery (owned by spec 049)
- Preview environment container-based web hosting (owned by spec 051)
- Custom domain DNS provisioning and certificate import (assumed handled by platform defaults or separate infrastructure work)
- CDN cache tuning, geographic edge configuration, or performance optimization beyond baseline hosting
