# Implementation Plan: Clean Logout Redirect

**Branch**: `083-clean-logout-redirect` | **Date**: 2026-08-15 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/083-clean-logout-redirect/spec.md`

## Summary

Make every sign-out converge on the canonical unauthenticated entry URL (`/`) rather than merely changing the authentication state while retaining the active SPA route. Reuse the route layer’s history replacement behavior so an explicit sign-out and automatic expired-session sign-out clear path, query, and fragment context without adding a return-location parameter. No API, data, or authentication contract change is required.

## Technical Context

**Language/Version**: TypeScript 5.7, React 18.3, Vite SPA

**Primary Dependencies**: Existing `AuthContext`, `appRoute` history helpers, React Query query client, Vitest, React Testing Library

**Storage**: N/A; logout already clears browser session credentials, active-venue state, and in-memory cached data

**Testing**: Vitest + React Testing Library for route replacement and AuthContext logout flows; ≥80% line/branch coverage on changed frontend code (Constitution III). No backend or Playwright work is required because this is a single-user client-navigation change.

**Target Platform**: Browser-based web application

**Project Type**: Web application; frontend-only vertical slice in `apps/web`

**Performance Goals**: Navigation begins immediately after local session cleanup; no extra network request beyond the existing best-effort logout request

**Constraints**: Canonical logout destination is `/`; navigation must replace—not push—the active history entry; query and fragment values must be removed; automatic session-expiry messaging remains available; existing invite-token flow is unchanged until the user signs out; no manually authored API payload types

**Scale/Scope**: One shared sign-out navigation helper or route call, two AuthContext paths (explicit and automatic), focused route/auth tests; no server, schema, or styling changes

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Relevance | Status |
|---|---|---|
| I. Core Mathematical Axioms | No monetary calculations. | N/A |
| II. Multi-Tenant Isolation | No data retrieval or mutation changes. | N/A |
| III. Engineering Rigor | Add focused Vitest + RTL coverage and retain ≥80% coverage on changed frontend code. | PASS |
| IV. QBO Integration | No QBO behavior. | N/A |
| V. Ledger State Machine | No ledger mutations. | N/A |
| VI. Polyglot Contract | No API contract changes or handwritten API types. | PASS |
| VII. EF Core Axioms | No backend persistence work. | N/A |
| VIII. Exception Governance | Existing best-effort logout semantics remain; local cleanup and redirect run even if server logout fails. | PASS |
| IX. UI Iconography | No UI icon changes. | N/A |
| X. Dual-Platform Operator Scripts | No operator scripts. | N/A |

**Post-design re-check**: PASS. The design stays within the existing SPA route and authentication boundaries.

## Project Structure

### Documentation (this feature)

```text
specs/083-clean-logout-redirect/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── logout-navigation.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Created later by /speckit-tasks
```

### Source Code (repository root)

```text
apps/web/
├── src/
│   ├── auth/
│   │   └── AuthContext.tsx                    # Modify explicit and automatic sign-out completion
│   └── lib/
│       └── appRoute.ts                        # Reuse or expose canonical replace-navigation helper
└── tests/
    ├── auth/
    │   └── AuthContext.sessionExpiry.test.tsx # Extend explicit and automatic sign-out coverage
    └── lib/
        └── appRoute.test.ts                   # Verify replacement normalizes URL state
```

**Structure Decision**: Keep ownership in the existing frontend route and auth layers. `AuthContext` remains responsible for session teardown; `appRoute` remains responsible for browser-history updates. The feature adds no backend layer.

## Implementation Phases

### Phase A — Canonical route transition (P1)

1. Establish or reuse a route helper that replaces the current history entry with `/`.
2. Ensure the helper removes any pathname, query string, and hash from the signed-out location.
3. Test replacement semantics so browser back does not expose a retained authenticated deep route as the latest history entry.

### Phase B — Explicit and automatic sign-out integration (P1)

1. Invoke the canonical replace-navigation only after local session cleanup has started, including when the logout request rejects.
2. Apply the same behavior to the automatic session-expiry handler.
3. Preserve the explicit-vs-expired state distinction: explicit logout clears session-expired messaging; automatic logout enables it.

### Phase C — Verification (P1–P2)

1. Cover logout from a deep route with path, query, and fragment state.
2. Cover failed server logout to prove cleanup and clean navigation still occur.
3. Confirm login continues through the normal authenticated entry path with no stored return location.
4. Run targeted Vitest tests, typecheck, and coverage as required by the project gate.

## Complexity Tracking

> No constitution violations requiring justification.
