import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import {
  getAppPath,
  navigateReturnToApp,
  navigateToIntegrationsSettings,
  navigateToOrganizationSettings,
  navigateToSettings,
  navigateToTeamSettings,
} from '@/lib/appRoute';
import { useCanManageTeam } from '@/hooks/useCanManageTeam';
import { useIsAdmin } from '@/hooks/useIsAdmin';

export interface SettingsNavProps {
  variant?: 'sidebar' | 'horizontal';
  showLabels?: boolean;
  onNavigate?: () => void;
}

type SettingsNavItem = {
  id: string;
  label: string;
  path: '/settings' | '/settings/team' | '/settings/organization' | '/settings/integrations';
  onClick: () => void;
};

export function SettingsNav({
  variant = 'sidebar',
  showLabels = true,
  onNavigate,
}: SettingsNavProps) {
  const currentPath = getAppPath();
  const canManageTeam = useCanManageTeam();
  const isAdmin = useIsAdmin();
  const isSidebar = variant === 'sidebar';
  const iconsOnly = isSidebar && !showLabels;

  const items: SettingsNavItem[] = [
    {
      id: 'overview',
      label: 'Overview',
      path: '/settings',
      onClick: navigateToSettings,
    },
    ...(canManageTeam
      ? [
          {
            id: 'team',
            label: 'Team',
            path: '/settings/team' as const,
            onClick: navigateToTeamSettings,
          },
        ]
      : []),
    {
      id: 'organization',
      label: 'Organization',
      path: '/settings/organization',
      onClick: navigateToOrganizationSettings,
    },
    ...(isAdmin
      ? [
          {
            id: 'integrations',
            label: 'Integrations',
            path: '/settings/integrations' as const,
            onClick: navigateToIntegrationsSettings,
          },
        ]
      : []),
  ];

  const handleReturnToApp = () => {
    navigateReturnToApp();
    onNavigate?.();
  };

  const handleItemClick = (onClick: () => void) => {
    onClick();
    onNavigate?.();
  };

  if (isSidebar) {
    return (
      <nav
        className={`settings-nav settings-nav--sidebar global-nav${iconsOnly ? ' global-nav--icons-only' : ''}`}
        aria-label="Settings"
        data-testid="settings-sidebar-nav"
      >
        <ul className="global-nav__list">
          <li className="global-nav__item-wrap">
            <button
              type="button"
              className="global-nav__item settings-nav__return"
              data-testid="settings-return-to-app"
              onClick={handleReturnToApp}
            >
              <span className="global-nav__icon" aria-hidden="true">
                <FontAwesomeIcon icon={faArrowLeft} className="settings-nav__return-icon" />
              </span>
              <span className="global-nav__label">Return to App</span>
            </button>
          </li>
          {items.map((item) => {
            const isActive = currentPath === item.path;
            return (
              <li key={item.id} className="global-nav__item-wrap">
                <button
                  type="button"
                  className={`global-nav__item${isActive ? ' global-nav__item--active' : ''}`}
                  aria-current={isActive ? 'page' : undefined}
                  data-testid={`settings-nav-${item.id}`}
                  onClick={() => handleItemClick(item.onClick)}
                >
                  <span className="global-nav__icon" aria-hidden="true">
                    {item.label.charAt(0)}
                  </span>
                  <span className="global-nav__label">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    );
  }

  return (
    <nav className="settings-nav settings-nav--horizontal" aria-label="Settings">
      <button
        type="button"
        className={`settings-nav__item${currentPath === '/settings' ? ' settings-nav__item--active' : ''}`}
        aria-current={currentPath === '/settings' ? 'page' : undefined}
        onClick={() => handleItemClick(navigateToSettings)}
      >
        Overview
      </button>
      {items
        .filter((item) => item.id !== 'overview')
        .map((item) => (
          <button
            key={item.id}
            type="button"
            className={`settings-nav__item${currentPath === item.path ? ' settings-nav__item--active' : ''}`}
            aria-current={currentPath === item.path ? 'page' : undefined}
            onClick={() => handleItemClick(item.onClick)}
          >
            {item.label}
          </button>
        ))}
    </nav>
  );
}
