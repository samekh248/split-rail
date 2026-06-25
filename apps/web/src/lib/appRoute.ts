import { useEffect, useState } from 'react';
import { captureSettingsReturnPath, readSettingsReturnPath } from '@/lib/settingsReturnStorage';

export type DashboardPath = '/' | '/venues' | '/venues/new';

export type AppPath =
  | DashboardPath
  | '/booking'
  | '/accounting'
  | '/settings'
  | '/settings/team'
  | '/settings/organization'
  | '/settings/integrations'
  | '/accept-invite';

const WORKSPACE_PATH_PATTERN = /^\/venues\/([^/]+)\/events\/([^/]+)\/?$/;

export function isEventWorkspacePath(pathname: string): boolean {
  return WORKSPACE_PATH_PATTERN.test(pathname);
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

export function pushPath(path: string): void {
  window.history.pushState(null, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function replacePath(path: string): void {
  window.history.replaceState(null, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function getAppPath(): AppPath | string {
  const { pathname } = window.location;
  if (isEventWorkspacePath(pathname)) {
    return pathname;
  }
  switch (pathname) {
    case '/venues':
      return '/venues';
    case '/venues/new':
      return '/venues/new';
    case '/settings':
      return '/settings';
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
  if (path === '/venues/new') {
    return '/venues/new';
  }
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

export function navigateToCreateVenue(): void {
  pushPath('/venues/new');
}

export function navigateToDashboard(): void {
  pushPath('/');
}

export function navigateToAccounting(): void {
  pushPath('/accounting');
}

export function navigateToBooking(): void {
  pushPath('/booking');
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
  if (appPath === '/venues/new') {
    return '/venues/new';
  }
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
