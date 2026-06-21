# Implementation Plan: Complete Content Security Policy via HTTP Response Headers

**Branch**: `049-csp-http-response-header` | **Date**: 2026-06-21 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/049-csp-http-response-header/spec.md` (Linear SPLR-42)

## Summary

Close the **CSP delivery gap**: today the policy lives only as an HTML `<meta>` tag in `apps/web/index.html`, omits `object-src 'none'`, and is never emitted as an HTTP response header. Deliver the PRD §5.2 policy on **both delivery paths** — (1) ASP.NET Core middleware on every API response, and (2) Firebase Hosting `headers` config on every static web response — using a single canonical policy string. Remove the meta tag (header becomes authoritative). Scope dev-only relaxations to non-production environments only.

## Technical Context

**Language/Version**: C# / .NET 8.0 (`apps/api`), TypeScript / Node 22 (`apps/web`), JSON hosting config (`firebase.json`)

**Primary Dependencies**: ASP.NET Core middleware pipeline (`Program.cs`), existing custom middleware patterns (`ExceptionHandlerMiddleware`), Firebase Hosting headers (new `firebase.json`), Vitest + Playwright for verification

**Storage**: No schema migrations or persistence changes

**Testing**: xUnit integration tests (`WebApplicationFactory<Program>`) asserting `Content-Security-Policy` on API success/error responses; Vitest unit tests for canonical policy helper/constants in `apps/web`; Playwright E2E header inspection on web entry + proxied API; optional JSON contract test for `firebase.json` headers; ≥80.0% line/branch coverage on touched backend and frontend files (Constitution III)

**Target Platform**: GCP Cloud Run API + Firebase Hosting static web bundle (production)

**Project Type**: Web application monorepo — **cross-cutting security headers** on API middleware and static hosting config

**Performance Goals**: Negligible — one header append per HTTP response

**Constraints**: Production policy MUST match PRD §5.2 exactly; dev-only directives (e.g. `style-src 'unsafe-inline'`) MUST NOT appear in production; QuickBooks/Google `connect-src` allowances preserved; ≥80.0% coverage on touched files; missing/unparseable coverage reports fail CI

**Scale/Scope**: ~3 new/modified backend files (middleware + options + Program wiring), ~2 frontend files (`index.html`, policy constant/test), 1 new `firebase.json`, 1–2 integration test files, 1 Playwright spec; 0 migrations, 0 API route/DTO changes

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Relevance | Status |
|-----------|-----------|--------|
| I. Core Mathematical Axioms | No monetary math. | N/A |
| II. Multi-Tenant Isolation | No query or data-scope changes. | N/A |
| III. Engineering Rigor | **Primary** — integration + unit + E2E header verification; ≥80% on touched files. | PASS |
| IV. QBO Integration | **Secondary** — `connect-src` must retain `*.quickbooks.com`; no outbound write changes. | PASS |
| V. Ledger State Machine | Unrelated. | N/A |
| VI. Polyglot Contract | No DTO/OpenAPI changes. | N/A |
| VII. EF Core Axioms | No database access. | N/A |
| VIII. Exception Governance | Middleware must not log secrets; header value is static config (no PII). | PASS |
| IX. UI Iconography | No UI component changes. | N/A |

**Post-design re-check (Phase 1)**: [research.md](./research.md), [data-model.md](./data-model.md), and [contracts/csp-http-response-header.md](./contracts/csp-http-response-header.md) confirm dual-path header delivery (API middleware + Firebase Hosting), meta-tag removal, environment-scoped dev relaxations, and integration/E2E verification strategy. Gates remain PASS. No Complexity Tracking entries required.

## Project Structure

### Documentation (this feature)

```text
specs/049-csp-http-response-header/
├── plan.md              # This file
├── research.md          # Phase 0 — delivery path, meta tag, dev policy decisions
├── data-model.md        # Phase 1 — policy entity, delivery channels, env rules
├── quickstart.md        # Phase 1 — validation scenarios
├── contracts/
│   └── csp-http-response-header.md  # Phase 1 — canonical header contract
├── checklists/
│   └── requirements.md  # From /speckit-specify
└── tasks.md             # Phase 2 (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
apps/api/
├── Program.cs                                    # MODIFY — register CSP middleware early in pipeline
├── Configuration/
│   └── ContentSecurityPolicyOptions.cs           # NEW — canonical policy + env flag
└── Middleware/
    └── ContentSecurityPolicyMiddleware.cs        # NEW — append header on all responses

apps/api.tests/
├── Integration/
│   └── ContentSecurityPolicyMiddlewareTests.cs   # NEW — header on API + error paths
└── Unit/
    └── ContentSecurityPolicyOptionsTests.cs      # NEW — policy string + env gating (if needed)

apps/web/
├── index.html                                    # MODIFY — remove meta CSP tag
├── firebase.json                                 # NEW — hosting headers for static responses
└── src/
    └── security/
        └── contentSecurityPolicy.ts              # NEW — exported canonical policy constant + tests

apps/web/tests/
└── security/
    └── contentSecurityPolicy.test.ts             # NEW — policy string matches contract

tests/e2e/
└── specs/integrity/
    └── csp-response-header.spec.ts               # NEW — web + API header verification
```

**Structure Decision**: Minimal cross-cutting change — one ASP.NET Core middleware following existing `Middleware/` conventions, one Firebase Hosting config for static assets, shared canonical policy documented in contract. No new NuGet packages required (custom middleware over third-party security-headers package to keep policy string explicit and testable).

## Complexity Tracking

> No constitution violations requiring justification.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |

## Phase 0 & Phase 1 Outputs

| Artifact | Path | Status |
|----------|------|--------|
| Research | [research.md](./research.md) | Complete |
| Data model | [data-model.md](./data-model.md) | Complete |
| Contract | [contracts/csp-http-response-header.md](./contracts/csp-http-response-header.md) | Complete |
| Quickstart | [quickstart.md](./quickstart.md) | Complete |

**Next**: Run `/speckit-tasks` to generate dependency-ordered `tasks.md`.
