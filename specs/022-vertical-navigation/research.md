# Phase 0 Research: Vertical Navigation Architecture

**Feature**: `022-vertical-navigation` | **Date**: 2026-06-18

Resolves technical unknowns for the plan. Clarifications from `/speckit-clarify` (settings active state, shell scope, org name in top bar, remove settings back button, disabled placeholders) are incorporated.

## D1. Frontend-only feature; no backend or API changes

- **Decision**: Implement entirely in `apps/web`. No C# DTO, endpoint, migration, or swagger changes. Profile badge uses existing `UserProfileResponse` (`email`, `organization.name`).
- **Rationale**: Spec assumptions and FR-001–FR-021 describe layout, routing, and client state only. Constitution III backend coverage applies to touched backend files — none expected; frontend must meet ≥80% on new/modified shell files.
- **Alternatives considered**:
  - *User-preference API for sidebar pin state*: rejected — clarify session + spec defer cross-session persistence.
  - *Server-driven navigation config*: rejected — over-engineering for static global items + placeholders.

## D2. Introduce `AppShell` layout wrapper (composition over page rewrites)

- **Decision**: New `AppShell` component wraps all authenticated routes in `App.tsx` (dashboard, create-venue, settings). Pages supply contextual top-bar content via `TopBarContext` or render-prop slot (`topBarContent`). Left rail + profile menu owned by shell.
- **Rationale**: FR-001 requires consistent two-tier shell across routes. Single wrapper avoids duplicating rail/top-bar markup in `DashboardHome`, `SettingsLayout`, and `CreateVenuePage`.
- **Alternatives considered**:
  - *Per-page copy of rail markup*: rejected — drift risk, violates DRY.
  - *React Router layout routes*: rejected — app uses History API (`appRoute.ts`); no router dependency.

## D3. Sidebar state machine in client hook + `sessionStorage`

- **Decision**: `useSidebarState()` manages `expanded | collapsed | hover-expanded` with `sessionStorage` key `split-rail:sidebar-pinned` (boolean: pinned expanded vs collapsed). Hover overlay is ephemeral (not persisted). Constants: expanded width 240px, collapsed 64px, hover delay 250ms, transition 150ms cubic-bezier(0.4, 0, 0.2, 1) per SPLR-62.
- **Rationale**: Matches FR-005–FR-011 and edge-case session persistence. CSS custom properties `--sidebar-width` and `--sidebar-overlay` drive layout reflow vs overlay z-index.
- **Alternatives considered**:
  - *CSS-only hover without JS state*: rejected — cannot implement pin-from-hover or session persistence.
  - *localStorage persistence*: rejected — spec limits to browser session default reset.

## D4. Global nav config and active-route matching

- **Decision**: `lib/globalNav.ts` exports static `GLOBAL_NAV_ITEMS`: Dashboard (active for `/`, `/venues/new`, ledger nested views), Booking Calendar + Settlements/Accounting Sync (`disabled: true`, label suffix "Coming soon"). Settings routes (`/settings/*`) match **no** global active id (clarify Q1-B). Active id derived from `getAppPath()`.
- **Rationale**: FR-012, FR-020, and clarify decisions need centralized route→highlight rules testable in unit tests.
- **Alternatives considered**:
  - *Hide placeholder modules*: rejected — clarify Q5-A requires visible disabled items.
  - *Settings as global rail item*: rejected — clarify Q1-B; Settings lives in profile menu only.

## D5. Settings layout refactor — top bar sub-nav, remove back control

- **Decision**: `SettingsNav` moves from `SettingsLayout` sidebar column into `TopBar` contextual slot (horizontal tabs). Remove `settings-layout__back` and header row; page title moves to main content or top-bar leading area. `SettingsLayout` becomes content-only wrapper inside `AppShell`.
- **Rationale**: Clarify Q4-A removes back button; FR-013 requires section links in contextual top area; existing vertical `settings-nav` CSS refactored to horizontal top-bar variant.
- **Alternatives considered**:
  - *Keep vertical settings nav in content column*: rejected — contradicts FR-013 post-clarify top-bar placement.

## D6. Profile badge without avatar API

- **Decision**: Circular avatar shows **initials derived from email** (first char of local part, uppercase) until a future avatar field exists. Display name = email local part or full email if no `@` split. Menu: Settings → `navigateToSettings()`, Sign out → `useAuth().logout()`.
- **Rationale**: `UserProfileResponse` has no `avatarUrl` or `displayName`. Initials pattern matches common SaaS fallback; no backend change.
- **Alternatives considered**:
  - *Generic silhouette icon only*: rejected — spec FR-014 requires avatar circle; initials add identity.
  - *Add displayName to API*: rejected — out of scope for layout feature.

## D7. Responsive breakpoint and mobile drawer

- **Decision**: CSS `@media (max-width: 767px)` hides desktop rail; `TopBar` shows hamburger control opening `MobileNavDrawer` (full-viewport overlay, focus trap, Escape/outside dismiss). Drawer reuses `GlobalNav` + `ProfileBadge` content.
- **Rationale**: SPLR-62 specifies `<768px`; FR-018/FR-019. Reuse `WelcomeModal` focus-trap patterns from onboarding.
- **Alternatives considered**:
  - *Bottom tab bar on mobile*: rejected — contradicts SPLR-62 hamburger drawer spec.

## D8. Testing strategy (Constitution III)

- **Decision**: Vitest + RTL suites under `apps/web/tests/shell/`: `AppShell`, `SidebarRail` (collapse/hover/pin), `GlobalNav` (active states, disabled placeholders), `ProfileMenu`, `MobileNavDrawer`, `SettingsTopNav` integration. Extend `DashboardHome` / `SettingsLayout` tests for removed legacy header controls. Optional Playwright viewport resize smoke in `tests/e2e/specs/navigation/vertical-shell.spec.ts`.
- **Rationale**: FR-022 + Constitution III; feature 017 established workspace navigation test patterns to extend.
- **Alternatives considered**:
  - *Visual regression only*: rejected — insufficient for CI coverage gate.

## D10. UI iconography — Font Awesome Free (Constitution IX)

- **Decision**: Add `@fortawesome/fontawesome-svg-core`, `@fortawesome/free-solid-svg-icons`, and `@fortawesome/react-fontawesome` to `apps/web`. Bootstrap once in `lib/fontAwesome.ts`. Navigation pin/unpin uses `faThumbtack` / `faThumbtackSlash` in `NavPinButton`. App-wide standard documented in `.specify/memory/iconography.md`.
- **Rationale**: User requirement for consistent professional icons; free tier covers navigation and common UI glyphs without custom SVG maintenance.
- **Alternatives considered**:
  - *Hand-drawn SVG per control*: rejected — inconsistent, harder to maintain.
  - *Font Awesome Pro*: rejected — licensing; free solid set sufficient for v1.

## D9. Organization name in top bar

- **Decision**: `TopBar` leading region shows `profile.organization.name` from `useUserProfile()` on all shell pages (clarify Q3-A). Dashboard contextual controls (venue switcher, event combobox, add venue) render in trailing `topBarContent` slot.
- **Rationale**: Clarify Q3-A; replaces `app__subtitle` removed with legacy header.
- **Alternatives considered**:
  - *Org name in left rail header*: rejected — user chose top bar in clarify.
