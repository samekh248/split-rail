import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  useCanManageFestivalSchedule,
  useCanPublishPublicItinerary,
} from '@/hooks/useFestivalPermissions';

vi.mock('@/api/user', () => ({
  useUserProfile: vi.fn(),
}));

import { useUserProfile } from '@/api/user';

function mockPermissions(permissions: Record<string, boolean> | undefined) {
  vi.mocked(useUserProfile).mockReturnValue({
    data: permissions ? { role: { permissions } } : undefined,
  } as ReturnType<typeof useUserProfile>);
}

describe('useCanManageFestivalSchedule', () => {
  it('returns true when the role carries schedule authority', () => {
    mockPermissions({ canManageFestivalSchedule: true });

    const { result } = renderHook(() => useCanManageFestivalSchedule());
    expect(result.current).toBe(true);
  });

  it('returns false when the role lacks schedule authority', () => {
    mockPermissions({ canManageFestivalSchedule: false });

    const { result } = renderHook(() => useCanManageFestivalSchedule());
    expect(result.current).toBe(false);
  });

  it('returns false while the profile is still loading', () => {
    mockPermissions(undefined);

    const { result } = renderHook(() => useCanManageFestivalSchedule());
    expect(result.current).toBe(false);
  });
});

describe('useCanPublishPublicItinerary', () => {
  it('tracks the publish grant independently of schedule authority', () => {
    mockPermissions({ canManageFestivalSchedule: true, canPublishPublicItinerary: false });

    const { result } = renderHook(() => useCanPublishPublicItinerary());
    expect(result.current).toBe(false);
  });

  it('returns true once publishing is granted', () => {
    mockPermissions({ canPublishPublicItinerary: true });

    const { result } = renderHook(() => useCanPublishPublicItinerary());
    expect(result.current).toBe(true);
  });
});
