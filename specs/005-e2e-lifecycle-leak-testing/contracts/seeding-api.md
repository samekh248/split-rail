# Contract: Deterministic Seeding Surface

A **test-environment-gated** seeding surface that provisions the deterministic verification dataset (FR-021). Registered only when `Preview:EnableTestSeeding=true` (preview/test environments); never registered in production DI (Constitution III rigor, FR-022 no new product features).

## Endpoint

```
POST /api/test-seed/reset      → tears down + recreates the deterministic dataset
POST /api/test-seed/lifecycle-event  → (re)seeds a fresh PreShow lifecycle event in Org A
```

- Guarded by `Preview:EnableTestSeeding`; returns `404`/`403` when disabled so the surface is invisible in production.
- DTOs defined **C#-first** in `apps/api/DTOs/Seeding/` and surfaced through `swagger.json` → `generated-api.ts` (Constitution VI). The E2E fixtures import generated types; no hand-authored TS payload types.

## `POST /api/test-seed/reset`

Request: none (deterministic dataset is fixed by sentinel constants).

Response `200`:
```jsonc
{
  "orgA": { "organizationId": "...", "adminEmail": "alpha-admin@e2e.test",
            "scopedUserEmail": "alpha-scoped@e2e.test",
            "inScopeVenueId": "...", "outOfScopeVenueId": "..." },
  "orgB": { "organizationId": "...", "adminEmail": "bravo-admin@e2e.test",
            "scopedUserEmail": "bravo-scoped@e2e.test",
            "inScopeVenueId": "...", "outOfScopeVenueId": "..." },
  "sentinels": { "orgAStrings": ["E2E Org Alpha", "Alpha Main Hall", ...],
                 "orgBStrings": ["E2E Org Bravo", "Bravo Main Hall", ...] }
}
```

Behavior:
- Creates the two isolated org contexts, admins, venue-scoped users, in/out-of-scope venues (see `data-model.md` §1). Each row carries its own `organization_id` (Constitution II).
- Idempotent: a second call resets to the identical deterministic state.
- Returns known sentinel strings/IDs so the isolation suite can deep-scan responses for foreign data (D9).

## `POST /api/test-seed/lifecycle-event`

Request:
```jsonc
{ "organizationId": "<orgA id>", "venueId": "<Alpha Main Hall id>" }
```

Response `200`:
```jsonc
{
  "eventId": "...",
  "qboTagName": "EVENT-E2E-LIFECYCLE",
  "expectedSettlement": { "computedNetPayout": "12345.67", "totals": { ... } },  // decimal strings
  "expectedVariance": { "<accountId>": "100.00", ... }                          // fake-QBO actuals − settlement
}
```

Behavior:
- Seeds a fresh `PreShow` event with fixed planning + settlement line-item decimals and the deterministic `qboTagName` matched by `FakeQboTransactionClient`.
- Returns the **precomputed expected** decimal-string results so the lifecycle suite asserts exact base-10 equality (FR-008, Constitution I) without re-deriving math on the client (no JS `number` money math).
- Money fields serialized as strings via existing `DecimalStringJsonConverter` (Constitution I/VI).

## Constraints

- Reads use explicit `organization_id`-scoped, eager `.Include()`/`.AsNoTracking()` queries (Constitution VII).
- Granular domain exceptions only; no secrets/PII in logs; seeded passwords are deterministic non-secret test values (Constitution VIII).
- This surface is verification infrastructure, not a product feature; it MUST remain disabled in production (FR-022).
