import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowsRotate, faBuilding, faCalendarDays, faGauge } from '@fortawesome/free-solid-svg-icons';
import { getAppPath } from '@/lib/appRoute';
import { GLOBAL_NAV_ITEMS, navigateToAccountingWithVenueScope, resolveActiveGlobalNavId, type GlobalNavId } from '@/lib/globalNav';
import { useCanManageEvents } from '@/hooks/useCanManageEvents';
import { useActiveVenue } from '@/venue/useActiveVenue';

const NAV_ICONS: Record<GlobalNavId, typeof faGauge> = {
  dashboard: faGauge,
  venues: faBuilding,
  booking: faCalendarDays,
  accounting: faArrowsRotate,
};

export interface GlobalNavProps {
  onNavigate?: () => void;
  className?: string;
}

export function GlobalNav({ onNavigate, className }: GlobalNavProps) {
  const canViewFinancials = useCanManageEvents();
  const { isAllVenuesSelected, venues, activateVenueId } = useActiveVenue();
  const currentPath = getAppPath();
  const activeId = resolveActiveGlobalNavId(currentPath);

  const visibleItems = GLOBAL_NAV_ITEMS.filter(
    (item) => item.id !== 'accounting' || canViewFinancials,
  );

  const handleNavigate = (itemId: GlobalNavId, navigate?: () => void) => {
    if (!navigate) {
      return;
    }
    if (itemId === 'accounting') {
      navigateToAccountingWithVenueScope(isAllVenuesSelected, venues, activateVenueId);
    } else {
      navigate();
    }
    onNavigate?.();
  };

  return (
    <nav className={className ?? 'global-nav'} aria-label="Global">
      <ul className="global-nav__list">
        {visibleItems.map((item) => {
          const isActive = activeId === item.id;
          const isDisabled = Boolean(item.disabled);

          return (
            <li key={item.id} className="global-nav__item-wrap">
              <button
                type="button"
                className={`global-nav__item${isActive ? ' global-nav__item--active' : ''}${
                  isDisabled ? ' global-nav__item--disabled' : ''
                }`}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
                aria-disabled={isDisabled || undefined}
                tabIndex={isDisabled ? -1 : undefined}
                data-testid={`global-nav-${item.id}`}
                onClick={() => {
                  if (isDisabled) {
                    return;
                  }
                  handleNavigate(item.id, item.navigate);
                }}
              >
                <span className="global-nav__icon" aria-hidden="true">
                  <FontAwesomeIcon icon={NAV_ICONS[item.id]} />
                </span>
                <span className="global-nav__label">
                  {item.label}
                  {isDisabled ? (
                    <span className="global-nav__coming-soon">Coming soon</span>
                  ) : null}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
