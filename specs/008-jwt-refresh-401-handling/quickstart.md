# Quickstart & Validation: JWT Persistence, Refresh Rotation & 401 Handling

**Feature**: `008-jwt-refresh-401-handling` | **Date**: 2026-06-16

A validation guide proving the mid-session recovery works end-to-end. See [contracts/api-client-recovery.md](contracts/api-client-recovery.md) and [contracts/ui-components.md](contracts/ui-components.md) for the behavioral specifics and the full test matrix; this file is the run/verify guide.

## Prerequisites

- Backend API running locally (Vite dev proxies `/api` → `http://localhost:5000`).
- Frontend deps installed in `apps/web`.

## Automated validation (primary)

Run from `apps/web`:

```bash
# Unit + component tests with coverage (≥80% gate enforced by vite.config.ts)
npm run test -- --coverage
```

Targeted suites:

```bash
npm run test -- tests/api/client.test.ts tests/api/client.refresh.test.ts
npm run test -- tests/auth/AuthContext.sessionExpiry.test.tsx tests/auth/LoginPage.test.tsx
```

Expected: all green; coverage for new/changed files (`src/api/client.ts`, `src/auth/AuthContext.tsx`, `src/pages/LoginPage.tsx`) at or above 80% lines/functions/branches/statements. A missing or unparseable coverage report is treated as a failure (Constitution III).

E2E (from repo root `tests/e2e` workspace):

```bash
npx playwright test specs/auth/session-refresh.spec.ts
```

Expected: expired-token-then-refresh keeps the session alive; unrecoverable session lands on the login screen showing the session-expired notice.

## Manual validation

### Scenario A — Transparent mid-session refresh (US1, SC-002)

1. Sign in normally; confirm you reach the dashboard.
2. In DevTools → Application → Local Storage, replace `accessToken` with a clearly invalid/expired value but leave `refreshToken` valid.
3. Trigger any data action (reload venues / open the ledger).
4. **Expected**: the action succeeds with no visible error; `accessToken` in storage has been replaced with a fresh value (rotation). Network tab shows one `POST /api/auth/refresh` followed by a successful replay of the original request.

### Scenario B — Concurrent burst, single refresh (US3, SC-004)

1. As in A, invalidate `accessToken` only.
2. Load a screen that fires several requests at once (dashboard).
3. **Expected**: the Network tab shows **exactly one** `POST /api/auth/refresh`; all data requests succeed; no error flashes.

### Scenario C — Unrecoverable session → login with notice (US2, FR-017, SC-005)

1. Invalidate **both** `accessToken` and `refreshToken` in storage.
2. Trigger any data action.
3. **Expected**: a best-effort `POST /api/auth/logout` is attempted, stored credentials are cleared, the app returns to the **Sign in** screen, and a **"Your session expired — please sign in again."** notice is shown. Signing in again restores access.

### Scenario D — Network blip during refresh → no false logout (FR-015, SC-007)

1. Invalidate `accessToken`; keep `refreshToken` valid.
2. In DevTools → Network, set throttling to **Offline**, then trigger a data action so the refresh call cannot reach the server.
3. **Expected**: a connectivity error surfaces; you are **not** signed out; `accessToken`/`refreshToken` remain in storage. Restore the network and retry the action — it now recovers normally.

## Traceability

| Scenario | User Story | Key requirements |
|----------|-----------|------------------|
| A | US1 | FR-001, FR-004, FR-005, FR-011, FR-014 |
| B | US3 | FR-010, SC-004 |
| C | US2 | FR-007, FR-012, FR-016, FR-017 |
| D | Edge case | FR-015, SC-007 |
