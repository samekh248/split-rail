# Quickstart & Validation Guide: Auth Layout Theming (SPLR-92)

How to validate branded authentication layout theming. References [contracts/auth-layout-theming.md](./contracts/auth-layout-theming.md) and [data-model.md](./data-model.md).

## Prerequisites

- Node 22 + `npm install` in `apps/web`
- Branch `069-theme-auth-layout`
- M1 tokens complete: `059-mhc-design-tokens` (`tests/theme/cssTokens.test.ts` passing)
- M4 button styles complete: `065-shared-button-styles` (`tests/theme/buttons.test.tsx`, `buttonMigration.test.ts` passing)
- M2 logo component available: `062-brand-logo-component` (auth variant asset)

## Run dev server

```bash
cd apps/web
npm run dev
```

Open the app signed out to reach sign-in. Use "Create an account" to reach registration.

## Automated tests (primary gate)

```bash
cd apps/web
npm run test -- tests/auth tests/theme/authLayoutTheming.test.ts tests/onboarding/OrganizationCreateStep.theme.test.tsx tests/theme/buttonMigration.test.ts
npm run test:coverage
npm run build
```

**Expected**: All auth theme tests pass; coverage ≥80% on modified auth/CSS files; build succeeds.

### Token hygiene (auth CSS block)

```bash
cd apps/web
rg '#2563eb|#3b82f6|#64748b|#f8fafc' src/index.css
```

**Pass**: no legacy blue or cool-gray hex in auth-related rules (token references only).

### Primary button migration

```bash
cd apps/web
npm run test -- tests/theme/buttonMigration.test.ts
```

**Pass**: `LoginForm.tsx`, `RegisterForm.tsx`, and `OrganizationCreateStep.tsx` declare `btn-primary`.

---

## Manual validation checklist

### Sign-in (User Story 1)

1. Open sign-in while signed out.
2. Page background is warm Canvas Cream.
3. Form sits on Pure White card with subtle border/shadow.
4. Split-Rail wordmark appears centered above "Sign in" title.
5. Title uses brand slab-serif brown typography.
6. "Create an account" link uses orange/brown accent — not blue.
7. "Sign in" submit button is Alpine Sunset orange (shared primary style).
8. Tab through email, password, submit, and link — visible focus ring on each control.

### Registration (User Story 2)

1. Navigate to "Create an account".
2. Visual treatment matches sign-in: cream page, white card, brown title.
3. Wordmark appears above title (after parity implementation).
4. Field focus and validation errors use warm on-brand colors.
5. "Create account" submit uses shared primary button style.
6. "Sign in" footer link is on-brand (not blue).

### Organization creation (User Story 3)

1. Sign in as a user with no organization (or trigger org-create step via test harness).
2. "Set up your organization" screen uses same auth card shell.
3. "Create organization" submit uses shared primary style.

### Mobile and desktop (SC-002)

1. Repeat sign-in and registration at ~375px viewport width — no horizontal scroll; logo, title, fields, and submit remain usable.
2. Repeat at ~1280px — card widens slightly; layout remains centered and legible.

### Auth resolving state

1. Reload app with valid stored tokens (or observe brief resolving state on load).
2. Loading/resolving screen uses cream background — no flash of unstyled white or gray page.

### Regression spot-check

1. `AcceptInvitePage` (if exercisable) inherits auth card styling.
2. Functional behavior unchanged: validation messages, submit loading states, navigation between sign-in/register.

---

## Definition of done

- [ ] Login, registration, and organization-creation screens match Montana High Country palette (SC-001).
- [ ] `AuthLayout.test.tsx` and extended auth tests pass (SC-004).
- [ ] `authLayoutTheming.test.ts` CSS contract passes.
- [ ] RegisterPage shows wordmark when `showLogo` enabled (FR-009 parity).
- [ ] CI coverage ≥80% on modified frontend files (SC-005).
- [ ] No functional auth regressions (FR-010).

## Related specs

- Depends on: `065-shared-button-styles`, `059-mhc-design-tokens`, `062-brand-logo-component`
- Blocks: SPLR-93 welcome modal theming
- Functional auth baseline: `006-login-registration-layout`, `007-registration-org-onboarding`
