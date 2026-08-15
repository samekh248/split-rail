import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BucketTable } from '@/components/festival/BucketTable';
import type { RevenueBucketResponse } from '@/types/generated-api';

const mockUpdate = { mutateAsync: vi.fn(), isPending: false };

vi.mock('@/api/festivalFinancials', () => ({
  useUpdateRevenueBucket: () => mockUpdate,
}));

function Wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient();
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

const openBucket: RevenueBucketResponse = {
  id: 'bucket-1',
  name: 'Wristbands',
  amount: '100000.00',
  totalAllocated: '25000.00',
  remaining: '75000.00',
  isAllocable: true,
  lockedAt: null,
};

const lockedBucket: RevenueBucketResponse = {
  id: 'bucket-2',
  name: 'VIP',
  amount: '20000.00',
  totalAllocated: '22000.00',
  remaining: '-2000.00',
  isAllocable: false,
  lockedAt: '2026-08-14T12:00:00Z',
};

describe('BucketTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdate.mutateAsync.mockResolvedValue(openBucket);
  });

  it('renders live balances for each bucket', () => {
    render(
      <BucketTable venueId="v1" eventId="e1" buckets={[openBucket, lockedBucket]} />,
      { wrapper: Wrapper },
    );

    expect(screen.getByText('Wristbands')).toBeInTheDocument();
    expect(screen.getByTestId('bucket-remaining-bucket-1')).toHaveTextContent('$75,000.00');
    expect(screen.getByTestId('bucket-remaining-bucket-2')).toHaveTextContent('-$2,000.00');
  });

  it('shows allocable state and allows toggling when manageable', async () => {
    render(
      <BucketTable venueId="v1" eventId="e1" buckets={[openBucket]} canManage />,
      { wrapper: Wrapper },
    );

    const toggle = screen.getByTestId('bucket-allocable-bucket-1');
    expect(toggle).toHaveTextContent('Yes');

    await userEvent.click(toggle);

    expect(mockUpdate.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        bucketId: 'bucket-1',
        body: expect.objectContaining({ isAllocable: false }),
      }),
    );
  });

  it('renders lock indicators for locked buckets', () => {
    render(
      <BucketTable venueId="v1" eventId="e1" buckets={[openBucket, lockedBucket]} />,
      { wrapper: Wrapper },
    );

    expect(screen.getByTestId('bucket-lock-bucket-1')).toHaveTextContent('Open');
    expect(screen.getByTestId('bucket-lock-bucket-2')).toHaveTextContent('Locked');
  });

  it('disables allocable toggle on locked buckets', () => {
    render(
      <BucketTable venueId="v1" eventId="e1" buckets={[lockedBucket]} canManage />,
      { wrapper: Wrapper },
    );

    expect(screen.getByTestId('bucket-allocable-bucket-2')).toBeDisabled();
  });
});
