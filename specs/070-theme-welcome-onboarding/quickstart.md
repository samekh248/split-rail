# Quickstart & Validation Guide: Welcome Modal and Onboarding Flow Theming (SPLR-93)

How to validate branded welcome modal and onboarding flow theming. References [contracts/onboarding-theming.md](./contracts/onboarding-theming.md) and [data-model.md](./data-model.md).

## Prerequisites

- Node 22 + `npm install` in `apps/web`
- Branch `070-theme-welcome-onboarding`
- M1 tokens complete: `059-mhc-design-tokens` (`tests/theme/cssTokens.test.ts` passing)
- M4 button styles complete: `065-shared-button-styles` (`tests/theme/buttons.test.tsx`, `buttonMigration.test.ts` passing)
- Auth layout theming complete: `069-theme-auth-layout` (`tests/theme/authLayoutTheming.test.ts` passing)

## Run dev server

```bash
cd apps/web
npm run dev
```

## Automated tests (primary gate)

```bash
cd apps/web
npm run test -- tests/onboarding tests/theme/onboardingTheming.test.ts tests/theme/authLayoutTheming.test.ts tests/theme/buttonMigration.test.ts
npm run test:coverage
npm run build
```

**Expected**: All onboarding theme tests pass; coverage ≥80% on modified onboarding/CSS files; build succeeds.

### Token hygiene (welcome-modal CSS block)

```bash
cd apps/web
rg '#2563eb|#3b82f6|#64748b|#f8fafc' src/index.css
```

**Pass**: no legacy blue or cool-gray hex in welcome-modal rules (token references + documented backdrop rgba only).

### Primary button migration

```bash
cd apps/web
npm run test -- tests/theme/buttonMigration.test.ts
```

**Pass**: `WelcomeModal.tsx` and `OrganizationCreateStep.tsx` declare `btn-primary`.

---

## Manual validation checklist

### Welcome overlay (User Story 1)

1. Complete registration + organization setup (or trigger first-landing welcome state).
2. Welcome overlay appears over dashboard with warm brown-tinted backdrop scrim.
3. Dialog panel is Pure White with subtle border/shadow.
4. "Welcome to Split Rail" title uses brand slab-serif brown typography.
5. Body copy uses warm muted neutral tone.
6. "Get started" button is Alpine Sunset orange (shared primary style).
7. Press Escape — overlay dismisses; dashboard revealed.
8. Tab through dismiss button — visible on-brand focus ring.
9. Click backdrop — overlay dismisses (unchanged behavior).

### Organization creation (User Story 2)

1. Sign in as a user with no organization.
2. "Set up your organization" screen matches sign-in: cream page, white card, brown title.
3. Field focus and validation errors use warm on-brand colors.
4. "Create organization" submit uses shared primary button style.

### Auth resolving (User Story 3)

1. Reload app and observe brief resolving state on cold load.
2. Full-viewport cream background with warm muted status text.
3. No flash of unstyled white or cool-gray page before destination screen.

### Mobile and desktop (SC-002)

1. Repeat welcome overlay at ~375px viewport — no horizontal scroll; title, body, and dismiss remain usable.
2. Repeat at ~1280px — dialog remains centered and legible.
3. Long organization name in welcome body wraps without layout break.

### Regression spot-check

1. Team member edit modal inherits branded backdrop/card (shared `.welcome-modal__*` classes).
2. Welcome overlay does NOT reappear on ordinary returning-user login.
3. Functional behavior unchanged: org validation, submit loading states, routing.

---

## Definition of done

- [ ] Welcome overlay, organization-creation, and auth-resolving surfaces match Montana High Country palette (SC-001).
- [ ] `WelcomeModal.test.tsx` passes with branded + functional assertions (SC-004).
- [ ] `onboardingTheming.test.ts` CSS contract passes.
- [ ] `OrganizationCreateStep.theme.test.tsx` passes (auth layout inheritance).
- [ ] CI coverage ≥80% on modified frontend files (SC-005).
- [ ] No functional onboarding regressions (FR-009).

## Related specs

- Depends on: `065-shared-button-styles`, `059-mhc-design-tokens`, `069-theme-auth-layout`
- Blocks: SPLR-94 WCAG AA contrast audit
- Functional onboarding baseline: `007-registration-org-onboarding`
