# Contract: Retrieve Settlement PDF (signed URL)

Returns a short-lived, signed download URL for the archived settlement PDF. The WORM bucket stays private; no permanent public link is ever exposed.

## Endpoint

```
GET /api/venues/{venueId}/events/{eventId}/settlement-pdf
```

- **Auth**: Bearer JWT required.
- **Permission**: `can_view_financials` (`RequirePermission(PermissionNames.ViewFinancials)`).
- **Scope**: caller must have access to `{venueId}` within their authenticated organization.

## Responses

| Status | Body | When |
|--------|------|------|
| `200 OK` | `SettlementPdfLinkDto` | Event is settled and a PDF exists |
| `403 Forbidden` | `ErrorResponse` (`authorization`) | Missing `can_view_financials` |
| `404 Not Found` | `ErrorResponse` (`not_found`) | Event/venue out of scope, or no current settlement PDF (`settlement_pdf_url` null) |

### `200` body — `SettlementPdfLinkDto`

```jsonc
{
  "url": "https://storage.googleapis.com/…&X-Goog-Signature=…",
  "expiresAt": "2026-06-15T03:27:45Z"   // ~15 minutes out (configurable)
}
```

## Behavior

1. Resolve tenant + venue scope; load event (`.AsNoTracking()`).
2. If `settlement_pdf_url` is null → 404.
3. Mint a **V4 signed URL** (default TTL 15 min) for the stored object via `ISettlementArchiveStore.CreateSignedUrlAsync`.
4. Return the signed URL + expiry. The raw object path is not returned.

## Test assertions

- `404` when the event has no settlement PDF.
- `403` for a role lacking `can_view_financials`; `404` for out-of-scope venue.
- `200` returns a non-empty URL and a future `expiresAt`; the archive-store fake records the signed-URL request for the correct object.
