import { useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEllipsisVertical } from '@fortawesome/free-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';

export interface KebabMenuItem {
  label: string;
  onSelect: () => void;
  testId?: string;
  destructive?: boolean;
  icon?: IconDefinition;
}

export interface KebabMenuProps {
  ariaLabel: string;
  items: KebabMenuItem[];
  testId?: string;
}

export function KebabMenu({ ariaLabel, items, testId = 'kebab-menu' }: KebabMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    previousFocusRef.current = document.activeElement as HTMLElement | null;
    menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();

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

  if (items.length === 0) {
    return null;
  }

  const closeMenu = () => setOpen(false);

  return (
    <div className="kebab-menu" ref={menuRef} data-testid={testId}>
      <button
        type="button"
        className="kebab-menu__trigger"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="menu"
        data-testid={`${testId}-trigger`}
        onClick={() => setOpen((value) => !value)}
      >
        <FontAwesomeIcon icon={faEllipsisVertical} aria-hidden="true" />
      </button>
      {open ? (
        <div className="kebab-menu__menu" role="menu" data-testid={`${testId}-panel`}>
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              className={
                item.destructive
                  ? 'kebab-menu__menu-item kebab-menu__menu-item--destructive btn-icon-label'
                  : 'kebab-menu__menu-item btn-icon-label'
              }
              data-testid={item.testId}
              onClick={() => {
                closeMenu();
                item.onSelect();
              }}
            >
              {item.icon ? <FontAwesomeIcon icon={item.icon} aria-hidden="true" /> : null}
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
