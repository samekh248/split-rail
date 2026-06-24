# Implementation Plan: Brand Web Fonts (Zilla Slab + Inter)

**Branch**: `060-brand-web-fonts` | **Date**: 2026-06-24 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/060-brand-web-fonts/spec.md` (Linear SPLR-80, milestone M1)

## Summary

Load **Zilla Slab (700)** and **Inter (400, 500, 700)** from Google Fonts using a **single** mechanism (`@import` at the top of `index.css`), define canonical font tokens `--font-brand` and `--font-ui` with brand-guide fallback stacks alongside existing color tokens in `:root`, wire default `body` text to `--font-ui`, and extend the **production Content Security Policy** (plus `index.html` meta parity) to allow `fonts.googleapis.com` and `fonts.gstatic.com`. Ship Vitest contract tests for font tokens, Google Fonts import URL, body wiring, and CSP allowlists.

This is a **frontend-only** slice (`apps/web`). No backend API, DTO, or database changes. Completes the typography half of M1 (color tokens from SPLR-79 / `059-mhc-design-tokens`) and unblocks SPLR-81 (global typography rules).

**Branch note**: Partial font work exists from parent epic (`058-brand-theming-mhc`) — `@import` URL, `--font-heading` / `--font-ui`, and `typography.test.ts` are present but incomplete: wrong token name (`--font-heading` vs SPLR-80 `--font-brand`), incomplete fallback stacks, and production CSP lacks `style-src` / `font-src` for Google Fonts (fonts blocked when HTTP header CSP applies in production).

## Technical Context

**Language/Version**: TypeScript 5.7 + React 18.3 (`apps/web`), built with Vite 6. No backend code changes.

**Primary Dependencies**: Plain CSS (`apps/web/src/index.css`), Google Fonts CDN (`fonts.googleapis.com`, `fonts.gstatic.com`), `apps/web/index.html` (preconnect hints + dev meta CSP), `apps/web/src/security/contentSecurityPolicy.ts` (production CSP constant synced to `firebase.json`).

**Storage**: CSS custom properties on `:root`; external font files cached by browser from Google CDN. No server persistence.

**Testing**: Vitest 2 — extend `apps/web/tests/theme/typography.test.ts`; extend `apps/web/src/theme/tokens.ts` font mirror + `requiredCssVariables`; extend `apps/web/tests/security/contentSecurityPolicy.test.ts` for font provider directives. Coverage enforced at ≥80% lines/functions/branches/statements via existing `vite.config.ts` thresholds on modified theme/security modules.

**Target Platform**: Modern evergreen browsers (desktop + mobile), Vite SPA; Firebase Hosting production with HTTP `Content-Security-Policy` header.

**Project Type**: Web application — frontend typography foundation only.

**Performance Goals**: `display=swap` on Google Fonts URL (already present) to limit invisible text; `preconnect` hints in `index.html` retained for faster font handshake. Manual auth-page FOUT check per FR-009.

**Constraints**: Constitution VI — no new hand-authored API payload types (N/A). Constitution III — ≥80.0% line/branch coverage on frontend for all new/modified source files; backend N/A. Exactly **one** font-loading declaration (`@import` in CSS **or** `<link>` in HTML — not both). Font tokens MUST live in `:root` alongside color tokens (FR-004). Fallback stacks MUST match brand guide (FR-006). Component-level heading/body mapping rules are **out of scope** (SPLR-81). No Tailwind.

**Scale/Scope**: 2 font tokens + 1 `@import` line + CSP directive additions; 1 CSS file; 1 TS policy module; 1 HTML file (preconnect/meta sync); 2–3 Vitest modules extended; ~6 `--font-heading` references renamed to `--font-brand` in `index.css`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Applicable? | Status | Notes |
|---|-----------|-------------|--------|-------|
| I | Core Mathematical Axioms | No | PASS (N/A) | No monetary computation. |
| II | Multi-Tenant Isolation | No | PASS (N/A) | No database access. |
| III | Engineering Rigor & Quality Gates | **Yes — primary** | PASS | Extend `typography.test.ts`, `tokens.ts`, `contentSecurityPolicy.test.ts`; ≥80% coverage gate via `vite.config.ts`. |
| IV | QBO Integration | No | PASS (N/A) | No QuickBooks interaction. |
| V | Ledger State Machine & Immutability | No | PASS (N/A) | Visual-only typography layer. |
| VI | Polyglot Contract Serialization | No | PASS (N/A) | No API types. |
| VII | EF Core Axioms | No | PASS (N/A) | Frontend-only. |
| VIII | Exception Governance & Logging Privacy | No | PASS (N/A) | No logging changes. |
| IX | UI Iconography | No | PASS (N/A) | No icon changes. |
| X | Dual-Platform Operator Scripts | No | PASS (N/A) | No deploy scripts. |

**Gate result (pre-design)**: All gates PASS. No violations.

**Gate result (post-design)**: Unchanged. Artifacts define CSS font token contracts, CSP allowlist updates, and Vitest regression only.

## Project Structure

### Documentation (this feature)

```text
specs/060-brand-web-fonts/
├── plan.md              # This file
├── research.md          # Phase 0 — loading mechanism, token naming, CSP, FOUT
├── data-model.md        # Phase 1 — font token catalog
├── quickstart.md        # Phase 1 — manual + automated validation for SPLR-80
├── contracts/
│   └── brand-fonts.md   # Font token + CSP + Vitest contract
├── checklists/
│   └── requirements.md  # Spec quality checklist (from /speckit-specify)
└── tasks.md             # Phase 2 output (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
apps/web/
├── index.html                              # SYNC — meta CSP font directives; keep preconnect
├── firebase.json                           # SYNC — production CSP header (via contract literal)
├── src/
│   ├── index.css                           # EXTEND — @import URL, --font-brand, --font-ui stacks
│   ├── main.tsx                            # UNCHANGED — imports index.css
│   ├── security/
│   │   └── contentSecurityPolicy.ts        # EXTEND — style-src + font-src for Google Fonts
│   └── theme/
│       └── tokens.ts                       # EXTEND — fonts.brand/ui stacks + requiredCssVariables
└── tests/
    ├── theme/
    │   └── typography.test.ts              # EXTEND — token names, stacks, import URL, body wiring
    └── security/
        └── contentSecurityPolicy.test.ts   # EXTEND — font provider directives in contract literal
```

**Structure Decision**: Keep font loading via `@import` at line 1 of `index.css` (single mechanism). Retain `preconnect` `<link>` tags in `index.html` as performance hints only — they do not load fonts and do not violate FR-007. Rename `--font-heading` → `--font-brand` per SPLR-80 across `index.css` and tests.

## Complexity Tracking

> No constitution violations. Table not required.
