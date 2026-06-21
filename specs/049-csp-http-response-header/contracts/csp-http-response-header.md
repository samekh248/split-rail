# Contract: Content Security Policy HTTP Response Header

**Feature**: 049-csp-http-response-header (SPLR-42)  
**Date**: 2026-06-21  
**Type**: HTTP response header policy (not a new public API)

## Purpose

Define the exact `Content-Security-Policy` response header that production MUST emit on all web and API responses, per PRD §5.2 and TDD §9.

## Canonical production policy

```http
Content-Security-Policy: default-src 'self'; script-src 'self'; connect-src 'self' *.quickbooks.com *.googleapis.com; object-src 'none';
```

**Literal value** (no leading/trailing whitespace):

```text
default-src 'self'; script-src 'self'; connect-src 'self' *.quickbooks.com *.googleapis.com; object-src 'none';
```

## Delivery contract

| Surface | Owner | Applies to |
|---------|-------|------------|
| API (Cloud Run) | `ContentSecurityPolicyMiddleware` | All HTTP responses including errors and redirects |
| Static web (Firebase Hosting) | `apps/web/firebase.json` `hosting.headers` | All paths (`/**`) |

### Firebase Hosting header shape

```json
{
  "hosting": {
    "public": "dist",
    "headers": [
      {
        "source": "/**",
        "headers": [
          {
            "key": "Content-Security-Policy",
            "value": "default-src 'self'; script-src 'self'; connect-src 'self' *.quickbooks.com *.googleapis.com; object-src 'none';"
          }
        ]
      }
    ]
  }
}
```

## Environment contract

| `ASPNETCORE_ENVIRONMENT` | API header |
|--------------------------|------------|
| `Production` | Canonical production policy only |
| `Development` | Production policy; MAY append ` style-src 'self' 'unsafe-inline'` for local tooling |
| `Staging` / other non-dev | Canonical production policy only |

**Invariant**: `unsafe-inline` MUST NOT appear in any Production response header.

## Required directive checklist

| Directive | Required value | Absent in current meta tag? |
|-----------|----------------|----------------------------|
| `default-src` | `'self'` | No |
| `script-src` | `'self'` | No |
| `connect-src` | `'self' *.quickbooks.com *.googleapis.com` | Partial (`https://` prefix in meta — normalize to PRD form) |
| `object-src` | `'none'` | **Yes — gap to close** |

## Prohibited in production

- `style-src 'unsafe-inline'` (present in legacy meta tag — remove from production)
- `unsafe-eval`
- Wildcard `*` sources beyond PRD-specified connect hosts
- Duplicate conflicting `<meta http-equiv="Content-Security-Policy">` tag

## Verification contract

### API integration test matrix

| Request | Expected status | Header present | Header value |
|---------|-----------------|----------------|--------------|
| `GET /swagger/index.html` | 200 | Yes | Canonical |
| `GET /api/organizations` (unauthenticated) | 401 | Yes | Canonical |
| `GET /api/nonexistent` | 404 | Yes | Canonical |

### Playwright E2E contract

1. Navigate to web app origin → document response includes canonical header
2. `fetch('/api/...')` through app origin → response includes canonical header
3. Header value contains substring `object-src 'none'`
4. Header value does NOT contain `unsafe-inline` when `NODE_ENV`/deploy target is production

### Cross-artifact sync contract

These three locations MUST hold identical production policy strings:

1. `ContentSecurityPolicyOptions.ProductionPolicy` (C#)
2. `apps/web/src/security/contentSecurityPolicy.ts` export
3. `apps/web/firebase.json` header value

Automated tests MUST fail if any diverge.

## Compatibility notes

- QuickBooks OAuth and API calls to `*.quickbooks.com` remain permitted via `connect-src`
- Google API calls (e.g. Cloud endpoints) remain permitted via `*.googleapis.com`
- Vite-bundled scripts and styles served from same origin satisfy `script-src 'self'` and `default-src 'self'`

## Out of scope

- CSP violation reporting (`report-uri` / `report-to`)
- `Content-Security-Policy-Report-Only` shadow mode
- Per-route policy variation
