# Data Model: Branded Authentication Layout Theming (SPLR-92)

This feature introduces **no persisted entities, API payloads, or database tables**. The model covers **auth shell presentation theming**, **token application rules**, and **component/CSS contracts** — all client-side.

## Auth flow surfaces (theme scope)

| Surface | Component | AuthLayout usage | Primary action |
|---------|-----------|------------------|----------------|
| Sign-in | `LoginPage` → `LoginForm` | Yes (`showLogo`) | Sign in |
| Registration | `RegisterPage` → `RegisterForm` | Yes (`showLogo` after parity change) | Create account |
| Organization creation | `OrganizationCreateStep` | Yes | Create organization |
| Auth resolving | App auth gate loading state | N/A (`.auth-resolving` only) | — |
| Invite acceptance | `AcceptInvitePage` | Yes (inherits CSS) | Out of dedicated scope |

## Auth layout shell entity

| Attribute | Value |
|-----------|-------|
| Root landmark | `<main className="auth-layout">` |
| Page background | `var(--color-bg-cream)` |
| Card container | `.auth-layout__card` |
| Card background | `var(--color-surface-white)` |
| Card border | `1px solid var(--color-border-subtle)` |
| Card shadow | `var(--shadow-card)` |
| Card radius | `12px` (auth-specific; data cards use `--radius-card`) |
| Max width | `28rem` default; `32rem` at ≥1280px |
| Logo slot | Optional `BrandLogo` variant `auth` via `showLogo` prop |
| Logo class | `.auth-layout__logo` |
| Title class | `.auth-layout__title` |
| Subtitle class | `.auth-layout__subtitle` |
| Footer/nav class | `.auth-layout__footer`, `.auth-layout__nav` |
| Inline link class | `.auth-layout__link` |

## Branded auth surface token map (consumption only — no new tokens)

| Token | Auth usage |
|-------|------------|
| `--color-bg-cream` | Page background (`.auth-layout`), resolving state (`.auth-resolving`) |
| `--color-surface-white` | Card background, form input background |
| `--color-primary-brown` | Title text, form input text |
| `--color-text-muted` | Subtitle, nav helper copy |
| `--color-accent-orange` | Inline action links (`.auth-layout__link`) |
| `--color-border-subtle` | Card border, input border |
| `--color-focus-ring` | Link and input `:focus-visible` outline |
| `--color-error` / `--color-error-bg` / `--color-error-border` | Form and field errors |
| `--color-warning-bg` / `--color-warning-border` / `--color-warning-text` | Session-expired notice |
| `--font-brand` | Title heading |
| `--font-ui` | Form labels and inputs |
| `--shadow-card` | Auth card elevation |
| `.btn-primary` | Submit buttons on all auth forms |

## Form field entity (auth context)

| Attribute | Class | Token rules |
|-----------|-------|-------------|
| Field wrapper | `.form-field` | Layout only |
| Label | `.form-field__label` | `--font-ui`, semibold |
| Input | `.form-field__input` | white bg, brown text, subtle border; orange border on focus |
| Input invalid | `[aria-invalid='true']` | `--color-error` border |
| Field error | `.form-field__error` | `--color-error` text |
| Form error banner | `.auth-form__error` | error token trio |
| Submit | `.auth-form__submit.btn-primary` | shared primary button (M4) |

## Validation rules

| ID | Rule |
|----|------|
| VR-001 | Auth page and resolving backgrounds MUST use `var(--color-bg-cream)` — no legacy cool-gray page tones. |
| VR-002 | Auth card MUST use `var(--color-surface-white)` background — no `#fff` shorthand. |
| VR-003 | Auth title MUST use `var(--font-brand)` and `var(--color-primary-brown)`. |
| VR-004 | Inline auth links MUST NOT use legacy blue (`#2563eb` or similar); MUST use `--color-accent-orange` or brown token. |
| VR-005 | All auth submit buttons MUST include `.btn-primary` class. |
| VR-006 | Interactive auth controls MUST define `:focus-visible` using `--color-focus-ring` (or equivalent on-brand ring). |
| VR-007 | Auth CSS blocks MUST NOT introduce ad-hoc hex literals covered by `legacyPalette` denylist. |
| VR-008 | Functional auth behavior (validation, submit handlers, a11y ids) MUST NOT change during theming work. |

## State transitions (presentation only)

| State | Visual treatment |
|-------|------------------|
| Default | Cream page, white card, brown title |
| Field focus | Orange border + focus ring on input |
| Field invalid | Red error border + inline error message |
| Form error | Error banner above fields |
| Submit pending | Primary button disabled + loading label |
| Session expired | Warm warning notice in card |
| Auth resolving | Full-viewport cream background, muted text |

## Relationships

```text
AuthLayout (shell)
├── BrandLogo? (auth variant)
├── title / subtitle
├── notice? (e.g. session-expired)
├── children (LoginForm | RegisterForm | org-create form)
└── footer? (nav links)

LoginForm / RegisterForm / OrganizationCreateStep
└── FormField[] + btn-primary submit
```

## Out of scope entities

- Welcome modal (SPLR-93)
- Post-auth dashboard empty state
- API auth payloads (`LoginRequest`, `RegisterRequest`, etc.) — unchanged
- Invitation flow business logic — CSS inheritance only
