# Logout Navigation Contract

## Scope

This is a browser-navigation contract for sign-out. It does not introduce an HTTP endpoint or alter authentication payloads.

## Trigger

The contract applies when either:

1. an authenticated user explicitly chooses Sign out; or
2. the client finishes automatic sign-out after session recovery fails.

## Required Observable Result

After local sign-out cleanup completes:

| Browser value | Required value |
|---|---|
| Pathname | `/` |
| Query string | Empty |
| Fragment | Empty |
| Current rendered screen | Existing sign-in view |
| Prior-location parameters | Absent |
| History operation | Replace current entry |

## Failure Behavior

If the server logout request fails or is unreachable, client-side cleanup and the required browser result still occur.

## Compatibility

- Existing login, registration, and invitation-acceptance request formats are unchanged.
- A direct `/accept-invite?token=…` visit remains supported before logout.
- Post-login navigation does not receive a logout-created return-location value.
