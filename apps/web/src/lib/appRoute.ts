import { useEffect, useState } from 'react';
import { captureSettingsReturnPath, readSettingsReturnPath } from '@/lib/settingsReturnStorage';

export type DashboardPath = '/' | '/venues';

export type AppPath =
  | DashboardPath
  | '/booking'
  | '/accounting'
  | '/settings'
  | '/settings/account'
  | '/settings/team'
  | '/settings/organization'
  | '/settings/integrations'
  | '/accept-invite';

const WORKSPACE_PATH_PATTERN = /^\/venues\/([^/]+)\/events\/([^/]+)\/?$/;
const FESTIVAL_ITINERARY_PATH_PATTERN = /^\/venues\/([^/]+)\/festivals\/([^/]+)\/itinerary\/?$/;
const FESTIVAL_LEDGER_PATH_PATTERN =
  /^\/venues\/([^/]+)\/festivals\/([^/]+)\/ledger\/?$/;
const FESTIVAL_REPORTS_PATH_PATTERN =
  /^\/venues\/([^/]+)\/festivals\/([^/]+)\/reports\/?$/;
const BLOCK_SETTLEMENT_PATH_PATTERN =
  /^\/venues\/([^/]+)\/festivals\/([^/]+)\/blocks\/([^/]+)\/settlement\/?$/;

function normalizeAppPathname(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.replace(/\/+$/, '');
  }
  return pathname;
}

export function isEventWorkspacePath(pathname: string): boolean {
  return WORKSPACE_PATH_PATTERN.test(pathname);
}

export function isEventOrFestivalWorkspacePath(pathname: string): boolean {
  return (
    isEventWorkspacePath(pathname)
    || isFestivalItineraryPath(pathname)
    || isFestivalLedgerPath(pathname)
    || isFestivalReportsPath(pathname)
    || isBlockSettlementPath(pathname)
  );
}

export function isFestivalItineraryPath(pathname: string): boolean {
  return FESTIVAL_ITINERARY_PATH_PATTERN.test(pathname);
}

export function isFestivalLedgerPath(pathname: string): boolean {
  return FESTIVAL_LEDGER_PATH_PATTERN.test(pathname);
}

export function isFestivalReportsPath(pathname: string): boolean {
  return FESTIVAL_REPORTS_PATH_PATTERN.test(pathname);
}

export function isBlockSettlementPath(pathname: string): boolean {
  return BLOCK_SETTLEMENT_PATH_PATTERN.test(pathname);
}

export function buildBlockSettlementPath(venueId: string, eventId: string, blockId: string): string {
  return `/venues/${venueId}/festivals/${eventId}/blocks/${blockId}/settlement`;
}

export function parseBlockSettlementPath(
  pathname: string,
): { venueId: string; eventId: string; blockId: string } | null {
  const match = pathname.match(BLOCK_SETTLEMENT_PATH_PATTERN);
  if (!match) {
    return null;
  }
  return { venueId: match[1], eventId: match[2], blockId: match[3] };
}

export function buildFestivalItineraryPath(venueId: string, eventId: string): string {
  return `/venues/${venueId}/festivals/${eventId}/itinerary`;
}

export function buildFestivalLedgerPath(venueId: string, eventId: string): string {
  return `/venues/${venueId}/festivals/${eventId}/ledger`;
}

export function buildFestivalReportsPath(venueId: string, eventId: string): string {
  return `/venues/${venueId}/festivals/${eventId}/reports`;
}

export function parseFestivalItineraryPath(
  pathname: string,
): { venueId: string; eventId: string } | null {
  const match = pathname.match(FESTIVAL_ITINERARY_PATH_PATTERN);
  if (!match) {
    return null;
  }
  return { venueId: match[1], eventId: match[2] };
}

export function parseFestivalLedgerPath(
  pathname: string,
): { venueId: string; eventId: string } | null {
  const match = pathname.match(FESTIVAL_LEDGER_PATH_PATTERN);
  if (!match) {
    return null;
  }
  return { venueId: match[1], eventId: match[2] };
}

export function parseFestivalReportsPath(
  pathname: string,
): { venueId: string; eventId: string } | null {
  const match = pathname.match(FESTIVAL_REPORTS_PATH_PATTERN);
  if (!match) {
    return null;
  }
  return { venueId: match[1], eventId: match[2] };
}

export function buildEventWorkspacePath(
  venueId: string,
  eventId: string,
  focus?: string,
): string {
  const base = `/venues/${venueId}/events/${eventId}`;
  if (!focus) {
    return base;
  }
  return `${base}?focus=${encodeURIComponent(focus)}`;
}

export function parseEventWorkspacePath(
  pathname: string,
): { venueId: string; eventId: string } | null {
  const match = pathname.match(WORKSPACE_PATH_PATTERN);
  if (!match) {
    return null;
  }
  return { venueId: match[1], eventId: match[2] };
}

export function getWorkspaceFocusFromUrl(): string | null {
  return new URLSearchParams(window.location.search).get('focus');
}

const BOOKING_MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export function defaultBookingMonth(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function parseBookingMonth(value: string | null | undefined): string | null {
  if (!value || !BOOKING_MONTH_PATTERN.test(value)) {
    return null;
  }
  return value;
}

export function getBookingMonthFromUrl(): string | null {
  return parseBookingMonth(new URLSearchParams(window.location.search).get('month'));
}

const BOOKING_VENUE_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseBookingVenueId(value: string | null | undefined): string | null {
  if (!value || !BOOKING_VENUE_ID_PATTERN.test(value)) {
    return null;
  }
  return value;
}

export function getBookingVenueFromUrl(): string | null {
  return parseBookingVenueId(new URLSearchParams(window.location.search).get('venue'));
}

export function resolveBookingMonthFromUrl(): string {
  return getBookingMonthFromUrl() ?? defaultBookingMonth();
}

export function buildBookingPath(month?: string, venueId?: string | null): string {
  const valid = parseBookingMonth(month) ?? defaultBookingMonth();
  const params = new URLSearchParams({ month: valid });
  const venue = venueId === undefined ? getBookingVenueFromUrl() : parseBookingVenueId(venueId);
  if (venue) {
    params.set('venue', venue);
  }
  return `/booking?${params.toString()}`;
}

export function pushPath(path: string): void {
  window.history.pushState(null, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function replacePath(path: string): void {
  window.history.replaceState(null, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function getAppPath(): AppPath | string {
  const pathname = normalizeAppPathname(window.location.pathname);
  if (isEventWorkspacePath(pathname)) {
    return pathname;
  }
  if (
    isFestivalItineraryPath(pathname)
    || isFestivalLedgerPath(pathname)
    || isFestivalReportsPath(pathname)
    || isBlockSettlementPath(pathname)
  ) {
    return pathname;
  }
  switch (pathname) {
    case '/venues':
      return '/venues';
    case '/settings':
      return '/settings';
    case '/settings/account':
      return '/settings/account';
    case '/settings/team':
      return '/settings/team';
    case '/settings/organization':
      return '/settings/organization';
    case '/settings/integrations':
      return '/settings/integrations';
    case '/accept-invite':
      return '/accept-invite';
    case '/accounting':
      return '/accounting';
    case '/booking':
      return '/booking';
    default:
      return '/';
  }
}

export function getDashboardPath(): DashboardPath {
  const path = getAppPath();
  if (path === '/venues') {
    return '/venues';
  }
  return '/';
}

export function getInviteTokenFromUrl(): string | null {
  if (getAppPath() !== '/accept-invite') {
    return null;
  }
  return new URLSearchParams(window.location.search).get('token');
}

export function navigateToVenues(): void {
  pushPath('/venues');
}

export function navigateToDashboard(): void {
  pushPath('/');
}

/** Ends an authenticated route without retaining it in browser history. */
export function navigateToSignIn(): void {
  replacePath('/');
}

export function navigateToAccounting(): void {
  pushPath('/accounting');
}

export function navigateToBooking(month?: string): void {
  pushPath(buildBookingPath(month));
}

export function navigateToBookingVenue(venueId: string): void {
  pushPath(buildBookingPath(undefined, venueId));
}

export function navigateToBookingMonth(month: string): void {
  const next = buildBookingPath(month);
  const current = `${window.location.pathname}${window.location.search}`;
  if (current === next) {
    return;
  }
  pushPath(next);
}

export function navigateToSettings(): void {
  captureSettingsReturnPath(getAppPath());
  pushPath('/settings');
}

export function navigateReturnToApp(): void {
  pushPath(readSettingsReturnPath());
}

export function navigateToTeamSettings(): void {
  pushPath('/settings/team');
}

export function navigateToAccountSettings(): void {
  pushPath('/settings/account');
}

export function navigateToOrganizationSettings(): void {
  pushPath('/settings/organization');
}

export function navigateToIntegrationsSettings(): void {
  pushPath('/settings/integrations');
}

export function navigateToAcceptInvite(token: string): void {
  pushPath(`/accept-invite?token=${encodeURIComponent(token)}`);
}

export function useAppRoute(): AppPath | string {
  const [path, setPath] = useState<AppPath | string>(() => getAppPath());

  useEffect(() => {
    const onPopState = () => setPath(getAppPath());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  return path;
}

export function useDashboardRoute(): DashboardPath {
  const appPath = useAppRoute();
  if (appPath === '/venues') {
    return '/venues';
  }
  return '/';
}

export interface EventWorkspaceRouteParams {
  venueId: string;
  eventId: string;
  focus: string | null;
}

export function useEventWorkspaceRoute(): EventWorkspaceRouteParams | null {
  const [, setRouteRevision] = useState(0);

  useEffect(() => {
    const onPopState = () => setRouteRevision((revision) => revision + 1);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const params = parseEventWorkspacePath(window.location.pathname);
  if (!params) {
    return null;
  }

  return {
    ...params,
    focus: getWorkspaceFocusFromUrl(),
  };
}

export function useBookingCalendarMonth(): string {
  const [, setRouteRevision] = useState(0);

  useEffect(() => {
    const onPopState = () => setRouteRevision((revision) => revision + 1);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const month = resolveBookingMonthFromUrl();

  useEffect(() => {
    if (getAppPath() !== '/booking') {
      return;
    }
    const next = buildBookingPath(month);
    const current = `${window.location.pathname}${window.location.search}`;
    if (current !== next) {
      replacePath(next);
    }
  }, [month]);

  return month;
}
