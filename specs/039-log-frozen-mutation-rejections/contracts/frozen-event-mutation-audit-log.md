# Observability Contract: Frozen-Event Mutation Rejection Audit Log

**Feature**: 039-log-frozen-mutation-rejections  
**Date**: 2026-06-19  
**Type**: Structured application log (not a public HTTP API)

## Purpose

When the platform rejects a mutation because the target event is in `SETTLED` or `RECONCILED` status, it MUST emit a structured audit log entry satisfying this contract. User-facing HTTP responses are unchanged (400 Bad Request with existing `ledger_state` error type).

## Emission trigger

Emit **once per rejected attempt** when `FrozenEventMutationAuditor.RejectIfFrozen` (or equivalent artist-path wrapper) determines `event.status ∈ { SETTLED, RECONCILED }` and throws.

Do **not** emit for:
- Successful mutations on `PRE_SHOW` events
- Sanctioned lifecycle transitions (finalize, reconcile, reversal)
- Rejections due to non-frozen ledger rules

## Log level

`Warning`

## Message template

```
Rejected frozen event mutation: {Operation} on event {EventId} at venue {VenueId} by user {UserId} (status {EventStatus})
```

When `UserId` is unavailable (unauthenticated edge case), omit the user segment or log `UserId` as null — do not fabricate an identity.

## Structured properties

| Property | Type | Example | Required |
|----------|------|---------|----------|
| `Operation` | string | `update_line_item` | Yes |
| `EventId` | guid | `a1b2c3d4-...` | Yes |
| `VenueId` | guid | `e5f6g7h8-...` | Yes |
| `UserId` | guid? | `i9j0k1l2-...` | When authenticated |
| `EventStatus` | string | `SETTLED` or `RECONCILED` | Yes |

## Allowed operation values

| Value | Mutation blocked |
|-------|------------------|
| `update_event_metadata` | Event title/date/tag update |
| `delete_event` | Event deletion |
| `lock_budget` | Budget lock attempt |
| `create_line_item` | Line item creation |
| `update_line_item` | Line item update |
| `delete_line_item` | Line item deletion |
| `create_artist` | Artist creation |
| `update_artist` | Artist update |
| `delete_artist` | Artist deletion |
| `recalculate` | Settlement payout recalculation |
| `qbo_sync_recompute` | QBO sync recompute on SETTLED event or non-actuals field change during sync |

New mutation paths added in future features MUST extend this list if they guard against frozen events.

## Prohibited log content

The following MUST NOT appear in the audit log entry or its structured properties:

- Signature payloads (`artist_signature_data`, base64 stroke vectors)
- JWT access or refresh tokens
- QuickBooks tokens or client secrets
- Database connection strings
- Raw HTTP request or response bodies
- Financial field values (proforma, settlement, payout amounts)
- Cleartext user PII (email, display name, phone)

## HTTP response (unchanged — reference only)

Rejected mutations continue to return:

- **400 Bad Request**
- Error type: `ledger_state`
- Detail: existing message per mutation path (see [data-model.md](../data-model.md))

`ExceptionHandlerMiddleware` may still log `{ExceptionType}` separately; the audit entry defined here is the compliance-grade record.

## Verification contract (automated)

Tests MUST assert for each covered path:

1. Exactly one Warning log entry matches the message template for the rejection.
2. Structured properties include `Operation`, `EventId`, `VenueId`, `EventStatus`.
3. When authenticated, `UserId` matches the acting user.
4. Captured log text contains none of the prohibited content listed above.

Minimum path coverage (FR-011):

| Status | Required paths | Verified |
|--------|----------------|----------|
| `SETTLED` | event metadata update, line-item update, artist update | Yes — `FrozenEventMutationAuditTests` |
| `RECONCILED` | line-item update, artist update | Yes — `FrozenEventMutationAuditTests` |

All operation labels (`update_event_metadata`, `delete_event`, `lock_budget`, `create_line_item`, `update_line_item`, `delete_line_item`, `create_artist`, `update_artist`, `delete_artist`) verified on `SETTLED` events via integration tests (2026-06-19).

## GCP Cloud Logging query example

```
jsonPayload.Operation="update_line_item"
jsonPayload.EventId="<event-guid>"
severity="WARNING"
```

(Field names may vary by ASP.NET Core JSON formatter configuration; structured properties should remain searchable.)
