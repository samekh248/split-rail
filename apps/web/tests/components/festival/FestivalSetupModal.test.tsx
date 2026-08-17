import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  FestivalSetupModal,
  countFestivalDays,
  validateFestivalRange,
} from '@/components/festival/FestivalSetupModal';

const mockCreate = { mutateAsync: vi.fn(), isPending: false };
const mockUpdate = { mutateAsync: vi.fn(), isPending: false };

vi.mock('@/api/festivals', () => ({
  useCreateFestival: () => mockCreate,
  useUpdateFestival: () => mockUpdate,
}));

function Wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient();
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

async function setDate(label: RegExp, value: string) {
  const input = screen.getByLabelText(label);
  await userEvent.clear(input);
  await userEvent.type(input, value);
}

describe('countFestivalDays', () => {
  it('counts an inclusive range', () => {
    expect(countFestivalDays('2026-08-14', '2026-08-16')).toBe(3);
    expect(countFestivalDays('2026-08-14', '2026-08-14')).toBe(1);
  });

  it('returns null for unparseable dates', () => {
    expect(countFestivalDays('', '2026-08-16')).toBeNull();
  });
});

describe('validateFestivalRange', () => {
  it('accepts one to three days', () => {
    expect(validateFestivalRange('2026-08-14', '2026-08-14')).toBeUndefined();
    expect(validateFestivalRange('2026-08-14', '2026-08-16')).toBeUndefined();
  });

  it('rejects a range longer than three days with a clear message', () => {
    expect(validateFestivalRange('2026-08-14', '2026-08-20')).toMatch(/3 days or fewer/);
  });

  it('rejects an end date before the start date', () => {
    expect(validateFestivalRange('2026-08-16', '2026-08-14')).toMatch(/before the start date/);
  });

  it('requires both dates', () => {
    expect(validateFestivalRange('', '2026-08-16')).toMatch(/Start date is required/);
    expect(validateFestivalRange('2026-08-14', '')).toMatch(/End date is required/);
  });
});

describe('FestivalSetupModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreate.mutateAsync.mockResolvedValue({
      eventId: 'festival-1',
      venueId: 'venue-1',
      title: 'Kalispell Roundup',
      startDate: '2026-08-14',
      endDate: '2026-08-16',
      eventType: 'FESTIVAL',
      status: 'PRE_SHOW',
      qboTagName: '#Fest-2026-KALISPELL',
      days: [],
      stages: [],
    });
  });

  it('requires only name, start date and end date', () => {
    render(
      <FestivalSetupModal venueId="venue-1" open onClose={vi.fn()} onCreated={vi.fn()} />,
      { wrapper: Wrapper },
    );

    expect(screen.getByLabelText(/Festival name/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Start date/)).toBeInTheDocument();
    expect(screen.getByLabelText(/End date/)).toBeInTheDocument();
    // No stage, category, or deal fields at festival-creation time.
    expect(screen.queryByLabelText(/Stage/)).not.toBeInTheDocument();
  });

  it('creates a festival with the entered range', async () => {
    const onCreated = vi.fn();
    render(
      <FestivalSetupModal venueId="venue-1" open onClose={vi.fn()} onCreated={onCreated} />,
      { wrapper: Wrapper },
    );

    await userEvent.type(screen.getByLabelText(/Festival name/), 'Kalispell Roundup');
    await setDate(/Start date/, '2026-08-14');
    await setDate(/End date/, '2026-08-16');
    await userEvent.click(screen.getByTestId('festival-setup-save'));

    expect(mockCreate.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Kalispell Roundup',
        startDate: '2026-08-14',
        endDate: '2026-08-16',
      }),
    );
    expect(onCreated).toHaveBeenCalledWith('festival-1');
  });

  it('blocks a range longer than three days with a clear message', async () => {
    render(
      <FestivalSetupModal venueId="venue-1" open onClose={vi.fn()} onCreated={vi.fn()} />,
      { wrapper: Wrapper },
    );

    await userEvent.type(screen.getByLabelText(/Festival name/), 'Week Long');
    await setDate(/Start date/, '2026-08-14');
    await setDate(/End date/, '2026-08-20');
    await userEvent.click(screen.getByTestId('festival-setup-save'));

    expect(screen.getByText(/3 days or fewer/)).toBeInTheDocument();
    expect(mockCreate.mutateAsync).not.toHaveBeenCalled();
  });

  it('requires a festival name', async () => {
    render(
      <FestivalSetupModal venueId="venue-1" open onClose={vi.fn()} onCreated={vi.fn()} />,
      { wrapper: Wrapper },
    );

    await setDate(/Start date/, '2026-08-14');
    await setDate(/End date/, '2026-08-15');
    await userEvent.click(screen.getByTestId('festival-setup-save'));

    expect(screen.getByText('Festival name is required.')).toBeInTheDocument();
    expect(mockCreate.mutateAsync).not.toHaveBeenCalled();
  });

  it('passes the existing event id when converting a standard event', async () => {
    render(
      <FestivalSetupModal
        venueId="venue-1"
        open
        onClose={vi.fn()}
        onCreated={vi.fn()}
        existingEventId="event-9"
        initialTitle="Autumn Show"
        initialStartDate="2026-10-02"
      />,
      { wrapper: Wrapper },
    );

    expect(screen.getByText('Convert to festival')).toBeInTheDocument();

    await setDate(/End date/, '2026-10-03');
    await userEvent.click(screen.getByTestId('festival-setup-save'));

    expect(mockCreate.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ existingEventId: 'event-9', title: 'Autumn Show' }),
    );
  });

  it('creates the festival at the venue picked from a multi-venue list', async () => {
    render(
      <FestivalSetupModal
        venueId="venue-1"
        open
        onClose={vi.fn()}
        onCreated={vi.fn()}
        venues={[
          { id: 'venue-1', name: 'Hall A' },
          { id: 'venue-2', name: 'Hall B' },
        ]}
      />,
      { wrapper: Wrapper },
    );

    await userEvent.click(screen.getByTestId('festival-venue-select'));
    await userEvent.click(screen.getByTestId('festival-venue-select-option-venue-2'));

    expect(screen.getByTestId('festival-venue-select')).toHaveTextContent('Hall B');
  });

  it('omits the venue picker when scoped to a single venue', () => {
    render(
      <FestivalSetupModal
        venueId="venue-1"
        open
        onClose={vi.fn()}
        onCreated={vi.fn()}
        venues={[{ id: 'venue-1', name: 'Hall A' }]}
      />,
      { wrapper: Wrapper },
    );

    expect(screen.queryByTestId('festival-venue-select')).not.toBeInTheDocument();
  });

  it('renders nothing when closed', () => {
    render(
      <FestivalSetupModal venueId="venue-1" open={false} onClose={vi.fn()} onCreated={vi.fn()} />,
      { wrapper: Wrapper },
    );

    expect(screen.queryByTestId('festival-setup-modal')).not.toBeInTheDocument();
  });

  it('saves festival name and dates in edit mode', async () => {
    mockUpdate.mutateAsync.mockResolvedValue({
      eventId: 'festival-1',
      title: 'Kalispell Roundup',
      startDate: '2026-08-14',
      endDate: '2026-08-16',
    });
    const onCreated = vi.fn();

    render(
      <FestivalSetupModal
        mode="edit"
        venueId="venue-1"
        eventId="festival-1"
        open
        onClose={vi.fn()}
        onCreated={onCreated}
        initialTitle="Old Name"
        initialStartDate="2026-08-14"
        initialEndDate="2026-08-15"
      />,
      { wrapper: Wrapper },
    );

    expect(screen.getByText('Edit festival')).toBeInTheDocument();
    expect(screen.getByLabelText(/Festival name/)).toHaveValue('Old Name');
    expect(screen.getByLabelText(/End date/)).toHaveValue('2026-08-15');

    await userEvent.clear(screen.getByLabelText(/Festival name/));
    await userEvent.type(screen.getByLabelText(/Festival name/), 'Kalispell Roundup');
    await setDate(/End date/, '2026-08-16');
    await userEvent.click(screen.getByTestId('festival-setup-save'));

    expect(mockUpdate.mutateAsync).toHaveBeenCalledWith({
      title: 'Kalispell Roundup',
      startDate: '2026-08-14',
      endDate: '2026-08-16',
    });
    expect(mockCreate.mutateAsync).not.toHaveBeenCalled();
    expect(onCreated).toHaveBeenCalledWith('festival-1');
  });
});
