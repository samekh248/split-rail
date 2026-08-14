# Contract: Festival Structure & Itinerary Endpoints

`FestivalsController` — wrapper lifecycle, stages, programming blocks, itinerary. All routes org-scoped through the venue/event hierarchy (Constitution II); all DTOs C#-first in `apps/api/DTOs/Festivals/` (Constitution VI). Money fields ride the existing money-string serialization (spec 012).

## Wrapper lifecycle

### POST /venues/{venueId}/festivals
Create a festival, or convert an existing standard event when `existingEventId` is provided (lossless — title/date/ledger retained).

Request `CreateFestivalRequest`: `{ title, startDate, endDate, existingEventId? }`
- 400: `endDate < startDate`; range > 3 calendar days (v1 cap); `existingEventId` already a festival or settled/reconciled.
- Side effects: `EventType=Festival`, `EndDate` set, default StageZone "Main Stage" created, master QBO tag generated into `QboTagName` if empty (`#Fest-{yyyy}-{slug}` — display-only string; never written to QBO, Constitution IV).

Response 201 `FestivalResponse`: wrapper fields + `days[]` (derived dates) + `stages[]`.

### GET /venues/{venueId}/festivals/{eventId}
Response 200 `FestivalResponse`. 404 when not found / not this org / not a festival.

### PUT /venues/{venueId}/festivals/{eventId}
Request `UpdateFestivalRequest`: `{ title, startDate, endDate }`
- 409 `FestivalDateConflictResponse` `{ affectedBlockIds[], affectedBlockTitles[] }` when shrinking the range would orphan blocks (explicit resolution required — move/cancel first).
- 400 on 3-day-cap violation; blocked when wrapper Settled/Reconciled (Constitution V).

### POST /venues/{venueId}/festivals/{eventId}/revert-to-standard
200 only when no non-default stages, no blocks, no festival financial rows; otherwise 409 explaining blockers.

## Stages

### GET /venues/{venueId}/festivals/{eventId}/stages → 200 `StageZoneResponse[]`
### POST .../stages — `{ name, sortOrder? }` → 201; 409 duplicate name (unique per festival)
### PUT .../stages/{stageId} — rename/reorder; 409 duplicate name
### DELETE .../stages/{stageId} → 204; 409 when last remaining stage or stage still has blocks (`{ blockingBlockIds[] }`)

Permissions: `ManageFestivalSchedule` (stage managers manage blocks, not stages, unless also granted).

## Programming blocks

### POST /venues/{venueId}/festivals/{eventId}/blocks
Request `CreateProgrammingBlockRequest` (creation-level validation only — two-level validation per spec FR-005):
```
{ title, dayDate, stageZoneId, startTime, endTime, category,
  requiresSettlement, festivalArtistId?|newArtistName?, isPubliclyVisible?,
  description?, loadInTime?, soundcheckTime?, dealTerms? }
```
- 400: `dayDate` outside festival range; `startTime >= endTime`; missing required fields.
- 409 `BlockConflictResponse` `{ conflictingBlockId, conflictingBlockTitle, conflictingTimes }` — same-stage active overlap (D12).
- 201 `ProgrammingBlockResponse` incl. `warnings[]` (e.g. `ARTIST_DOUBLE_BOOKED` — non-blocking).

### PUT .../blocks/{blockId}
Same shape/validation as create; moving day/stage re-runs conflict validation and writes a `Reschedule`/`Moved` audit entry (prior + new placement). 409 on conflict; 400 when finalized-settlement fields would change outside reopen (Constitution V guard).

### POST .../blocks/{blockId}/status
Request `{ status: Scheduled|Delayed|PartiallyCompleted|Canceled, reason? }` — transitions per data-model state machine; writes audit entry; response includes `requiresSettlementReview` when settlement work already started.

### GET .../blocks/{blockId}/history → 200 audit entries (schedule changes + status changes) for the panel.
### DELETE .../blocks/{blockId} → 204 draft-only; 409 once settlement work exists (cancel instead).

Permissions: `ManageFestivalSchedule`, or `FinalizeSettlements` scoped via `StageZoneAssignment` for own-stage block edits. Artists/finance-only users: 403.

## Itinerary

### GET /venues/{venueId}/festivals/{eventId}/itinerary?view=internal|public&day=&stageZoneId=&category=&status=
- `internal` (default): requires itinerary access; full block payloads grouped by day/stage.
- `public`: only `IsPubliclyVisible` blocks, public field subset `{ title, dayDate, stageName, startTime, endTime, category }` — server-filtered so internal fields can never reach a public rendering path (D13).
- Filters combinable; response shape optimized for the timeline grid: `{ days[], stages[], blocks[] }`.

### POST .../itinerary/publish-visibility
Request `{ blockIds[], isPubliclyVisible }` — requires `PublishPublicItinerary`; writes `PublishChange` audit entries. 403 for stage managers by default.

## Artists

### GET /venues/{venueId}/festivals/{eventId}/artists → `FestivalArtistResponse[]` incl. appearance counts
### POST .../artists — `{ name }` → 201; 409 duplicate per festival
### GET .../artists/{artistId}/rollup → `{ appearances[], totalNetPayout, totalAllocatedRevenue, byDay[], byStage[] }` (D5/D14)
### POST .../artists/{artistId}/copy-deal-terms — `{ sourceBlockId, targetBlockIds[] }` → applies deal terms across that artist's draft blocks; 409 for finalized targets.

## Error semantics

Typed exceptions → existing middleware mapping: `NotFoundException` 404, `ValidationException` 400, `BlockConflictException`/`ConflictException` 409, `AuthorizationException` 403. Cross-org access is always 404 (existence not revealed).
