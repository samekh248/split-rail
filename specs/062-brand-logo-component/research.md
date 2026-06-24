# Phase 0 Research: Brand Logo Component (SPLR-83)

All Technical Context items are resolved. Decisions are grounded in Linear SPLR-83, parent epic `058-brand-theming-mhc`, and the current `apps/web` codebase on branch `062-brand-logo-component`.

## D1. Rendering pattern — `<img>` with variant-mapped `src`

**Decision**: Render a single `<img>` per mount inside a flex-centered wrapper `<div>`. Map `variant` prop to `src` via constants imported from `apps/web/src/brand/assets.ts`. Apply BEM-style classes `brand-logo` and `brand-logo--{variant}` on the image; `brand-logo-wrapper` on the wrapper.

**Rationale**:
- Linear SPLR-83 explicitly specifies `<img>` with `src` from `assets.ts`.
- PNG wordmark and badge artwork are pre-designed brand assets with transparency; duplicating as inline SVG would violate DRY and complicate designer handoff.
- Single `<img>` swap is the simplest path for variant changes without dual-mount flicker.

**Alternatives considered**:
- **Inline SVG components**: rejected — duplicates artwork, harder for designers to update, not requested in issue.
- **CSS `background-image` on a div**: rejected — weaker accessibility defaults; `<img alt>` is clearer for brand identity.
- **`<picture>` with responsive sources**: rejected — only two fixed variants tied to nav state, not viewport art direction.

## D2. Asset path centralization

**Decision**: Define `BRAND_LOGO_TEXT` and `BRAND_LOGO_BADGE` as the only public path strings in `apps/web/src/brand/assets.ts`. `BrandLogo.tsx` imports these constants; consumers never pass raw paths.

**Rationale**:
- FR-009 and SC-005 require zero hardcoded `/brand/` paths outside the registry.
- SPLR-82 owns file placement under `public/brand/`; SPLR-83 consumes constants only.
- Grep-friendly single source of truth for path migrations.

**Alternatives considered**:
- **Prop-driven `src` override**: rejected — invites drift and bypasses registry.
- **Import PNG as Vite modules**: works but changes URL shape (`/assets/...` hashed); public `/brand/` paths match epic contract and Firebase static hosting.

## D3. Stylesheet location — global `index.css` block

**Decision**: Keep logo layout rules in the existing `/* Brand logo */` section of `apps/web/src/index.css` (`.brand-logo-wrapper`, `.brand-logo--text`, `.brand-logo--badge`). Wordmark wrapper padding `1.5rem` (24px). Badge fixed `2.5rem` square with `object-fit: contain`.

**Rationale**:
- Matches project convention (plain CSS, no Tailwind, no CSS Modules for shell chrome).
- Epic M2 already established these rules; SPLR-83 validates rather than relocates.
- Global classes allow parent shells (`SidebarRail`, `TopBar`) to add layout hooks via `className` without coupling.

**Alternatives considered**:
- **Co-located CSS module**: rejected — inconsistent with shell/navigation styling in `index.css`.
- **Parent-only padding**: rejected — FR-005 requires ≥24px padding for wordmark variant; wrapper default ensures compliance even before SPLR-84 wiring.

## D4. Test file location

**Decision**: Primary contract tests live at `apps/web/tests/theme/BrandLogo.test.tsx` (not `tests/components/brand/` from Linear issue body).

**Rationale**:
- Parent epic `058-brand-theming-mhc` established `tests/theme/**` for brand foundation tests (`typography.test.ts`, `BrandLogo.test.tsx`, palette scans).
- Avoids duplicate test files and import path churn.
- Vitest config already includes `tests/**/*.test.tsx`.

**Alternatives considered**:
- **Move to `tests/components/brand/`**: rejected — breaks epic convention, no functional benefit.
- **Split theme vs component dirs**: rejected — logo is part of M2 brand theme milestone.

## D5. `auth` variant scope boundary

**Decision**: SPLR-83 acceptance covers **`text` and `badge` only**. The codebase may retain `auth` variant and `BRAND_LOGO_AUTH` for auth-layout work elsewhere in the epic; SPLR-83 tasks and quickstart do not require implementing or testing `auth`.

**Rationale**:
- Spec Assumptions explicitly exclude authentication logo from SPLR-83.
- Removing `auth` would regress `AuthLayout.tsx` already wired in epic branch.
- Narrow issue scope with coexistence is lower risk than API reduction.

**Alternatives considered**:
- **Strip `auth` from component**: rejected — breaks auth reskin milestone and violates minimize-unrelated-changes principle.
- **Expand SPLR-83 to include `auth`**: rejected — contradicts written spec boundaries.

## D6. Layout-shift prevention

**Decision**: Wrapper uses flex centering with consistent padding; badge uses fixed dimensions; wordmark uses `max-height: 2.5rem`. Optional `opacity` transition on `.brand-logo` is permitted but not required for acceptance.

**Rationale**:
- SC-004 requires no noticeable jump on variant swap; reserved vertical space in wrapper addresses this.
- Collapsed rail width (~4rem) fits `2.5rem` badge per existing sidebar CSS.

**Alternatives considered**:
- **Absolute positioning both variants**: rejected — accessibility and DOM simplicity favor single `<img>` swap.
- **Mandatory CSS transition**: rejected — spec lists animation as optional polish.

## D7. Implementation reconciliation (existing code)

**Decision**: Treat SPLR-83 as **contract verification first**. If `BrandLogo.tsx`, `assets.ts`, CSS, and tests already satisfy [contracts/brand-logo.md](./contracts/brand-logo.md), implementation phase is gap-fill only (missing assets, path drift, padding regression).

**Rationale**:
- Grep on branch shows component, tests, and CSS already present from `058-brand-theming-mhc`.
- Standalone spec/plan still adds value for Linear traceability and independent task generation.

**Alternatives considered**:
- **Rewrite component from scratch**: rejected — unnecessary duplicate work.
