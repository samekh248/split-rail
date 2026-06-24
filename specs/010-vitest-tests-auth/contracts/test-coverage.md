# Test Coverage Contract: Auth Layouts & Venue Selector

**Feature**: 010-vitest-tests-auth
**Date**: 2026-06-16

This is the UI/test contract for the feature: it maps each functional requirement and acceptance scenario to the verification that must exist. "Suite" entries name the target test file(s) under `apps/web/tests/**`; existing files are extended/consolidated, new ones added only where a gap exists. Every row must end with a passing assertion that executes the real source module.

## Coverage matrix

| ID | Requirement / scenario | Target under test | Suite (extend or add) | Key assertions |
|----|------------------------|-------------------|------------------------|----------------|
| C1 | FR-001 login renders required labeled fields + submit | `LoginForm`, `LoginPage` | `auth/LoginForm.test.tsx`, `auth/LoginPage.test.tsx` | email + password fields labeled; "Sign in" submit present |
| C2 | FR-002 register renders exactly email/password/org + submit | `RegisterForm`, `RegisterPage` | `auth/RegisterForm.test.tsx`, `auth/RegisterPage.test.tsx` | exactly the three labeled fields; "Create account" submit; no confirm-password |
| C3 | FR-003 empty submit blocks + inline validation | `LoginForm`, `RegisterForm` | `auth/LoginForm.test.tsx`, `auth/RegisterForm.test.tsx` | required messages shown; `onSubmit` not called |
| C4 | FR-004 malformed email / weak password messages | `validation`, forms | `auth/validation.test.ts`, form suites | each invalid input → its specific message |
| C5 | FR-005 form-level error distinct + announced | forms, `AuthContext` | form suites, `auth/AuthContext.*.test.tsx` | `role="alert"` for form error; generic, no PII (Constitution VIII) |
| C6 | FR-011 pending disables submit (no duplicate submit) | forms, `AuthContext` | form suites | submit disabled + progress label while `pending` |
| C7 | FR-006 venue selector renders provided list verbatim; no client filtering | `VenueSwitcher` | `venue/VenueSwitcher.test.tsx` | scoped list rendered as-is; out-of-scope venue never appears |
| C8 | FR-007 select updates active venue; active indicated | `VenueSwitcher` | `venue/VenueSwitcher.test.tsx` | choosing option updates current; one `aria-selected` option |
| C9 | FR-008 single-venue and no-venue states | `VenueSwitcher`, `DashboardHome` | `venue/VenueSwitcher.test.tsx`, `pages/DashboardHome.test.tsx` | single-venue display; empty → selector hidden + dashboard empty state |
| C10 | FR-009 keyboard operability (open + select) | `VenueSwitcher` | `venue/VenueSwitcher.test.tsx` | Enter/ArrowDown open + select via keyboard; accessible name present |
| C11 | FR-010 existing role-gated control hidden/shown by permission | `SyncNowButton`, `FinalizeSettlementPanel` | `qbo/SyncNowButton.test.tsx`, `settlement/FinalizeSettlementPanel.test.tsx` | absent/disabled when permission false; present when true |
| C12 | FR-010a page/container-level wiring | `LoginPage`, `RegisterPage`, `DashboardHome` | `auth/LoginPage.test.tsx`, `auth/RegisterPage.test.tsx`, `pages/DashboardHome.test.tsx` | page wires context→form; dashboard hosts switcher; loading/error/retry states |
| C13 | Edge: server-failure vs validation distinction | forms + context | form + context suites | inline field error ≠ form-level error path |
| C14 | Edge: remembered venue no longer accessible → fallback | `VenueContext`, `activeVenueStorage` | `venue/VenueContext.test.tsx`, `venue/activeVenueStorage.test.ts` | stale id falls back to default accessible venue, no throw |
| C15 | Edge: venue list load failure → error + retry | `DashboardHome` | `pages/DashboardHome.test.tsx` | error state with retry triggers refetch |
| C16 | FR-012/FR-013 + SC-005 suites pass in CI and meet ≥80% gate | full `apps/web` suite | CI (`vitest run --coverage`) | thresholds (lines/branches/functions/statements ≥80) satisfied |

## Contract rules

1. **Real source execution**: Each row's assertions must render/import the actual module so coverage is attributed; stub only the network/storage boundary.
2. **Contract types only**: Fixtures import shapes from `@/types/generated-api` (Constitution VI).
3. **Read-only QBO**: C11's sync test must not simulate any QBO write (Constitution IV).
4. **Scope fidelity**: C7 must prove the client does not filter; it renders exactly what the (stubbed) server returns (Constitution II).
5. **Determinism**: No row may rely on real timers, real network, or cross-test state; reset storage + unstub globals per test.
6. **Consolidation**: When extending an existing file already covering a row, tighten/de-duplicate rather than adding a parallel test.

## Definition of Done (verification)

- All matrix rows have at least one passing test (SC-001, SC-004).
- `vitest run --coverage` passes with thresholds met (C16 / SC-005).
- Suites run deterministically across consecutive runs (SC-002) and within ~2 minutes locally (SC-003).
- An intentionally injected regression (remove a field, leak an out-of-scope venue, expose a gated control) fails at least one test (SC-004).
