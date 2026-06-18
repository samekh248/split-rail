// ---------------------------------------------------------------------------
// T005 — Coverage reconciliation of contracts/test-coverage.md (W1–W32):
//   W1  venue empty-state CTA (admin) ...................... covered (DashboardOverviewPage)
//   W2  persistent shell add-venue ....................... covered (T006)
//   W3  zero-venue empty state hides CTA (restricted) ...... covered (T007)
//   W4  shell add-venue hidden (restricted) ................ covered (T008)
//   W5  create-venue empty name validation ................. covered (CreateVenuePage)
//   W6  over-max-length venue name ....................... covered (T009)
//   W7  successful create → dashboard + active venue ....... covered (CreateVenuePage)
//   W8  unauthorized create-venue redirect ............... covered (CreateVenuePage)
//   W9  event combobox venue-scoped list ................... covered (T012)
//   W10 select event updates ledger ...................... covered (EventWorkspacePage)
//   W11 no-events informational (no create CTA) ........ covered (DashboardOverviewPage)
//   W12 no-events empty state at root .................... covered (DashboardOverviewPage)
//   W13 inline create-event → ledger ....................... covered (T011)
//   W14 venue switch clears event ........................ covered (EventWorkspacePage)
//   W15 edit/delete out of scope (feature 015) ............. n/a
//   W16 settings landing + nav ............................. covered (T015/T016)
//   W17 Team card gating ................................... covered (SettingsLandingPage)
//   W18 team URL silent redirect ........................... covered (TeamSettingsPage)
//   W19 placeholder org/integrations ....................... covered (T017)
//   W20 rename forms deferred .............................. n/a
//   W21 invite form fields + validation .................... covered (T019)
//   W22 member list scoped data ............................ covered (T021)
//   W23 invitation list scoped data ........................ covered (T020)
//   W24 resend/cancel gating ............................... covered (InvitationList)
//   W25 edit modal save/cancel/last-admin ................... covered (MemberEditModal)
//   W26 remove confirm pattern ............................. covered (RemoveMemberConfirm)
//   W27 team page integration .............................. covered (TeamSettingsPage)
//   W28 pending submit disabled ............................ covered (CreateVenuePage, InviteMemberForm T019)
//   W29 server vs validation errors ........................ covered (CreateVenuePage, InviteMemberForm T019)
//   W30 events load failure + retry ...................... covered (DashboardOverviewPage)
//   W31 stale venue fallback ............................... covered (VenueContext, feature 010)
//   W32 CI coverage gate ................................... verified (T027) — 86.11% stmts / 85.49% branches
// ---------------------------------------------------------------------------

import type { EventResponse } from '@/types/generated-api';
import { VENUE_A, VENUE_B } from './venues';

export const EVENT_A: EventResponse = {
  eventId: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
  venueId: VENUE_A.id,
  title: 'Show A',
  eventDate: '2026-08-01',
  status: 'PRE_SHOW',
  isBudgetLocked: false,
  qboTagName: '',
};

export const EVENT_B: EventResponse = {
  eventId: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
  venueId: VENUE_B.id,
  title: 'Show B',
  eventDate: '2026-09-01',
  status: 'PRE_SHOW',
  isBudgetLocked: false,
  qboTagName: '',
};

export const EVENT_C: EventResponse = {
  eventId: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  venueId: VENUE_A.id,
  title: 'Show C',
  eventDate: '2026-10-01',
  status: 'PRE_SHOW',
  isBudgetLocked: false,
  qboTagName: '',
};

/** Multiple events for venue A (combobox switching). */
export const eventsForVenueA: EventResponse[] = [EVENT_A, EVENT_C];

/** No events for a venue. */
export const noEvents: EventResponse[] = [];

/** Stub returned when creating an event inline from the dashboard. */
export const newlyCreatedEvent: EventResponse = {
  eventId: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
  venueId: VENUE_A.id,
  title: 'Spring Show',
  eventDate: '2026-05-01',
  status: 'PRE_SHOW',
  isBudgetLocked: false,
  qboTagName: '',
};
