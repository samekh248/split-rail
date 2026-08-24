import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { isEventOrFestivalWorkspacePath, navigateToBookingVenue, navigateToDashboard } from '@/lib/appRoute';
import { useActiveVenue } from '@/venue/useActiveVenue';
import { useRegions } from '@/api/regions';
import {
  buildGroupedSections,
  buildRegionFilterOptions,
  filterVenuesByRegion,
  type VenueRegionFilter,
} from '@/lib/venueListView';

export const ALL_VENUES_LABEL = 'All Venues';

type VenueOption =
  | { kind: 'all'; id: null; label: typeof ALL_VENUES_LABEL }
  | { kind: 'venue'; id: string; label: string }
  | { kind: 'header'; id: string; label: string; sectionKey: string };

export function VenueSwitcher() {
  const { venues, activeVenueId, setActiveVenue, isLoading } = useActiveVenue();
  const { data: regionsData, isLoading: regionsLoading } = useRegions();
  const regions = useMemo(() => (Array.isArray(regionsData) ? regionsData : []), [regionsData]);
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [regionFilter, setRegionFilter] = useState<VenueRegionFilter>('all');
  const containerRef = useRef<HTMLDivElement>(null);
  const labelId = useId();
  const listboxId = useId();

  const showRegionFilter = !regionsLoading && regions.length > 0;
  const filterOptions = useMemo(
    () => buildRegionFilterOptions(venues, regions),
    [venues, regions],
  );
  const filteredVenues = useMemo(
    () => filterVenuesByRegion(venues, regionFilter),
    [venues, regionFilter],
  );
  const groupedSections = useMemo(() => {
    if (!showRegionFilter || regionFilter !== 'all') {
      return null;
    }
    return buildGroupedSections(venues, regions, 'all').filter(
      (section) => section.venues.length > 0,
    );
  }, [showRegionFilter, regionFilter, venues, regions]);
  const isEmptyFilterResult =
    showRegionFilter && regionFilter !== 'all' && filteredVenues.length === 0;

  const options = useMemo<VenueOption[]>(() => {
    const allOption: VenueOption = { kind: 'all', id: null, label: ALL_VENUES_LABEL };
    if (groupedSections) {
      const grouped = groupedSections.flatMap((section) => [
        {
          kind: 'header' as const,
          id: `header-${section.sectionKey}`,
          label: section.title,
          sectionKey: section.sectionKey,
        },
        ...section.venues.map((venue) => ({
          kind: 'venue' as const,
          id: venue.id ?? '',
          label: venue.name ?? 'Venue',
        })),
      ]);
      return [allOption, ...grouped];
    }
    return [
      allOption,
      ...filteredVenues.map((venue) => ({
        kind: 'venue' as const,
        id: venue.id ?? '',
        label: venue.name ?? 'Venue',
      })),
    ];
  }, [groupedSections, filteredVenues]);

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
    const index = options.findIndex((option) => option.kind !== 'header' && option.id === activeVenueId);
    setHighlightIndex(index >= 0 ? index : 0);
  }, [options, activeVenueId, open]);

  if (isLoading || venues.length === 0) {
    return null;
  }

  const selectOption = (option: VenueOption) => {
    if (option.kind === 'header') {
      return;
    }
    if (option.kind === 'all') {
      setActiveVenue(null);
      if (isEventOrFestivalWorkspacePath(window.location.pathname)) {
        navigateToDashboard();
      }
    } else if (option.id) {
      setActiveVenue(option.id);
      if (isEventOrFestivalWorkspacePath(window.location.pathname)) {
        navigateToBookingVenue(option.id);
      }
    }
    setOpen(false);
  };

  const handleTriggerClick = () => {
    if (isEventOrFestivalWorkspacePath(window.location.pathname) && activeVenueId) {
      navigateToBookingVenue(activeVenueId);
      return;
    }
    setOpen((value) => !value);
  };

  const selectableIndexes = options.reduce<number[]>((indexes, option, index) => {
    if (option.kind !== 'header') {
      indexes.push(index);
    }
    return indexes;
  }, []);

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
    if (selectableIndexes.length === 0) {
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlightIndex((index) => {
        const currentPos = selectableIndexes.indexOf(index);
        const nextPos = currentPos === -1 ? 0 : (currentPos + 1) % selectableIndexes.length;
        return selectableIndexes[nextPos]!;
      });
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightIndex((index) => {
        const currentPos = selectableIndexes.indexOf(index);
        const prevPos =
          currentPos === -1
            ? selectableIndexes.length - 1
            : (currentPos - 1 + selectableIndexes.length) % selectableIndexes.length;
        return selectableIndexes[prevPos]!;
      });
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      const option = options[highlightIndex];
      if (option && option.kind !== 'header') {
        selectOption(option);
      }
    }
  };

  const handleTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (
      !open
      && (event.key === 'Enter' || event.key === ' ')
      && isEventOrFestivalWorkspacePath(window.location.pathname)
      && activeVenueId
    ) {
      event.preventDefault();
      navigateToBookingVenue(activeVenueId);
      return;
    }
    handleKeyDown(event);
  };

  return (
    <div className="venue-switcher" ref={containerRef} data-testid="venue-switcher">
      <div className="venue-switcher__cluster">
        <button
          type="button"
          className="venue-switcher__trigger"
          aria-haspopup={isEventOrFestivalWorkspacePath(window.location.pathname) ? undefined : 'listbox'}
          aria-expanded={isEventOrFestivalWorkspacePath(window.location.pathname) ? undefined : open}
          aria-controls={isEventOrFestivalWorkspacePath(window.location.pathname) ? undefined : listboxId}
          aria-labelledby={labelId}
          data-testid="venue-switcher-trigger"
          onClick={handleTriggerClick}
          onKeyDown={handleTriggerKeyDown}
        >
          <span className="venue-switcher__label" id={labelId}>
            Venue
          </span>
          <span className="venue-switcher__current" data-testid="venue-switcher-current">
            {currentLabel}
          </span>
        </button>
        <button
          type="button"
          className="venue-switcher__chevron-btn"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-label="Switch venue"
          data-testid="venue-switcher-menu-toggle"
          onClick={() => setOpen((value) => !value)}
          onKeyDown={handleKeyDown}
        >
          <span className="venue-switcher__chevron" aria-hidden="true">
            ▾
          </span>
        </button>
      </div>
      {open ? (
        <div className="venue-switcher__menu" data-testid="venue-switcher-menu">
          {showRegionFilter ? (
            <select
              className="venue-switcher__region-filter"
              aria-label="Filter by region"
              data-testid="venue-switcher-region-filter"
              value={regionFilter}
              onChange={(event) => setRegionFilter(event.target.value)}
            >
              {filterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : null}
          {isEmptyFilterResult ? (
            <p className="venue-switcher__empty" data-testid="venue-switcher-empty">
              No venues match this region.
            </p>
          ) : (
            <ul
              id={listboxId}
              role="listbox"
              aria-label="Venues"
              className="venue-switcher__list"
            >
              {options.map((option, index) => {
                if (option.kind === 'header') {
                  return (
                    <li
                      key={option.id}
                      role="presentation"
                      className={
                        option.sectionKey === 'unassigned'
                          ? 'venue-switcher__section-heading venue-switcher__section-heading--unassigned'
                          : 'venue-switcher__section-heading'
                      }
                      data-testid={`venue-switcher-section-${option.sectionKey}`}
                    >
                      {option.label}
                    </li>
                  );
                }

                const isActive =
                  option.kind === 'all' ? activeVenueId === null : option.id === activeVenueId;
                const isHighlighted = index === highlightIndex;
                const testId = option.kind === 'all' ? 'venue-option-all' : `venue-option-${option.id}`;
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
          )}
        </div>
      ) : null}
    </div>
  );
}
