import type { Ref } from 'react';

export interface TopBarProps {
  organizationName: string;
  onOpenMobileNav?: () => void;
  showMobileMenu?: boolean;
  mobileTriggerRef?: Ref<HTMLButtonElement>;
}

export function TopBar({
  organizationName,
  onOpenMobileNav,
  showMobileMenu,
  mobileTriggerRef,
}: TopBarProps) {
  return (
    <header className="top-bar" data-testid="top-bar">
      <div className="top-bar__leading">
        {showMobileMenu ? (
          <button
            ref={mobileTriggerRef}
            type="button"
            className="top-bar__menu-button"
            aria-label="Open navigation menu"
            data-testid="mobile-nav-open"
            onClick={onOpenMobileNav}
          >
            ☰
          </button>
        ) : null}
        <span className="top-bar__org-name" data-testid="top-bar-org-name">
          {organizationName}
        </span>
      </div>
    </header>
  );
}
