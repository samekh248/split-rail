import { useEffect, useState } from 'react';

export type DashboardPath = '/' | '/venues/new';

export function getDashboardPath(): DashboardPath {
  if (window.location.pathname === '/venues/new') {
    return '/venues/new';
  }
  return '/';
}

export function navigateToCreateVenue(): void {
  window.history.pushState(null, '', '/venues/new');
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function navigateToDashboard(): void {
  window.history.pushState(null, '', '/');
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function useDashboardRoute(): DashboardPath {
  const [path, setPath] = useState<DashboardPath>(() => getDashboardPath());

  useEffect(() => {
    const onPopState = () => setPath(getDashboardPath());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  return path;
}
