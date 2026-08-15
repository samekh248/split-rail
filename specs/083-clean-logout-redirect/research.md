# Research: Clean Logout Redirect

## Decision 1: Replace the current history entry with the canonical root path

**Decision**: Use the existing route layer’s replacement behavior to navigate to `/` after every completed local sign-out.

**Rationale**: `AuthContext` currently transitions to `unauthenticated` but does not change `window.location`, so `App` shows `LoginPage` at the previous authenticated route. `appRoute.ts` already provides `replacePath`, which both uses `history.replaceState` and notifies route listeners. Replacing (rather than pushing) removes the prior route from the current history position and normalizes away query/hash state.

**Alternatives considered**:

- Push `/` onto history: rejected because Back would immediately return to the preserved deep route.
- Keep the active URL and only render the login page: rejected because it violates the requested clean URL behavior.
- Use a query parameter to carry a return destination: rejected because the feature explicitly prohibits prior-location references after logout.

## Decision 2: Cover explicit logout and automatic session expiry with the same clean-route behavior

**Decision**: Route both `logout` and `handleAutomaticSignOut` through the canonical replacement after client-side cleanup.

**Rationale**: Both code paths leave a user unauthenticated. Supporting only the profile-menu action would leave a confusing deep URL on session expiration, contrary to the feature’s universal clean sign-in outcome.

**Alternatives considered**:

- Only fix explicit logout: rejected because expired sessions produce the same location-context leak.
- Redirect before cleanup: rejected because the application could briefly render an unauthenticated sign-in screen with stale client state.

## Decision 3: Keep server logout best-effort

**Decision**: Preserve the existing behavior where local cleanup and navigation complete even when the logout request fails.

**Rationale**: The existing `finally` path intentionally clears local state to prevent continued access with expired or invalid credentials. The clean URL must not depend on server availability.

**Alternatives considered**:

- Block redirect until the server confirms logout: rejected because a network failure would leave a user on a sensitive deep route and potentially with stale UI state.

## Decision 4: Do not change invite acceptance or post-login routing rules

**Decision**: Preserve current invite and normal post-login navigation behavior; only logout normalizes to `/`.

**Rationale**: `/accept-invite?token=…` is an existing unauthenticated route required to complete an invitation. The feature applies when logout occurs, not to a user opening an invite link directly.

**Alternatives considered**:

- Remove all unauthenticated route query strings globally: rejected because it would break valid invite-token flows and expands scope.
