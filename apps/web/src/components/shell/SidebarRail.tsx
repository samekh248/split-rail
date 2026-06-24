import type { ReactNode } from 'react';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { navigateToDashboard } from '@/lib/appRoute';
import { GlobalNav } from './GlobalNav';
import { NavPinButton } from './NavPinButton';
import { ProfileBadge } from './ProfileBadge';
import type { useSidebarState } from '@/hooks/useSidebarState';

type SidebarState = ReturnType<typeof useSidebarState>;

export type SidebarNavigationMode = 'global' | 'settings';

export interface SidebarRailProps {
  sidebar: SidebarState;
  navigationMode?: SidebarNavigationMode;
  navigation?: ReactNode;
  onNavigate?: () => void;
  footer?: ReactNode;
}

export function SidebarRail({
  sidebar,
  navigationMode = 'global',
  navigation,
  onNavigate,
  footer,
}: SidebarRailProps) {
  const {
    pinnedExpanded,
    hoverExpanded,
    pinNavigation,
    unpinNavigation,
    onRailPointerEnter,
    onRailPointerLeave,
  } = sidebar;

  const showLabels = pinnedExpanded || hoverExpanded;

  const handleBrandClick = () => {
    navigateToDashboard();
    onNavigate?.();
  };

  const navigationContent =
    navigation ??
    (navigationMode === 'settings' ? null : (
      <GlobalNav
        className={`global-nav${showLabels ? '' : ' global-nav--icons-only'}`}
        onNavigate={onNavigate}
      />
    ));

  const brandButton = (
    <button
      type="button"
      className="sidebar-rail__brand-button"
      data-testid="sidebar-brand"
      aria-label="Split Rail home"
      onClick={handleBrandClick}
    >
      <BrandLogo variant={showLabels ? 'text' : 'badge'} className="sidebar-rail__brand-logo" />
    </button>
  );

  return (
    <aside
      className={`sidebar-rail${showLabels ? ' sidebar-rail--expanded' : ' sidebar-rail--collapsed'}${
        hoverExpanded && !pinnedExpanded ? ' sidebar-rail--overlay' : ''
      }`}
      data-testid="sidebar-rail"
      onMouseEnter={onRailPointerEnter}
      onMouseLeave={onRailPointerLeave}
    >
      <div className="sidebar-rail__header">
        {pinnedExpanded ? (
          <>
            {brandButton}
            <NavPinButton variant="unpin" onClick={unpinNavigation} />
          </>
        ) : hoverExpanded ? (
          <>
            {brandButton}
            <NavPinButton variant="pin" onClick={pinNavigation} />
          </>
        ) : (
          brandButton
        )}
      </div>
      {navigationContent}
      <div className="sidebar-rail__footer">
        {footer ?? <ProfileBadge showDisplayName={showLabels} />}
      </div>
    </aside>
  );
}
