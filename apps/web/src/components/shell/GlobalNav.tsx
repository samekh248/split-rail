import { getAppPath } from '@/lib/appRoute';
import { GLOBAL_NAV_ITEMS, resolveActiveGlobalNavId } from '@/lib/globalNav';

export interface GlobalNavProps {
  onNavigate?: () => void;
  className?: string;
}

export function GlobalNav({ onNavigate, className }: GlobalNavProps) {
  const currentPath = getAppPath();
  const activeId = resolveActiveGlobalNavId(currentPath);

  return (
    <nav className={className ?? 'global-nav'} aria-label="Global">
      <ul className="global-nav__list">
        {GLOBAL_NAV_ITEMS.map((item) => {
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
                  if (isDisabled || !item.navigate) {
                    return;
                  }
                  item.navigate();
                  onNavigate?.();
                }}
              >
                <span className="global-nav__icon" aria-hidden="true">
                  {item.label.charAt(0)}
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
