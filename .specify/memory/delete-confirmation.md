# Destructive Action Confirmation

This document defines the mandatory UX pattern for delete and other irreversible
destructive actions in the Split Rail web application. It implements **Constitution §XI**.

## When confirmation is required

Confirmation MUST appear before any user-initiated action that:

- Deletes or permanently removes a persisted entity (venue, event, stage, member, ledger row, artist deal, etc.)
- Cancels a booking or festival in a way that removes it from the calendar
- Finalizes or locks data in a way that cannot be undone without an explicit reopen flow

**Prohibited**: calling delete/remove APIs directly from a row button, kebab item, or
toolbar action without an intermediate confirmation step. **`window.confirm` is not
permitted** for product UI; use the shared modal pattern below.

## Exempt actions (no confirmation)

- Clearing a draft form field, signature pad, or unsaved modal input
- Removing a transient UI filter or local-only selection
- Backend-enforced idempotent no-ops that do not destroy user data

Document exemptions in the feature spec **Assumptions** section.

## Required modal pattern

Use an `alertdialog` confirmation component that:

1. Opens from the destructive control; does **not** mutate server state on open
2. Names the target entity in the body copy (e.g. stage name, event title)
3. Describes irreversible impact in plain language
4. Provides a single destructive confirm button using `btn-primary--compact btn-primary--danger btn-icon-label` with left-aligned icon (`faTrash` for delete, `faBan` for cancel-booking per iconography.md)
5. Supports dismiss via backdrop click, close control, and `Escape` (disabled while pending)
6. Shows pending state on the confirm button (`Deleting…`, etc.) and disables duplicate submits
7. Surfaces API errors inside the dialog **and** inline near the source panel when appropriate

### Shared styling

- Backdrop: `welcome-modal__backdrop`
- Shell: `team-confirm` with `role="alertdialog"` and `aria-modal="true"`
- Header: `ModalHeader` + `team-confirm__heading`
- Body: `team-confirm__text`
- Destructive action: `btn-primary--compact btn-primary--danger btn-icon-label` (compact primary sizing, red fill)
- Error: `team-confirm__error`

### Reference implementations

| Action | Component |
|--------|-----------|
| Delete venue | `apps/web/src/components/venue/DeleteVenueConfirm.tsx` |
| Delete event | `apps/web/src/components/event/EventDeleteConfirm.tsx` |
| Remove team member | `apps/web/src/components/team/RemoveMemberConfirm.tsx` |
| Cancel festival booking | `apps/web/src/components/festival/FestivalCancelConfirm.tsx` |
| Delete festival stage | `apps/web/src/components/festival/StageDeleteConfirm.tsx` |

When adding a new destructive flow, copy the nearest existing confirm component; do not invent a one-off dialog layout.

## Testing requirements (Constitution III)

Every new delete/remove flow MUST include Vitest + RTL coverage that:

1. Clicking the entry control opens the confirm dialog and does **not** call the mutation
2. Confirm invokes the mutation; cancel/close does not
3. Pending and error states render as specified

## Spec Kit checklist for features with deletes

In `spec.md`:

- Add an acceptance scenario: destructive action → confirm → outcome
- Add **FR-00X**: destructive actions MUST use the Constitution §XI confirmation pattern

In `plan.md` Constitution Check table, include a row for §XI (Destructive Action Confirmation).

In `tasks.md`, include explicit tasks for the confirm component, wiring, and tests.
