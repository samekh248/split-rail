import { useEffect, useId, useRef, useState } from 'react';
import { useActiveVenue } from '@/venue/useActiveVenue';

export function VenueSwitcher() {
  const { venues, activeVenueId, activeVenue, setActiveVenue, isLoading } = useActiveVenue();
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const labelId = useId();
  const listboxId = useId();

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
    const index = venues.findIndex((venue) => venue.id === activeVenueId);
    setHighlightIndex(index >= 0 ? index : 0);
  }, [venues, activeVenueId, open]);

  if (isLoading || venues.length === 0) {
    return null;
  }

  if (venues.length === 1) {
    return (
      <div
        className="venue-switcher venue-switcher--single"
        data-testid="venue-switcher"
      >
        <span className="venue-switcher__label" id={labelId}>
          Venue
        </span>
        <span
          className="venue-switcher__current"
          aria-labelledby={labelId}
          data-testid="venue-switcher-current"
        >
          {activeVenue?.name ?? 'Venue'}
        </span>
      </div>
    );
  }

  const selectVenue = (id: string) => {
    setActiveVenue(id);
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
      setHighlightIndex((index) => (index + 1) % venues.length);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightIndex((index) => (index - 1 + venues.length) % venues.length);
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      const venue = venues[highlightIndex];
      if (venue?.id) {
        selectVenue(venue.id);
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
          {activeVenue?.name ?? 'Select venue'}
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
          {venues.map((venue, index) => {
            const isActive = venue.id === activeVenueId;
            const isHighlighted = index === highlightIndex;
            return (
              <li key={venue.id} role="presentation">
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
                  data-testid={`venue-option-${venue.id}`}
                  onMouseEnter={() => setHighlightIndex(index)}
                  onClick={() => venue.id && selectVenue(venue.id)}
                >
                  <span>{venue.name}</span>
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
