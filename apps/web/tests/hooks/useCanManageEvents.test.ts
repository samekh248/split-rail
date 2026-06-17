import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useCanManageEvents } from '@/hooks/useCanManageEvents';

vi.mock('@/api/user', () => ({
  useUserProfile: vi.fn(),
}));

import { useUserProfile } from '@/api/user';

describe('useCanManageEvents', () => {
  it('returns true when user can view financials', () => {
    vi.mocked(useUserProfile).mockReturnValue({
      data: { role: { permissions: { canViewFinancials: true } } },
    } as ReturnType<typeof useUserProfile>);

    const { result } = renderHook(() => useCanManageEvents());
    expect(result.current).toBe(true);
  });

  it('returns false when user cannot view financials', () => {
    vi.mocked(useUserProfile).mockReturnValue({
      data: { role: { permissions: { canViewFinancials: false } } },
    } as ReturnType<typeof useUserProfile>);

    const { result } = renderHook(() => useCanManageEvents());
    expect(result.current).toBe(false);
  });
});
