import { vi } from 'vitest';
import type { EventResponse, PermissionsDto, VenueResponse } from '@/types/generated-api';
import { fullAccessProfile, restrictedProfile } from '../fixtures/auth';

/**
 * Permission stub mapping (feature 017):
 * - canManagePermissions → useCanManageVenues, useCanManageTeam (venue create, team settings)
 * - canViewFinancials → useCanManageEvents (event create CTA / inline panel)
 */
export const workspaceAdminProfile = {
  email: 'admin@example.com',
  organization: { id: 'org-1', name: 'Acme Org' },
  role: { permissions: fullAccessProfile.role!.permissions! },
};

export const workspaceMemberProfile = {
  role: { permissions: restrictedProfile.role!.permissions! },
};

export interface MockWorkspaceFetchOptions {
  profile?: { role: { permissions: Partial<PermissionsDto> } };
  venues?: VenueResponse[];
  venuesOk?: boolean;
  venuesStatus?: number;
  eventsByVenue?: Record<string, EventResponse[]>;
  eventsError?: boolean;
  createdEvent?: EventResponse;
  createdVenue?: VenueResponse;
  createVenueStatus?: number;
}

const DEFAULT_CREATED_VENUE: VenueResponse = {
  id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
  name: 'The Roxy',
  organizationId: 'org-1',
  createdAt: '2026-06-17T00:00:00Z',
};

export function mockWorkspaceFetch(options: MockWorkspaceFetchOptions = {}) {
  const {
    profile = workspaceAdminProfile,
    venues = [],
    venuesOk = true,
    venuesStatus = 200,
    eventsByVenue = {},
    eventsError = false,
    createdEvent,
    createdVenue = DEFAULT_CREATED_VENUE,
    createVenueStatus = 201,
  } = options;

  let venueList = [...venues];
  const eventLists: Record<string, EventResponse[]> = { ...eventsByVenue };

  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? 'GET';

      if (url.includes('/users/me')) {
        return {
          ok: true,
          status: 200,
          json: () => Promise.resolve(profile),
        };
      }

      const eventsPostMatch = url.match(/\/venues\/([^/]+)\/events$/);
      if (eventsPostMatch && method === 'POST') {
        const venueId = eventsPostMatch[1]!;
        const body = init?.body ? JSON.parse(String(init.body)) : {};
        const response: EventResponse =
          createdEvent ??
          ({
            eventId: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
            venueId,
            title: body.title,
            eventDate: body.eventDate,
            status: 'PRE_SHOW',
            isBudgetLocked: false,
            qboTagName: body.qboTagName ?? '',
          } as EventResponse);
        eventLists[venueId] = [...(eventLists[venueId] ?? []), response];
        return {
          ok: true,
          status: 201,
          json: () => Promise.resolve(response),
        };
      }

      const eventsGetMatch = url.match(/\/venues\/([^/]+)\/events$/);
      if (eventsGetMatch && method === 'GET') {
        if (eventsError) {
          return {
            ok: false,
            status: 500,
            json: () => Promise.resolve({ detail: 'Server error' }),
          };
        }
        const venueId = eventsGetMatch[1]!;
        return {
          ok: true,
          status: 200,
          json: () => Promise.resolve(eventLists[venueId] ?? []),
        };
      }

      if (url.includes('/api/venues') && url.includes('/events')) {
        if (eventsError) {
          return {
            ok: false,
            status: 500,
            json: () => Promise.resolve({ detail: 'Server error' }),
          };
        }
        const venueId = url.match(/\/venues\/([^/]+)\/events/)?.[1];
        const events = venueId ? (eventLists[venueId] ?? []) : [];
        return {
          ok: true,
          status: 200,
          json: () => Promise.resolve(events),
        };
      }

      if (url.match(/\/venues$/) && method === 'POST') {
        if (createVenueStatus >= 400) {
          return {
            ok: false,
            status: createVenueStatus,
            statusText: 'Error',
            json: () => Promise.resolve({ detail: 'Server error' }),
          };
        }
        venueList = [createdVenue];
        return {
          ok: true,
          status: 201,
          json: () => Promise.resolve(createdVenue),
        };
      }

      if (url.match(/\/venues$/) && method === 'GET') {
        return {
          ok: venuesOk,
          status: venuesStatus,
          json: () =>
            venuesOk
              ? Promise.resolve(venueList)
              : Promise.resolve({ detail: 'Server error' }),
        };
      }

      if (url.includes('/venues') && !url.includes('/events') && method === 'GET') {
        return {
          ok: venuesOk,
          status: venuesStatus,
          json: () =>
            venuesOk
              ? Promise.resolve(venueList)
              : Promise.resolve({ detail: 'Server error' }),
        };
      }

      return { ok: true, status: 200, json: () => Promise.resolve({}) };
    }),
  );
}

export function mockTeamApiFetch() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/api/roles')) {
        return {
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve([
              { id: 'role-1', roleName: 'Admin' },
              { id: 'role-2', roleName: 'Promoter' },
            ]),
        };
      }
      if (url.includes('/api/venues')) {
        return {
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve([
              { id: 'ven-1', name: 'Hall A', organizationId: 'org-1', createdAt: '2026-01-01T00:00:00Z' },
            ]),
        };
      }
      if (url.includes('/api/invitations') && init?.method === 'POST') {
        return {
          ok: true,
          status: 201,
          json: () =>
            Promise.resolve({
              id: 'inv-new',
              email: 'new@example.com',
              roleName: 'Promoter',
              status: 'pending',
              venueScopes: [],
            }),
        };
      }
      if (url.includes('/api/invitations')) {
        return { ok: true, status: 200, json: () => Promise.resolve([]) };
      }
      if (url.includes('/api/users')) {
        return { ok: true, status: 200, json: () => Promise.resolve([]) };
      }
      return { ok: true, status: 200, json: () => Promise.resolve([]) };
    }),
  );
}
