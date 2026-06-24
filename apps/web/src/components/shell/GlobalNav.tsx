export interface GlobalNavProps {
  onNavigate?: () => void;
  className?: string;
}

function LedgerIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <path
        fill="currentColor"
        d="M2 2.75A1.75 1.75 0 0 1 3.75 1h8.5A1.75 1.75 0 0 1 14 2.75v10.5A1.75 1.75 0 0 1 12.25 15h-8.5A1.75 1.75 0 0 1 2 13.25V2.75Zm1.75-.25a.25.25 0 0 0-.25.25v10.5c0 .138.112.25.25.25h8.5a.25.25 0 0 0 .25-.25V2.75a.25.25 0 0 0-.25-.25h-8.5ZM5 5.5a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 0 1.5h-4.5A.75.75 0 0 1 5 5.5Zm0 3a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 0 1.5h-4.5A.75.75 0 0 1 5 8.5Zm0 3a.75.75 0 0 1 .75-.75h2.5a.75.75 0 0 1 0 1.5h-2.5A.75.75 0 0 1 5 11.5Z"
      />
    </svg>
  );
}

export function GlobalNav({ onNavigate, className }: GlobalNavProps) {
  return (
    <nav className={className ?? 'global-nav'} aria-label="Global">
      <ul className="global-nav__list">
        <li className="global-nav__item-wrap">
          <button
            type="button"
            className="global-nav__item global-nav__item--active"
            aria-label="Event ledger"
            aria-current="page"
            data-testid="global-nav-ledger"
            onClick={() => onNavigate?.()}
          >
            <span className="global-nav__icon" aria-hidden="true">
              <LedgerIcon />
            </span>
            <span className="global-nav__label">Event ledger</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}
