# Quickstart & Validation Guide: Login & Registration Layout

How to run and validate the feature end-to-end. References contracts/auth-flows.md and contracts/ui-components.md for detail; does not duplicate implementation.

## Prerequisites

- Backend API running locally (default `http://localhost:5000`) with the auth + organizations endpoints (already present).
- Node 22 + dependencies installed in `apps/web` (`npm install`).
- No new packages are required for this feature.

## Run

```bash
# from apps/web
npm run dev            # Vite dev server on http://localhost:5173 (proxies /api → :5000)
```

Open `http://localhost:5173`. With no token in `localStorage`, the **login screen** renders.

## Automated tests (primary verification)

```bash
# from apps/web
npm run test           # Vitest run (auth tests under tests/auth/**)
npm run test:coverage  # enforce ≥80% lines/functions/branches/statements
```

Expected: all auth suites pass and global coverage gate is satisfied.

## Manual validation scenarios

### Login (User Story 1 — P1)
1. **Invalid input blocked**: submit empty email/password → inline messages appear next to each field; no network call (SC-002).
2. **Malformed email**: enter `not-an-email` → inline email error on blur/submit.
3. **Invalid credentials**: submit a valid-format but wrong email/password → form-level "Invalid email or password." appears; you remain on the login screen (no reload) (FR-004, SC-004).
4. **Success**: submit valid credentials → you land in the dashboard (`EventLedgerPage`) within one screen (SC-001). `localStorage.accessToken` is set.
5. **In-flight**: while submitting, the button is disabled and shows progress; double-submit is prevented (FR-009).

### Registration (User Story 2 — P2)
1. **Three fields only**: the form shows email, password, organization name — no confirm-password field (FR-002).
2. **Validation parity**: a password missing an uppercase/lowercase/digit or under 8 chars is rejected inline with the matching message (mirrors backend `PasswordValidator`).
3. **Duplicate email**: register with an existing email → "An account with this email already exists."; entered email + org name preserved, password cleared (FR-005, FR-011).
4. **Success / auto-login**: register a new email + password + organization name → you are signed in automatically and land in the dashboard, now an Admin of the new organization (no separate sign-in). Verify `GET /api/organizations/current` returns the new org.
5. **Org-step retry (partial failure)**: simulate a failure of `POST /api/organizations` (e.g., stop that path) after register+login → an inline error invites retry; retry creates the org **without** re-registering (D2).

### Responsive & accessibility (User Story 3 — P3)
1. **Mobile ≈375px** (DevTools device toolbar): both screens are fully usable — no clipped fields, no horizontal scroll, tap targets comfortable (SC-003).
2. **Desktop ≈1280px**: form is centered with a constrained max-width and remains legible (SC-003).
3. **Keyboard only**: Tab through all fields and the submit button; activate with Enter/Space; focus is always visible (FR-012, SC-006).
4. **Screen reader / a11y tree**: each input has an associated label; when a field error shows, the input is `aria-invalid` and points to its error via `aria-describedby`, and the error is announced (`role="alert"`).

### Navigation & session edge cases
1. **Toggle screens**: "Create an account" (login → register) and "Sign in" (register → login) switch views and clear transient errors (FR-007).
2. **Already authenticated**: with a token present, visiting the app goes straight to the dashboard, not the login form.
3. **No flash on load**: on refresh, a neutral placeholder shows briefly while auth resolves — the login form does not flash for authenticated users.
4. **Logout**: triggering logout clears tokens and returns to the login screen.

## Success criteria mapping

| Criterion | Validated by |
|-----------|--------------|
| SC-001 sign-in in one screen, no reload | Login scenario 4 |
| SC-002 invalid input caught client-side | Login scenario 1–2; Register scenario 2 |
| SC-003 responsive at 375px / 1280px | Responsive scenarios 1–2 |
| SC-004 every failure shows inline error | Login scenario 3; Register scenario 3 |
| SC-005 register in under 2 minutes | Register scenario 4 (end-to-end timing) |
| SC-006 WCAG 2.1 AA | Accessibility scenarios 3–4 + `FormField` tests |
