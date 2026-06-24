# Research: Complete Content Security Policy via HTTP Response Headers

**Feature**: 049-csp-http-response-header (SPLR-42)  
**Date**: 2026-06-21

## R1: API response header delivery mechanism

**Decision**: Add a dedicated `ContentSecurityPolicyMiddleware` registered early in the ASP.NET Core pipeline (immediately after `ExceptionHandlerMiddleware` so error responses also carry the header).

**Rationale**: Existing middleware pattern (`ExceptionHandlerMiddleware`, `TenantContextMiddleware`) is established in this codebase. A custom middleware keeps the PRD §5.2 policy string explicit, unit-testable, and independent of third-party packages. ASP.NET Core's built-in `UseSecurityHeaders` / NWebsec alternatives add abstraction without benefit for a single static policy string.

**Alternatives considered**:

| Alternative | Rejected because |
|-------------|------------------|
| `app.Use(async (ctx, next) => { ... })` inline in `Program.cs` | Harder to unit/integration test; violates existing middleware file convention |
| Reverse proxy / Cloud Run ingress headers only | Does not cover local dev, preview, or swagger; splits policy ownership from application |
| Meta tag only (status quo) | Fails SPLR-42 acceptance criteria; weaker enforcement; no coverage for JSON API responses |

## R2: Static web response header delivery mechanism

**Decision**: Add `apps/web/firebase.json` with a global `headers` rule applying `Content-Security-Policy` to `/**` for the Vite `dist/` public path.

**Rationale**: Linear issue and SPLR-42 scope explicitly call out Firebase Hosting headers config. No `firebase.json` exists today — this feature introduces it. Firebase Hosting applies headers at the CDN edge for all static assets (HTML shell, JS, CSS, fonts) without requiring Vite build plugins.

**Alternatives considered**:

| Alternative | Rejected because |
|-------------|------------------|
| Vite `server.headers` / build plugin only | Covers dev/preview only; production static hosting bypasses Vite |
| Cloud CDN config outside repo | Not version-controlled; harder to test in CI |
| Duplicate meta tag update | Does not satisfy HTTP header requirement |

## R3: Canonical policy string normalization

**Decision**: Use the PRD §5.2 string verbatim as the single source of truth:

```text
default-src 'self'; script-src 'self'; connect-src 'self' *.quickbooks.com *.googleapis.com; object-src 'none';
```

Duplicate this exact string in (1) C# `ContentSecurityPolicyOptions.ProductionPolicy`, (2) `apps/web/src/security/contentSecurityPolicy.ts`, and (3) `firebase.json` — with contract tests asserting all three match.

**Rationale**: PRD specifies exact format without `https://` scheme prefixes on host sources. Current meta tag uses `https://*.quickbooks.com` which is equivalent in modern browsers but diverges from the spec literal. Normalizing to PRD form satisfies SC-004 diff checks.

**Alternatives considered**:

| Alternative | Rejected because |
|-------------|------------------|
| Shared JSON file imported by both stacks | Adds build tooling complexity for a 120-char string |
| Scheme-prefixed hosts (`https://*.quickbooks.com`) | Fails literal PRD §5.2 match requirement |

## R4: Legacy meta tag handling

**Decision**: **Remove** the `<meta http-equiv="Content-Security-Policy">` from `apps/web/index.html`.

**Rationale**: Spec FR-006 requires headers as authoritative enforcement. Retaining a meta tag creates dual sources that may diverge (current meta includes `style-src 'unsafe-inline'` absent from PRD). Browsers combine policies when both exist — the stricter effective policy is unpredictable during transition.

**Alternatives considered**:

| Alternative | Rejected because |
|-------------|------------------|
| Update meta to match PRD | Still fails HTTP header requirement; duplicate maintenance |
| Keep meta as fallback | Contradicts FR-006; dev/prod divergence risk remains |

## R5: Development environment policy

**Decision**: Production and Staging environments emit PRD §5.2 only. Development environment (`ASPNETCORE_ENVIRONMENT=Development`) may append `style-src 'self' 'unsafe-inline'` via middleware for Vite HMR/local tooling — **never** in Production. Local Vite dev server does not inject CSP headers (browser relies on no header or optional future dev-only plugin; out of scope unless styles break without inline allowance).

**Rationale**: Current meta tag's `style-src 'unsafe-inline'` exists for developer convenience. Spec FR-005 forbids this in production. Vite production builds bundle CSS without inline styles, so PRD policy should not break prod UI. If local dev styles break after meta removal, add Vite dev-server headers in a follow-up — not production leakage.

**Alternatives considered**:

| Alternative | Rejected because |
|-------------|------------------|
| Same strict policy everywhere including dev | May break Vite HMR; acceptable trade-off to try strict-first |
| Relaxed policy in firebase.json for preview deploys | Preview deploys use Firebase Hosting — use production policy to match acceptance criteria |

## R6: Error and exception response coverage

**Decision**: Register CSP middleware **before** auth/tenant middleware but **after** `ExceptionHandlerMiddleware` is incorrect — actually ExceptionHandlerMiddleware wraps the pipeline in try/catch, so CSP middleware should run **inside** the try block on the way out. Place CSP middleware **first** (before ExceptionHandler) OR append header in both middleware and exception handler.

**Revised decision**: Place `ContentSecurityPolicyMiddleware` as the **first** middleware after `app.Build()` so it wraps all responses including those written by `ExceptionHandlerMiddleware` on the outbound path. Pattern: call `await _next(context)` then append header if not already present (or use `OnStarting` callback).

**Rationale**: ExceptionHandlerMiddleware writes the response body after catching exceptions; header must be set before response starts. Using `context.Response.OnStarting()` in CSP middleware ensures header is appended even when downstream middleware short-circuits.

**Alternatives considered**:

| Alternative | Rejected because |
|-------------|------------------|
| Append only in exception handler | Misses success responses |
| Append only on success path | Misses 4xx/5xx from exception handler |

## R7: Verification strategy (FR-007–FR-009)

**Decision**:

1. **Integration tests** (`ContentSecurityPolicyMiddlewareTests`): `WebApplicationFactory<Program>` with `ASPNETCORE_ENVIRONMENT=Production` — assert header on `GET /swagger`, `GET /api/...` (authenticated), and forced 404/401 error responses.
2. **Unit tests**: Policy constant equality; optional environment gating tests.
3. **Frontend unit test**: `contentSecurityPolicy.test.ts` asserts exported constant matches contract.
4. **Playwright E2E** (`csp-response-header.spec.ts`): Load web app, intercept document response, assert header; call API via browser context, assert same header on JSON response.
5. **Contract test** (optional CI step): Parse `firebase.json` and assert header value matches canonical string.

**Rationale**: Dual delivery paths require dual automated verification. Integration tests prove API wiring; Playwright proves end-user-visible headers through the full stack; firebase.json validated statically.

**Alternatives considered**:

| Alternative | Rejected because |
|-------------|------------------|
| Manual production curl only | Not CI-enforceable |
| Meta tag DOM inspection | Wrong delivery mechanism per spec |

## R8: Style-src and production UI impact

**Decision**: Do not add `style-src` directive in production — rely on `default-src 'self'` fallback for stylesheets bundled by Vite.

**Rationale**: Vite production build emits external CSS files served from `'self'`. Inline styles in React (if any) would need audit — none expected in current codebase. If E2E reveals blocked styles, add `style-src 'self'` (still PRD-compliant as additive) before considering `unsafe-inline`.

**Alternatives considered**:

| Alternative | Rejected because |
|-------------|------------------|
| Carry `unsafe-inline` to production | Violates FR-005 and SC-004 |
