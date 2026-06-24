import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useEffect, useRef, type RefObject } from 'react';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { GlobalNav } from './GlobalNav';
import { ProfileBadge } from './ProfileBadge';
import type { SidebarNavigationMode } from './SidebarRail';

function refCurrent<T extends HTMLElement>(ref?: RefObject<T | null>): T | null {
  return ref?.current ?? null;
}

export interface MobileNavDrawerProps {
  open: boolean;
  onClose: () => void;
  triggerRef?: RefObject<HTMLButtonElement | null>;
  navigationMode?: SidebarNavigationMode;
  navigation?: React.ReactNode;
}

export function MobileNavDrawer({
  open,
  onClose,
  triggerRef,
  navigationMode = 'global',
  navigation,
}: MobileNavDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    previousFocusRef.current = document.activeElement as HTMLElement | null;
    drawerRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
      if (event.key === 'Tab' && drawerRef.current) {
        const focusable = drawerRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) {
          return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      (refCurrent(triggerRef) ?? previousFocusRef.current)?.focus();
    };
  }, [open, onClose, triggerRef]);

  if (!open) {
    return null;
  }

  const navigationContent =
    navigation ??
    (navigationMode === 'settings' ? null : <GlobalNav onNavigate={onClose} />);

  return (
    <div className="mobile-nav-drawer" data-testid="mobile-nav-drawer">
      <button
        type="button"
        className="mobile-nav-drawer__backdrop"
        aria-label="Close navigation menu"
        data-testid="mobile-nav-backdrop"
        onClick={onClose}
      />
      <div
        ref={drawerRef}
        className="mobile-nav-drawer__panel"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        tabIndex={-1}
      >
        <div className="mobile-nav-drawer__header">
          <BrandLogo variant="text" className="mobile-nav-drawer__brand" />
          <button
            type="button"
            className="mobile-nav-drawer__close"
            aria-label="Close menu"
            data-testid="mobile-nav-close"
            onClick={onClose}
          >
            <FontAwesomeIcon
              icon={faXmark}
              className="mobile-nav-drawer__close-icon"
              aria-hidden="true"
            />
          </button>
        </div>
        {navigationContent}
        <div className="mobile-nav-drawer__profile">
          <ProfileBadge showDisplayName onMenuAction={onClose} />
        </div>
      </div>
    </div>
  );
}
