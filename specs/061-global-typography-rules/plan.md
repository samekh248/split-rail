# Implementation Plan: Global Typography Rules for Headings and UI Text

**Branch**: `061-global-typography-rules` | **Date**: 2026-06-24 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/061-global-typography-rules/spec.md` (Linear SPLR-81)

## Summary

Establish **global typography defaults** in the web app so brand headings (slab-serif, bold, primary brown) and UI text (sans-serif) apply consistently across dashboard, authentication, and ledger surfaces without per-component font overrides. Add a `.text-on-dark` cream-text utility for dark brand surfaces and document governed selectors in a Typography comment block.

This is a **frontend-only CSS feature** in `apps/web/src/index.css`, verified primarily by static CSS contract tests in `apps/web/tests/theme/typography.test.ts` plus the existing Vitest suite. **No backend changes.** Implementation depends on merged `059-mhc-design-tokens` and `060-brand-web-fonts` so `--font-heading`, `--font-ui`, `--color-primary-brown`, and `--color-bg-cream` exist in `:root`.

## Technical Context

**Language/Version**: TypeScript 5.7 + React 18.3 (`apps/web`), plain CSS in `index.css`. No backend code.

**Primary Dependencies**: Existing Montana High Country design tokens (`059`) and web font loading (`060`). No new npm packages.

**Storage**: N/A — declarative CSS only.

**Testing**: Vitest 2 reading `index.css` for selector/token contract assertions (`tests/theme/typography.test.ts`); full `npm run test` regression; `npm run test:coverage` for ≥80% global gate. No new Playwright E2E (not a multi-user or tenant-isolation flow).

**Target Platform**: Modern evergreen browsers; Vite SPA build.

**Project Type**: Web application — frontend stylesheet slice only.

**Performance Goals**: Zero runtime cost beyond normal CSS cascade; no additional font requests (fonts loaded by `060`).

**Constraints**: ≥80.0% line/branch coverage on backend and frontend independently (Constitution III); missing/unparseable coverage reports treated as failing. Frontend global gate already enforced in `apps/web/vite.config.ts`. No hand-authored API types (Constitution VI — N/A). Typography rules MUST reference token variables only, not hard-coded font names or hex colors. Must not regress readability on login, dashboard home, or event ledger at ≈375px and ≈1280px.

**Scale/Scope**: One CSS section (~25–40 lines), minor cleanup of conflicting font overrides in existing component rules, one theme test file (create or extend), optional `.text-on-dark` adoption on app header text.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Applicable? | Status | Notes |
|---|-----------|-------------|--------|-------|
| I | Core Mathematical Axioms | No | PASS (N/A) | No monetary computation. |
| II | Multi-Tenant Isolation | No | PASS (N/A) | No data access; presentation only. |
| III | Engineering Rigor & Quality Gates | **Yes — primary** | PASS | CSS contract tests + full Vitest regression; ≥80% coverage gate via existing `vite.config.ts`. No backend code → backend coverage unchanged. |
| IV | QBO Integration | No | PASS (N/A) | No Intuit interaction. |
| V | Ledger State Machine | No | PASS (N/A) | No ledger mutations. |
| VI | Polyglot Contract Serialization | No | PASS (N/A) | No API payload types introduced. |
| VII | EF Core Axioms | No | PASS (N/A) | Frontend-only. |
| VIII | Exception Governance & Logging | No | PASS (N/A) | No logging or error paths. |

**Gate result**: All gates PASS. No violations. Complexity Tracking not required.

## Project Structure

### Documentation (this feature)

```text
specs/061-global-typography-rules/
├── plan.md              # This file
├── research.md          # Phase 0 — token naming, placement, verification, dependencies
├── data-model.md        # Phase 1 — typography rule set logical model
├── quickstart.md        # Phase 1 — validation guide
├── contracts/
│   └── global-typography.md   # CSS selector/token contract
├── checklists/
│   └── requirements.md  # Spec quality checklist (from /speckit-specify)
└── tasks.md             # Phase 2 output (created by /speckit-tasks)
```

### Source Code (repository root)

```text
apps/web/
├── src/
│   └── index.css                          # EXTEND — Typography section + comment reference
│       #   h1–h3, .heading-brand → --font-heading, 700, --color-primary-brown
│       #   body, p, label, button, input, td, th → --font-ui
│       #   .text-on-dark → --color-bg-cream
│       #   Remove conflicting font-family/color on governed selectors in legacy blocks
│   └── pages/
│       ├── DashboardHome.tsx              # OPTIONAL — add .text-on-dark to header text if needed
│       └── LoginPage.tsx                  # UNCHANGED markup (h1 inherits globals)
└── tests/
    └── theme/
        └── typography.test.ts             # NEW or EXTEND — CSS contract assertions
```

**Structure Decision**: Follow established `apps/web` theme testing under `tests/theme/`. All typography defaults live in the single global stylesheet already imported by `main.tsx`. Reuse `--font-heading` (not a new `--font-brand` alias) per upstream token registry. Component files change only if header text needs `.text-on-dark` class adoption.

## Complexity Tracking

No constitution violations to justify.

## Post-Design Constitution Re-Check

*Re-evaluated after Phase 1 design artifacts (research.md, data-model.md, contracts/, quickstart.md).*

| # | Principle | Re-Check | Notes |
|---|-----------|----------|-------|
| I | Core Mathematical Axioms | PASS (N/A) | CSS-only. |
| II | Multi-Tenant Isolation | PASS (N/A) | No data layer. |
| III | Engineering Rigor | PASS | `contracts/global-typography.md` defines test contract; quickstart maps SC-001–SC-006 to automated + manual checks. |
| IV | QBO Integration | PASS (N/A) | — |
| V | Ledger State Machine | PASS (N/A) | — |
| VI | Polyglot Contracts | PASS (N/A) | No TS API types. |
| VII | EF Core Axioms | PASS (N/A) | — |
| VIII | Exception Governance | PASS (N/A) | — |

**Re-check result**: All gates PASS post-design. Ready for `/speckit-tasks`.
