# Contract: Welcome Modal and Onboarding Flow Theming (SPLR-93)

CSS and component class contract for Montana High Country branded post-registration onboarding surfaces. Runtime source of truth: `apps/web/src/index.css` welcome-modal block, `AuthLayout` (SPLR-92), and onboarding components. Test parity: `apps/web/tests/theme/onboardingTheming.test.ts`, `apps/web/tests/onboarding/**`, `apps/web/tests/theme/authLayoutTheming.test.ts` (resolving background).

## Welcome backdrop (`.welcome-modal__backdrop`)

```css
.welcome-modal__backdrop {
  position: fixed;
  inset: 0;
  background: rgba(62, 39, 35, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  z-index: 1000;
}
```

**Prohibited**: cool-gray or legacy slate scrims (`rgba(0,0,0,0.5)` without warm brown tint on primary onboarding modal).

## Welcome dialog panel (`.welcome-modal`)

```css
.welcome-modal {
  background: var(--color-surface-white);
  border-radius: 12px;
  padding: 2rem;
  max-width: 28rem;
  width: 100%;
  box-shadow: var(--shadow-modal);
  border: 1px solid var(--color-border-subtle);
}
```

**Prohibited**: `#fff` shorthand; legacy blue borders.

## Title and body

```css
.welcome-modal__title {
  font-family: var(--font-brand);
  color: var(--color-primary-brown);
  /* size/spacing per index.css */
}

.welcome-modal__body {
  color: var(--color-text-muted);
}
```

## Dismiss action

```tsx
<button type="button" className="welcome-modal__dismiss btn-primary" onClick={onDismiss}>
  Get started
</button>
```

Shared `.btn-primary` rules in `index.css` include `.welcome-modal__dismiss` in hover, disabled, and `:focus-visible` selectors.

## WelcomeModal component contract (functional freeze)

| Behavior | Requirement | Test |
|----------|-------------|------|
| Dialog semantics | `role="dialog"`, `aria-modal="true"`, `aria-labelledby` | `WelcomeModal.test.tsx` |
| Focus on open | Dialog receives focus on mount | existing effect |
| Focus trap | Tab cycles within dialog focusables | existing keydown handler |
| Escape dismiss | `Escape` calls `onDismiss` | `WelcomeModal.test.tsx` |
| Backdrop dismiss | Backdrop click calls `onDismiss` | manual / optional test |
| Focus restore | Prior focus restored on unmount | existing cleanup |
| Primary CTA | Dismiss button has `btn-primary` | `WelcomeModal.test.tsx` |

**Prohibited**: Removing focus trap, changing dismiss semantics, or altering welcome show/hide rules in `App.tsx`.

## Organization creation (inherits auth layout)

`OrganizationCreateStep` MUST render:

```tsx
<AuthLayout title="Set up your organization" subtitle="...">
  <form className="auth-form">
    <FormField ... />
    <button type="submit" className="auth-form__submit btn-primary">Create organization</button>
  </form>
</AuthLayout>
```

Full auth layout CSS contract: `specs/069-theme-auth-layout/contracts/auth-layout-theming.md`.

Test: `OrganizationCreateStep.theme.test.tsx` asserts `.auth-layout`, `.auth-layout__card`, `.auth-layout__title`, and `btn-primary` on submit.

## Auth resolving (`.auth-resolving`)

```css
.auth-resolving {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-muted);
  background: var(--color-bg-cream);
}
```

Rendered in `App.tsx` with `role="status"` and `aria-live="polite"`.

## Shared modal inheritance (team dialogs)

Components reusing `.welcome-modal__backdrop` and `.welcome-modal`:

- `MemberEditModal` — adds `team-modal` modifier on panel
- `RemoveMemberConfirm` — backdrop + inner content

Changes to backdrop/panel tokens automatically apply. No dedicated team-modal contract in this feature.

## Test matrix

| Selector / surface | Key assertions | Test file |
|--------------------|----------------|-----------|
| `.welcome-modal__backdrop` | brown scrim `rgba(62, 39, 35, 0.5)` | `onboardingTheming.test.ts` |
| `.welcome-modal` | white surface, border, shadow-modal | `onboardingTheming.test.ts`, `dataContainers.test.ts` |
| `.welcome-modal__title` | `--font-brand`, `--color-primary-brown` | `onboardingTheming.test.ts` |
| `.welcome-modal__body` | `--color-text-muted` | `onboardingTheming.test.ts` |
| `WelcomeModal` render | dialog a11y, btn-primary, dismiss behavior | `WelcomeModal.test.tsx` |
| `OrganizationCreateStep` | auth layout + btn-primary | `OrganizationCreateStep.theme.test.tsx` |
| `.auth-resolving` | cream bg, muted text | `onboardingTheming.test.ts`, `authLayoutTheming.test.ts` |
| Welcome modal block | no legacy blue hex | `onboardingTheming.test.ts` |
| `WelcomeModal.tsx` source | contains `btn-primary` | `buttonMigration.test.ts` |

## Legacy palette denylist (welcome-modal block)

Must NOT appear in `.welcome-modal*` rules (except documented backdrop rgba):

- `#2563eb`, `#3b82f6` (legacy blue)
- `#64748b`, `#f8fafc` (cool gray)
- `#fff` as background shorthand on `.welcome-modal`
