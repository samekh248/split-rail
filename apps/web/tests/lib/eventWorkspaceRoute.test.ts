import { beforeEach, describe, expect, it } from 'vitest';
import { getAppPath } from '@/lib/appRoute';
import { navigateToEventWorkspace } from '@/lib/eventWorkspaceRoute';
import { getActiveEventId } from '@/venue/activeEventStorage';
import { getActiveVenueId } from '@/venue/activeVenueStorage';

const VENUE_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const EVENT_ID = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';

describe('eventWorkspaceRoute', () => {
  beforeEach(() => {
    sessionStorage.clear();
    window.history.pushState({}, '', '/');
  });

  it('navigateToEventWorkspace updates path and session storage', () => {
    navigateToEventWorkspace(VENUE_ID, EVENT_ID);

    expect(window.location.pathname).toBe(`/venues/${VENUE_ID}/events/${EVENT_ID}`);
    expect(getAppPath()).toBe(`/venues/${VENUE_ID}/events/${EVENT_ID}`);
    expect(getActiveVenueId()).toBe(VENUE_ID);
    expect(getActiveEventId(VENUE_ID)).toBe(EVENT_ID);
  });

  it('navigateToEventWorkspace appends optional focus query', () => {
    navigateToEventWorkspace(VENUE_ID, EVENT_ID, 'deal');

    expect(window.location.pathname).toBe(`/venues/${VENUE_ID}/events/${EVENT_ID}`);
    expect(window.location.search).toBe('?focus=deal');
  });

  it('navigateToEventWorkspace supports settlement and sync focus values', () => {
    navigateToEventWorkspace(VENUE_ID, EVENT_ID, 'settlement');
    expect(window.location.search).toBe('?focus=settlement');

    navigateToEventWorkspace(VENUE_ID, EVENT_ID, 'sync');
    expect(window.location.search).toBe('?focus=sync');
  });
});
