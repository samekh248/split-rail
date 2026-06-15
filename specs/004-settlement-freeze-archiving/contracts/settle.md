# Contract: Finalize Settlement

Atomically freezes an event: validates state + signature, snapshots financials, renders the immutable PDF, uploads it to the WORM bucket, and transitions the event to `SETTLED`.

## Endpoint

```
POST /api/venues/{venueId}/events/{eventId}/settle
```

- **Auth**: Bearer JWT required.
- **Permission**: `can_sign_settlement` (`RequirePermission(PermissionNames.SignSettlement)`).
- **Scope**: caller must have access to `{venueId}` (venue scope) within their authenticated organization.
- **Route convention**: matches existing `api/venues/{venueId:guid}/events/{eventId:guid}/...` (spec's `/api/v1/...` normalized to project convention).

## Request body

```jsonc
{
  // base64-encoded JSON vector array of the touchscreen signature (>= 1 stroke)
  "signatureData": "eyJzdHJva2VzIjpbW3sieCI6MTAsInkiOjIwfV1dfQ==",
  // explicit confirmation flag from the finalize dialog
  "confirmed": true
}
```

DTO `FinalizeSettlementRequest(string SignatureData, bool Confirmed)`.

## Responses

| Status | Body | When |
|--------|------|------|
| `200 OK` | `SettlementResultDto` | Settlement frozen successfully |
| `400 Bad Request` | `ErrorResponse` (`validation` / `ledger_state`) | Missing/malformed signature, budget not locked, not `PreShow`, or `confirmed=false` |
| `403 Forbidden` | `ErrorResponse` (`authorization`) | Missing `can_sign_settlement` |
| `404 Not Found` | `ErrorResponse` (`not_found`) | Event/venue not found or out of tenant scope |
| `409 Conflict` | `ErrorResponse` (`concurrency`) | Lost a concurrent finalize race (another request already settled) |
| `502 Bad Gateway` | `ErrorResponse` (`settlement_archive`) | PDF upload failed — event left **not** `SETTLED` (atomicity) |

### `200` body — `SettlementResultDto`

```jsonc
{
  "eventId": "…",
  "status": "SETTLED",
  "settledAt": "2026-06-15T03:12:45Z",
  "settledByUserId": "…",
  "settlementPdfAvailable": true,
  "editability": { "proforma": "read-only", "settlement": "read-only", "qboActual": "read-only" }
}
```

> The raw signature payload and the bucket object path are **never** returned in this response or written to logs. The PDF is retrieved separately via the signed-URL endpoint.

## Behavior (atomic)

1. Resolve tenant + venue scope; load tracked event.
2. Validate `status == PreShow`, `is_budget_locked == true`, `confirmed == true`, and signature (≥1 stroke). On failure → 400 (no side effects).
3. Snapshot `financial_line_items` (settlement values) + `event_artists.calculated_net_payout`.
4. Render PDF (signature + financial block + deal math) via `SettlementPdfRenderer`.
5. Upload PDF to WORM bucket at `settlements/{org}/{venue}/{event}/{settlementId}.pdf`. On failure → 502, event unchanged.
6. In a DB transaction set `artist_signature_data`, `settled_at`, `settled_by_user_id`, `settlement_pdf_url`, `status = SETTLED`; commit with `xmin` concurrency check. Loser → 409.

## Test assertions

- Happy path: `200`; event `status=SETTLED`, `settled_at`/`settled_by_user_id` set, `artist_signature_data` stored, `settlement_pdf_url` non-null.
- `403` for role without `can_sign_settlement`; `404`/`403` for out-of-scope venue.
- `400` for empty/malformed signature, unlocked budget, already-settled event.
- Atomicity: forced archive-store failure → `502` and event remains not `SETTLED` with null `settlement_pdf_url`.
- Concurrency: two parallel finalizes → one `200`, one `409`; exactly one stored object.
