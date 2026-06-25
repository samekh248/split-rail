# Data Model: Welcome Modal and Onboarding Flow Theming (SPLR-93)

This feature introduces **no persisted entities, API payloads, or database tables**. The model covers **onboarding presentation theming**, **token application rules**, and **component/CSS contracts** — all client-side.

## Onboarding flow surfaces (theme scope)

| Surface | Component | Shell | Primary action |
|---------|-----------|-------|----------------|
| Post-onboarding welcome | `WelcomeModal` | Modal overlay (backdrop + dialog) | Get started (dismiss) |
| Organization creation | `OrganizationCreateStep` | `AuthLayout` (inherits SPLR-92) | Create organization |
| Auth resolving | `App.tsx` auth gate | `.auth-resolving` full-page | — |
| Team modals (inheritance) | `MemberEditModal`, `RemoveMemberConfirm` | Reuses `.welcome-modal__*` classes | Out of dedicated scope |

## Welcome overlay entity

| Attribute | Class / element | Token rules |
|-----------|-----------------|-------------|
| Backdrop | `.welcome-modal__backdrop` | Fixed full-viewport; brown-tinted scrim `rgba(62, 39, 35, 0.5)`; flex center |
| Dialog panel | `.welcome-modal` | `var(--color-surface-white)` bg; `var(--shadow-modal)`; `var(--color-border-subtle)` border |
| Title | `.welcome-modal__title` | `var(--font-brand)`; `var(--color-primary-brown)` |
| Body | `.welcome-modal__body` | `var(--color-text-muted)` |
| Dismiss | `.welcome-modal__dismiss.btn-primary` | shared primary button (M4) |
| Dialog semantics | `role="dialog"`, `aria-modal="true"` | Unchanged (functional freeze) |

## Organization creation step entity

| Attribute | Value |
|-----------|-------|
| Shell | `AuthLayout` (see `069-theme-auth-layout` data model) |
| Title | "Set up your organization" |
| Submit class | `.auth-form__submit.btn-primary` |
| Form fields | `.form-field__*` (inherits auth form tokens) |

No additional org-create-specific theme entities — validation rules defer to auth layout contract.

## Auth resolving state entity

| Attribute | Class | Token rules |
|-----------|-------|-------------|
| Container | `.auth-resolving` | `min-height: 100vh`; flex center |
| Background | `.auth-resolving` | `var(--color-bg-cream)` |
| Status text | `.auth-resolving` | `var(--color-text-muted)` |
| Semantics | `role="status"`, `aria-live="polite"` | Unchanged |

## Branded onboarding token map (consumption only — no new tokens)

| Token | Onboarding usage |
|-------|------------------|
| `--color-surface-white` | Welcome dialog panel background |
| `--color-primary-brown` | Welcome dialog title |
| `--color-text-muted` | Welcome body copy; auth resolving status text |
| `--color-bg-cream` | Auth resolving page background |
| `--color-border-subtle` | Welcome dialog border |
| `--shadow-modal` | Welcome dialog elevation |
| `--font-brand` | Welcome dialog title |
| `--font-ui` | Primary dismiss button label |
| `.btn-primary` | Welcome dismiss action |
| `rgba(62, 39, 35, 0.5)` | Welcome backdrop scrim (Lodgepole Brown at 50% opacity) |

## Validation rules

| ID | Rule |
|----|------|
| VR-001 | Welcome dialog panel MUST use `var(--color-surface-white)` — no `#fff` shorthand. |
| VR-002 | Welcome backdrop MUST use warm brown-tinted scrim (`rgba(62, 39, 35, 0.5)` or equivalent token). |
| VR-003 | Welcome title MUST use `var(--font-brand)` and `var(--color-primary-brown)`. |
| VR-004 | Welcome body MUST use `var(--color-text-muted)` — no legacy cool-gray body tones. |
| VR-005 | Welcome dismiss MUST include `.btn-primary` class. |
| VR-006 | Organization-creation step MUST render inside branded `AuthLayout` with `.btn-primary` submit. |
| VR-007 | Auth resolving MUST use `var(--color-bg-cream)` background and `var(--color-text-muted)` text. |
| VR-008 | Welcome modal CSS blocks MUST NOT introduce ad-hoc hex literals covered by legacy palette denylist (except documented backdrop scrim). |
| VR-009 | Functional onboarding behavior (focus trap, dismiss handlers, welcome show/hide rules, org validation) MUST NOT change during theming work. |

## State transitions (presentation only)

| State | Visual treatment |
|-------|------------------|
| First dashboard landing | Brown scrim + white welcome dialog over dashboard |
| Welcome dismissed | Dashboard workspace visible; overlay removed |
| Org-create (incomplete onboarding) | Cream page, white auth card, brown title (via AuthLayout) |
| Auth resolving | Full-viewport cream background, muted status text |
| Org-create field focus/error | Inherits auth form focus/error tokens |

## Relationships

```text
App (auth gate)
├── auth-resolving? (loading)
├── OrganizationCreateStep? (no org)
│   └── AuthLayout → form + btn-primary
└── Dashboard + WelcomeModal? (first landing)
    └── WelcomeModal
        ├── backdrop (dismiss on click)
        ├── title + body (org name)
        └── btn-primary dismiss

Team modals (inherit CSS only)
└── welcome-modal__backdrop + welcome-modal classes
```

## Out of scope entities

- Sign-in / registration auth layout (SPLR-92 — dependency, not this feature)
- Dashboard empty state styling
- API onboarding payloads — unchanged
- WCAG contrast token adjustments (SPLR-94)
