# Implementation Plan: Branded Authentication Layout Theming

**Branch**: `069-theme-auth-layout` | **Date**: 2026-06-24 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/069-theme-auth-layout/spec.md` (Linear SPLR-92, milestone M5)

## Summary

Apply and **verify** Montana High Country brand theming across authentication entry screens—sign-in, registration, and organization creation—so first-touch flows feel unmistakably like Split-Rail rather than generic SaaS slate/blue. Grounding against the codebase shows **most CSS and component wiring is already tokenized**: `.auth-layout` uses cream background and white card tokens, titles use brand slab-serif brown typography, links use orange accent, forms use `.btn-primary`, and `.auth-resolving` uses cream background.

**Net-new work** is primarily **verification, test hardening, and small parity gaps**:

1. Add optional wordmark to `RegisterPage` (`showLogo`) for entry-screen parity with sign-in.
2. Add dedicated CSS contract tests (`authLayoutTheming.test.ts`) mirroring the `dataContainers.test.ts` pattern.
3. Extend component tests (`AuthLayout`, `LoginPage`, `RegisterPage`, form tests) with primary-button and branded-structure assertions; consolidate redundant theme test coverage where appropriate.
4. Audit auth CSS block for legacy hex/denylist violations and align any stragglers with token references.

Frontend-only (`apps/web`). No backend changes. Depends on M1 tokens (SPLR-79) and M4 button styles (SPLR-88). Unblocks SPLR-93 (welcome modal theming).

## Technical Context

**Language/Version**: TypeScript 5.7 + React 18.3 (`apps/web`), Vite 6. No backend code changes.

**Primary Dependencies**: Montana High Country CSS tokens in `apps/web/src/index.css` (`--color-bg-cream`, `--color-surface-white`, `--color-primary-brown`, `--color-accent-orange`, `--color-focus-ring`, `--color-border-subtle`, `--shadow-card`); shared `.btn-primary` from M4 (`065-shared-button-styles`); `BrandLogo` auth variant (`062-brand-logo-component`); auth components (`AuthLayout`, `LoginForm`, `RegisterForm`, `OrganizationCreateStep`); pages (`LoginPage`, `RegisterPage`).

**Storage**: N/A — presentation-layer CSS and component class wiring only.

**Testing**: Vitest 2 + React Testing Library — extend `apps/web/tests/auth/**` and add `apps/web/tests/theme/authLayoutTheming.test.ts` (CSS file-parse contract). Existing `buttonMigration.test.ts` already asserts `btn-primary` on auth forms. Constitution III: ≥80% line/branch coverage on modified frontend files via `vite.config.ts` thresholds.

**Target Platform**: Modern evergreen browsers (desktop + mobile), Vite SPA; auth screens usable at ~375px and ~1280px.

**Project Type**: Web application — frontend auth shell theming only.

**Performance Goals**: Branded cream background present from first painted auth frame (global CSS, no JS theme toggle); no layout shift when optional logo renders above title.

**Constraints**: Constitution III — ≥80.0% line/branch coverage on frontend for all modified files; backend N/A. Constitution VI — no hand-authored API types (N/A; no API changes). All auth colors MUST reference named design tokens — no ad-hoc hex in auth CSS blocks. Functional auth behavior (validation, orchestration, routing, a11y associations) MUST remain unchanged (FR-010). Welcome modal theming (SPLR-93) out of scope.

**Scale/Scope**: ~1 TSX page change (`RegisterPage` logo parity), auth CSS audit/polish in `index.css` auth block (~lines 1439–1652), 1 new theme CSS contract test module, 4–6 extended auth test files; no deploy scripts.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Applicable? | Status | Notes |
|---|-----------|-------------|--------|-------|
| I | Core Mathematical Axioms | No | PASS (N/A) | No monetary computation. |
| II | Multi-Tenant Isolation | No | PASS (N/A) | Visual-only; no database access. |
| III | Engineering Rigor & Quality Gates | **Yes — primary** | PASS | Auth layout + CSS contract tests; ≥80% coverage on modified files. |
| IV | QBO Integration | No | PASS (N/A) | No QuickBooks interaction. |
| V | Ledger State Machine & Immutability | No | PASS (N/A) | Presentational theming only. |
| VI | Polyglot Contract Serialization | No | PASS (N/A) | No API types or DTO changes. |
| VII | EF Core Axioms | No | PASS (N/A) | Frontend-only. |
| VIII | Exception Governance & Logging Privacy | No | PASS (N/A) | No logging changes. |
| IX | UI Iconography | No | PASS (N/A) | Auth uses text links and image wordmark; no new icon controls. |
| X | Dual-Platform Operator Scripts | No | PASS (N/A) | No deploy scripts. |

**Gate result (pre-design)**: All gates PASS. No violations.

**Gate result (post-design)**: Unchanged. Artifacts define auth layout theming contract, token map, test matrix, and validation guide only.

## Project Structure

### Documentation (this feature)

```text
specs/069-theme-auth-layout/
├── plan.md              # This file
├── research.md          # Phase 0 — gap analysis, verify-first strategy
├── data-model.md        # Phase 1 — auth shell theme entities, validation rules
├── quickstart.md        # Phase 1 — manual + automated validation for SPLR-92
├── contracts/
│   └── auth-layout-theming.md   # CSS + component theming + test contract
├── checklists/
│   └── requirements.md  # Spec quality checklist (from /speckit-specify)
└── tasks.md             # Phase 2 output (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
apps/web/
├── src/
│   ├── components/
│   │   ├── auth/
│   │   │   ├── AuthLayout.tsx           # VERIFY — logo slot, class hooks (minimal/no change expected)
│   │   │   ├── LoginForm.tsx            # VERIFY — btn-primary present
│   │   │   └── RegisterForm.tsx         # VERIFY — btn-primary present
│   │   ├── brand/
│   │   │   └── BrandLogo.tsx            # VERIFY — auth variant used by LoginPage
│   │   └── onboarding/
│   │       └── OrganizationCreateStep.tsx  # VERIFY — AuthLayout + btn-primary
│   ├── pages/
│   │   ├── LoginPage.tsx                # VERIFY — showLogo enabled
│   │   └── RegisterPage.tsx             # MODIFY — add showLogo for brand parity
│   └── index.css                        # VERIFY/AUDIT — auth-layout section token compliance
└── tests/
    ├── auth/
    │   ├── AuthLayout.test.tsx          # EXTEND — merge theme structure + logo assertions
    │   ├── AuthLayout.theme.test.tsx    # CONSOLIDATE or EXTEND — avoid duplicate coverage
    │   ├── LoginPage.test.tsx           # EXTEND — btn-primary + auth-layout assertions
    │   ├── RegisterPage.test.tsx        # EXTEND — logo + btn-primary assertions
    │   ├── LoginForm.test.tsx           # EXTEND — btn-primary class assertion
    │   └── RegisterForm.test.tsx        # EXTEND — btn-primary class assertion
    ├── onboarding/
    │   └── OrganizationCreateStep.theme.test.tsx  # VERIFY — already covers auth layout + btn-primary
    └── theme/
        ├── authLayoutTheming.test.ts    # NEW — CSS contract for auth-layout block
        ├── buttonMigration.test.ts      # VERIFY — auth surfaces already listed
        └── dataContainers.test.ts       # VERIFY — auth card reference test already present
```

**Structure Decision**: Monorepo web app under `apps/web`. Auth component tests stay in `tests/auth/**`. CSS token contract tests follow `tests/theme/dataContainers.test.ts` pattern for the `.auth-layout` block.

## Complexity Tracking

> No constitution violations. Table not required.

## Phase Artifacts Summary

| Phase | Artifact | Key decisions |
|-------|----------|---------------|
| 0 | [research.md](./research.md) | Verify-first: CSS largely complete; focus on tests + RegisterPage logo parity |
| 1 | [data-model.md](./data-model.md) | Auth shell theme entities, token map, validation rules |
| 1 | [contracts/auth-layout-theming.md](./contracts/auth-layout-theming.md) | Per-selector CSS hooks, token map, test matrix |
| 1 | [quickstart.md](./quickstart.md) | Automated + manual validation steps |

## Implementation Notes (for `/speckit-tasks`)

1. **RegisterPage.tsx** — Add `showLogo` to `AuthLayout` for parity with `LoginPage` (FR-009 optional registration wordmark).
2. **index.css** — Audit auth block (`.auth-layout` through `.auth-resolving`, `.form-field__*` used by auth) for token-only colors; confirm no `#2563eb`, `#64748b`, or denylist hex; align `--shadow-card` vs `--shadow-soft` if card depth spec requires consistency with data containers.
3. **authLayoutTheming.test.ts** — Parse `index.css` and assert: cream page bg, white card + border/shadow, brown title font/color, orange/brown links (no blue hex), focus-ring token on links and inputs, cream resolving background.
4. **AuthLayout.test.tsx** — Extend with logo rendering when `showLogo`, title class hook, card container; merge or dedupe `AuthLayout.theme.test.tsx`.
5. **LoginPage / RegisterPage tests** — Assert submit buttons carry `btn-primary`; RegisterPage asserts wordmark when logo enabled.
6. **LoginForm / RegisterForm tests** — Assert submit button has `btn-primary` class.
7. **Run gate** — `npm run test -- tests/auth tests/theme/authLayoutTheming.test.ts tests/onboarding/OrganizationCreateStep.theme.test.tsx` then `npm run test:coverage`.

**Depends on**: M1 tokens (SPLR-79), M4 button styles (SPLR-88), M2 logo component (SPLR-83).

**Blocks**: SPLR-93 welcome modal and onboarding theming.
