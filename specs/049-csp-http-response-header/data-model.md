# Data Model: Complete Content Security Policy via HTTP Response Headers

**Feature**: 049-csp-http-response-header (SPLR-42)  
**Date**: 2026-06-21

## Overview

This feature introduces **no database schema changes**. The data model documents the canonical CSP policy, delivery channels, environment rules, and validation invariants.

## Core Entity: Content Security Policy

| Attribute | Value / Rule |
|-----------|--------------|
| Header name | `Content-Security-Policy` |
| Production value | `default-src 'self'; script-src 'self'; connect-src 'self' *.quickbooks.com *.googleapis.com; object-src 'none';` |
| Source of truth | PRD §5.2 |
| Required directives | `default-src`, `script-src`, `connect-src`, `object-src` |

### Directive Breakdown

| Directive | Value | Purpose |
|-----------|-------|---------|
| `default-src` | `'self'` | Fallback for unspecified resource types |
| `script-src` | `'self'` | JavaScript only from same origin |
| `connect-src` | `'self' *.quickbooks.com *.googleapis.com` | XHR/fetch/WebSocket to self + QBO + Google APIs |
| `object-src` | `'none'` | Block plugins/embeds (`<object>`, `<embed>`, `<applet>`) |

## Delivery Channels

| Channel | Mechanism | Responses covered |
|---------|-----------|-------------------|
| **API** | `ContentSecurityPolicyMiddleware` in ASP.NET Core pipeline | All Cloud Run API responses (JSON, errors, redirects, swagger) |
| **Static web** | Firebase Hosting `headers` in `firebase.json` | HTML shell, JS bundles, CSS, fonts, static assets |

### Configuration Entity: `ContentSecurityPolicyOptions`

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `ProductionPolicy` | `string` | PRD §5.2 literal | Emitted when `IHostEnvironment.IsProduction()` |
| `DevelopmentPolicy` | `string?` | `ProductionPolicy` + optional ` style-src 'self' 'unsafe-inline'` | Emitted in Development only |
| `HeaderName` | `string` | `Content-Security-Policy` | Response header key |

## Environment Policy Matrix

| Environment | API header value | Static hosting header | Meta tag in `index.html` |
|-------------|------------------|----------------------|--------------------------|
| Production | PRD §5.2 exact | PRD §5.2 exact | **Removed** |
| Development | PRD §5.2 (+ optional dev `style-src`) | N/A (local Vite) | **Removed** |
| Preview / CI test | Production policy when env=Production | PRD §5.2 if deployed via Firebase | **Removed** |

## Validation Rules

1. **VR-001**: Every production HTTP response from API MUST include `Content-Security-Policy` header.
2. **VR-002**: Every production static response from Firebase Hosting MUST include the same header value.
3. **VR-003**: Header value MUST contain `object-src 'none'`.
4. **VR-004**: Production header MUST NOT contain `unsafe-inline`, `unsafe-eval`, or other dev-only directives.
5. **VR-005**: `connect-src` MUST include `*.quickbooks.com` and `*.googleapis.com` host patterns.
6. **VR-006**: C#, TypeScript, and `firebase.json` policy strings MUST be byte-identical to the contract (whitespace-normalized).
7. **VR-007**: Header MUST be present on error responses (4xx/5xx) from the API, not only success paths.

## State Transitions

Not applicable — policy is static configuration with environment-based selection at request time. No persisted state.

## Relationships

```text
PRD §5.2 (canonical string)
  ├── ContentSecurityPolicyOptions (C# config)
  │     └── ContentSecurityPolicyMiddleware → all API responses
  ├── contentSecurityPolicy.ts (TS export)
  │     └── unit test ↔ contract assertion
  └── firebase.json headers → all static web responses

Removed:
  index.html <meta http-equiv="Content-Security-Policy"> (legacy)
```

## Out of Scope

- Database tables, migrations, EF entities
- `Content-Security-Policy-Report-Only` reporting endpoint
- Subresource Integrity (SRI) hashes
- TLS 1.3 transport hardening (separate milestone item)
- Nonce/hash-based CSP for inline scripts
