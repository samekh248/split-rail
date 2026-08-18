import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  applyItineraryFilters,
  DEFAULT_ITINERARY_FILTERS,
  filterStagesByItineraryFilter,
  ItineraryFilters,
} from '@/components/festival/ItineraryFilters';
import type { ProgrammingBlockResponse } from '@/types/generated-api';
import { pickSelectFieldOption } from '../../utils/selectField';

const stages = [
  { id: 'stage-1', name: 'Main Stage', sortOrder: 0, blockCount: 2 },
  { id: 'stage-2', name: 'Side Stage', sortOrder: 1, blockCount: 1 },
];

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
    stageZoneId: 'stage-2',
    category: 'MUSIC',
    scheduleStatus: 'SCHEDULED',
    bookingStatus: 'CONFIRMED',
  },
];

describe('applyItineraryFilters', () => {
  it('keeps every block when no filter is set', () => {
    expect(applyItineraryFilters(blocks, DEFAULT_ITINERARY_FILTERS)).toHaveLength(2);
  });

  it('narrows the itinerary to one or more selected stages', () => {
    const mainStageOnly = applyItineraryFilters(blocks, {
      ...DEFAULT_ITINERARY_FILTERS,
      stageZoneIds: ['stage-1'],
    });
    expect(mainStageOnly.map((block) => block.id)).toEqual(['block-1']);

    const bothStages = applyItineraryFilters(blocks, {
      ...DEFAULT_ITINERARY_FILTERS,
      stageZoneIds: ['stage-1', 'stage-2'],
    });
    expect(bothStages).toHaveLength(2);
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

describe('filterStagesByItineraryFilter', () => {
  it('returns every stage when none are selected', () => {
    expect(filterStagesByItineraryFilter(stages, DEFAULT_ITINERARY_FILTERS)).toHaveLength(2);
  });

  it('returns only the selected stages', () => {
    const filtered = filterStagesByItineraryFilter(stages, {
      ...DEFAULT_ITINERARY_FILTERS,
      stageZoneIds: ['stage-2'],
    });
    expect(filtered.map((stage) => stage.id)).toEqual(['stage-2']);
  });
});

describe('ItineraryFilters', () => {
  it('exposes a booking filter alongside stage, category, and status', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <ItineraryFilters
        stages={stages}
        values={DEFAULT_ITINERARY_FILTERS}
        onChange={onChange}
      />,
    );

    expect(screen.getByTestId('itinerary-filter-booking')).toBeInTheDocument();

    await pickSelectFieldOption(user, 'itinerary-filter-booking', 'HOLD');
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ bookingStatus: 'HOLD' }),
    );
  });

  it('supports selecting multiple stages from the multiselect', async () => {
    const onChange = vi.fn();
    render(
      <ItineraryFilters
        stages={stages}
        values={DEFAULT_ITINERARY_FILTERS}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByTestId('itinerary-filter-stage'));
    fireEvent.click(screen.getByTestId('itinerary-filter-stage-option-stage-1').querySelector('input')!);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ stageZoneIds: ['stage-1'] }),
    );

    onChange.mockClear();
    fireEvent.click(screen.getByTestId('itinerary-filter-stage-option-stage-2').querySelector('input')!);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ stageZoneIds: ['stage-2'] }),
    );
  });
});
