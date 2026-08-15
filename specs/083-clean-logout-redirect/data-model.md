# Data Model: Clean Logout Redirect

## Overview

This feature adds no persisted entities, API payloads, or database fields. It defines one transient browser-navigation outcome that is produced after client session teardown.

## Transient States

### Authenticated session

| Attribute | Meaning |
|---|---|
| Authentication phase | User is signed in and can view authenticated routes. |
| Current browser location | May be a dashboard, event, festival, settings, or other deep route, including query/fragment state. |

### Signed-out session

| Attribute | Meaning |
|---|---|
| Authentication phase | User is unauthenticated. |
| Cached profile and workspace state | Cleared. |
| Canonical browser location | `/` only; no query string, fragment, or prior route reference. |
| Screen | Existing sign-in view. |

## State Transitions

| Trigger | From | To | Required outcome |
|---|---|---|---|
| User selects Sign out | Authenticated session | Signed-out session | Local session is cleared and the current history entry is replaced by `/`. |
| Session expires and recovery cannot restore it | Authenticated session | Signed-out session | Local session is cleared, expiry feedback remains available, and the current history entry is replaced by `/`. |
| Logout network request fails | Authenticated session | Signed-out session | Same local cleanup and clean `/` navigation still occur. |
| User logs in | Signed-out session | Authenticated session | Existing normal post-login routing applies; no pre-logout location is restored from the URL. |

## Validation Rules

- The signed-out location must have pathname `/`, empty search, and empty hash.
- No return/redirect/from-style parameter may be created or retained by logout.
- Direct unauthenticated invite links remain valid until a logout transition occurs.
