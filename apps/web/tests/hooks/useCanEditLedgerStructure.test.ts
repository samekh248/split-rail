import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useCanEditLedgerStructure } from '@/hooks/useCanEditLedgerStructure';

vi.mock('@/api/user', () => ({
  useUserProfile: vi.fn(),
}));

import { useUserProfile } from '@/api/user';

describe('useCanEditLedgerStructure', () => {
  it('allows structural edits during planning when user can view financials', () => {
    vi.mocked(useUserProfile).mockReturnValue({
      data: { role: { permissions: { canViewFinancials: true, canEditSettlement: false } } },
    } as ReturnType<typeof useUserProfile>);

    const { result } = renderHook(() => useCanEditLedgerStructure('PRE_SHOW', false));
    expect(result.current).toBe(true);
  });

  it('allows structural edits during settlement when user can edit settlement', () => {
    vi.mocked(useUserProfile).mockReturnValue({
      data: { role: { permissions: { canViewFinancials: true, canEditSettlement: true } } },
    } as ReturnType<typeof useUserProfile>);

    const { result } = renderHook(() => useCanEditLedgerStructure('PRE_SHOW', true));
    expect(result.current).toBe(true);
  });

  it('blocks structural edits when settled', () => {
    vi.mocked(useUserProfile).mockReturnValue({
      data: { role: { permissions: { canViewFinancials: true, canEditSettlement: true } } },
    } as ReturnType<typeof useUserProfile>);

    const { result } = renderHook(() => useCanEditLedgerStructure('SETTLED', true));
    expect(result.current).toBe(false);
  });
});
