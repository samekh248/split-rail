# Quickstart: Validate Clean Logout Redirect

## Prerequisites

- Start the web application using the project’s normal development workflow.
- Use a test account with access to at least one authenticated area.
- Open browser developer tools only if needed to inspect the address bar or history behavior.

## Validation Scenarios

### 1. Sign out from a deep workspace route

1. Sign in and open an event workspace or festival itinerary route.
2. Add a harmless query parameter and fragment in the browser address bar if the route supports it.
3. Open the account menu and select Sign out.

**Expected**

- The sign-in view appears.
- The address bar is exactly the root sign-in location (`/`).
- No event, venue, festival, query, or fragment reference remains.

### 2. Sign out from a settings or booking page

1. Sign in and navigate to Settings or Booking.
2. Select Sign out.

**Expected**

- The same canonical sign-in URL and sign-in view are shown.

### 3. Server logout failure still clears the location

1. Simulate an unavailable or failing logout request in the existing auth test environment.
2. Trigger explicit logout from a deep route.

**Expected**

- Local signed-in state is cleared.
- The sign-in view appears at `/`.
- The prior route is not retained in the URL.

### 4. Automatic session expiry

1. Start from a signed-in deep route.
2. Simulate a request whose session refresh cannot be completed.

**Expected**

- The existing session-expired indication is available on sign-in.
- The browser URL is `/` with no previous-location detail.

### 5. Sign in after logout

1. From the clean sign-in screen, authenticate with valid credentials.

**Expected**

- The normal authenticated entry experience appears.
- The browser did not use a logout-created return destination.

## Automated Checks

Run the focused auth and route tests, then the frontend typecheck and the project-required coverage command. Refer to [logout-navigation.md](./contracts/logout-navigation.md) for exact browser-state assertions and [data-model.md](./data-model.md) for the expected transition behavior.
