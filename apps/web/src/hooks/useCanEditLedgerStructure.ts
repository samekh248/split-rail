import { useUserProfile } from '@/api/user';
import type { EventStatus } from '@/types/generated-api';

export function useCanEditLedgerStructure(
  status: EventStatus | string | null | undefined,
  isBudgetLocked: boolean,
): boolean {
  const { data: profile } = useUserProfile();

  if (status !== 'PRE_SHOW') return false;

  const permissions = profile?.role?.permissions;
  if (isBudgetLocked) {
    return permissions?.canEditSettlement ?? false;
  }

  return permissions?.canViewFinancials ?? false;
}
