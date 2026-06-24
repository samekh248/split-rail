import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { isEventWorkspacePath, navigateToDashboard } from '@/lib/appRoute';
import { useActiveVenue } from '@/venue/useActiveVenue';

export const ALL_VENUES_LABEL = 'All Venues';

type VenueOption =
  | { kind: 'all'; id: null; label: typeof ALL_VENUES_LABEL }
  | { kind: 'venue'; id: string; label: string };

export function VenueSwitcher() {
  const { venues, activeVenueId, setActiveVenue, isLoading } = useActiveVenue();
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const labelId = useId();
  const listboxId = useId();

  const options = useMemo<VenueOption[]>(
    () => [
      { kind: 'all', id: null, label: ALL_VENUES_LABEL },
      ...venues.map((venue) => ({
        kind: 'venue' as const,
        id: venue.id ?? '',
        label: venue.name ?? 'Venue',
      })),
    ],
    [venues],
  );

  const currentLabel = useMemo(() => {
    if (activeVenueId === null) {
      return ALL_VENUES_LABEL;
    }
    return venues.find((venue) => venue.id === activeVenueId)?.name ?? 'Select venue';
  }, [activeVenueId, venues]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [open]);

  useEffect(() => {
    if (activeVenueId === null) {
      setHighlightIndex(0);
      return;
    }
    const index = options.findIndex((option) => option.id === activeVenueId);
    setHighlightIndex(index >= 0 ? index : 0);
  }, [options, activeVenueId, open]);

  if (isLoading || venues.length === 0) {
    return null;
  }

  const selectOption = (option: VenueOption) => {
    if (option.kind === 'all') {
      setActiveVenue(null);
      if (isEventWorkspacePath(window.location.pathname)) {
        navigateToDashboard();
      }
    } else if (option.id) {
      setActiveVenue(option.id);
    }
    setOpen(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (!open) {
      if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        setOpen(true);
      }
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlightIndex((index) => (index + 1) % options.length);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightIndex((index) => (index - 1 + options.length) % options.length);
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      const option = options[highlightIndex];
      if (option) {
        selectOption(option);
      }
    }
  };

  return (
    <div className="venue-switcher" ref={containerRef} data-testid="venue-switcher">
      <button
        type="button"
        className="venue-switcher__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-labelledby={labelId}
        data-testid="venue-switcher-trigger"
        onClick={() => setOpen((value) => !value)}
        onKeyDown={handleKeyDown}
      >
        <span className="venue-switcher__label" id={labelId}>
          Venue
        </span>
        <span className="venue-switcher__current" data-testid="venue-switcher-current">
          {currentLabel}
        </span>
        <span className="venue-switcher__chevron" aria-hidden="true">
          ▾
        </span>
      </button>
      {open ? (
        <ul
          id={listboxId}
          role="listbox"
          aria-label="Venues"
          className="venue-switcher__menu"
          data-testid="venue-switcher-menu"
        >
          {options.map((option, index) => {
            const isActive =
              option.kind === 'all' ? activeVenueId === null : option.id === activeVenueId;
            const isHighlighted = index === highlightIndex;
            const testId =
              option.kind === 'all'
                ? 'venue-option-all'
                : `venue-option-${option.id}`;
            return (
              <li key={option.kind === 'all' ? 'all' : option.id} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  className={[
                    'venue-switcher__option',
                    isActive ? 'venue-switcher__option--active' : '',
                    isHighlighted ? 'venue-switcher__option--highlighted' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  data-testid={testId}
                  onMouseEnter={() => setHighlightIndex(index)}
                  onClick={() => selectOption(option)}
                >
                  <span>{option.label}</span>
                  {isActive ? (
                    <span className="venue-switcher__check" aria-hidden="true">
                      ✓
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
