import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UnassignedTransactionsBanner } from '@/components/dashboard/UnassignedTransactionsBanner';
import type { ActionCenterDto } from '@/types/generated-api';
import { VENUE_A, VENUE_B } from '../../fixtures/venues';
import * as eventWorkspaceRoute from '@/lib/eventWorkspaceRoute';

vi.mock('@/api/qbo', () => ({
  useUnmappedTransactions: vi.fn(),
  useCreateMapping: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
  qboKeys: { unmappedList: () => ['qbo', 'unmapped-list'] },
}));

vi.mock('@/api/ledger', () => ({
  useLedger: vi.fn(),
  ledgerKeys: { grid: () => ['ledger'] },
}));

import { useUnmappedTransactions } from '@/api/qbo';
import { useLedger } from '@/api/ledger';

const mockedUnmappedList = vi.mocked(useUnmappedTransactions);
const mockedLedger = vi.mocked(useLedger);

const EVENT_1 = '11111111-1111-1111-1111-111111111111';
const EVENT_2 = '22222222-2222-2222-2222-222222222222';

function actionCenter(overrides: Partial<ActionCenterDto> = {}): ActionCenterDto {
  return {
    totalUnmappedCount: overrides.totalUnmappedCount ?? 0,
    eventsWithUnmapped: overrides.eventsWithUnmapped ?? [],
  };
}

function renderBanner(
  props: Partial<ComponentProps<typeof UnassignedTransactionsBanner>> = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  const view = render(
    <QueryClientProvider client={queryClient}>
      <UnassignedTransactionsBanner
        actionCenter={props.actionCenter}
        venues={props.venues ?? [VENUE_A]}
        isAllVenuesView={props.isAllVenuesView ?? false}
        isLoading={props.isLoading ?? false}
        venueScopeKey={props.venueScopeKey ?? VENUE_A.id!}
        onRetryDashboard={props.onRetryDashboard}
      />
    </QueryClientProvider>,
  );

  return { ...view, queryClient };
}

describe('UnassignedTransactionsBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(eventWorkspaceRoute, 'navigateToEventWorkspace').mockImplementation(() => {});
    mockedLedger.mockReturnValue({
      data: {
        blocks: [{ rows: [{ id: 'row-1', rowLabel: 'Sound' }] }],
      },
    } as ReturnType<typeof useLedger>);
    mockedUnmappedList.mockReturnValue({
      data: {
        transactions: [
          {
            id: 'u-1',
            qboAccountId: 'ACC-1',
            qboAccountName: 'Sound',
            amount: '100.00',
            transactionDate: '2026-06-10',
          },
        ],
      },
    } as ReturnType<typeof useUnmappedTransactions>);
  });

  describe('visibility', () => {
    it('hides banner when totalUnmappedCount is 0', () => {
      renderBanner({
        actionCenter: actionCenter({ totalUnmappedCount: 0 }),
      });

      expect(screen.queryByTestId('unassigned-transactions-banner')).not.toBeInTheDocument();
    });

    it('hides banner while loading', () => {
      renderBanner({
        actionCenter: actionCenter({
          totalUnmappedCount: 3,
          eventsWithUnmapped: [
            {
              eventId: EVENT_1,
              venueId: VENUE_A.id,
              title: 'Show A',
              eventDate: '2026-06-20',
              unmappedCount: 3,
            },
          ],
        }),
        isLoading: true,
      });

      expect(screen.queryByTestId('unassigned-transactions-banner')).not.toBeInTheDocument();
    });

    it('shows count message when totalUnmappedCount > 0', () => {
      renderBanner({
        actionCenter: actionCenter({
          totalUnmappedCount: 4,
          eventsWithUnmapped: [
            {
              eventId: EVENT_1,
              venueId: VENUE_A.id,
              title: 'Show A',
              eventDate: '2026-06-20',
              unmappedCount: 4,
            },
          ],
        }),
      });

      expect(screen.getByTestId('unassigned-transactions-banner')).toHaveTextContent(
        '4 unassigned transactions detected',
      );
    });
  });

  describe('drawer', () => {
    const eventsActionCenter = actionCenter({
      totalUnmappedCount: 5,
      eventsWithUnmapped: [
        {
          eventId: EVENT_1,
          venueId: VENUE_A.id,
          title: 'High Count Show',
          eventDate: '2026-06-22',
          unmappedCount: 3,
        },
        {
          eventId: EVENT_2,
          venueId: VENUE_A.id,
          title: 'Low Count Show',
          eventDate: '2026-06-20',
          unmappedCount: 2,
        },
      ],
    });

    it('opens drawer on banner toggle without changing route', async () => {
      const user = userEvent.setup();
      window.history.pushState({}, '', '/');

      renderBanner({ actionCenter: eventsActionCenter });
      await user.click(screen.getByTestId('unassigned-transactions-banner-toggle'));

      expect(screen.getByTestId('unassigned-drawer')).toBeInTheDocument();
      expect(window.location.pathname).toBe('/');
    });

    it('lists event rows with title, date, and count', async () => {
      const user = userEvent.setup();
      renderBanner({ actionCenter: eventsActionCenter });
      await user.click(screen.getByTestId('unassigned-transactions-banner-toggle'));

      const row = screen.getByTestId(`unassigned-event-row-${EVENT_1}`);
      expect(within(row).getByText(/High Count Show/)).toBeInTheDocument();
      expect(within(row).getByText(/2026-06-22/)).toBeInTheDocument();
      expect(within(row).getByText('3')).toBeInTheDocument();
    });

    it('shows venue name on rows in all-venues mode', async () => {
      const user = userEvent.setup();
      renderBanner({
        actionCenter: actionCenter({
          totalUnmappedCount: 2,
          eventsWithUnmapped: [
            {
              eventId: EVENT_1,
              venueId: VENUE_B.id,
              title: 'Cross Venue Show',
              eventDate: '2026-06-21',
              unmappedCount: 2,
            },
          ],
        }),
        venues: [VENUE_A, VENUE_B],
        isAllVenuesView: true,
        venueScopeKey: 'all',
      });
      await user.click(screen.getByTestId('unassigned-transactions-banner-toggle'));

      expect(screen.getByText(/Hall B · Cross Venue Show/)).toBeInTheDocument();
    });

    it('dismisses drawer on close button and Escape', async () => {
      const user = userEvent.setup();
      renderBanner({ actionCenter: eventsActionCenter });
      await user.click(screen.getByTestId('unassigned-transactions-banner-toggle'));
      expect(screen.getByTestId('unassigned-drawer')).toBeInTheDocument();

      await user.click(screen.getByLabelText('Close drawer'));
      expect(screen.queryByTestId('unassigned-drawer')).not.toBeInTheDocument();

      await user.click(screen.getByTestId('unassigned-transactions-banner-toggle'));
      await user.keyboard('{Escape}');
      expect(screen.queryByTestId('unassigned-drawer')).not.toBeInTheDocument();
    });

    it('has scrollable drawer body for large lists', async () => {
      const user = userEvent.setup();
      renderBanner({ actionCenter: eventsActionCenter });
      await user.click(screen.getByTestId('unassigned-transactions-banner-toggle'));

      const body = document.querySelector('.unassigned-drawer__body');
      expect(body).not.toBeNull();
      expect(body).toHaveClass('unassigned-drawer__body');
    });

    it('shows recoverable error when event list is empty but count is positive', async () => {
      const user = userEvent.setup();
      const onRetry = vi.fn();
      renderBanner({
        actionCenter: actionCenter({ totalUnmappedCount: 2, eventsWithUnmapped: [] }),
        onRetryDashboard: onRetry,
      });
      await user.click(screen.getByTestId('unassigned-transactions-banner-toggle'));

      expect(screen.getByText(/Unable to load the event list/)).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Retry' }));
      expect(onRetry).toHaveBeenCalled();
    });
  });

  describe('accordion', () => {
  const singleEventCenter = actionCenter({
    totalUnmappedCount: 1,
    eventsWithUnmapped: [
      {
        eventId: EVENT_1,
        venueId: VENUE_A.id,
        title: 'Accordion Show',
        eventDate: '2026-06-20',
        unmappedCount: 1,
      },
    ],
  });

    it('expands to show transaction list', async () => {
      const user = userEvent.setup();
      renderBanner({ actionCenter: singleEventCenter });
      await user.click(screen.getByTestId('unassigned-transactions-banner-toggle'));

      const row = screen.getByTestId(`unassigned-event-row-${EVENT_1}`);
      await user.click(within(row).getByText(/Accordion Show/));

      expect(screen.getByTestId(`unassigned-event-list-${EVENT_1}`)).toBeInTheDocument();
      expect(within(screen.getByTestId(`unassigned-event-list-${EVENT_1}`)).getByText('$100.00')).toBeInTheDocument();
    });

    it('collapses transaction list while drawer stays open', async () => {
      const user = userEvent.setup();
      renderBanner({ actionCenter: singleEventCenter });
      await user.click(screen.getByTestId('unassigned-transactions-banner-toggle'));

      const row = screen.getByTestId(`unassigned-event-row-${EVENT_1}`);
      await user.click(within(row).getByText(/Accordion Show/));
      expect(screen.getByTestId(`unassigned-event-list-${EVENT_1}`)).toBeInTheDocument();

      await user.click(within(row).getByText(/Accordion Show/));
      expect(screen.queryByTestId(`unassigned-event-list-${EVENT_1}`)).not.toBeInTheDocument();
      expect(screen.getByTestId('unassigned-drawer')).toBeInTheDocument();
    });
  });

  describe('success state', () => {
    it('hides banner and shows success message when count reaches zero while drawer open', async () => {
      const user = userEvent.setup();
      const initial = actionCenter({
        totalUnmappedCount: 1,
        eventsWithUnmapped: [
          {
            eventId: EVENT_1,
            venueId: VENUE_A.id,
            title: 'Final Show',
            eventDate: '2026-06-20',
            unmappedCount: 1,
          },
        ],
      });

      const { rerender, queryClient } = renderBanner({ actionCenter: initial });
      await user.click(screen.getByTestId('unassigned-transactions-banner-toggle'));

      rerender(
        <QueryClientProvider client={queryClient}>
          <UnassignedTransactionsBanner
            actionCenter={actionCenter({ totalUnmappedCount: 0, eventsWithUnmapped: [] })}
            venues={[VENUE_A]}
            isAllVenuesView={false}
            isLoading={false}
            venueScopeKey={VENUE_A.id!}
          />
        </QueryClientProvider>,
      );

      expect(screen.queryByTestId('unassigned-transactions-banner')).not.toBeInTheDocument();
      expect(screen.getByTestId('unassigned-drawer-success')).toBeInTheDocument();
    });
  });

  describe('workspace', () => {
    it('navigates to event workspace with sync focus', async () => {
      const user = userEvent.setup();
      renderBanner({
        actionCenter: actionCenter({
          totalUnmappedCount: 1,
          eventsWithUnmapped: [
            {
              eventId: EVENT_1,
              venueId: VENUE_A.id,
              title: 'Workspace Show',
              eventDate: '2026-06-20',
              unmappedCount: 1,
            },
          ],
        }),
      });
      await user.click(screen.getByTestId('unassigned-transactions-banner-toggle'));
      await user.click(screen.getByTestId(`unassigned-event-workspace-link-${EVENT_1}`));

      expect(eventWorkspaceRoute.navigateToEventWorkspace).toHaveBeenCalledWith(
        VENUE_A.id,
        EVENT_1,
        'sync',
      );
    });
  });
});
