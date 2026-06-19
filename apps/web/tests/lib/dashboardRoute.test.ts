import { renderHook, act } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  getDashboardPath,
  navigateToCreateVenue,
  navigateToDashboard,
  navigateToEventWorkspace,
  useDashboardRoute,
} from '@/lib/dashboardRoute';

describe('dashboardRoute', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/');
  });

  it('getDashboardPath returns / for root', () => {
    expect(getDashboardPath()).toBe('/');
  });

  it('getDashboardPath returns /venues/new on create path', () => {
    window.history.pushState({}, '', '/venues/new');
    expect(getDashboardPath()).toBe('/venues/new');
  });

  it('navigateToCreateVenue updates path and hook state', () => {
    const { result } = renderHook(() => useDashboardRoute());
    expect(result.current).toBe('/');

    act(() => navigateToCreateVenue());
    expect(window.location.pathname).toBe('/venues/new');
    expect(result.current).toBe('/venues/new');
  });

  it('navigateToDashboard returns to root', () => {
    window.history.pushState({}, '', '/venues/new');
    const { result } = renderHook(() => useDashboardRoute());

    act(() => navigateToDashboard());
    expect(window.location.pathname).toBe('/');
    expect(result.current).toBe('/');
  });

  it('re-exports navigateToEventWorkspace from the dashboard route barrel', () => {
    const venueId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    const eventId = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';

    navigateToEventWorkspace(venueId, eventId, 'deal');

    expect(window.location.pathname).toBe(`/venues/${venueId}/events/${eventId}`);
    expect(window.location.search).toBe('?focus=deal');
  });
});
