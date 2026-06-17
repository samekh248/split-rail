import { getAppPath, navigateToIntegrationsSettings, navigateToOrganizationSettings, navigateToSettings, navigateToTeamSettings } from '@/lib/appRoute';
import { useCanManageTeam } from '@/hooks/useCanManageTeam';

export function SettingsNav() {
  const currentPath = getAppPath();
  const canManageTeam = useCanManageTeam();

  const items = [
    ...(canManageTeam
      ? [{ id: 'team', label: 'Team', path: '/settings/team' as const, onClick: navigateToTeamSettings }]
      : []),
    {
      id: 'organization',
      label: 'Organization',
      path: '/settings/organization' as const,
      onClick: navigateToOrganizationSettings,
    },
    {
      id: 'integrations',
      label: 'Integrations',
      path: '/settings/integrations' as const,
      onClick: navigateToIntegrationsSettings,
    },
  ];

  return (
    <nav className="settings-nav" aria-label="Settings">
      <button
        type="button"
        className={`settings-nav__item${currentPath === '/settings' ? ' settings-nav__item--active' : ''}`}
        aria-current={currentPath === '/settings' ? 'page' : undefined}
        onClick={() => navigateToSettings()}
      >
        Overview
      </button>
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className={`settings-nav__item${currentPath === item.path ? ' settings-nav__item--active' : ''}`}
          aria-current={currentPath === item.path ? 'page' : undefined}
          onClick={item.onClick}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}
