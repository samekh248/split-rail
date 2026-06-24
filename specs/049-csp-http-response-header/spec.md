# Feature Specification: Complete Content Security Policy via HTTP Response Headers

**Feature Branch**: `049-csp-http-response-header`

**Created**: 2026-06-21

**Status**: Draft

**Input**: Linear [SPLR-42](https://linear.app/audiodex/issue/SPLR-42/serve-complete-csp-as-http-response-header-incl-object-src-none) — Serve complete CSP as HTTP response header (incl. object-src 'none')

**Linear Issue**: [SPLR-42](https://linear.app/audiodex/issue/SPLR-42/serve-complete-csp-as-http-response-header-incl-object-src-none)

**Project Milestone**: Gap: Security, Secrets & Transport Hardening

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Production responses enforce the mandated security policy via HTTP headers (Priority: P1)

As a security and compliance stakeholder, I need every production HTTP response from the platform to include the complete Content Security Policy as a response header, so that browser enforcement does not depend on page markup alone and meets the product security baseline defined in PRD §5.2.

**Why this priority**: Today the policy exists only as an HTML meta tag, which is weaker than header-based enforcement, can be omitted by intermediaries, and does not apply to non-HTML responses. Header delivery is the required compliance mechanism for this milestone.

**Independent Test**: Request representative production pages and API responses, inspect response headers, and confirm the mandated policy is present as `Content-Security-Policy` on each response without requiring HTML parsing.

**Acceptance Scenarios**:

1. **Given** the platform is running in production, **When** a user or client requests the main web application entry page, **Then** the response includes a `Content-Security-Policy` header matching PRD §5.2 exactly.
2. **Given** the platform is running in production, **When** a client requests a backend API response (including error responses), **Then** the response includes the same mandated `Content-Security-Policy` header.
3. **Given** the platform is running in production, **When** a security reviewer inspects static asset delivery responses (scripts, styles, or HTML shells served by the web hosting layer), **Then** those responses also carry the mandated header.

---

### User Story 2 - Policy blocks plugin and embedded-object injection vectors (Priority: P1)

As a platform operator protecting venue financial data, I need the security policy to explicitly deny object and plugin embedding (`object-src 'none'`), so that legacy plugin-based attack surfaces cannot load inside the application context.

**Why this priority**: The current meta-tag policy omits `object-src 'none'`, leaving a known hardening gap called out in PRD §5.2 and TDD §9. Closing this directive is a direct acceptance criterion for the issue.

**Independent Test**: Verify the production header string includes `object-src 'none'` and that automated policy validation reports no missing required directives relative to PRD §5.2.

**Acceptance Scenarios**:

1. **Given** a production response with the mandated header, **When** the policy is parsed, **Then** it contains `object-src 'none'` as an explicit directive.
2. **Given** the mandated production policy, **When** compared against PRD §5.2, **Then** all required directives are present with equivalent values: `default-src 'self'`, `script-src 'self'`, `connect-src 'self' *.quickbooks.com *.googleapis.com`, and `object-src 'none'`.
3. **Given** a page that would attempt to load an embedded object or plugin, **When** the browser applies the header policy, **Then** the object load is blocked by policy enforcement.

---

### User Story 3 - Production policy is authoritative; development allowances do not leak (Priority: P2)

As a developer working locally, I need development-only policy relaxations (such as inline styles needed by local tooling) to remain confined to non-production environments, so that production security posture is not weakened by convenience directives used during development.

**Why this priority**: The current meta-tag policy includes development-oriented allowances (for example inline styles) that are not part of PRD §5.2. Production must match the spec policy exactly without carrying over dev-only directives.

**Independent Test**: Compare policy emitted in production versus local development; confirm production matches PRD §5.2 exactly and that any additional development-only directives are absent from production responses.

**Acceptance Scenarios**:

1. **Given** the platform is running in production, **When** the Content Security Policy header is inspected, **Then** it does not include development-only directives such as `style-src 'unsafe-inline'` unless explicitly added to PRD §5.2.
2. **Given** the platform is running in a local development environment, **When** additional directives are needed for developer tooling, **Then** those directives are scoped to non-production environments only.
3. **Given** both web and API delivery paths in production, **When** policies are compared, **Then** they present a single consistent mandated policy rather than divergent partial policies.

---

### Edge Cases

- **Duplicate policy sources**: If both a meta tag and a response header are present, the stricter effective policy applies in browsers; production must not rely on the meta tag as the primary enforcement mechanism once headers are in place.
- **Non-HTML API responses**: JSON and binary API responses must still carry the header even though they do not render HTML, ensuring uniform security signaling and future-proofing for mixed-content endpoints.
- **Cached responses**: Responses served from intermediate caches must still expose the mandated header to clients (header must be set at origin, not stripped).
- **QuickBooks and Google API connectivity**: The mandated `connect-src` allowance for QuickBooks and Google APIs must remain intact so existing integration flows continue to function under the tightened policy.
- **Error and redirect responses**: 4xx/5xx error pages and redirects must include the same policy header so security posture is consistent across success and failure paths.

## Requirements *(mandatory)*

### Functional Requirements

#### Header Delivery

- **FR-001**: The platform MUST emit the complete Content Security Policy as an HTTP response header named `Content-Security-Policy` on all production responses from the web application delivery layer.
- **FR-002**: The platform MUST emit the same mandated Content Security Policy header on all production responses from backend services.
- **FR-003**: Production policy MUST match PRD §5.2 exactly:

  `default-src 'self'; script-src 'self'; connect-src 'self' *.quickbooks.com *.googleapis.com; object-src 'none';`

#### Policy Completeness

- **FR-004**: The production policy MUST include the `object-src 'none'` directive, which is currently missing from the existing meta-tag policy.
- **FR-005**: Production responses MUST NOT include development-only policy directives (such as inline style allowances) unless those directives are explicitly part of PRD §5.2.
- **FR-006**: Where a legacy HTML meta-tag policy remains during transition, it MUST NOT contradict the mandated production header policy; header delivery is the authoritative enforcement mechanism in production.

#### Verification and Quality

- **FR-007**: Automated verification MUST confirm the mandated header is present on representative production web and API responses.
- **FR-008**: Automated verification MUST confirm the header value includes all PRD §5.2 directives, including `object-src 'none'`.
- **FR-009**: The feature MUST achieve ≥80% line/branch coverage across backend and frontend for all new or modified enforcement and verification code (CI-enforced; Constitution III).

### Key Entities

- **Content Security Policy (CSP)**: The browser-enforceable set of directives that restrict which resources a page may load or connect to; in this feature, represented as a single canonical production policy string mandated by PRD §5.2.
- **Production Response**: Any HTTP response served to end users or client applications in the production environment, including HTML pages, static assets, API payloads, and error responses.
- **Policy Directive**: An individual clause within the CSP (for example `object-src 'none'`) that controls a specific resource category.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of sampled production web entry and static asset responses include a `Content-Security-Policy` header matching PRD §5.2 exactly (verified by automated header inspection).
- **SC-002**: 100% of sampled production API responses include the same mandated `Content-Security-Policy` header (verified by automated header inspection).
- **SC-003**: Security review confirms `object-src 'none'` is present in production — zero production responses omit this directive.
- **SC-004**: Production responses contain zero development-only CSP directives not specified in PRD §5.2 (verified by policy diff against the canonical string).
- **SC-005**: Existing QuickBooks connection and Google-backed integration flows continue to function under the tightened policy (no regression in primary user journeys that depend on allowed connect targets).
- **SC-006**: ≥80% line/branch coverage achieved across backend and frontend code for this feature (CI-enforced; Constitution III).

## Assumptions

- PRD §5.2 defines the canonical production CSP string; no additional directives beyond that string are required for this milestone unless PRD is amended.
- Local development may retain additional directives for developer convenience, provided they never appear on production responses.
- QuickBooks (`*.quickbooks.com`) and Google API (`*.googleapis.com`) host patterns remain the only external connect targets required in production.
- TLS 1.3 transport hardening referenced elsewhere in the security milestone is out of scope for this feature unless explicitly coupled in implementation planning.
- Browser support for CSP Level 2+ directives including `object-src` is assumed for all supported client browsers per existing product browser support matrix.

## Dependencies

- PRD §5.2 (canonical CSP policy definition)
- TDD §9 (security transport and header requirements)
- Existing QuickBooks Online integration (connect-src allowances must remain compatible)
- Linear issue SPLR-42 under milestone "Gap: Security, Secrets & Transport Hardening"
