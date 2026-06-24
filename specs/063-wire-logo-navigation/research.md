# Phase 0 Research: Dynamic Logo in Navigation Shell (SPLR-84)

All Technical Context items are resolved. Decisions are grounded in Linear SPLR-84, spec `063-wire-logo-navigation`, parent specs `062-brand-logo-component` and `022-vertical-navigation`, and the current `apps/web` shell on branch `063-wire-logo-navigation`.

## D1. Variant selection — derive from existing sidebar state

**Decision**: Desktop `SidebarRail` continues to map `showLabels` (`pinnedExpanded || hoverExpanded`) to `BrandLogo` variant: `text` when labels visible, `badge` when collapsed. No new global logo state store; shell reuses `useSidebarState` outputs already passed to `SidebarRail`.

**Rationale**:
- FR-002/FR-003 align with `showLabels` semantics from `022-vertical-navigation`.
- Hover overlay temporarily shows labels → wordmark; pointer leave → badge (spec User Story 1 scenario 3).
- Avoids duplicate state that could desync from rail width.

**Alternatives considered**:
- **Dedicated `logoVariant` context**: rejected — redundant with `showLabels`.
- **CSS-only swap (hide/show two images)**: rejected — violates single-`<img>` BrandLogo contract and hurts accessibility.

## D2. Mobile drawer header — replace placeholder title with wordmark

**Decision**: In `MobileNavDrawer`, replace the static `"Menu"` header label with `<BrandLogo variant="text" className="mobile-nav-drawer__brand" />`, retaining the close button in the header flex row. CSS rules `.mobile-nav-drawer__brand` already exist in `index.css` (padding override, left-aligned wordmark within header).

**Rationale**:
- FR-004 requires wordmark at top of drawer panel.
- Pre-authored CSS anticipates this wiring; only component JSX is missing.
- Close control stays right-aligned via existing `justify-content: space-between` on `.mobile-nav-drawer__header`.

**Alternatives considered**:
- **Wordmark below header row**: rejected — PRD places logo at drawer top; wastes vertical space.
- **Duplicate logo in drawer body**: rejected — crowds navigation links (FR-006).

## D3. Mobile top bar — centered wordmark via three-zone flex layout

**Decision**: Extend `TopBar` with a center slot rendering `<BrandLogo variant="text" className="top-bar__brand" />` when `showMobileMenu` is true. Restructure `.top-bar` at `max-width: 768px` to a three-column CSS grid: `auto 1fr auto` — leading (menu + org name) | centered brand | trailing (contextual content). Hide or visually de-emphasize org name on very narrow widths only if overlap occurs; default keeps org name in leading column per existing behavior.

**Rationale**:
- FR-005 requires centered wordmark when sidebar is hidden (mobile breakpoint hides `.app-shell__sidebar-slot`).
- Grid center column with `justify-self: center` achieves true visual center without absolute positioning overlap bugs.
- `showMobileMenu` prop already gates mobile chrome; desktop top bar omits center logo (sidebar carries brand).

**Alternatives considered**:
- **Logo only in drawer, skip top bar**: rejected — spec User Story 3 is P2 but in scope; PRD allows both placements.
- **Absolute center over full bar**: rejected — overlaps menu/org on narrow phones; grid zones are more predictable.
- **Replace org name with logo**: rejected — spec requires logo alongside org context, not instead of it.

## D4. Padding and layout-shift — shell overrides + base wrapper

**Decision**: Rely on `BrandLogo` base `.brand-logo-wrapper` padding (`1.5rem` / 24px) for wordmark compliance where shell does not override. `SidebarRail` and `MobileNavDrawer` use shell-specific class hooks that zero out wrapper padding where header chrome provides spacing (`padding: 1rem` on drawer panel, sidebar header flex). Verify expanded sidebar wordmark still meets ≥24px effective spacing via header/panel padding + image margins; adjust shell CSS only if audit fails.

**Rationale**:
- FR-006 applies to all wordmark placements.
- Epic already tuned `.sidebar-rail__brand-logo` and `.mobile-nav-drawer__brand` overrides to prevent double padding.
- Badge variant uses fixed dimensions in sidebar collapsed CSS — supports SC-006 no-jank requirement.

**Alternatives considered**:
- **Force 24px on wrapper in all contexts**: rejected — double padding in drawer/sidebar headers.
- **Remove all shell overrides**: rejected — breaks collapsed rail alignment.

## D5. Implementation reconciliation (existing code)

**Decision**: Treat SPLR-84 as **gap-fill + verification**. `SidebarRail.tsx` already wires dynamic `BrandLogo` (likely from epic T027). `MobileNavDrawer.tsx` and `TopBar.tsx` lack `BrandLogo` despite epic task T028 marked complete — this milestone implements T028 remainder and hardens tests.

**Rationale**:
- Code inspection confirms sidebar wiring; mobile surfaces are the net-new work.
- Standalone spec/plan provides Linear traceability independent of epic task checkbox drift.

**Alternatives considered**:
- **Rewrite SidebarRail wiring**: rejected — working code; test hardening only.
- **Defer mobile top bar**: rejected — explicit FR-005 in spec.

## D6. Test strategy — shell tests assert placement and variant src

**Decision**: Extend `tests/shell/SidebarRail.test.tsx` with explicit `src` assertions (`/brand/sr-text.png` vs `/brand/sr-badge.png`) for expanded vs collapsed. Add `MobileNavDrawer` test for wordmark in drawer header. Add `TopBar` test (or `AppShell` mobile viewport test) for centered wordmark when `showMobileMenu` is true. No new test directory — keep `tests/shell/**` convention from `022-vertical-navigation`.

**Rationale**:
- FR-009 and SC-005 require navigation shell automated coverage.
- Asserting `img` `src` ties shell tests to BrandLogo contract without duplicating component unit tests.
- Constitution III: modified shell files need ≥80% coverage via existing `vite.config.ts` thresholds.

**Alternatives considered**:
- **Playwright visual regression**: rejected — out of scope for this milestone; Vitest + RTL sufficient per constitution for component/shell changes.
- **Only manual QA**: rejected — FR-009 mandates automated tests.

## D7. Scope boundaries

**Decision**: No auth logo changes, no SPLR-87 color theming, no new BrandLogo variants, no backend changes. Consumers import `<BrandLogo />` only — no raw `/brand/` paths in shell files.

**Rationale**: Spec edge cases and dependencies explicitly bound scope.

**Alternatives considered**: N/A — aligned with spec assumptions.
