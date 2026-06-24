import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useCanManageVenues } from '@/hooks/useCanManageVenues';

vi.mock('@/api/user', () => ({
  useUserProfile: vi.fn(),
}));

import { useUserProfile } from '@/api/user';

describe('useCanManageVenues', () => {
  it('returns true when user can manage permissions', () => {
    vi.mocked(useUserProfile).mockReturnValue({
      data: { role: { permissions: { canManagePermissions: true } } },
    } as ReturnType<typeof useUserProfile>);

    const { result } = renderHook(() => useCanManageVenues());
    expect(result.current).toBe(true);
  });

  it('returns false when user cannot manage permissions', () => {
    vi.mocked(useUserProfile).mockReturnValue({
      data: { role: { permissions: { canManagePermissions: false } } },
    } as ReturnType<typeof useUserProfile>);

    const { result } = renderHook(() => useCanManageVenues());
    expect(result.current).toBe(false);
  });

  it('returns false when profile is not loaded', () => {
    vi.mocked(useUserProfile).mockReturnValue({
      data: undefined,
    } as ReturnType<typeof useUserProfile>);

    const { result } = renderHook(() => useCanManageVenues());
    expect(result.current).toBe(false);
  });
});
