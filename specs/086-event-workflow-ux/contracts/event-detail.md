# Contract: Event Detail Capture and Workflow Surfaces

**Feature**: [spec.md](../spec.md) | **Plan**: [plan.md](../plan.md) | **Data model**: [data-model.md](../data-model.md)

Two contracts here: the API payload shape (§1) and the interface behaviours the frontend must honour (§2–§5). No new endpoint is introduced.

---

## §1 API payload extension

### Affected records

`CreateEventRequest`, `UpdateEventRequest`, and `EventResponse` in `apps/api/DTOs/Ledger/LedgerDtos.cs`. All three already carry `DoorsTime`, `LoadInTime`, `CurfewTime`, and `SupportLineup`.

### Added fields

| Field | Wire type | Optional | Semantics |
|---|---|---|---|
| Show start time | `string?` `"HH:mm"` | yes | When music starts. Accepted only when the event's booking placement is confirmed. |
| Notes | `string?` | yes | Free-text operational notes, max **2000** characters after trimming (see data-model.md V4). Trimmed; empty becomes null. |

Times use the same `"HH:mm"` string convention as the existing `DoorsTime` (`evt.DoorsTime?.ToString("HH:mm")`).

Both records are **positional**, so new parameters MUST be appended after the existing optional ones to preserve positional compatibility for existing callers.

### Endpoint behaviour

| Condition | Result |
|---|---|
| Show start supplied, placement confirmed, start ≥ doors | Accepted and persisted |
| Show start supplied, placement **not** confirmed | Rejected — validation error naming the rule |
| Show start earlier than doors time | Rejected — validation error naming the conflicting times; prior values unchanged |
| Show start supplied, event settled or reconciled | Rejected by the existing status guard |
| Notes beyond 2000 characters | Rejected — validation error stating the limit |
| Placement changes away from confirmed | Stored show start time **retained**, not cleared |

Errors follow the existing granular `ValidationException` path (Constitution VIII). Every read and write keeps its existing venue/organization scoping (Constitution II).

### Contract regeneration (blocking)

After the DTO change, `apps/web/src/types/generated-api.ts` MUST be regenerated from live Swagger and committed. CI enforces this via `git diff --exit-code` in the `contract-type-drift` job. Hand-editing the file is prohibited (Constitution VI) and would fail the gate regardless.

---

## §2 Event creation surfaces

Applies to `CreateBookingEventModal` and `EventFormPanel`.

| Requirement | Contract |
|---|---|
| Selection controls | Use the shared `SelectField`; no unstyled native `<select>` remains |
| Action row | Dismiss action on the **left**, primary action on the **right** |
| Primary action | Carries a leading Font Awesome Free icon |
| Spacing | Uniform section spacing consistent with other modals |
| Validation display | Errors appear in the same position/style as elsewhere |
| Type selection (`EventFormPanel`) | Standard vs festival selection is unambiguous, not a single subtle cue |
| Existing behaviour | Current validation semantics and test IDs preserved |

---

## §3 Event detail surface

Applies to `BookingEventDrawer`.

### Detail mode

| Requirement | Contract |
|---|---|
| Grouping | Content organised under labelled groupings (schedule, lineup, notes), not a flat paragraph list |
| Empty groups | Omitted entirely; no blank space where absent information would be |
| Absence | Communicated in words where a group is shown but a value is missing |
| Notes rendering | Line breaks preserved; content rendered as **literal text**, never as markup |
| Lineup rendering | Readable without entering edit mode; literal text |
| Actions | Grouped consistently and visually separated from the content they act on |

### Edit mode

| Field | Availability |
|---|---|
| Doors time | Always available to an editor |
| Show start time | **Only when the placement is confirmed**; otherwise not rendered at all |
| Supporting lineup | Always available to an editor |
| Notes | Always available to an editor |

All four are read-only when the user lacks event-edit permission or the event is settled/reconciled.

---

## §4 Workspace header overflow

Applies to `FestivalModeCard`.

| Requirement | Contract |
|---|---|
| Placement | *Convert to festival* is a `KebabMenu` item, not a top-level button |
| Component | Reuses the shared `KebabMenu` unchanged |
| Behaviour | The conversion flow it triggers is identical to before |
| Permission | Absent when the user cannot convert |
| Empty menu | The menu is **omitted entirely** when it would contain no permitted items |
| Dismissal | Escape or outside click closes without performing an action (provided by `KebabMenu`) |

`KebabMenu` interface, consumed as-is:

```
{ ariaLabel: string; items: KebabMenuItem[]; testId?: string }
KebabMenuItem = { label, onSelect, testId?, destructive?, icon? }
```

---

## §5 Artist section action

Applies to `ArtistDealPanel`.

| Requirement | Contract |
|---|---|
| Placement | *Add artist* moves from the section header to the **foot** of the section, after existing artists |
| Permission | Same gate as before; absent for users without artist-manage permission |
| Disabled logic | Existing disabled conditions preserved |
| Test ID | `add-artist-btn` retained so existing coverage keeps working |

---

## Out of contract

- Publishing times to any public listing or feed
- Notifying artists, staff, or ticketing on change
- Structuring the supporting lineup into deal-bearing artist records
- Any settlement, ledger, or QuickBooks behaviour
- `LoadInTime` / `CurfewTime` interfaces (exist in the model, deliberately untouched)
- Festival programming block times, which remain independent
