import type { VenueResponse } from '@/types/generated-api';

// Shared venue fixtures (feature 010-vitest-tests-auth, T001).
// Shapes come from the generated API contract (Constitution VI) — never hand-mirrored.

export const VENUE_A: VenueResponse = {
  id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  name: 'Hall A',
  organizationId: 'org-1',
  createdAt: '2026-01-01T00:00:00Z',
};

export const VENUE_B: VenueResponse = {
  id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  name: 'Hall B',
  organizationId: 'org-1',
  createdAt: '2026-01-01T00:00:00Z',
};

export const VENUE_C: VenueResponse = {
  id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
  name: 'Hall C',
  organizationId: 'org-1',
  createdAt: '2026-01-01T00:00:00Z',
};

/** A well-formed UUID that is intentionally NOT in any fixture list. */
export const UNSCOPED_VENUE_ID = '99999999-9999-9999-9999-999999999999';

/** Multiple accessible venues (switching / active indication / keyboard nav). */
export const multiVenue: VenueResponse[] = [VENUE_A, VENUE_B];

/** A restricted user's scoped list — only Hall B is accessible. */
export const scopedVenue: VenueResponse[] = [VENUE_B];

/** Exactly one accessible venue. */
export const singleVenue: VenueResponse[] = [VENUE_A];

/** No accessible venues. */
export const noVenues: VenueResponse[] = [];
