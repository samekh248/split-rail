# Quickstart & Validation Guide: Settlement Freeze Pipeline

This guide proves the feature end-to-end. It references [data-model.md](data-model.md) and [contracts/](contracts/) for details rather than duplicating them.

## Prerequisites

- .NET 8 SDK; Node 20+; Docker (for Testcontainers PostgreSQL).
- Existing SPLR-16/17 features in place (`events`, `financial_line_items`, `event_artists`, RBAC, ledger grid, `DealMathEngine`).
- New backend packages restored: `QuestPDF`, `Google.Cloud.Storage.V1`.
- For local PDF-link/download: a GCS bucket with an Object Retention Policy (7-year), and ADC/Workload Identity (or a Secret Manager-sourced signing key). Integration tests do **not** require GCS — they use the in-memory archive-store fake.

## Backend setup

```bash
cd apps/api
dotnet restore
dotnet ef migrations add AddSettlementArchiveColumns      # events columns + xmin + can_reverse_settlement + settlement_reversals
dotnet ef database update
dotnet build
dotnet run                                                 # serves Swagger at /swagger; regenerates swagger.json
```

Configuration (env / appsettings) for `SettlementArchiveOptions`:

```jsonc
"SettlementArchive": {
  "BucketName": "split-rail-settlements-prod",
  "SignedUrlTtlMinutes": 15
}
```

QuestPDF license is set once at startup: `QuestPDF.Settings.License = LicenseType.Community;`.

## Frontend setup

```bash
cd apps/web
npm install
npm run gen:api      # regenerate generated-api.ts from swagger.json (API must be running)
npm run test
```

## End-to-end validation scenarios

### Scenario A — Freeze a settlement (User Story 1)

1. As a user with `can_sign_settlement`, open a `PRE_SHOW` event whose **budget is locked** with settlement values entered.
2. Draw a signature on the canvas; click **Finalize Settlement** and confirm.
3. **Expect**: `POST .../settle` → `200`; the event becomes `SETTLED`; `settled_at`, `settled_by_user_id`, `artist_signature_data`, and `settlement_pdf_url` are populated (verify via DB or the ledger response `status`/`editability`).
4. Open the settlement PDF link → `GET .../settlement-pdf` returns a signed URL that downloads a PDF embedding the signature + financial block + deal-math payouts.

### Scenario B — Immutability guard (User Story 2)

1. With the event from A in `SETTLED`, attempt to edit a line item, an artist, or lock/unlock budget.
2. **Expect**: every mutation → `400` (`ledger_state`), the attempt is logged, and the stored PDF object is unchanged (the in-memory fake / GCS object has identical bytes and was not re-rendered).

### Scenario C — Signature capture + instant lock (User Story 3)

1. Render the settlement workspace as an authorized user; draw and clear/redo the signature; confirm serialization to a base64 vector array.
2. After a successful finalize, **expect** all settlement inputs to render read-only with a visible "Settled / Locked" indicator and a working PDF link.
3. Render as a user **without** `can_sign_settlement`; **expect** the signature + finalize controls to be hidden/disabled.

### Scenario D — Audited reversal (clarification)

1. As a user with `can_reverse_settlement`, `POST .../reverse-settlement` with a reason.
2. **Expect**: `200`; event back to `PRE_SHOW` (budget still locked); a `settlement_reversals` row records the previous PDF URL; the **original PDF object is preserved** (not deleted/overwritten).
3. Re-finalize → a **new** PDF object is created (distinct path); the original remains retrievable via the audit trail.
4. As a user lacking `can_reverse_settlement` (even one with `can_sign_settlement`), `POST .../reverse-settlement` → `403`.

## Test commands

```bash
# Backend (unit + Testcontainers integration)
cd apps/api.tests && dotnet test

# Frontend (Vitest + RTL)
cd apps/web && npm run test
```

## Expected coverage gates

- ≥80% line/branch coverage across new backend and frontend code (CI-enforced).
- Required proofs: atomicity (forced archive failure leaves event un-`SETTLED`), immutability (post-settle mutations rejected + PDF unchanged), authorization (403 paths), concurrency (409 on race), reversal (403 for non-super-admins; original PDF preserved).
