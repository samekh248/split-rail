# Quickstart: Validate Complete CSP HTTP Response Headers

**Feature**: 049-csp-http-response-header (SPLR-42)  
**Plan**: [plan.md](./plan.md)  
**Contract**: [contracts/csp-http-response-header.md](./contracts/csp-http-response-header.md)

## Prerequisites

- .NET 8 SDK
- Node.js 22 + npm
- Docker (optional — integration tests using shared `IntegrationTestBase` need Testcontainers; CSP-only tests may use lightweight `WebApplicationFactory` without DB)
- Repository root: `c:\Users\dusti\split-rail`

## Canonical policy reference

```text
default-src 'self'; script-src 'self'; connect-src 'self' *.quickbooks.com *.googleapis.com; object-src 'none';
```

## 1. Run backend integration tests (API headers)

```powershell
cd apps/api.tests
dotnet test --filter "FullyQualifiedName~ContentSecurityPolicy"
```

**Expected** (after implementation):
- `GET /swagger/index.html` → `Content-Security-Policy` header matches canonical policy
- Unauthenticated API request → 401 response still includes header
- Unknown route → 404 response still includes header
- Header contains `object-src 'none'`
- Header does NOT contain `unsafe-inline` when environment is Production

## 2. Run backend unit tests (policy config)

```powershell
cd apps/api.tests
dotnet test --filter "FullyQualifiedName~ContentSecurityPolicyOptions"
```

**Expected**: Production policy string equals contract literal; Development may differ only by optional `style-src` suffix.

## 3. Run frontend unit tests (policy constant sync)

```powershell
cd apps/web
npm run test -- tests/security/contentSecurityPolicy.test.ts
```

**Expected**: Exported TypeScript constant matches contract literal byte-for-byte.

## 4. Validate firebase.json (static hosting)

```powershell
# After implementation — manual or scripted check
Get-Content apps/web/firebase.json | Select-String "object-src"
```

**Expected**: `firebase.json` `hosting.headers` entry for `/**` includes canonical policy with `object-src 'none'`.

## 5. Run Playwright E2E (end-to-end header verification)

```powershell
cd tests/e2e
npx playwright test specs/integrity/csp-response-header.spec.ts
```

**Expected**:
- Web document response carries canonical `Content-Security-Policy` header
- Proxied API response carries same header
- No `unsafe-inline` in production-mode responses

## 6. Manual smoke (local)

### API

```powershell
cd apps/api
$env:ASPNETCORE_ENVIRONMENT = "Production"
dotnet run --urls http://127.0.0.1:5000
```

In another terminal:

```powershell
curl -sI http://127.0.0.1:5000/swagger/index.html | Select-String "Content-Security-Policy"
```

**Expected**: Header line matches canonical policy including `object-src 'none'`.

### Web (Vite preview — static path)

```powershell
cd apps/web
npm run build
npm run preview
```

Note: Vite preview serves locally without Firebase headers — use Playwright or deploy preview to Firebase for static header validation. API headers validated via curl above.

## 7. Coverage gate

```powershell
cd apps/api.tests
dotnet test /p:CollectCoverage=true --filter "FullyQualifiedName~ContentSecurityPolicy"

cd apps/web
npm run test:coverage
```

**Expected**: ≥80.0% line/branch coverage on touched middleware, options, and policy constant files.

## Failure diagnosis

| Symptom | Likely cause |
|---------|--------------|
| Header missing on 401/404/500 | CSP middleware not using `OnStarting` or registered after response started |
| Header missing on static assets only | `firebase.json` not deployed or wrong `public` path |
| `unsafe-inline` in production | Development policy leaking; check `IsProduction()` guard |
| QBO connect fails in browser | `connect-src` missing `*.quickbooks.com` — verify canonical string |
| Meta tag still present | `index.html` not updated — remove legacy `<meta http-equiv>` |
| TS/C#/firebase strings diverge | Update all three locations; run sync unit test |

## Next step

Run `/speckit-tasks` to generate implementation tasks from [plan.md](./plan.md).
