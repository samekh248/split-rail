# Phase 0 Research: Mobile Top Bar and Navigation Drawer Theming (SPLR-87)

All Technical Context items are resolved. Decisions are grounded in Linear SPLR-87, spec `064-mobile-top-bar-drawer-theme`, parent specs `059-mhc-design-tokens`, `063-wire-logo-navigation`, and the current `apps/web` shell on branch `064-mobile-top-bar-drawer-theme`.

## D1. Mobile top bar — brown bar via existing 768px media block

**Decision**: Apply Lodgepole Brown background and cream text to `.top-bar` inside the existing `@media (max-width: 768px)` block in `index.css`. Set `.top-bar__org-name` to `var(--color-text-on-dark)` on mobile. Desktop `.top-bar` remains `background: transparent` with brown org name (unchanged above breakpoint).

**Rationale**:
- FR-001/FR-009 require brown mobile bar while preserving desktop behavior.
- The 768px block already gates mobile grid layout and menu button visibility — theming belongs in the same scope to avoid drift.
- Matches sidebar reference: `background: var(--color-primary-brown); color: var(--color-bg-cream)`.

**Alternatives considered**:
- **Cream bar with brown text (alternate from Linear scope note)**: rejected — spec and Linear issue default to brown bar for sidebar consistency.
- **React conditional class on `TopBar`**: rejected — CSS media query keeps markup simple and avoids JS viewport detection.
- **Separate mobile-only `TopBar` component**: rejected — over-engineering for color swap.

## D2. Drawer panel — verify existing tokens, polish controls

**Decision**: Treat drawer panel theming as **mostly complete**. `.mobile-nav-drawer__panel` already sets `background: var(--color-primary-brown)` and `color: var(--color-bg-cream)`. Focus implementation on close-button touch target (44px), Font Awesome close icon, and test hardening. Confirm `GlobalNav` inside drawer inherits cream text via `color: inherit` on `.global-nav__item`.

**Rationale**:
- FR-003 is largely satisfied by existing CSS from prior shell work.
- Gap is control sizing, iconography, and regression tests — not panel background rewrite.
- Sidebar footer border pattern (`rgba(244, 241, 234, 0.12)`) already mirrored on `.mobile-nav-drawer__profile`.

**Alternatives considered**:
- **Rewrite drawer CSS from scratch**: rejected — risks regression; verify-first approach.
- **Light-theme drawer**: rejected — contradicts spec and sidebar reference.

## D3. Iconography — Font Awesome for menu and close controls

**Decision**: Replace Unicode `☰` in `TopBar` and `×` in `MobileNavDrawer` with `FontAwesomeIcon` using `faBars` and `faXmark` from `@fortawesome/free-solid-svg-icons`, following `NavPinButton` import pattern. Style icons cream on brown via `color: inherit` on mobile.

**Rationale**:
- Constitution IX prohibits Unicode symbol placeholders for navigation controls when FA equivalents exist.
- `UnassignedTransactionsDrawer` already uses `faXmark` — consistent precedent.
- Tree-shaken per-icon imports match project convention.

**Alternatives considered**:
- **Keep Unicode glyphs**: rejected — constitution violation.
- **Custom SVG hamburger**: rejected — constitution violation.

## D4. Touch targets and focus — align with sidebar pin button patterns

**Decision**: Set mobile menu and drawer close buttons to `min-width: 2.75rem; min-height: 2.75rem` (44px) with flex centering. Use `outline: 2px solid var(--color-bg-cream); outline-offset: 2px` on `:focus-visible`, matching `.sidebar-rail__brand-button:focus-visible` and `.nav-pin-button:focus-visible`.

**Rationale**:
- FR-006/FR-007 and SC-003 require 44px targets and visible focus on brown backgrounds.
- Reusing established sidebar focus pattern ensures visual consistency.

**Alternatives considered**:
- **Orange focus ring (`--color-focus-ring`)**: rejected on brown chrome — low contrast; cream ring matches sidebar.
- **36px buttons**: rejected — below touch-target spec.

## D5. FOUC prevention — global CSS, no runtime theme class

**Decision**: Rely on globally loaded `index.css` token rules. Drawer mounts with panel classes already styled (brown background in CSS); no light-theme flash because there is no alternate unstyled state or async theme injection. Avoid conditional rendering that paints drawer panel before styles apply.

**Rationale**:
- FR-005/SC-001/SC-002 addressed by CSS-first architecture.
- Drawer returns `null` when closed — open state renders panel with pre-defined themed classes immediately.

**Alternatives considered**:
- **CSS-in-JS theme provider**: rejected — unnecessary; contradicts existing plain CSS approach.
- **Inline style fallbacks**: rejected — duplicates tokens and violates single-source-of-truth.

## D6. Test strategy — shell RTL + CSS contract assertions

**Decision**: Extend `TopBar.test.tsx` to assert menu button contains Font Awesome SVG (`svg[data-icon="bars"]` or role/img pattern). Extend `MobileNavDrawer.test.tsx` to assert drawer panel has themed classes and close control sizing hooks. Add `tests/theme/mobileShellTheming.test.ts` reading `index.css` to verify `@media (max-width: 768px)` block sets `.top-bar` background/color to token variables (pattern from `cssTokens.test.ts`).

**Rationale**:
- FR-010/SC-005 require automated themed-shell coverage.
- CSS contract tests catch token regressions without brittle `getComputedStyle` in jsdom (limited media query support).
- Constitution III: modified files need ≥80% coverage.

**Alternatives considered**:
- **Playwright visual regression**: rejected — out of scope; Vitest sufficient for theming milestone.
- **Only manual QA**: rejected — FR-010 mandates automated tests.

## D7. Scope boundaries

**Decision**: No logo variant/placement changes (SPLR-84 scope). No workspace bar theming. No auth screen changes. No backend/API work. No new design tokens — consume M1 tokens only.

**Rationale**: Spec assumptions and dependencies explicitly bound scope.

**Alternatives considered**: N/A — aligned with spec.
