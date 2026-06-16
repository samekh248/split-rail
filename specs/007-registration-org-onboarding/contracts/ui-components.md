# Contract: UI Components

Presentational/behavioral contracts for new and extended components. Reuses 006 primitives (`AuthLayout`, `FormField`, `RegisterForm`, `LoginForm`). All API types from `generated-api.ts`. WCAG 2.1 AA per Constitution-aligned 006 standards.

## `WelcomeModal` (NEW) — FR-005a

**Purpose**: One-time celebratory welcome shown on the first dashboard landing after onboarding.

| Prop | Type | Notes |
|------|------|-------|
| `organizationName` | `string` | Displayed in the greeting. |
| `onDismiss` | `() => void` | Calls `dismissWelcome()` (clears `justOnboarded`). |

**Behavior / states**:
- Renders only when `phase === 'authenticated' && justOnboarded === true`.
- Dismiss via primary button, `Esc`, and backdrop click → `onDismiss`.
- Never renders for ordinary returning logins (justOnboarded stays false).

**Accessibility**: `role="dialog"`, `aria-modal="true"`, labelled by its heading; focus moves into the dialog on open and is trapped; focus returns to the dashboard on close; visible focus styles.

## `OrganizationCreateStep` (NEW) — FR-006a, FR-013

**Purpose**: Org-only step for an authenticated-but-org-less user (fresh or recovery).

| Prop | Type | Notes |
|------|------|-------|
| `onSubmit` | `(name: string) => Promise<void>` | Calls `createOrganization(name)`. |
| `pending` | `boolean` | Disables input + button while in flight (FR-012). |
| `error` | `string \| null` | Inline error (e.g., retry message). |

**Behavior / states**:
- Single required "Organization name" field (reuses `validateOrganizationName` + `FormField`).
- Submit blocked while pending; success transitions to `authenticated`.
- No password field (FR-013).

**Accessibility**: label programmatically associated; error linked via `aria-describedby`; keyboard operable; rendered within `AuthLayout` for consistent responsive shell.

## `DashboardHome` (NEW) — FR-004, FR-005

**Purpose**: Authenticated landing that is non-erroring for a brand-new org.

| Prop | Type | Notes |
|------|------|-------|
| `organizationName` | `string` | Workspace header. |

**Behavior / states**:
- Uses `useVenues()`:
  - `isLoading` → neutral loading text.
  - `data.length === 0` → empty-state panel: heading + "No venues yet" guidance (no error). 
  - `data.length > 0` → existing ledger workspace (renders `EventLedgerPage` for a selected/first venue+event, preserving current behavior).
  - `error` → inline error with retry affordance (no silent failure, SC-005).
- Hosts the sign-out control (existing `logout`).

**Accessibility**: empty state uses a labelled region/heading; loading uses `role="status"`/`aria-live="polite"` consistent with the existing resolving state.

## `App.tsx` auth gate (EXTEND) — FR-006, FR-010, FR-011

**Behavior by phase**:

| `phase` | Render |
|---------|--------|
| `resolving` | Neutral loading (`role="status"`, non-flickering). |
| `unauthenticated` | `LoginPage` / `RegisterPage` (toggle via `authView`). |
| `needs-organization` | `OrganizationCreateStep`. |
| `authenticated` | `DashboardHome` + `WelcomeModal` (when `justOnboarded`). |

- An authenticated (or needs-organization) user never sees the login/register entry forms (FR-010).

## `useVenues` (NEW data hook) — FR-005

```text
useVenues(): UseQueryResult<VenueResponse[]>
  queryKey: ['venues']
  queryFn:  GET /api/venues
```

- Org-scoped server-side; returns `[]` for a brand-new org. Consumed only by `DashboardHome`.

## Reused 006 components (unchanged)

- `AuthLayout`, `FormField`, `RegisterForm`, `LoginForm`, `LoginPage`, `RegisterPage`, `validation.ts`, `mapAuthError`, `tokenStorage.ts`, `useUserProfile()`.
