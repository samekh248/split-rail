# Route & Error Contract Audit

**Date**: 2026-06-15  
**Feature**: 005-e2e-lifecycle-leak-testing (FR-018)

## Summary

All controllers use the uniform `api/` route prefix (non-versioned, consistent with features 002–004). Error responses flow through `ExceptionHandlerMiddleware` and serialize as `ErrorResponse { type, detail, errors? }`.

## Controller route inventory

| Controller | Route prefix | Notes |
|------------|--------------|-------|
| AuthController | `api/auth` | ✓ |
| OrganizationsController | `api/organizations` | ✓ |
| VenuesController | `api/venues` | ✓ |
| EventsController | `api/venues/{venueId}/events` | ✓ |
| LedgerController | `api/venues/{venueId}/events/{eventId}` | ✓ |
| SettlementController | `api/venues/{venueId}/events/{eventId}` | ✓ |
| QboSyncController | `api/venues/{venueId}/events/{eventId}` + mappings | ✓ |
| QboOAuthController | `api/venues/{venueId}/qbo` + callback | ✓ |
| UsersController | `api/users` | ✓ |
| RolesController | `api/roles` | ✓ |
| InvitationsController | `api/invitations` | ✓ |
| TestSeedingController | `api/test-seed` | Preview/test only |

## Error contract

All unhandled domain exceptions map to consistent HTTP status + `ErrorResponse.type`:

- `401` → `authentication`
- `403` → `authorization`
- `400` → `validation` / `ledger_state`
- `404` → `not_found`
- `409` → `conflict` / `concurrency`
- `502` → `qbo_*` / `settlement_archive`

## Findings

**No inconsistencies requiring code changes.** All controllers follow established conventions. Test seeding routes are gated to Preview/Test via `PreviewOptions.EnableTestSeeding`.

## Status

PASS — FR-018 satisfied by verification.
