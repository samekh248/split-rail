import { vi } from 'vitest';
import {
  filterTonightEvents,
  partitionRecentEvents,
  partitionUpcomingEvents,
} from '@/lib/partitionOverviewZones';
import type {
  DashboardResponse,
  EventCardDto,
  EventResponse,
  PermissionsDto,
  VenueResponse,
} from '@/types/generated-api';
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
  dashboardByVenue?: Record<string, DashboardResponse>;
  venueQboStatusByVenue?: Record<string, { venueId: string; qboConnected: boolean; lastSyncedAt: string | null }>;
  venueSyncResultByVenue?: Record<string, unknown>;
  eventsError?: boolean;
  dashboardError?: boolean;
  pinError?: boolean;
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

function toEventCardDto(event: EventResponse, isPinned = false): EventCardDto {
  return {
    eventId: event.eventId,
    venueId: event.venueId,
    title: event.title,
    eventDate: event.eventDate,
    status: event.status,
    isBudgetLocked: event.isBudgetLocked,
    qboTagName: event.qboTagName,
    settledAt: event.settledAt,
    settlementPdfAvailable: event.settlementPdfAvailable ?? false,
    isPinned,
    hasVarianceConcern: false,
    unmappedCount: 0,
    lastSyncedAt: null,
  };
}

function buildDashboardFromEvents(
  venueId: string,
  events: EventResponse[],
  pinnedKeys: Set<string>,
): DashboardResponse {
  const cards = events.map((event) =>
    toEventCardDto(event, pinnedKeys.has(`${venueId}:${event.eventId}`)),
  );
  const tonightEvents = filterTonightEvents(events).map((event) =>
    toEventCardDto(event, pinnedKeys.has(`${venueId}:${event.eventId}`)),
  );
  const upcomingEvents = partitionUpcomingEvents(events).map((event) =>
    toEventCardDto(event, pinnedKeys.has(`${venueId}:${event.eventId}`)),
  );
  const recentEvents = partitionRecentEvents(events).map((event) =>
    toEventCardDto(event, pinnedKeys.has(`${venueId}:${event.eventId}`)),
  );
  const pinnedEvents = cards.filter((event) => event.isPinned);

  return {
    venueId,
    tonightEvents,
    pinnedEvents,
    upcomingEvents,
    recentEvents,
  };
}

function updateDashboardPinState(
  dashboard: DashboardResponse,
  eventId: string,
  pinned: boolean,
): DashboardResponse {
  const updateCard = (event: EventCardDto): EventCardDto =>
    event.eventId === eventId ? { ...event, isPinned: pinned } : event;

  let pinnedEvents = (dashboard.pinnedEvents ?? []).map(updateCard);
  const allEvents = [
    ...(dashboard.tonightEvents ?? []),
    ...(dashboard.upcomingEvents ?? []),
    ...(dashboard.recentEvents ?? []),
    ...pinnedEvents,
  ];
  const target = allEvents.find((event) => event.eventId === eventId);

  if (pinned && target && !pinnedEvents.some((event) => event.eventId === eventId)) {
    pinnedEvents = [...pinnedEvents, { ...target, isPinned: true }];
  }
  if (!pinned) {
    pinnedEvents = pinnedEvents.filter((event) => event.eventId !== eventId);
  }

  return {
    ...dashboard,
    tonightEvents: (dashboard.tonightEvents ?? []).map(updateCard),
    upcomingEvents: (dashboard.upcomingEvents ?? []).map(updateCard),
    recentEvents: (dashboard.recentEvents ?? []).map(updateCard),
    pinnedEvents,
  };
}

export function mockWorkspaceFetch(options: MockWorkspaceFetchOptions = {}) {
  const {
    profile = workspaceAdminProfile,
    venues = [],
    venuesOk = true,
    venuesStatus = 200,
    eventsByVenue = {},
    dashboardByVenue = {},
    eventsError = false,
    dashboardError = false,
    pinError = false,
    createdEvent,
    createdVenue = DEFAULT_CREATED_VENUE,
    createVenueStatus = 201,
    venueQboStatusByVenue = {},
    venueSyncResultByVenue = {},
  } = options;

  let venueList = [...venues];
  const eventLists: Record<string, EventResponse[]> = { ...eventsByVenue };
  const dashboardLists: Record<string, DashboardResponse> = { ...dashboardByVenue };
  const pinnedKeys = new Set<string>();

  for (const [venueId, dashboard] of Object.entries(dashboardLists)) {
    for (const event of dashboard.pinnedEvents ?? []) {
      if (event.eventId) {
        pinnedKeys.add(`${venueId}:${event.eventId}`);
      }
    }
  }

  const pinRequests: Array<{ method: string; venueId: string; eventId: string }> = [];

  const resolveDashboard = (venueId: string): DashboardResponse => {
    if (dashboardLists[venueId]) {
      return dashboardLists[venueId]!;
    }
    return buildDashboardFromEvents(venueId, eventLists[venueId] ?? [], pinnedKeys);
  };

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

      const pinMatch = url.match(/\/venues\/([^/]+)\/events\/([^/]+)\/pin$/);
      if (pinMatch && (method === 'PUT' || method === 'DELETE')) {
        if (pinError) {
          return {
            ok: false,
            status: 500,
            json: () => Promise.resolve({ detail: 'Pin failed' }),
          };
        }
        const venueId = pinMatch[1]!;
        const eventId = pinMatch[2]!;
        pinRequests.push({ method, venueId, eventId });
        const pinned = method === 'PUT';
        const key = `${venueId}:${eventId}`;
        if (pinned) {
          pinnedKeys.add(key);
        } else {
          pinnedKeys.delete(key);
        }
        const current = resolveDashboard(venueId);
        dashboardLists[venueId] = updateDashboardPinState(current, eventId, pinned);
        return { ok: true, status: 204, json: () => Promise.resolve(undefined) };
      }

      const dashboardGetMatch = url.match(/\/venues\/([^/]+)\/dashboard$/);
      if (dashboardGetMatch && method === 'GET') {
        if (dashboardError || eventsError) {
          return {
            ok: false,
            status: 500,
            json: () => Promise.resolve({ detail: 'Server error' }),
          };
        }
        const venueId = dashboardGetMatch[1]!;
        return {
          ok: true,
          status: 200,
          json: () => Promise.resolve(resolveDashboard(venueId)),
        };
      }

      const qboStatusMatch = url.match(/\/venues\/([^/]+)\/qbo\/status$/);
      if (qboStatusMatch && method === 'GET') {
        const venueId = qboStatusMatch[1]!;
        const status = venueQboStatusByVenue[venueId] ?? {
          venueId,
          qboConnected: false,
          lastSyncedAt: null,
        };
        return {
          ok: true,
          status: 200,
          json: () => Promise.resolve(status),
        };
      }

      const venueSyncMatch = url.match(/\/venues\/([^/]+)\/sync$/);
      if (venueSyncMatch && method === 'POST' && !url.includes('/events/')) {
        const venueId = venueSyncMatch[1]!;
        const result = venueSyncResultByVenue[venueId] ?? {
          venueId,
          attemptedCount: 0,
          succeededCount: 0,
          results: [],
        };
        return {
          ok: true,
          status: 200,
          json: () => Promise.resolve(result),
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

      if (url.includes('/venues') && !url.includes('/events') && !url.includes('/qbo/') && !url.endsWith('/sync') && method === 'GET') {
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

  return {
    get pinRequests() {
      return [...pinRequests];
    },
    getDashboard(venueId: string) {
      return resolveDashboard(venueId);
    },
  };
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
