# Phase 0 Research: Branded Authentication Layout Theming (SPLR-92)

All Technical Context items are resolved. Decisions are grounded in Linear SPLR-92, spec `069-theme-auth-layout`, parent specs `059-mhc-design-tokens`, `065-shared-button-styles`, `066-white-cream-containers`, `062-brand-logo-component`, and the current `apps/web` auth stack on branch `069-theme-auth-layout`.

## D1. Verify-first strategy — CSS largely complete

**Decision**: Treat auth layout theming as **mostly implemented**. The `.auth-layout` block in `index.css` (lines ~1439–1652) already applies Montana High Country tokens: cream page background, white card with `--color-border-subtle` and `--shadow-card`, brand title typography (`--font-brand`, `--color-primary-brown`), orange accent links (`--color-accent-orange`), tokenized form fields, and cream `.auth-resolving` background. Primary submit buttons on `LoginForm`, `RegisterForm`, and `OrganizationCreateStep` already declare `.btn-primary`.

**Rationale**:
- Grounding against the repo shows prior M4/M5 prep work landed auth token wiring before this spec was written.
- Re-implementing existing CSS risks regression without user-visible benefit.
- Linear SPLR-92 acceptance criteria emphasize **matching palette** and **passing AuthLayout tests** — verification + gap closure satisfies the intent.

**Alternatives considered**:
- **Full CSS rewrite from scratch**: rejected — duplicates working token rules; high regression risk.
- **Tailwind or CSS-in-JS migration**: rejected — out of scope; project uses plain CSS classes in `index.css`.

## D2. RegisterPage logo parity

**Decision**: Add `showLogo` to `RegisterPage`'s `AuthLayout` invocation, matching `LoginPage`. Use existing `BrandLogo` `auth` variant and `.auth-layout__logo` CSS hooks — no new logo asset or component work.

**Rationale**:
- FR-009: sign-in MUST support wordmark; registration MAY show same treatment for parity.
- Linear issue lists optional centered wordmark on login/register.
- `LoginPage` already passes `showLogo`; `RegisterPage` does not — the only functional gap for User Story 4.

**Alternatives considered**:
- **Logo on sign-in only**: rejected as default — spec encourages registration parity; one-line prop addition is low cost.
- **New text-variant logo component**: rejected — `BrandLogo` auth variant and assets already exist (SPLR-83).

## D3. CSS contract tests — dedicated auth theme module

**Decision**: Add `apps/web/tests/theme/authLayoutTheming.test.ts` following the `dataContainers.test.ts` pattern: read `index.css`, extract selector blocks for `.auth-layout`, `.auth-layout__card`, `.auth-layout__title`, `.auth-layout__link`, `.form-field__input`, `.auth-resolving`, and assert token references plus absence of legacy blue hex (`#2563eb`) and cool-gray body tones in auth blocks.

**Rationale**:
- FR-011/SC-004 require automated regression protection for auth theming.
- `dataContainers.test.ts` already includes one auth-card assertion as M5 reference — dedicated module covers full auth block per FR-001–FR-008.
- File-parse tests are stable, fast, and match established theme test conventions in this repo.

**Alternatives considered**:
- **Visual snapshot tests only**: rejected — brittle; CSS contract tests catch token drift earlier.
- **Extend only RTL smoke tests**: rejected — insufficient to catch CSS regressions when class names remain but rules change.

## D4. Component test consolidation

**Decision**: Extend `AuthLayout.test.tsx`, `LoginPage.test.tsx`, `RegisterPage.test.tsx`, and form tests with branded-structure and `btn-primary` assertions. Merge overlapping coverage from `AuthLayout.theme.test.tsx` into `AuthLayout.test.tsx` (or keep theme file but dedupe identical structure test). Do not duplicate `buttonMigration.test.ts` file-presence checks — add RTL class assertions on rendered submit buttons for runtime confidence.

**Rationale**:
- Linear acceptance criteria explicitly call out `AuthLayout.test.tsx` updated and passing.
- `buttonMigration.test.ts` verifies source contains `btn-primary` but not that the rendered button receives the class at runtime.
- Consolidation reduces maintenance burden from parallel near-duplicate describe blocks.

**Alternatives considered**:
- **Delete AuthLayout.theme.test.tsx entirely without merging**: rejected — would drop coverage unless assertions move first.
- **Page-level E2E for auth theming**: rejected — Playwright login E2E exists elsewhere; CSS + RTL sufficient for this visual-only milestone.

## D5. Card depth token — shadow-card vs shadow-soft

**Decision**: Keep `.auth-layout__card` on `var(--shadow-card)` as currently implemented. Data containers (SPLR-89) use `--shadow-soft` on inline cards; auth card uses slightly stronger `--shadow-card` for centered entry focal point — both satisfy FR-002 "subtle brown-tinted border or soft card shadow."

**Rationale**:
- `dataContainers.test.ts` already asserts auth card uses `--shadow-card` as M5 reference.
- Auth card is a standalone centered panel, not an inline data block — marginally stronger elevation is acceptable and already shipped.

**Alternatives considered**:
- **Switch auth card to `--shadow-soft` for strict parity with data containers**: rejected unless visual review shows inconsistency — spec allows either subtle border or shadow; current choice is valid.

## D6. AcceptInvitePage and auth-adjacent flows

**Decision**: No dedicated TSX changes. `AcceptInvitePage` reuses `AuthLayout` and auth form classes — token updates in `index.css` inherit automatically. Include in manual quickstart spot-check only; no new test module unless gaps found during implementation.

**Rationale**:
- Spec Assumptions: invitation flows inherit auth layout styling; dedicated invitation UX out of scope.
- Reduces scope creep while satisfying edge-case note in spec.

**Alternatives considered**:
- **Explicit AcceptInvitePage theme test file**: deferred — add only if implementation reveals divergent markup/classes.

## D7. Functional behavior freeze

**Decision**: Zero changes to auth API orchestration, validation rules, routing, or WCAG association patterns. Theming limited to CSS audit, optional logo prop, and tests.

**Rationale**:
- FR-010 explicit freeze.
- Spec Assumptions: visual-only milestone.

**Alternatives considered**:
- **Combine with auth bug fixes**: rejected — scope boundary per spec.

## Resolved unknowns

| Unknown | Resolution |
|---------|------------|
| Are M1/M4 dependencies satisfied? | Yes — tokens and `.btn-primary` exist in `index.css`; `buttonMigration.test.ts` lists auth surfaces. |
| How much CSS work remains? | Audit + possible minor polish; no structural rewrite. |
| RegisterPage logo? | Add `showLogo` — only confirmed TSX gap. |
| Backend changes? | None — frontend-only. |
