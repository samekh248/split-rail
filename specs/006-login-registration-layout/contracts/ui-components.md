# Contract: UI Components

Presentational and container component contracts for the auth experience. All components are function components (React 18) in `apps/web/src`. Styling via `index.css` (responsive, focus-visible). All interactive elements meet WCAG 2.1 AA (FR-012, SC-006).

## `AuthLayout` (`components/auth/AuthLayout.tsx`)

Responsive shell shared by both screens.

| Prop | Type | Description |
|------|------|-------------|
| `title` | `string` | screen heading (rendered as `<h1>`) |
| `subtitle` | `string?` | optional supporting text |
| `children` | `ReactNode` | the form |
| `footer` | `ReactNode?` | cross-link area ("Create an account" / "Sign in") |

**Behavior / a11y / responsive**:
- Renders a centered card within a `<main>` landmark; single `<h1>` per screen.
- Mobile (≈375px): full-width card, comfortable tap targets, no horizontal scroll (SC-003).
- Desktop (≈1280px): constrained max-width, centered; legible line lengths.
- Visible focus outline preserved (`:focus-visible`); no focus traps.

## `FormField` (`components/auth/FormField.tsx`)

Reusable accessible field primitive (label + input + inline error).

| Prop | Type | Description |
|------|------|-------------|
| `id` | `string` | input id; label `htmlFor` references it |
| `label` | `string` | visible label text |
| `type` | `'email' \| 'password' \| 'text'` | input type (password ⇒ masked, FR-010) |
| `value` | `string` | controlled value |
| `onChange` | `(v: string) => void` | change handler |
| `onBlur` | `() => void?` | triggers field validation |
| `error` | `string?` | inline error message |
| `required` | `boolean?` | sets `aria-required` |
| `autoComplete` | `string?` | e.g. `email`, `current-password`, `new-password`, `organization` |

**A11y contract**:
- `<label htmlFor={id}>` ↔ `<input id={id}>` association.
- When `error` present: input gets `aria-invalid="true"` and `aria-describedby="{id}-error"`; the error node has `id="{id}-error"` and `role="alert"` (announced to assistive tech).
- Error text is visually adjacent to its field and remains associated across viewports (FR-003, SC-003/SC-006).

## `LoginForm` (`components/auth/LoginForm.tsx`)

| Prop | Type | Description |
|------|------|-------------|
| `onSubmit` | `(credentials: LoginRequest) => Promise<void>` | invokes login flow |
| `pending` | `boolean` | submit-in-progress (disables submit, shows progress) |
| `formError` | `string?` | form-level error (e.g., invalid credentials) |

**Behavior**: two `FormField`s (email, password); inline validation on blur + submit; blocks submit when invalid (SC-002); disables the submit button and indicates progress while `pending` (FR-009); renders `formError` in a `role="alert"` banner without navigating away (FR-004).

## `RegisterForm` (`components/auth/RegisterForm.tsx`)

| Prop | Type | Description |
|------|------|-------------|
| `onSubmit` | `(values: { email: string; password: string; organizationName: string }) => Promise<void>` | invokes registration orchestration |
| `pending` | `boolean` | submit-in-progress |
| `formError` | `string?` | form-level error |

**Behavior**: exactly three `FormField`s — email, password, organization name (FR-002, no confirm-password); inline validation mirroring backend rules; same submit/progress/error semantics as `LoginForm` (FR-005, FR-009).

## `LoginPage` / `RegisterPage` (`pages/`)

Containers that compose `AuthLayout` + the respective form, wire the form to `useAuth()` actions, manage `pending`/`formError` from the mutation state, and render the cross-navigation footer (FR-007).

| Prop | Type | Description |
|------|------|-------------|
| `onNavigate` | `(view: 'login' \| 'register') => void` | toggles the unauthenticated view |

## `AuthProvider` / `useAuth` (`auth/AuthContext.tsx`, `auth/useAuth.ts`)

Provides `AuthState` (see data-model.md) and actions `login`, `register`, `logout`. Resolves initial `phase` from `tokenStorage`. Exposes `pending` and `error` for the current action so pages can drive UI without managing fetch state themselves.

## `App.tsx` (auth gate — EXTEND)

```
<AuthProvider>
  phase === 'resolving'      → neutral placeholder (no flash)
  phase === 'unauthenticated' → view==='login' ? <LoginPage/> : <RegisterPage/>
  phase === 'authenticated'   → existing dashboard (<EventLedgerPage/> within app shell)
</AuthProvider>
```

## Component → requirement traceability

| Component | Requirements |
|-----------|--------------|
| `AuthLayout` | FR-008, SC-003, FR-012/SC-006 |
| `FormField` | FR-003, FR-010, FR-012, SC-002, SC-006 |
| `LoginForm` | FR-001, FR-003, FR-004, FR-009, FR-010, FR-011 |
| `RegisterForm` | FR-002, FR-003, FR-005, FR-009, FR-010, FR-011 |
| `LoginPage`/`RegisterPage` | FR-006, FR-007 |
| `AuthProvider`/`App` gate | FR-006, FR-007, edge cases (resolving, already-authenticated) |
