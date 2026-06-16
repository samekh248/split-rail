# Phase 0 Research: Registration & Organization Onboarding Flow

All unknowns were resolved by grounding the spec against the existing backend and the 006 frontend. **No NEEDS CLARIFICATION remain.** Backend requires **no changes**.

## Decision 1 — Detect "authenticated but org-less" via `GET /api/users/me`

**Decision**: Drive all post-authentication routing off `UserProfileResponse` from `GET /api/users/me`. `organization == null` ⇒ route to the organization-creation step; `organization != null` ⇒ route to the dashboard. The same response's `role` reflects the **Admin** assignment.

**Rationale**:
- `UserProfileResponse.organization` and `.role` are **nullable** by contract (`apps/api/DTOs/Users/UserDtos.cs`; `generated-api.ts` `organization?`/`role?`). `UserService.GetProfileAsync` explicitly returns `(…, null, null, [])` when the tenant context has no `OrganizationId` (the user has no org mapping). This is a first-class, server-authoritative signal — no inference needed (FR-006a).
- The access token only includes an `org_id` claim when a `UserOrganizationMapping` exists (`TokenService.GenerateAccessToken`), so `/users/me` after a token issued pre-org returns a null organization, exactly matching the org-less case.
- A `useUserProfile()` query already exists (`src/api/user.ts`) consuming the generated type — reuse it (Constitution VI).

**Alternatives considered**:
- `GET /api/organizations/current` — **rejected** as the primary signal: it *throws* `AuthorizationException` ("User is not a member of an organization") for org-less users (`OrganizationService.GetCurrentOrganizationAsync`), forcing error-driven control flow. `/users/me` returns a clean nullable instead.
- Decoding the JWT client-side for an `org_id` claim — **rejected**: brittle, duplicates server logic, and risks treating a stale token as truth.

## Decision 2 — Silent token refresh on application load

**Decision**: On load, if an access token is present, attempt `GET /users/me`. On `401`, call `POST /api/auth/refresh` with the stored refresh token, persist the returned `AuthResponse` tokens, and retry `/users/me` once. If refresh fails (or no refresh token), clear tokens and show the login screen.

**Rationale**:
- `POST /api/auth/refresh` exists (`AuthController.Refresh` → `AuthService.RefreshAsync` → `TokenService.RefreshAsync`): it validates the stored, non-revoked, unexpired refresh token, **rotates** it (marks old revoked, issues a new pair), and re-includes `org_id`. Refresh tokens live `RefreshTokenExpirationDays`, far longer than the access token, enabling persistence across restart (FR-007, FR-008a).
- Single retry avoids loops; a failed refresh is a definitive "session over" signal → clean unauthenticated state (US3 scenario 3).

**Alternatives considered**:
- Trust token presence without validation (current 006 behavior) — **rejected**: an expired access token would render a broken dashboard whose first data call 401s (violates FR-008a / US3#3).
- Global `fetch` interceptor that refreshes on any 401 mid-session — **deferred**: valuable but broader than this feature; load-time bootstrap is the in-scope slice. Noted as a future enhancement so as not to expand scope.

## Decision 3 — Token re-issue after organization creation

**Decision**: After a successful `POST /api/organizations`, obtain a fresh token that carries `org_id` before treating the user as fully onboarded — via either a re-login (already done in 006) or a refresh call — then load `/users/me` to confirm `organization` is present and route to the dashboard.

**Rationale**: The token minted at login/registration (pre-org) has no `org_id` claim; org-scoped endpoints depend on it (`TokenService.GetPrimaryOrganizationIdAsync`). Re-issuing after mapping creation is mandatory for tenant scoping (FR-016, Constitution II). 006 already re-logs in after `createOrganization`; this plan keeps that and adds the `/users/me` confirmation as the routing source of truth.

**Alternatives considered**: Assuming the original token is org-scoped — **rejected** (it is not). A backend transactional register-with-org endpoint returning an org-scoped token — **rejected** for this slice (see Decision 7).

## Decision 4 — One-time post-onboarding welcome modal (transient, in-memory)

**Decision**: Track a transient `justOnboarded` boolean in `AuthContext` (set true only when the onboarding orchestration completes successfully). `App.tsx` mounts `WelcomeModal` on the first authenticated render while `justOnboarded` is true; dismissing it clears the flag. The flag is **not** persisted.

**Rationale**: FR-005a requires the modal only on the first post-onboarding landing and explicitly **not** for ordinary returning logins. In-memory transient state satisfies this precisely and keeps returning-login renders modal-free. A reload immediately after onboarding (before dismissal) simply won't reshow it — acceptable per the spec ("first post-onboarding landing").

**Alternatives considered**:
- Persisting a "welcomed" flag (localStorage / server profile field) — **rejected**: adds storage/DTO surface for a one-shot UI cue and would require a backend field (Constitution VI churn). Out of scope.

## Decision 5 — Dashboard empty state for a brand-new organization

**Decision**: Introduce `DashboardHome` that queries `GET /api/venues` (`useVenues()`). If the list is empty, render a friendly empty-state workspace (heading + "no venues yet" guidance) instead of `EventLedgerPage`. If venues exist, preserve the existing ledger behavior. This removes the current hardcoded-GUID `EventLedgerPage` render that would 404 for a new org.

**Rationale**: The clarified scope (Session 2026-06-16) requires the existing dashboard route to render a **valid, non-erroring** empty state for a new org (FR-005). `GET /api/venues` is org-scoped and returns `VenueResponse[]`; an empty array is the new-org signal. Today `App.tsx` passes default placeholder `venueId`/`eventId` to `EventLedgerPage`, which for a new org yields a "Failed to load ledger" error — not acceptable.

**Alternatives considered**:
- Building venue/event creation here — **rejected**: out of scope (the spec excludes it); the empty state only needs to be welcoming and non-erroring.
- Keeping the placeholder-id ledger render — **rejected**: it errors for new orgs.

## Decision 6 — Session storage mechanism (localStorage) and persistence durability

**Decision**: Keep the existing `localStorage`-backed `tokenStorage.ts` (`accessToken`, `refreshToken`). This already satisfies FR-007 (persist until token expiry or explicit sign-out, surviving full browser close/restart).

**Rationale**: `localStorage` persists across tabs and restarts until cleared; `clearTokens()` on sign-out (already wired in 006 `logout`) satisfies FR-009. The clarified answer (persist across restart) maps directly to `localStorage`, so no change is needed. Refresh-token rotation (Decision 2) bounds the effective lifetime.

**Alternatives considered**: `sessionStorage` — **rejected** (cleared on tab close, contradicts the clarification). HttpOnly cookies — **rejected**: requires backend/CORS/CSRF changes; out of scope and contrary to the established `Authorization: Bearer` convention in `client.ts`.

## Decision 7 — Keep onboarding as a client-orchestrated multi-call sequence (no new backend endpoint)

**Decision**: Implement onboarding as the existing client orchestration (`register → login → createOrganization → re-issue token → load profile`) with explicit partial-failure recovery, rather than introducing a backend "register-with-organization" endpoint.

**Rationale**: Keeps the feature frontend-only with zero DTO/swagger churn (Constitution VI) and reuses proven 006 code. Partial failure (account created, org not) leaves the user authenticated-but-org-less, which the profile-driven state machine (Decision 1) naturally routes to the org-creation step — retryable without the password and without duplicate orgs (FR-012, FR-013). Idempotency on retry is inherent: a second `POST /api/organizations` only runs if the first did not succeed, and the user creates exactly one org.

**Alternatives considered**: A transactional backend endpoint returning org-scoped tokens — **rejected for this slice** (backend change, contract churn) but **recorded as a future simplification** that would make onboarding atomic and remove the re-issue step.

## Decision 8 — Testing approach (Constitution III)

**Decision**: Unit/component tests with Vitest + RTL for the bootstrap (refresh success/failure, resolving state), the profile-driven phase machine (org present vs null, `justOnboarded`), the register orchestration + partial-failure recovery, the welcome modal (once-only, dismiss, absent on returning login, focus/a11y), and the dashboard empty state. A Playwright E2E spec in `tests/e2e` covers the full new-user onboarding → Admin → dashboard journey plus returning login-only and reload persistence, with intercepted login/refresh responses.

**Rationale**: Constitution III mandates automated verification for every component/route and a Playwright E2E for tenant-isolation/multi-user workflows; onboarding *creates* a tenant, so it qualifies. Coverage ≥80% is enforced by the existing `vite.config.ts` v8 thresholds.

**Alternatives considered**: Unit tests only — **rejected**: the cross-step onboarding journey and tenant provisioning need an E2E to satisfy Constitution III and SC-001/SC-002.
