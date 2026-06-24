# Contract: Authentication Layout Theming (SPLR-92)

CSS and component class contract for Montana High Country branded auth entry screens. Runtime source of truth: `apps/web/src/index.css` auth block and auth components. Test parity: `apps/web/tests/theme/authLayoutTheming.test.ts`, `apps/web/tests/auth/**`, `apps/web/tests/onboarding/OrganizationCreateStep.theme.test.tsx`.

## Page shell (`.auth-layout`)

```css
.auth-layout {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: var(--color-bg-cream);
}
```

**Prohibited**: cool-gray or legacy slate page backgrounds (`#f8fafc`, `#f1f5f9`, etc.).

## Auth card (`.auth-layout__card`)

```css
.auth-layout__card {
  width: 100%;
  max-width: 28rem;
  background: var(--color-surface-white);
  border: 1px solid var(--color-border-subtle);
  border-radius: 12px;
  padding: 2rem;
  box-shadow: var(--shadow-card);
}
```

Desktop widening at `min-width: 1280px`: `max-width: 32rem; padding: 2.5rem`.

**Prohibited**: `#fff` shorthand; legacy blue borders.

## Title and subtitle

```css
.auth-layout__title {
  font-family: var(--font-brand);
  color: var(--color-primary-brown);
  /* size/spacing per index.css */
}

.auth-layout__subtitle {
  color: var(--color-text-muted);
}
```

## Inline navigation links (`.auth-layout__link`)

```css
.auth-layout__link {
  color: var(--color-accent-orange);
  /* button reset + underline */
}

.auth-layout__link:focus-visible {
  outline: 2px solid var(--color-focus-ring);
  outline-offset: 2px;
}
```

**Prohibited**: `#2563eb`, `#3b82f6`, or other legacy blue link colors.

## Logo slot (optional)

When `AuthLayout` receives `showLogo`:

```tsx
<BrandLogo variant="auth" className="auth-layout__logo" alt="Split Rail" />
```

CSS hooks:

```css
.auth-layout__logo.brand-logo-wrapper {
  margin: 0 auto 1.5rem;
  justify-content: center;
}

.auth-layout__logo .brand-logo--auth {
  max-width: 16rem;
}
```

**Pages required to enable logo**:
- `LoginPage` — `showLogo` (existing)
- `RegisterPage` — `showLogo` (parity addition)

## Form submit (all auth flows)

Every primary submit control MUST declare both layout and shared primary classes:

```tsx
<button type="submit" className="auth-form__submit btn-primary" disabled={pending}>
```

**In-scope files** (also enforced by `buttonMigration.test.ts`):
- `components/auth/LoginForm.tsx`
- `components/auth/RegisterForm.tsx`
- `components/onboarding/OrganizationCreateStep.tsx`

## Form fields (`.form-field__*`)

```css
.form-field__input {
  color: var(--color-primary-brown);
  background: var(--color-surface-white);
  border: 1px solid var(--color-border-subtle);
}

.form-field__input:focus-visible {
  outline: 2px solid var(--color-focus-ring);
  border-color: var(--color-accent-orange);
}

.form-field__input[aria-invalid='true'] {
  border-color: var(--color-error);
}
```

## Session notice (`.session-expired-notice`)

Uses warning token trio (`--color-warning-bg`, `--color-warning-border`, `--color-warning-text`). MUST remain readable on white card.

## Auth resolving (`.auth-resolving`)

```css
.auth-resolving {
  min-height: 100vh;
  background: var(--color-bg-cream);
  color: var(--color-text-muted);
}
```

## Usage rules

1. **Token-only colors** — auth CSS rules MUST use `var(--*)` tokens; no ad-hoc hex in auth blocks (VR-007).
2. **Behavior freeze** — theming MUST NOT alter validation, routing, or a11y attribute wiring (FR-010).
3. **Shared primary buttons** — submit actions MUST use `.btn-primary` from M4, not bespoke orange/brown button CSS (FR-006).
4. **Logo optional but recommended** — sign-in and registration SHOULD show auth wordmark when space allows (FR-009).
5. **Inheritance** — `AcceptInvitePage` and other consumers of `AuthLayout` inherit this contract via shared CSS; no duplicate auth styling.

## In-scope selector checklist

| Selector / surface | Required properties | Test hook |
|--------------------|---------------------|-----------|
| `.auth-layout` | cream bg | `authLayoutTheming.test.ts`, `AuthLayout.test.tsx` |
| `.auth-layout__card` | white bg, subtle border, shadow | `authLayoutTheming.test.ts`, `dataContainers.test.ts` |
| `.auth-layout__title` | brand font, brown color | `authLayoutTheming.test.ts` |
| `.auth-layout__link` | orange/brown accent, focus ring | `authLayoutTheming.test.ts` |
| `.form-field__input` | token borders, focus, error | `authLayoutTheming.test.ts`, `FormField.test.tsx` |
| `.auth-form__submit.btn-primary` | shared primary class | `LoginForm.test.tsx`, `RegisterForm.test.tsx`, `OrganizationCreateStep.theme.test.tsx`, `buttonMigration.test.ts` |
| `.auth-resolving` | cream bg | `authLayoutTheming.test.ts` |
| `LoginPage` logo | `showLogo` + wordmark img | `LoginPage.test.tsx` |
| `RegisterPage` logo | `showLogo` + wordmark img | `RegisterPage.test.tsx` |

## Test contract

### `authLayoutTheming.test.ts` (CSS file parse — NEW)

- Assert `.auth-layout` block includes `var(--color-bg-cream)`.
- Assert `.auth-layout__card` block includes `var(--color-surface-white)` and `var(--shadow-card)`.
- Assert `.auth-layout__title` block includes `var(--font-brand)` and `var(--color-primary-brown)`.
- Assert `.auth-layout__link` block includes `var(--color-accent-orange)` and does NOT contain `#2563eb`.
- Assert `.auth-resolving` block includes `var(--color-bg-cream)`.
- Assert auth section does not contain denylist hex (cross-check with `legacyPalette.test.ts` patterns where applicable).

### `AuthLayout.test.tsx` (extend)

- Renders `main.auth-layout` and `.auth-layout__card`.
- When `showLogo`, renders wordmark image with accessible name.
- Title uses `.auth-layout__title` class hook.

### Page and form tests (extend)

- `LoginPage.test.tsx` — submit button has `btn-primary`; logo present.
- `RegisterPage.test.tsx` — submit button has `btn-primary`; logo present after parity change.
- `LoginForm.test.tsx` / `RegisterForm.test.tsx` — submit carries `btn-primary`.

### Existing coverage (verify, do not duplicate)

- `buttonMigration.test.ts` — source-file presence of `btn-primary` on auth components.
- `OrganizationCreateStep.theme.test.tsx` — auth layout + btn-primary runtime.
- `dataContainers.test.ts` — auth card white surface reference.

## Manual visual checklist (see quickstart.md)

- Sign-in and registration at 375px and 1280px: cream bg, white card, brown title, orange links, orange primary submit, visible focus rings.
- Organization creation step matches same shell.
- No legacy blue links or cool-gray page tones.
