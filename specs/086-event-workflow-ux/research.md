# Phase 0 Research: Event Workflow Visual Cleanup and Show Detail Capture

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-08-19

No `[NEEDS CLARIFICATION]` markers survived specification — the user's two answers resolved scope directly. The open questions here are all *existing-system* questions: what the product already does, so this feature extends rather than duplicates it.

---

## D1 — Which of the four "new" fields actually need backend work

**Decision**: Only **show start time** and **notes** are new. **Doors time** and **supporting lineup** already exist end-to-end and need interface only.

**Rationale**: A direct read of the codebase found:

| Field | Model (`Event.cs`) | Create/Update DTO | `EventResponse` | `EventService` | Interface |
|---|---|---|---|---|---|
| Doors time | `DoorsTime` ✅ | ✅ | ✅ | parses + projects ✅ | Booking create modal only |
| Supporting lineup | `SupportLineup` ✅ | ✅ | ✅ | normalises + projects ✅ | **None anywhere** |
| Show start time | ❌ | ❌ | ❌ | ❌ | ❌ |
| Notes | ❌ | ❌ | ❌ | ❌ | ❌ |

`Event.cs` also carries `LoadInTime` and `CurfewTime` with the same full plumbing and no interface, confirming the pattern: this area of the model was built out ahead of its UI.

This matches the user's instruction to "keep the opening/supporting bands as is, but if there is no UX for it, add it" precisely — the storage stays, the missing interface gets built.

**Alternatives considered**: Introducing a fresh `showStartTime`/`supportingActs` pair alongside the existing columns — rejected, it would leave two representations of the same fact and contradict the explicit instruction to keep the existing one.

---

## D2 — What "confirmed" means in this product

**Decision**: Confirmed refers to **`BookingPlacementStatus.Confirmed`**, not event status.

**Rationale**: `EventStatus` has exactly three values — `PreShow`, `Settled`, `Reconciled`. There is no confirmed event status. The confirmed/hold distinction lives in `BookingPlacementStatus` (`Hold1`, `Hold2`, `Confirmed`, `Cancelled`), which `Event` carries and defaults to `Confirmed`. The booking create modal is even titled "Create confirmed event".

This is the single most likely place for the implementation to go wrong, because the word "confirmed" reads like a status. Gating on `EventStatus` would be silently incorrect.

**Alternatives considered**: Adding a `Confirmed` member to `EventStatus` — rejected outright; it would collide with the settlement lifecycle and duplicate a distinction the model already draws.

---

## D3 — Where the confirmed-only rule is enforced

**Decision**: Enforce in `EventService` (authoritative) **and** reflect in the interface (affordance). Do not rely on the interface alone.

**Rationale**: Hiding a field is presentation, not a rule. A direct API call could otherwise set a show start time on a hold. `EventService` is already the single writer for every event field and already owns the settled/reconciled guard, so the rule belongs beside its peers. The interface simply does not render the field for non-confirmed placements, per FR-004.

**Alternatives considered**: Interface-only gating — rejected as unenforceable. A database constraint — rejected; the rule is conditional on another mutable column and is clearer in the service, consistent with how existing event rules are expressed.

---

## D4 — Retaining a show start time when a placement leaves confirmed

**Decision**: Retain the stored value; hide it from the interface while not confirmed; show it again if the placement returns to confirmed (FR-006).

**Rationale**: A booking commonly moves confirmed → hold → confirmed during renegotiation. Discarding the schedule on each transition would destroy operator work for no benefit. Retention is invisible to the user while non-confirmed, so it cannot mislead.

**Alternatives considered**: Clearing the field on transition away from confirmed — rejected as destructive and surprising. Continuing to display it on holds — rejected; it contradicts FR-004 and implies a schedule that is not committed.

---

## D5 — Time ordering validation

**Decision**: Refuse a show start time earlier than the same event's doors time. Treat the pair as times on the event's own calendar day; do not infer next-day rollover.

**Rationale**: Doors before music is the near-universal case and the ordering the operator expects to be protected. Inferring rollover from ordering alone would make a typo (19:00 doors, 07:30 start) silently valid as a next-morning show. The spec's Edge Cases already record that late-night shows are booked against the calendar day the operator selects, which is consistent with how the festival timeline treats its own day window.

**Alternatives considered**: Allowing any ordering — rejected, gives up a cheap and valuable guard. Auto-rolling a start earlier than doors into the next day — rejected as too clever; it silently reinterprets input.

---

## D6 — Reusing the existing overflow-menu pattern

**Decision**: Reuse the shared `KebabMenu` component unchanged.

**Rationale**: `src/components/shell/KebabMenu.tsx` already implements the full interaction: Escape to close, outside-pointer-down to close, focus moved to the first item on open, focus restored on close, and a `destructive` item flag. `BookingEventDrawer` already consumes it for the cancel-booking action, so the pattern is established in exactly the surface family this feature touches. `FestivalModeCard` needs only to swap its top-level button for a menu item.

The component takes `{ ariaLabel, items, testId }` with items of `{ label, onSelect, testId?, destructive?, icon? }` — sufficient as-is; no extension required.

**Alternatives considered**: A new overflow component tailored to the workspace header — rejected as duplication of a working, accessible pattern.

---

## D7 — Contract regeneration discipline

**Decision**: Treat Swagger regeneration as an explicit, blocking task between the DTO change and any frontend work.

**Rationale**: Constitution VI forbids hand-written frontend contract types, and CI enforces it with `git diff --exit-code apps/web/src/types/generated-api.ts` in the `contract-type-drift` job. On the immediately preceding feature (spec 085) this exact gate failed, because a DTO gained fields and `generated-api.ts` was never regenerated — which also broke the typecheck at several call sites. Regeneration requires the API actually running (the Swashbuckle CLI cannot bootstrap this minimal-hosting app), so it is real work that needs its own task rather than an afterthought.

**Alternatives considered**: Hand-adding the two fields to `generated-api.ts` — prohibited by Constitution VI, and would fail the drift gate regardless since the generated output must match byte-for-byte.

---

## D8 — Notes as plain text

**Decision**: Plain multi-line text with a bounded length, preserved line breaks, rendered literally.

**Rationale**: The operational need is parking instructions and hospitality quirks, not formatted documents. Plain text keeps the field cheap to store, safe to render, and consistent with the existing `SupportLineup` and line-item `Notes` fields, which are already plain strings normalised through `NormalizeOptionalText`. Rendering literally (never as markup) avoids introducing an injection surface on a field many roles can edit.

**Alternatives considered**: Rich text or markdown — rejected as disproportionate and a new rendering/sanitisation burden. Attachments — out of scope per the spec.

---

## D9 — Scope of the visual cleanup

**Decision**: Modernise the two creation surfaces and the detail view's structure; do not restyle the whole booking area.

**Rationale**: `CreateBookingEventModal` already uses `SelectField` and `FormField` but places a lone right-aligned Save with no dismiss action. `EventFormPanel` uses `FormField` throughout with radio-based type selection. `BookingEventDrawer`'s detail mode is the genuinely bare surface — unclassed `<p>` elements with no groupings — which is what "needs cleaned up" refers to. Confining the work to these keeps the change reviewable and avoids churning booking surfaces the user did not raise.

**Alternatives considered**: A sweeping booking-area restyle — rejected as scope the user did not ask for, and risky to review alongside new data fields.

---

## Resolved Unknowns Summary

| Question | Resolution |
|---|---|
| Which fields need backend work? | Show start time and notes only (D1) |
| What is "confirmed"? | `BookingPlacementStatus.Confirmed` (D2) |
| Where is the gate enforced? | `EventService`, plus interface affordance (D3) |
| What happens leaving confirmed? | Value retained, hidden (D4) |
| Time ordering? | Start must not precede doors; no rollover (D5) |
| Overflow menu? | Reuse shared `KebabMenu` unchanged (D6) |
| Contract types? | Regenerate from Swagger; blocking task (D7) |
| Notes format? | Bounded plain text, literal render (D8) |
| Cleanup scope? | Two create surfaces + detail structure only (D9) |
