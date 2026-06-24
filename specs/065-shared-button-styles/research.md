# Phase 0 Research: Shared Primary and Secondary Button Styles (SPLR-88)

All Technical Context items resolved. Decisions grounded in Linear SPLR-88, parent epic (`058-brand-theming-mhc`), dependency `059-mhc-design-tokens`, and current `apps/web` codebase on branch `065-shared-button-styles`.

## D1. Delivery mechanism — CSS classes vs React `Button` wrapper

**Decision**: Implement shared styles as **CSS utility classes** in `apps/web/src/index.css` (`.btn-primary`, `.btn-primary--compact`, `.btn-secondary`, `.btn-secondary--on-dark`). Do **not** introduce a mandatory `Button.tsx` wrapper for this milestone.

**Rationale**:
- Linear SPLR-88 lists `index.css` as the primary repo path; wrapper is optional ("if introducing a thin wrapper").
- Existing codebase uses BEM-ish component classes (`auth-form__submit`, `sync-now-button`) already aliased into shared selectors — migration path is additive.
- Spec assumption: "CSS-level button classes (and optional thin wrapper)" — CSS satisfies FR-001–FR-003 without new abstraction.

**Alternatives considered**:
- **`components/ui/Button.tsx` with variant prop**: cleaner long-term API but expands scope beyond SPLR-88; would require refactoring every button call site.
- **Tailwind `@apply`**: rejected — project uses plain CSS tokens, no Tailwind.

## D2. Primary size variants — standard vs compact

**Decision**: Retain two primary variants:
- `.btn-primary` — standard padding (`0.75rem 1rem`, `1rem` font) for form submits and modal dismissals.
- `.btn-primary--compact` — compact padding (`0.5rem 1rem`, `0.875rem` font) for sync, lock budget, and inline toolbar CTAs.

**Rationale**: Spec edge case allows compact sizing while retaining accent fill and interaction states. Current branch already defines both blocks with shared hover/disabled/focus rules.

**Alternatives considered**:
- **Single primary size everywhere**: rejected — sync/lock buttons would look oversized in ledger toolbars.
- **Per-component padding overrides**: rejected — defeats shared-style purpose.

## D3. Secondary styling — light surface vs dark chrome

**Decision**: Split secondary into two explicit variants aligned with spec edge cases:
- **`.btn-secondary`** (default, light surfaces): transparent or cream-tinted background; **Lodgepole Brown** label and border via `--color-primary-brown` / `--color-border-subtle` (matches SPLR-88 acceptance).
- **`.btn-secondary--on-dark`** (dark brown chrome): transparent background; **Canvas Cream** label and border (current `.btn-secondary` behavior — rename/extract).

Consolidate light-surface cancel/outline actions currently on `.btn-outline` selector list to also include `.btn-secondary` where semantically appropriate, OR document `.btn-outline` as an alias of `.btn-secondary` on light surfaces (same rules, merged selector list).

**Rationale**:
- SPLR-88 specifies brown border/text for secondary on light backgrounds.
- Current `.btn-secondary` uses cream colors — correct for nav/dark chrome but **incorrect** for SPLR-88 secondary acceptance on cream/white content.
- Spec edge case explicitly allows cream-toned secondary on dark navigation surfaces.
- Existing `.btn-outline` block already implements brown-on-light pattern; merging avoids duplicate rule maintenance.

**Alternatives considered**:
- **Replace `.btn-outline` entirely with `.btn-secondary`**: acceptable if selector lists merge; keep `.btn-outline` as deprecated alias in CSS comments only.
- **Single `.btn-secondary` with context media queries**: rejected — surface context is component-driven, not viewport-driven.

## D4. Gap analysis — epic branch vs SPLR-88 acceptance

**Decision**: Treat shared button CSS as **~70% complete** on current branch; implement remaining gaps:

| Surface | Current state | Gap |
|---------|---------------|-----|
| Auth submit (`LoginForm`, `RegisterForm`, `OrganizationCreateStep`) | `btn-primary` class + CSS alias | ✅ Complete |
| Welcome modal dismiss | `btn-primary` class + CSS alias | ✅ Complete |
| Dashboard empty retry | CSS alias only, no explicit class | Add `btn-primary` to TSX |
| QBO `SyncNowButton`, `SyncAllButton` | CSS alias only | Add `btn-primary--compact` to TSX |
| Ledger lock budget | CSS alias `.ledger-grid__lock-btn` | Verify class or alias; add test |
| **Finalize Settlement** | **No shared class; no themed CSS** | **Add `btn-primary` + CSS hook** |
| Legacy `#1e293b` on submit buttons | Absent from `index.css` | ✅ Passes `legacyPalette.test.ts` |
| `.btn-secondary` light-surface spec | Uses cream (dark-surface pattern) | Refine per D3 |

**Rationale**: FR-005 requires explicit migration verification; finalize settlement is the largest visible gap (browser default button styling today).

## D5. Selector alias strategy during migration

**Decision**: Keep CSS selector aliases (e.g., `.auth-form__submit` grouped with `.btn-primary`) for backward compatibility during M4, but **require explicit shared classes** on all FR-005 high-traffic TSX buttons for testability. Layout-only component rules (margin, width) may remain on BEM classes.

**Rationale**:
- FR-006: behavior unchanged — aliases prevent breakage if a class is missed.
- FR-008/SC-001: explicit classes enable RTL `toHaveClass('btn-primary')` assertions without parsing CSS selector lists.
- Remove duplicate color/disabled rules from component-specific blocks where shared rules already apply (e.g., `.auth-form__submit:disabled` duplicates shared disabled block).

**Alternatives considered**:
- **Remove all aliases immediately**: risky for unmigrated buttons outside FR-005 scope; defer to SPLR-91 legacy migration.

## D6. Contrast — cream vs white label on orange primary

**Decision**: Use `--color-surface-white` for primary button label text (current implementation). Validate with existing `contrast.ts` helper in theme tests if adding contrast assertions.

**Rationale**:
- M1 research (059 D3): white-on-orange meets WCAG; brand guide Alpine Sunset `#E65100` preserved.
- Spec allows Pure White when contrast requires; `--color-surface-white` satisfies FR-001.

**Alternatives considered**:
- **Canvas cream labels on orange**: fails contrast; rejected.

## D7. Test strategy

**Decision**: Three-layer verification:
1. **CSS contract** (`buttons.test.tsx`): token references, hover/disabled/focus-visible rules, secondary brown border on light variant.
2. **Migration contract** (`buttonMigration.test.ts` or extended component tests): FR-005 surfaces render with `btn-primary` / `btn-primary--compact`.
3. **Legacy denylist** (`legacyPalette.test.ts`): entire `index.css` free of `#1e293b` etc. (already passing).

**Rationale**: Constitution III requires automated verification; CSS file-read tests match established M1/M3 patterns. Component tests protect against class regression without visual snapshot tooling.

**Alternatives considered**:
- **Playwright visual regression**: out of scope for button-only milestone; existing E2E unchanged.
- **Percy/Chromatic**: not in project toolchain.

## D8. Dependency on design tokens

**Decision**: Hard dependency on `059-mhc-design-tokens` merged first. All button rules MUST use `var(--color-*)` and `var(--radius-button)` — no hardcoded brand hex in button blocks.

**Rationale**: SPLR-88 Linear lists M1 as dependency; current branch already has tokens in `:root`.

**Alternatives considered**: None — blocked without tokens.
