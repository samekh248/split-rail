# Research: Core Financial Ledger Grid & Base-10 Math Engine

**Feature**: 002-financial-ledger-grid
**Date**: 2026-06-14

All NEEDS CLARIFICATION items from the spec were resolved during `/speckit-clarify` (see spec §Clarifications). This document records the technical decisions that frame the design.

## 1. Base-10 deal math (`DealMathEngine`)

**Decision**: Implement a stateless `DealMathEngine` that operates exclusively on `System.Decimal`. Parse all monetary inputs from strings at the API boundary via `decimal.Parse(value, CultureInfo.InvariantCulture)`. Apply `Math.Round(value, 2, MidpointRounding.AwayFromZero)` at the documented steps (tax withholding and final payout). Compute:

- `netShowRevenue = grossRevenue − totalDeductions`
- `grossArtistPayout` per deal type (see below)
- `taxWithholding = Round(grossArtistPayout × taxRate/100, 2, AwayFromZero)`
- `finalPayout = Round(grossArtistPayout − taxWithholding, 2, AwayFromZero)`, floored at `0.00` for standard deals.

Deal-type behavior (from spec §FR-009/FR-010 and clarification Q1):

| `deal_type` | Gross artist payout | Tax |
|-------------|---------------------|-----|
| `guarantee` | `max(base_guarantee, netShowRevenue × backend%/100)` — comparison on **pre-tax (gross)** basis | tax withheld once from selected gross |
| `door_split` | `netShowRevenue × backend%/100` | tax withheld from result |
| `custom` | result of `CustomFormulaEvaluator` | rounding applied to evaluator result |

Multi-artist (clarification Q2): every artist's split uses the **same** shared `netShowRevenue`; payouts are independent; no ≤100% cap is enforced.

**Rationale**: Constitution I forbids floating-point in the money path; `decimal` is base-10 and exact for currency. Away-from-zero rounding matches professional ledger conventions. Stateless engine is trivially unit-testable for the documented edge cases.

**Alternatives considered**: `double`/`float` (rejected — constitution violation, rounding error); database-side computation (rejected — harder to unit test, splits logic across layers).

## 2. Sandboxed custom formulas (`CustomFormulaEvaluator`)

**Decision**: Use **NCalcSync 5.12.x** (the synchronous, .NET 8-targeted NCalc package). Wrap it in a `CustomFormulaEvaluator` that:

1. Sanitizes input by stripping every character outside `[a-zA-Z0-9\s+\-*/().]` (regex allow-list) **before** constructing the expression.
2. Enables decimal evaluation (`ExpressionOptions.DecimalAsDefault`) so numeric literals/operations are `decimal`.
3. Binds only the fixed parameter set: `GrossRevenue`, `TotalDeductions`, `BaseGuarantee`, `SplitPercentage` (percentage normalized by dividing by 100).
4. Rounds the result via `Math.Round(result, 2, MidpointRounding.AwayFromZero)`.
5. On parse/eval failure, throws a granular `FormulaEvaluationException` wrapping the root cause — never swallows or returns a default (Constitution VIII).

**Rationale**: NCalcSync is actively maintained (5.12.0, Feb 2026), MIT-licensed, supports decimal evaluation, and avoids the async-only surface. Character allow-list neutralizes injection; the bound-parameter allow-list prevents access to arbitrary identifiers/functions beyond math.

**Alternatives considered**: Roslyn scripting (rejected — heavyweight, larger attack surface, compiles arbitrary C#); hand-rolled parser (rejected — reinventing, error-prone); `DataTable.Compute` (rejected — uses `double`, violates Constitution I).

## 3. API route convention

**Decision**: Nest ledger routes under the existing convention `api/venues/{venueId}/events/{eventId}/…` (e.g. `…/ledger`, `…/line-items`, `…/artists`, `…/lock-budget`, `…/recalculate`). Do **not** introduce a `/v1/` segment.

**Rationale**: The 001 codebase exposes routes as `api/venues`, `api/organizations`, etc. — no version segment. The Linear issue proposed `/api/v1/…`, but matching the established convention keeps the surface consistent and avoids a mixed scheme. Versioning can be introduced uniformly later if needed.

**Alternatives considered**: Adopt `/api/v1/…` per the issue (rejected — inconsistent with existing controllers); flat `api/events/{eventId}` without venue (rejected — venue is the isolation/scoping anchor and appears in permission/scope logic).

## 4. Tenant isolation for nested financial entities

**Decision**: Add EF Core global query filters for the three new entities resolving organization through navigation chains, mirroring the existing `UserVenueScope` filter pattern:

- `Event`: `_tenantContext.OrganizationId == null || e.Venue.OrganizationId == _tenantContext.OrganizationId`
- `FinancialLineItem`: filter via `e.Event.Venue.OrganizationId`
- `EventArtist`: filter via `e.Event.Venue.OrganizationId`

All ledger reads use `.AsNoTracking()` with eager `.Include(e => e.Venue).ThenInclude(v => v.Organization)` (and line items/artists) per Constitution VII. Venue-scope enforcement (`UserVenueScope`) is applied in `LedgerService` for users with explicit scopes.

**Rationale**: Reuses the proven 001 isolation mechanism; defense-in-depth (global filter + service-level venue scope + permission policy). Constitution II forbids unscoped queries.

**Alternatives considered**: Manual `WHERE organization_id` per query (rejected — error-prone, easy to forget); denormalizing `organization_id` onto every row (rejected — redundant; navigation filter is sufficient and avoids drift).

## 5. Decimal-as-string serialization (Polyglot contracts)

**Decision**: Represent every monetary/percentage DTO field as a `string` in the API contract (e.g. `"1234.56"`). Implement a `DecimalStringJsonConverter : JsonConverter<decimal>` (and a nullable variant) that writes `value.ToString("F2", InvariantCulture)` and parses on read; apply it via DTO property attributes or a global `JsonSerializerOptions` converter. Configure Swashbuckle so these fields surface as `type: string` in `swagger.json`. Frontend types are produced by `openapi-typescript` into `apps/web/src/types/generated-api.ts`; no hand-written interfaces.

**Rationale**: Constitution VI/FR-032 — JS `number` is IEEE-754 float and cannot safely represent currency; strings preserve precision across the wire and force the frontend to treat money as text (display-only, never client-side float math).

**Alternatives considered**: Send raw JSON numbers (rejected — float precision loss, constitution violation); integer cents (rejected — diverges from `NUMERIC(12,2)` model and issue's explicit string-decimal requirement).

## 6. QBO actuals (interim, read-only)

**Decision**: `qbo_actual_value` is a `NUMERIC(12,2)` column defaulting to `0.00`, exposed read-only in the API/grid, with **no manual-entry path** until the separate QBO sync feature ships (clarification Q5). Variance (`qbo_actual_value − settlement_value`) is computed both server-side (in `LedgerService`/DTO assembly) and client-side for display; non-zero variances are flagged. When sync ships, actuals are append-only (Constitution IV).

**Rationale**: Keeps this feature in scope, honors the read-only/append-only QBO constitution stance, and avoids building throwaway entry UI.

**Alternatives considered**: Manual seeding/inline entry now (rejected per Q5 — out of scope and risks normalizing a non-append-only entry path).

## 7. Optimistic concurrency (FR-036)

**Decision**: Add a concurrency token to `financial_line_items` and `event_artists`. Use PostgreSQL's system `xmin` column mapped via Npgsql (`entity.UseXminAsConcurrencyToken()`), surfaced as a `version`/`rowVersion` value in DTOs. `SaveChanges` throwing `DbUpdateConcurrencyException` is translated to a `ConcurrencyConflictException` → HTTP 409, prompting the client to refresh and retry.

**Rationale**: `xmin` avoids adding/maintaining an explicit version column and is the idiomatic Npgsql approach. Optimistic strategy (clarification Q3) prevents silent overwrites during concurrent night-of settlement edits without lock contention.

**Alternatives considered**: Explicit `version int` column (rejected — extra bookkeeping vs. built-in `xmin`); pessimistic row locks (rejected per Q3 — poor UX, contention); last-write-wins (rejected per Q3 — silent data loss in financial path).

## 8. Frontend stack (new `apps/web`)

**Decision**: React 18 + Vite + TypeScript, TanStack Query for server state, generated API types via `openapi-typescript`, Vitest + React Testing Library for tests. A small `money.ts` provides display/formatting of decimal strings (no arithmetic). The ledger renders as a spreadsheet-style grid (3 block sections × 5 columns) with cell editability bound to event state + permissions, variance conditional highlighting, and a per-artist deal/formula panel with live payout preview after recalculate.

**Rationale**: Matches the deferred stack noted in 001's plan ("React + Vite") and the constitution's frontend testing mandate (Vitest + RTL). Generated types satisfy Constitution VI.

**Alternatives considered**: Next.js (rejected — SSR not needed for an authenticated internal tool; Vite SPA is simpler); hand-written API types (rejected — constitution violation).
