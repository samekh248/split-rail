# Phase 0 Research: Welcome Modal and Onboarding Flow Theming (SPLR-93)

All Technical Context items are resolved. Decisions are grounded in Linear SPLR-93, spec `070-theme-welcome-onboarding`, parent specs `059-mhc-design-tokens`, `065-shared-button-styles`, `069-theme-auth-layout`, `007-registration-org-onboarding`, and the current `apps/web` onboarding stack on branch `070-theme-welcome-onboarding`.

## D1. Verify-first strategy — welcome modal CSS largely complete

**Decision**: Treat welcome modal and onboarding theming as **mostly implemented**. The `.welcome-modal` block in `index.css` (lines ~1699–1740) already applies Montana High Country tokens: brown-tinted backdrop scrim (`rgba(62, 39, 35, 0.5)`), white panel with `--color-border-subtle` and `--shadow-modal`, brand title typography (`--font-brand`, `--color-primary-brown`), muted body text (`--color-text-muted`), and `.btn-primary` dismiss wired through shared button rules. `WelcomeModal.tsx` already declares `btn-primary` on the dismiss button.

**Rationale**:
- Grounding against the repo shows prior M4/M5 prep work landed welcome modal token wiring before this spec was written.
- `dataContainers.test.ts` already includes a welcome-modal white-surface assertion as M5 reference.
- Linear SPLR-93 acceptance criteria emphasize **visual consistency with auth pages** and **passing WelcomeModal tests** — verification + gap closure satisfies the intent.

**Alternatives considered**:
- **Full CSS rewrite from scratch**: rejected — duplicates working token rules; high regression risk.
- **Extract backdrop scrim to CSS custom property**: deferred — hardcoded rgba matches Linear spec explicitly; SPLR-94 may tokenize if contrast audit requires.

## D2. Organization creation — inherit via AuthLayout (SPLR-92)

**Decision**: No dedicated TSX changes expected for `OrganizationCreateStep`. It already wraps `AuthLayout` and uses `btn-primary` on submit. Branded auth layout theming from SPLR-92 (`069-theme-auth-layout`) applies automatically. Verify via existing `OrganizationCreateStep.theme.test.tsx`.

**Rationale**:
- FR-006/FR-007 satisfied by composition with themed `AuthLayout` and shared primary button.
- Spec Assumptions: auth layout theming completed or in progress as dependency.
- Reduces duplicate CSS work.

**Alternatives considered**:
- **Duplicate auth layout styles on org-create**: rejected — violates DRY; AuthLayout is the single shell.
- **New org-create-specific theme module**: rejected — unnecessary when auth layout contract already covers the surface.

## D3. Auth resolving state — covered by SPLR-92, extend assertion in onboarding contract

**Decision**: `.auth-resolving` already uses `var(--color-bg-cream)` background and `var(--color-text-muted)` text in `index.css`. `authLayoutTheming.test.ts` (SPLR-92) asserts cream background. Add explicit muted-text assertion in `onboardingTheming.test.ts` or extend auth test — onboarding spec owns the user-facing "resolving feels on-brand" outcome.

**Rationale**:
- FR-008 requires both cream background and warm muted text.
- Auth resolving is part of the onboarding entry experience per spec User Story 3.
- Single assertion addition closes the gap without CSS changes.

**Alternatives considered**:
- **Rely solely on authLayoutTheming.test.ts**: rejected — onboarding milestone should own end-to-end onboarding surface verification.
- **Change resolving markup in App.tsx**: rejected — CSS-only theming sufficient.

## D4. CSS contract tests — dedicated onboarding theme module

**Decision**: Add `apps/web/tests/theme/onboardingTheming.test.ts` following the `authLayoutTheming.test.ts` pattern: read `index.css`, extract selector blocks for `.welcome-modal__backdrop`, `.welcome-modal`, `.welcome-modal__title`, `.welcome-modal__body`, `.auth-resolving`, and assert token references plus absence of legacy blue hex in welcome-modal blocks.

**Rationale**:
- FR-010/SC-004 require automated regression protection for onboarding theming.
- `dataContainers.test.ts` covers modal white surface only — dedicated module covers full welcome-modal block per FR-001–FR-004.
- File-parse tests are stable, fast, and match established theme test conventions.

**Alternatives considered**:
- **Extend dataContainers.test.ts only**: rejected — mixes data-container scope with onboarding modal scope.
- **Visual snapshot tests only**: rejected — brittle; CSS contract tests catch token drift earlier.

## D5. Component test consolidation — WelcomeModal

**Decision**: Merge branded-structure assertions from `WelcomeModal.theme.test.tsx` into `WelcomeModal.test.tsx`. Retain all functional tests: dialog `role`/`aria-modal`, organization name display, button dismiss, Escape dismiss, `btn-primary` class. Remove duplicate theme file after merge.

**Rationale**:
- Linear acceptance criteria: `WelcomeModal.test.tsx` passes with branded assertions.
- `WelcomeModal.theme.test.tsx` duplicates dismiss test already in main file.
- Consolidation reduces maintenance burden.

**Alternatives considered**:
- **Keep both files**: rejected — near-duplicate describe blocks.
- **Delete functional tests in favor of theme-only**: rejected — FR-005 requires unchanged dismiss/focus behavior verification.

## D6. Shared modal pattern — team dialogs inherit automatically

**Decision**: No dedicated team-modal TSX changes. `MemberEditModal` and `RemoveMemberConfirm` reuse `.welcome-modal__backdrop` and `.welcome-modal` classes — backdrop and card token updates inherit automatically. Include in manual quickstart spot-check only.

**Rationale**:
- Spec edge case: team dialogs SHOULD inherit branded backdrop/card when reusing shared modal styling.
- CSS changes to `.welcome-modal__backdrop` and `.welcome-modal` propagate without additional work.

**Alternatives considered**:
- **Dedicated team modal theme tests**: deferred — out of scope unless implementation reveals divergent markup.

## D7. Functional behavior freeze

**Decision**: Zero changes to onboarding API orchestration, welcome show/hide rules, focus trap logic, organization validation, or routing. Theming limited to CSS audit and tests.

**Rationale**:
- FR-009 explicit freeze.
- Spec Assumptions: visual-only milestone.

**Alternatives considered**:
- **Combine with onboarding bug fixes**: rejected — scope boundary per spec.

## Resolved unknowns

| Unknown | Resolution |
|---------|------------|
| Are M1/M4/SPLR-92 dependencies satisfied? | Yes — tokens, `.btn-primary`, and `AuthLayout` theming exist; org-create and resolving inherit. |
| How much CSS work remains? | Audit + possible minor polish; no structural rewrite. |
| WelcomeModal TSX changes? | None expected — class hooks and `btn-primary` already present. |
| Backend changes? | None — frontend-only. |
| WCAG contrast? | Deferred to SPLR-94 per spec Assumptions. |
