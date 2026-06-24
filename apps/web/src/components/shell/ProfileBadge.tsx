import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/auth/useAuth';
import { useUserProfile } from '@/api/user';

export interface ProfileBadgeProps {
  showDisplayName?: boolean;
  onMenuAction?: () => void;
}

function displayNameFromEmail(email: string | null | undefined): string {
  if (!email) {
    return 'User';
  }
  const local = email.split('@')[0];
  return local || email;
}

function initialsFromEmail(email: string | null | undefined): string {
  const name = displayNameFromEmail(email);
  return name.charAt(0).toUpperCase() || '?';
}

export function ProfileBadge({ showDisplayName = true, onMenuAction }: ProfileBadgeProps) {
  const { logout } = useAuth();
  const { data: profile } = useUserProfile();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const email = profile?.email ?? null;
  const displayName = displayNameFromEmail(email);
  const initials = initialsFromEmail(email);

  useEffect(() => {
    if (!open) {
      return;
    }

    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const firstItem = menuRef.current?.querySelector<HTMLElement>('button');
    firstItem?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handlePointerDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handlePointerDown);
      previousFocusRef.current?.focus();
    };
  }, [open]);

  const closeMenu = () => setOpen(false);

  const handleSignOut = () => {
    closeMenu();
    onMenuAction?.();
    void logout();
  };

  return (
    <div className="profile-badge" ref={menuRef}>
      <button
        type="button"
        className="profile-badge__trigger"
        aria-expanded={open}
        aria-haspopup="menu"
        data-testid="profile-badge-trigger"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="profile-badge__avatar" aria-hidden="true">
          {initials}
        </span>
        {showDisplayName ? (
          <span className="profile-badge__name" data-testid="profile-badge-name">
            {displayName}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="profile-badge__menu" role="menu" data-testid="profile-badge-menu">
          <button type="button" role="menuitem" className="profile-badge__menu-item" onClick={handleSignOut}>
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}
