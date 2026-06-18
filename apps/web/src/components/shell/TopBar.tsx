import type { ReactNode, Ref } from 'react';
import { useUserProfile } from '@/api/user';

export interface TopBarProps {
  contextualContent?: ReactNode;
  onOpenMobileNav?: () => void;
  showMobileMenu?: boolean;
  mobileTriggerRef?: Ref<HTMLButtonElement>;
}

export function TopBar({
  contextualContent,
  onOpenMobileNav,
  showMobileMenu,
  mobileTriggerRef,
}: TopBarProps) {
  const { data: profile } = useUserProfile();
  const organizationName = profile?.organization?.name ?? 'Your organization';

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
      {contextualContent ? (
        <div className="top-bar__context" data-testid="top-bar-context">
          {contextualContent}
        </div>
      ) : null}
    </header>
  );
}
