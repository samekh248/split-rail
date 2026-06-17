import { useEffect, useState } from 'react';

export type DashboardPath = '/' | '/venues/new';

export type AppPath =
  | DashboardPath
  | '/settings'
  | '/settings/team'
  | '/settings/organization'
  | '/settings/integrations'
  | '/accept-invite';

function pushPath(path: string): void {
  window.history.pushState(null, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function getAppPath(): AppPath {
  const { pathname } = window.location;
  switch (pathname) {
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
    default:
      return '/';
  }
}

export function getDashboardPath(): DashboardPath {
  return getAppPath() === '/venues/new' ? '/venues/new' : '/';
}

export function getInviteTokenFromUrl(): string | null {
  if (getAppPath() !== '/accept-invite') {
    return null;
  }
  return new URLSearchParams(window.location.search).get('token');
}

export function navigateToCreateVenue(): void {
  pushPath('/venues/new');
}

export function navigateToDashboard(): void {
  pushPath('/');
}

export function navigateToSettings(): void {
  pushPath('/settings');
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

export function useAppRoute(): AppPath {
  const [path, setPath] = useState<AppPath>(() => getAppPath());

  useEffect(() => {
    const onPopState = () => setPath(getAppPath());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  return path;
}

export function useDashboardRoute(): DashboardPath {
  const appPath = useAppRoute();
  return appPath === '/venues/new' ? '/venues/new' : '/';
}
