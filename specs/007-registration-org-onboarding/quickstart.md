# Quickstart & Validation: Registration & Organization Onboarding Flow

A run/validation guide proving the feature works end-to-end. Implementation details live in `tasks.md` and the code. Contracts: [onboarding-flows.md](contracts/onboarding-flows.md), [ui-components.md](contracts/ui-components.md). State model: [data-model.md](data-model.md).

## Prerequisites

- Backend API running (`apps/api`) against its database (no schema changes for this feature).
- Frontend dev server (`apps/web`) proxying `/api` to the backend (see `vite.config.ts`).
- No new environment variables or dependencies.

## Run

```bash
# Terminal 1 — backend
cd apps/api && dotnet run

# Terminal 2 — frontend
cd apps/web && npm install && npm run dev
# open the printed URL (default http://localhost:5173)
```

## Manual validation scenarios

### 1. New-user onboarding → Admin → dashboard (P1: US1, SC-001/SC-002)
1. From signed-out, open the registration screen.
2. Enter a unique email, a valid password, and an organization name; submit.
3. Expect: you land in the dashboard, an empty-state workspace for the new org (no venues), and a **welcome modal** appears.
4. Dismiss the modal → empty dashboard is revealed.
5. Confirm Admin: profile (`GET /api/users/me`) shows `role.roleName == "Admin"` and a non-null `organization`.

### 2. Duplicate email blocked (US1 #5, FR-014)
1. Repeat step 1 with an email that already exists.
2. Expect: inline "account already exists" error; no second account/org created.

### 3. Org-creation failure recovery (US1 #4, FR-013)
1. Simulate org-create failure (e.g., stop the API right before the `POST /organizations` step, or intercept it to 500 in the E2E).
2. Expect: message that the account exists but org setup didn't finish; you are taken to the **organization-creation step** (no password re-entry).
3. Restore the API; submit the org name → land in dashboard as Admin; exactly **one** org exists.

### 4. Returning-user login-only (P2: US2, SC-003)
1. Sign out, then use the login screen with the account from scenario 1.
2. Expect: straight into the existing org's dashboard, **no** org-creation prompt and **no** welcome modal.

### 5. Org-less login routes to org creation (US2 #4, FR-006a)
1. Using an account that has no organization (e.g., the half-onboarded account before recovery), log in.
2. Expect: routed to the organization-creation step, not a tenant-less dashboard.

### 6. Session persistence across reload & restart (P3: US3, FR-007/FR-008/SC-004)
1. While authenticated, reload the page → remain authenticated, back in the dashboard (no welcome modal).
2. Close and reopen the browser to the app URL → still authenticated.

### 7. Silent refresh on expired access token (US3 #3, FR-008a)
1. Expire/remove only the access token (keep a valid refresh token), then reload.
2. Expect: a non-flickering loading state, a silent refresh, then the dashboard.
3. Invalidate the refresh token too and reload → returned to the login screen (session cleared).

### 8. Non-flickering resolving state (FR-011)
1. Throttle the network and reload while authenticated.
2. Expect: a neutral loading state precedes the dashboard — no flash of the login screen.

## Automated validation

```bash
# Frontend unit/component tests + coverage gate (≥80% lines/functions/branches/statements)
cd apps/web && npm run test -- --coverage

# E2E onboarding journey (Playwright, tests/e2e)
cd tests/e2e && npm test -- onboarding.spec.ts
```

**Expected**:
- Vitest suites pass: `authBootstrap` (refresh success/failure, resolving), `AuthContext.onboarding` (org present/null routing, justOnboarded), `authApi.refresh`, `WelcomeModal` (once-only + a11y), `OrganizationCreateStep`, `DashboardHome` (empty vs ledger).
- Coverage meets the ≥80% gate (CI fails the build otherwise; missing/unparseable coverage treated as failing — Constitution III).
- Playwright `onboarding.spec.ts` passes: new-user → Admin → dashboard, returning login-only, reload persistence, org-create-failure recovery.

## Acceptance traceability

| Requirement | Validated by |
|-------------|--------------|
| FR-001..FR-004, SC-001 | Manual #1; E2E onboarding |
| FR-005, FR-005a | Manual #1; `DashboardHome.test`, `WelcomeModal.test` |
| FR-006, FR-006a, SC-003 | Manual #4/#5; `AuthContext.onboarding.test`; E2E |
| FR-007, FR-008, FR-008a, SC-004 | Manual #6/#7; `authBootstrap.test` |
| FR-009 | Manual #4/#6 sign-out path |
| FR-010, FR-011 | Manual #8; auth-gate tests |
| FR-012, FR-013, FR-014, SC-005 | Manual #2/#3; orchestration tests; E2E |
| FR-016, SC-002 | Manual #1 Admin/org-scope check |
| FR-017 | All types from `generated-api.ts` (review) |
| FR-018, SC-006 | `npm run test -- --coverage` gate |
