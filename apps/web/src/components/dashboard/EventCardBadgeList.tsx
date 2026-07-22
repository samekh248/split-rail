import { useId, useState } from 'react';
import { isPastEventDate } from '@/lib/eventLifecycle';

export interface EventCardTag {
  key: string;
  label: string;
  testId: string;
  className: string;
  title?: string;
}

export interface EventCardBadgeListProps {
  tags: EventCardTag[];
  eventId: string;
  eventDate?: string | null;
  now?: Date;
}

export function resolveFeaturedEventCardTag(
  tags: EventCardTag[],
  eventDate: string | null | undefined,
  now: Date = new Date(),
): EventCardTag {
  if (tags.length === 0) {
    throw new Error('tags must not be empty');
  }

  if (isPastEventDate(eventDate, now)) {
    return tags.find((tag) => tag.key !== 'booking') ?? tags[0];
  }

  return tags[0];
}

function buildBadgeCountLabel(tags: EventCardTag[], featured: EventCardTag): string {
  if (tags.length === 2) {
    const other = tags.find((tag) => tag.key !== featured.key);
    return other
      ? `${featured.label} and ${other.label}`
      : `${featured.label} and 1 more status tag`;
  }

  return `${featured.label} and ${tags.length - 1} more status tags`;
}

export function EventCardBadgeList({
  tags,
  eventId,
  eventDate,
  now,
}: EventCardBadgeListProps) {
  const [open, setOpen] = useState(false);
  const popoverId = useId();

  if (tags.length === 0) {
    return null;
  }

  if (tags.length === 1) {
    const tag = tags[0];
    return (
      <span className={tag.className} title={tag.title} data-testid={tag.testId}>
        {tag.label}
      </span>
    );
  }

  const featured = resolveFeaturedEventCardTag(tags, eventDate, now);
  const isActionFeatured = featured.key !== 'booking';

  return (
    <div
      className="event-card__badge-stack"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className={[
          'event-card__badge-count',
          isActionFeatured ? 'event-card__badge-count--action' : 'event-card__badge-count--status',
        ].join(' ')}
        aria-label={buildBadgeCountLabel(tags, featured)}
        aria-describedby={open ? popoverId : undefined}
        aria-expanded={open}
        data-testid={`event-card-badge-count-${eventId}`}
        onClick={(event) => event.stopPropagation()}
        onFocus={() => setOpen(true)}
        onBlur={(event) => {
          if (!event.currentTarget.parentElement?.contains(event.relatedTarget as Node)) {
            setOpen(false);
          }
        }}
      >
        <span
          className={featured.className}
          data-testid={`event-card-badge-featured-${eventId}`}
        >
          {featured.label}
        </span>
        <span className="event-card__badge-count-total" aria-hidden="true">
          {tags.length}
        </span>
      </button>
      {open && (
        <div
          id={popoverId}
          role="tooltip"
          className="event-card__badge-popover"
          data-testid={`event-card-badge-popover-${eventId}`}
        >
          {tags.map((tag) => (
            <span
              key={tag.key}
              className={tag.className}
              title={tag.title}
              data-testid={tag.testId}
            >
              {tag.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
