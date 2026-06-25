# Implementation Plan: Welcome Modal and Onboarding Flow Theming

**Branch**: `070-theme-welcome-onboarding` | **Date**: 2026-06-24 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/070-theme-welcome-onboarding/spec.md` (Linear SPLR-93, milestone M5)

## Summary

Apply and **verify** Montana High Country brand theming across post-registration onboarding surfaces—the welcome overlay, organization-creation step, and authentication-resolving loading state—so the post-auth journey feels continuous with branded sign-in and registration. Grounding against the codebase shows **most CSS and component wiring is already tokenized**: `.welcome-modal` uses white surface, brand title typography, muted body text, and `.btn-primary` dismiss; `OrganizationCreateStep` wraps `AuthLayout` (themed in SPLR-92); `.auth-resolving` uses cream background and muted text.

**Net-new work** is primarily **verification, test hardening, and small parity gaps**:

1. Add dedicated CSS contract tests (`onboardingTheming.test.ts`) for the welcome-modal block and auth-resolving text color.
2. Extend or consolidate welcome modal component tests (`WelcomeModal.test.tsx`, `WelcomeModal.theme.test.tsx`) with branded-structure assertions alongside unchanged functional behavior (focus trap, Escape, backdrop dismiss).
3. Verify `OrganizationCreateStep.theme.test.tsx` passes against branded auth layout from SPLR-92 (no TSX changes expected).
4. Audit welcome-modal CSS block for legacy hex/denylist violations; align any stragglers with token references.

Frontend-only (`apps/web`). No backend changes. Depends on M1 tokens (SPLR-79), M4 button styles (SPLR-88), and auth layout theming (SPLR-92). Unblocks SPLR-94 (WCAG AA contrast audit).

## Technical Context

**Language/Version**: TypeScript 5.7 + React 18.3 (`apps/web`), Vite 6. No backend code changes.

**Primary Dependencies**: Montana High Country CSS tokens in `apps/web/src/index.css` (`--color-bg-cream`, `--color-surface-white`, `--color-primary-brown`, `--color-text-muted`, `--color-accent-orange`, `--color-border-subtle`, `--shadow-modal`); shared `.btn-primary` from M4 (`065-shared-button-styles`); branded `AuthLayout` from SPLR-92 (`069-theme-auth-layout`); onboarding components (`WelcomeModal`, `OrganizationCreateStep`); auth gate resolving state in `App.tsx`.

**Storage**: N/A — presentation-layer CSS and component class wiring only.

**Testing**: Vitest 2 + React Testing Library — extend `apps/web/tests/onboarding/**` and add `apps/web/tests/theme/onboardingTheming.test.ts` (CSS file-parse contract). Existing `dataContainers.test.ts` already asserts welcome-modal white surface; `authLayoutTheming.test.ts` covers `.auth-resolving` cream background. Constitution III: ≥80% line/branch coverage on modified frontend files via `vite.config.ts` thresholds.

**Target Platform**: Modern evergreen browsers (desktop + mobile), Vite SPA; welcome overlay and org-create usable at ~375px and ~1280px.

**Project Type**: Web application — frontend onboarding shell theming only.

**Performance Goals**: Branded welcome overlay and resolving state present from first paint (global CSS, no JS theme toggle); no layout shift when welcome dialog renders over dashboard.

**Constraints**: Constitution III — ≥80.0% line/branch coverage on frontend for all modified files; backend N/A. Constitution VI — no hand-authored API types (N/A; no API changes). All onboarding colors MUST reference named design tokens where applicable — backdrop scrim MAY use documented Lodgepole Brown rgba (`rgba(62, 39, 35, 0.5)`) per SPLR-93. Functional onboarding behavior (welcome show/hide rules, focus trap, dismiss handlers, org validation, routing) MUST remain unchanged (FR-009). WCAG contrast token adjustments deferred to SPLR-94.

**Scale/Scope**: CSS audit/polish in `index.css` welcome-modal block (~lines 1699–1740), 1 new theme CSS contract test module, 2–3 extended/consolidated onboarding test files; no deploy scripts; no TSX changes expected unless audit reveals gaps.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Applicable? | Status | Notes |
|---|-----------|-------------|--------|-------|
| I | Core Mathematical Axioms | No | PASS (N/A) | No monetary computation. |
| II | Multi-Tenant Isolation | No | PASS (N/A) | Visual-only; no database access. |
| III | Engineering Rigor & Quality Gates | **Yes — primary** | PASS | Welcome modal + onboarding theme tests; ≥80% coverage on modified files. |
| IV | QBO Integration | No | PASS (N/A) | No QuickBooks interaction. |
| V | Ledger State Machine & Immutability | No | PASS (N/A) | Presentational theming only. |
| VI | Polyglot Contract Serialization | No | PASS (N/A) | No API types or DTO changes. |
| VII | EF Core Axioms | No | PASS (N/A) | Frontend-only. |
| VIII | Exception Governance & Logging Privacy | No | PASS (N/A) | No logging changes. |
| IX | UI Iconography | No | PASS (N/A) | Welcome modal uses text only; no new icon controls. |
| X | Dual-Platform Operator Scripts | No | PASS (N/A) | No deploy scripts. |

**Gate result (pre-design)**: All gates PASS. No violations.

**Gate result (post-design)**: Unchanged. Artifacts define onboarding theming contract, token map, test matrix, and validation guide only.

## Project Structure

### Documentation (this feature)

```text
specs/070-theme-welcome-onboarding/
├── plan.md              # This file
├── research.md          # Phase 0 — gap analysis, verify-first strategy
├── data-model.md        # Phase 1 — onboarding theme entities, validation rules
├── quickstart.md        # Phase 1 — manual + automated validation for SPLR-93
├── contracts/
│   └── onboarding-theming.md   # CSS + component theming + test contract
├── checklists/
│   └── requirements.md  # Spec quality checklist (from /speckit-specify)
└── tasks.md             # Phase 2 output (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
apps/web/
├── src/
│   ├── components/
│   │   └── onboarding/
│   │       ├── WelcomeModal.tsx           # VERIFY — class hooks, btn-primary, a11y unchanged
│   │       └── OrganizationCreateStep.tsx # VERIFY — AuthLayout + btn-primary (inherits SPLR-92)
│   ├── App.tsx                            # VERIFY — auth-resolving + WelcomeModal wiring
│   └── index.css                          # VERIFY/AUDIT — welcome-modal block token compliance
└── tests/
    ├── onboarding/
    │   ├── WelcomeModal.test.tsx          # EXTEND — merge theme assertions + functional tests
    │   ├── WelcomeModal.theme.test.tsx    # CONSOLIDATE into WelcomeModal.test.tsx
    │   └── OrganizationCreateStep.theme.test.tsx  # VERIFY — auth layout + btn-primary
    └── theme/
        ├── onboardingTheming.test.ts      # NEW — CSS contract for welcome-modal + resolving text
        ├── authLayoutTheming.test.ts      # VERIFY — .auth-resolving cream (SPLR-92 dependency)
        ├── dataContainers.test.ts         # VERIFY — welcome-modal white surface reference
        └── buttonMigration.test.ts        # VERIFY — WelcomeModal.tsx lists btn-primary
```

**Structure Decision**: Monorepo web app under `apps/web`. Onboarding component tests stay in `tests/onboarding/**`. CSS token contract tests follow `authLayoutTheming.test.ts` pattern for the `.welcome-modal` block. Team modals (`MemberEditModal`, `RemoveMemberConfirm`) reuse `.welcome-modal__backdrop` and inherit backdrop/card styles automatically.

## Complexity Tracking

> No constitution violations. Table not required.

## Phase Artifacts Summary

| Phase | Artifact | Key decisions |
|-------|----------|---------------|
| 0 | [research.md](./research.md) | Verify-first: CSS largely complete; focus on tests + CSS audit |
| 1 | [data-model.md](./data-model.md) | Onboarding theme entities, token map, validation rules |
| 1 | [contracts/onboarding-theming.md](./contracts/onboarding-theming.md) | Per-selector CSS hooks, token map, test matrix |
| 1 | [quickstart.md](./quickstart.md) | Automated + manual validation steps |

## Implementation Notes (for `/speckit-tasks`)

1. **index.css** — Audit welcome-modal block (`.welcome-modal__backdrop` through `.welcome-modal__dismiss`) for token-only colors; confirm backdrop `rgba(62, 39, 35, 0.5)` scrim, white panel, brand title, muted body, primary dismiss; no `#2563eb`, `#64748b`, or denylist hex in onboarding blocks.
2. **onboardingTheming.test.ts** — Parse `index.css` and assert: brown-tinted backdrop scrim, white modal surface + border/shadow, brown slab-serif title, muted body text, cream resolving background + muted resolving text.
3. **WelcomeModal.test.tsx** — Merge branded-structure assertions from `WelcomeModal.theme.test.tsx`; retain functional tests (dialog a11y, Escape dismiss, button dismiss, focus trap unchanged).
4. **OrganizationCreateStep.theme.test.tsx** — Verify passes; no changes unless SPLR-92 auth layout regressions found.
5. **authLayoutTheming.test.ts** — Optionally extend `.auth-resolving` with explicit `color: var(--color-text-muted)` assertion if not already covered by onboarding contract.
6. **Run gate** — `npm run test -- tests/onboarding tests/theme/onboardingTheming.test.ts tests/theme/authLayoutTheming.test.ts` then `npm run test:coverage`.

**Depends on**: M1 tokens (SPLR-79), M4 button styles (SPLR-88), auth layout theming (SPLR-92).

**Blocks**: SPLR-94 WCAG AA contrast audit.
