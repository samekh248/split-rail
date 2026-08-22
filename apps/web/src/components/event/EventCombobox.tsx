import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { PinToggleButton } from '@/components/PinToggleButton';
import { formatEventDateRange } from '@/lib/eventDateRange';
import type { EventResponse } from '@/types/generated-api';
import {
  formatStatusBadgeLabel,
  resolveDeleteActionHint,
  resolveEditActionHint,
} from '@/venue/eventCardLabel';
import {
  canDeleteEvent,
  canEditEventMetadata,
} from '@/venue/eventLifecycle';
import { filterEvents } from '@/venue/eventSelection';

export interface EventComboboxProps {
  events: EventResponse[];
  selectedEventId: string | null;
  canManageEvents: boolean;
  onSelect: (eventId: string) => void;
  onCreateClick?: () => void;
  onEditClick?: (event: EventResponse) => void;
  onDeleteClick?: (event: EventResponse) => void;
  isPinned?: boolean;
  onPinToggle?: () => void;
}

export function EventCombobox({
  events,
  selectedEventId,
  canManageEvents,
  onSelect,
  onCreateClick,
  onEditClick,
  onDeleteClick,
  isPinned = false,
  onPinToggle,
}: EventComboboxProps) {
  const [open, setOpen] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const labelId = useId();
  const listboxId = useId();
  const filterId = useId();

  const filteredEvents = useMemo(
    () => filterEvents(events, filterQuery),
    [events, filterQuery],
  );

  const selectedEvent = events.find((event) => event.eventId === selectedEventId) ?? null;

  const pinButton =
    selectedEvent?.eventId && onPinToggle ? (
      <PinToggleButton
        pinned={isPinned}
        pinnedLabel={
          selectedEvent.eventType === 'FESTIVAL' ? 'Unpin festival' : 'Unpin event'
        }
        unpinnedLabel={
          selectedEvent.eventType === 'FESTIVAL' ? 'Pin festival' : 'Pin event'
        }
        testId={`event-combobox-pin-${selectedEvent.eventId}`}
        className="event-combobox__pin"
        onToggle={onPinToggle}
      />
    ) : null;

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
    const index = filteredEvents.findIndex((event) => event.eventId === selectedEventId);
    setHighlightIndex(index >= 0 ? index : 0);
  }, [filteredEvents, selectedEventId, open]);

  const selectEvent = (eventId: string) => {
    onSelect(eventId);
    setOpen(false);
    setFilterQuery('');
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
    if (filteredEvents.length === 0) {
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlightIndex((index) => (index + 1) % filteredEvents.length);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightIndex((index) => (index - 1 + filteredEvents.length) % filteredEvents.length);
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      const item = filteredEvents[highlightIndex];
      if (item?.eventId) {
        selectEvent(item.eventId);
      }
    }
  };

  if (events.length === 1 && selectedEvent) {
    return (
      <div className="event-combobox event-combobox--single" data-testid="event-combobox">
        <span className="event-combobox__label" id={labelId}>
          Event
        </span>
        <span className="event-combobox__current" data-testid="event-combobox-current">
          {selectedEvent.title} · {formatEventDateRange(selectedEvent.eventDate, selectedEvent.endDate)}
        </span>
        {pinButton}
      </div>
    );
  }

  return (
    <div className="event-combobox" ref={containerRef} data-testid="event-combobox">
      <div className="event-combobox__surface">
        <button
          type="button"
          className="event-combobox__trigger"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-labelledby={labelId}
          data-testid="event-combobox-trigger"
          onClick={() => setOpen((value) => !value)}
          onKeyDown={handleKeyDown}
        >
          <span className="event-combobox__label" id={labelId}>
            Event
          </span>
          <span className="event-combobox__current" data-testid="event-combobox-current">
            {selectedEvent
              ? `${selectedEvent.title} · ${formatEventDateRange(selectedEvent.eventDate, selectedEvent.endDate)}`
              : 'Select event'}
          </span>
          <span className="event-combobox__chevron" aria-hidden="true">
            ▾
          </span>
        </button>
        {pinButton}
      </div>
      {open ? (
        <div className="event-combobox__panel" data-testid="event-combobox-menu">
          <input
            id={filterId}
            type="search"
            className="event-combobox__filter"
            placeholder="Filter by title or date"
            aria-label="Filter events"
            data-testid="event-combobox-filter"
            value={filterQuery}
            onChange={(event) => setFilterQuery(event.target.value)}
          />
          {canManageEvents && onCreateClick ? (
            <button
              type="button"
              className="event-combobox__create"
              data-testid="event-combobox-create"
              onClick={() => {
                setOpen(false);
                onCreateClick();
              }}
            >
              Create event
            </button>
          ) : null}
          {filteredEvents.length === 0 ? (
            <p className="event-combobox__empty" data-testid="event-combobox-no-results">
              No matching events
            </p>
          ) : (
            <ul id={listboxId} role="listbox" aria-label="Events" className="event-combobox__menu">
              {filteredEvents.map((event, index) => {
                const isActive = event.eventId === selectedEventId;
                const isHighlighted = index === highlightIndex;
                const metadataEditable = canEditEventMetadata(event);
                const deletable = canDeleteEvent(event);
                const editHint = resolveEditActionHint(event.status, event.isBudgetLocked);
                const deleteHint = resolveDeleteActionHint(event.status, event.isBudgetLocked);
                return (
                  <li key={event.eventId} role="presentation" className="event-combobox__row">
                    <button
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      className={[
                        'event-combobox__option',
                        isActive ? 'event-combobox__option--active' : '',
                        isHighlighted ? 'event-combobox__option--highlighted' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      data-testid={`event-option-${event.eventId}`}
                      onMouseEnter={() => setHighlightIndex(index)}
                      onClick={() => event.eventId && selectEvent(event.eventId)}
                    >
                      <span className="event-combobox__option-title">{event.title}</span>
                      <span className="event-combobox__option-meta">
                        {formatEventDateRange(event.eventDate, event.endDate)} · {formatStatusBadgeLabel(event.status, event.isBudgetLocked)}
                      </span>
                      {isActive ? (
                        <span className="event-combobox__check" aria-hidden="true">
                          ✓
                        </span>
                      ) : null}
                    </button>
                    {canManageEvents ? (
                      <div className="event-combobox__actions">
                        {metadataEditable && onEditClick ? (
                          <button
                            type="button"
                            className="event-combobox__action"
                            data-testid={`event-edit-${event.eventId}`}
                            onClick={() => onEditClick(event)}
                          >
                            Edit
                          </button>
                        ) : null}
                        {deletable && onDeleteClick ? (
                          <button
                            type="button"
                            className="event-combobox__action event-combobox__action--danger"
                            data-testid={`event-delete-${event.eventId}`}
                            onClick={() => onDeleteClick(event)}
                          >
                            Delete
                          </button>
                        ) : null}
                        {!metadataEditable && editHint ? (
                          <span className="event-combobox__hint">{editHint}</span>
                        ) : null}
                        {metadataEditable && !deletable && deleteHint ? (
                          <span className="event-combobox__hint">{deleteHint}</span>
                        ) : null}
                      </div>
                    ) : null}
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
