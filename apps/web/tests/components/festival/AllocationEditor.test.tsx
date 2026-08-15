import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AllocationEditor } from '@/components/festival/AllocationEditor';
import type { RevenueAllocationResponse, RevenueBucketResponse } from '@/types/generated-api';

const bucket: RevenueBucketResponse = {
  id: 'bucket-1',
  name: 'Wristbands',
  amount: '100000.00',
  totalAllocated: '105000.00',
  remaining: '-5000.00',
  isAllocable: true,
};

const allocations: RevenueAllocationResponse[] = [
  {
    id: 'alloc-1',
    revenueBucketId: 'bucket-1',
    bucketName: 'Wristbands',
    programmingBlockId: 'block-1',
    blockTitle: 'Cody Jinks',
    allocationType: 'PERCENT_OF_BUCKET',
    calculatedAmount: '50000.00',
    bucketRemaining: '-5000.00',
    warnings: [{ code: 'BUCKET_OVERALLOCATED', message: 'Over by 5000' }],
  },
  {
    id: 'alloc-2',
    revenueBucketId: 'bucket-1',
    bucketName: 'Wristbands',
    programmingBlockId: 'block-2',
    blockTitle: 'Turnpike Troubadours',
    allocationType: 'PERCENT_OF_BUCKET',
    calculatedAmount: '55000.00',
    roundingAdjustment: '0.01',
    bucketRemaining: '-5000.00',
    warnings: [],
  },
];

describe('AllocationEditor', () => {
  it('shows named source bucket on each allocation line', () => {
    render(<AllocationEditor bucket={bucket} allocations={allocations} canManage />);

    expect(screen.getAllByTestId('allocation-source-bucket')).toHaveLength(2);
    expect(screen.getAllByTestId('allocation-source-bucket')[0]).toHaveTextContent(
      'from Wristbands',
    );
  });

  it('surfaces draft warning vs hard error balance states', () => {
    render(<AllocationEditor bucket={bucket} allocations={allocations} canManage />);

    expect(screen.getByTestId('allocation-balance-status')).toHaveTextContent('Over-allocated');
    expect(screen.getByTestId('allocation-draft-warning')).toBeInTheDocument();
    expect(screen.getByTestId('allocation-line-warning')).toHaveTextContent('Over bucket limit');
  });

  it('displays rounding adjustment when present', () => {
    render(<AllocationEditor bucket={bucket} allocations={allocations} canManage />);

    expect(screen.getByTestId('allocation-rounding-adjustment')).toHaveTextContent('Rounding adj.');
  });

  it('prompts when no bucket is selected', () => {
    render(<AllocationEditor bucket={null} allocations={[]} />);

    expect(screen.getByTestId('allocation-editor')).toHaveTextContent('Select a bucket');
  });

  it('shows not-allocable message for closed buckets', () => {
    render(
      <AllocationEditor
        bucket={{ ...bucket, isAllocable: false }}
        allocations={[]}
        canManage
      />,
    );

    expect(screen.getByTestId('allocation-not-allocable')).toBeInTheDocument();
  });
});
