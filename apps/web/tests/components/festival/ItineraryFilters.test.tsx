import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  applyItineraryFilters,
  DEFAULT_ITINERARY_FILTERS,
  ItineraryFilters,
} from '@/components/festival/ItineraryFilters';
import type { ProgrammingBlockResponse } from '@/types/generated-api';

const stages = [{ id: 'stage-1', name: 'Main Stage', sortOrder: 0, blockCount: 2 }];

const blocks: ProgrammingBlockResponse[] = [
  {
    id: 'block-1',
    title: 'Held Act',
    stageZoneId: 'stage-1',
    category: 'MUSIC',
    scheduleStatus: 'SCHEDULED',
    bookingStatus: 'HOLD',
  },
  {
    id: 'block-2',
    title: 'Confirmed Act',
    stageZoneId: 'stage-1',
    category: 'MUSIC',
    scheduleStatus: 'SCHEDULED',
    bookingStatus: 'CONFIRMED',
  },
];

describe('applyItineraryFilters', () => {
  it('keeps every block when no filter is set', () => {
    expect(applyItineraryFilters(blocks, DEFAULT_ITINERARY_FILTERS)).toHaveLength(2);
  });

  it('narrows the itinerary to holds or to confirmed appearances', () => {
    const holds = applyItineraryFilters(blocks, {
      ...DEFAULT_ITINERARY_FILTERS,
      bookingStatus: 'HOLD',
    });
    expect(holds.map((block) => block.id)).toEqual(['block-1']);

    const confirmed = applyItineraryFilters(blocks, {
      ...DEFAULT_ITINERARY_FILTERS,
      bookingStatus: 'CONFIRMED',
    });
    expect(confirmed.map((block) => block.id)).toEqual(['block-2']);
  });

  it('treats a block with no booking status as a hold', () => {
    const holds = applyItineraryFilters([{ id: 'block-3', stageZoneId: 'stage-1' }], {
      ...DEFAULT_ITINERARY_FILTERS,
      bookingStatus: 'HOLD',
    });
    expect(holds).toHaveLength(1);
  });
});

describe('ItineraryFilters', () => {
  it('exposes a booking filter alongside stage, category, and status', async () => {
    const onChange = vi.fn();
    render(
      <ItineraryFilters
        stages={stages}
        values={DEFAULT_ITINERARY_FILTERS}
        onChange={onChange}
      />,
    );

    const bookingFilter = screen.getByTestId('itinerary-filter-booking');
    expect(bookingFilter).toBeInTheDocument();

    await userEvent.selectOptions(bookingFilter, 'HOLD');
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ bookingStatus: 'HOLD' }),
    );
  });
});
