import { useState } from 'react';
import { useCreateMapping } from '@/api/qbo';
import { dashboardQueryKey } from '@/api/dashboard';
import { useQueryClient } from '@tanstack/react-query';
import { SelectField } from '@/components/auth/SelectField';
import { ledgerKeys } from '@/api/ledger';
import { qboKeys } from '@/api/qbo';
import type { UnmappedTransactionDto } from '@/types/generated-api';

interface InlineMappingDropdownProps {
  venueId: string;
  eventId: string;
  transaction: UnmappedTransactionDto;
  lineItemOptions: Array<{ id: string; label: string }>;
}

export function InlineMappingDropdown({
  venueId,
  eventId,
  transaction,
  lineItemOptions,
}: InlineMappingDropdownProps) {
  const [selectedLineItemId, setSelectedLineItemId] = useState('');
  const createMapping = useCreateMapping(venueId, eventId);
  const queryClient = useQueryClient();

  const handleConfirm = async () => {
    const option = lineItemOptions.find((o) => o.id === selectedLineItemId);
    if (!option) return;

    await createMapping.mutateAsync({
      qboAccountId: transaction.qboAccountId,
      qboAccountName: transaction.qboAccountName,
      mappedCategoryLabel: option.label,
      mappedLineItemId: option.id,
    });

    queryClient.setQueryData(
      qboKeys.unmappedList(venueId, eventId),
      (prev: { transactions: UnmappedTransactionDto[]; unmappedCount: number } | undefined) => {
        if (!prev) return prev;
        const transactions = prev.transactions.filter((t) => t.id !== transaction.id);
        return { ...prev, transactions, unmappedCount: transactions.length };
      },
    );

    void queryClient.invalidateQueries({ queryKey: ledgerKeys.grid(venueId, eventId) });
    void queryClient.invalidateQueries({ queryKey: dashboardQueryKey(venueId) });
  };

  return (
    <div className="inline-mapping-dropdown" data-testid="inline-mapping-dropdown">
      <SelectField
        id={`inline-mapping-select-${transaction.id}`}
        ariaLabel="Map to ledger row"
        value={selectedLineItemId}
        placeholder="Select row…"
        options={lineItemOptions.map((option) => ({
          value: option.id,
          label: option.label,
        }))}
        onChange={setSelectedLineItemId}
        wrapperClassName="inline-mapping-dropdown__select"
        data-testid="inline-mapping-select"
      />
      <button
        type="button"
        disabled={!selectedLineItemId || createMapping.isPending}
        onClick={() => void handleConfirm()}
        data-testid="inline-mapping-confirm"
      >
        Map
      </button>
    </div>
  );
}
