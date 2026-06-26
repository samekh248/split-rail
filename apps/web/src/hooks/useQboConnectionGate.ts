import { useOrganizationQboSummary } from '@/api/qbo';

export function useQboConnectionGate(organizationId: string | undefined) {
  const summaryQuery = useOrganizationQboSummary(organizationId);

  return {
    isQboConnected: summaryQuery.data?.isQboConnected ?? false,
    isLoading: summaryQuery.isLoading,
    summary: summaryQuery.data,
  };
}
