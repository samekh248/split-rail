# Phase 1 Data Model: Night-of Settlement Freeze Pipeline & Immutable Archiving

This feature mostly **consumes and extends** existing entities from SPLR-17. Schema deltas are intentionally small; the bulk of the work is the atomic transition pipeline, PDF rendering, and WORM archiving.

## Schema deltas

### `events` (extend existing table)

The table already has `status`, `is_budget_locked`, `settled_at`, `settled_by_user_id`. This feature adds:

| Column | Type | Notes |
|--------|------|-------|
| `artist_signature_data` | `TEXT` NULL | Base64-encoded JSON vector coordinate array of the touchscreen signature. Populated on finalize; cleared to NULL is NOT performed on reversal (history preserved via `settlement_reversals.previous_pdf_url`, but signature may be overwritten on re-settle). |
| `settlement_pdf_url` | `TEXT` NULL | Permanent GCS object path (`gs://…` or bucket/object key) of the frozen PDF. Non-null ⟺ event has a current archived settlement. |
| `xmin` | `xid` (system column) | Mapped as an EF Core optimistic-concurrency token (`.IsConcurrencyToken()`, `ValueGeneratedOnAddOrUpdate()`), mirroring `financial_line_items` / `event_artists`. Enables first-wins concurrent finalize. |

**EF Core mapping additions** (`ConfigureEvent`):
- `entity.Property(e => e.ArtistSignatureData).HasColumnName("artist_signature_data");`
- `entity.Property(e => e.SettlementPdfUrl).HasColumnName("settlement_pdf_url");`
- `entity.Property(e => e.Xmin).HasColumnName("xmin").HasColumnType("xid").ValueGeneratedOnAddOrUpdate().IsConcurrencyToken();`

**Model additions** (`Event.cs`): `string? ArtistSignatureData`, `string? SettlementPdfUrl`, `uint Xmin`, and `ICollection<SettlementReversal> Reversals`.

### `organization_roles` (extend existing table)

| Column | Type | Notes |
|--------|------|-------|
| `can_reverse_settlement` | `BOOLEAN` DEFAULT `false` | New least-privilege permission for the audited super-admin settlement reversal. Seeded `true` for the Admin role, `false` for others. |

**Model addition** (`OrganizationRole.cs`): `bool CanReverseSettlement`.
**Permission constant** (`PermissionNames`): `ReverseSettlement = "can_reverse_settlement"`.
**Authorization** (`PermissionAuthorizationHandler` switch + `Program.cs` policy list): add the new permission case/policy.
**Default role seeding**: grant `CanReverseSettlement = true` to the Admin role wherever default roles are created.

### `settlement_reversals` (new audit table)

Append-only audit log of settlement reversals. Never updated or deleted.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `UUID` PK | `gen_random_uuid()` |
| `event_id` | `UUID` FK → `events(id)` | Cascade delete with event |
| `reversed_by_user_id` | `UUID` FK → `users(id)` | Set-null on user delete |
| `reason` | `TEXT` NOT NULL | Required justification supplied by the reverser |
| `previous_pdf_url` | `TEXT` NOT NULL | The `settlement_pdf_url` that was in effect at reversal time (the original WORM object, which remains intact) |
| `reversed_at` | `TIMESTAMPTZ` DEFAULT `NOW()` | |

**Indexes**: `IX_settlement_reversals_event_id` on `event_id`.
**Tenant query filter**: `e.Event.Venue.OrganizationId == _tenantContext.OrganizationId` (resolve org via event → venue).

## Consumed entities (read-only / snapshot source)

- **`financial_line_items`**: `proforma_value`, `settlement_value`, `qbo_actual_value`, `is_artist_deduction`, `row_label`, `block_type`, `sort_order` — point-in-time source for the PDF financial block. Settlement freeze uses `settlement_value` (budget locked). Not mutated by finalize.
- **`event_artists`**: `artist_name`, `deal_type`, `calculated_net_payout` — captured into the PDF deal-math block. Recomputation happens via existing `DealMathEngine` before finalize (the values are already persisted by the ledger flow); finalize snapshots them as-is.
- **`venues` / `organizations`**: for tenant resolution and PDF header context (venue name, org name).
- **`users`**: `settled_by_user_id` and `reversed_by_user_id` references.

## State machine (owned transition)

```
[PRE_SHOW] --lock-budget (SPLR-17)--> [PRE_SHOW, is_budget_locked=true]
   |                                          |
   |                                   POST .../settle  (can_sign_settlement + venue scope)
   |                                   validate state + signature → snapshot → render PDF
   |                                   → upload WORM → persist url/signature/settled_* → status=SETTLED (atomic, xmin-guarded)
   v                                          v
[PRE_SHOW] <--POST .../reverse-settlement-- [SETTLED]  (can_reverse_settlement; audited; original PDF preserved)
                                              |
                                       (later, SPLR-18 QBO sync) --> [RECONCILED]
```

- **Finalize precondition**: `status == PreShow` AND `is_budget_locked == true` AND valid signature. Otherwise `SettlementStateException` / `SignatureValidationException` (→ 400).
- **Finalize on `SETTLED`/`RECONCILED`**: rejected (no re-freeze).
- **Concurrent finalize**: first commit wins via `xmin`; loser → `ConcurrencyConflictException` (→ 409).
- **Reversal precondition**: `status == SETTLED` (a `RECONCILED` event is out of this milestone's reversal scope) AND caller has `can_reverse_settlement`. Returns event to `PreShow` (budget still locked); original PDF preserved; audit row written.
- **Immutability invariant** (existing guard, now tested): any mutation of `events`/`event_artists`/`financial_line_items` while `SETTLED`/`RECONCILED` → `LedgerStateException` (→ 400, logged).

## Validation rules

- **Signature**: base64-decodable → JSON vector array → ≥1 stroke. Else `SignatureValidationException` (400).
- **Budget lock**: finalize requires `is_budget_locked == true`. Else `SettlementStateException` (400).
- **Reversal reason**: non-empty/non-whitespace. Else `ValidationException` (400).
- **Tenant/venue**: every endpoint resolves org via global query filter + `VenueService.IsVenueAccessibleAsync`; out-of-scope → `NotFoundException` (404) / `AuthorizationException` (403).

## Domain exceptions (new)

| Exception | HTTP | When |
|-----------|------|------|
| `SettlementStateException` | 400 | Finalize when not `PreShow`, budget not locked, or reversal when not `SETTLED` |
| `SignatureValidationException` | 400 | Missing/empty/malformed/zero-stroke signature |
| `SettlementArchiveException` | 502 | PDF upload to GCS fails (atomicity: event left un-`SETTLED`) |
| `ConcurrencyConflictException` (reuse) | 409 | Concurrent finalize loser |
| `AuthorizationException` (reuse) | 403 | Missing `can_sign_settlement` / `can_reverse_settlement` |
